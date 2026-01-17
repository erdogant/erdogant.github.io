let routeMap = null;
let routeLine = null;
let routeMarkers = [];
// let waypoints = [];
let waypointMarkers = [];
let airportLayer = null;
let airportData = null;
let airspaceLayer = null;
let TMZLayer = null;
let metarLayer = null;
let metarDataCache = new Map(); // Cache METAR data with timestamps

const time_dep = document.getElementById("DEPARTURE_clockField")?.value;

// Define base layers
const baseLayers = {
  OpenStreetMap: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }),
  OpenTopoMap: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "&copy; OpenTopoMap" }),
  // 'Carto Voyager': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', attribution: '&copy; CARTO' }),
};

// Initialize map
function initRouteMap(initialize = true) {
  // Initializing route map
  console.log(">func: initRouteMap()");
  let bounds = [52, 5];

  if (!initialize) {
    console.log("> Map already initialized, skipping initRouteMap()");
    return;
  }

  if (routeMap) {
    routeMap.remove();
    routeMap = null;
  }

  routeMap = L.map("route-map", {
    zoomControl: true,
    dragging: true,
    touchZoom: true,
    scrollWheelZoom: true,
    layers: [baseLayers["OpenStreetMap"]], // default layer
  });

  routeMap.setView(bounds, 6);
  UpdateFlightInfoFields(time_dep, false, true); // initialize=false, adjustZoom=false

  // Handle layer selection
  const layerSelect = document.getElementById("layer-select");
  layerSelect.onchange = function () {
    const selectedLayer = this.value;
    Object.values(baseLayers).forEach((layer) => routeMap.removeLayer(layer));
    baseLayers[selectedLayer].addTo(routeMap);
  };

  // Force resize to render correctly
  setTimeout(() => routeMap.invalidateSize(), 180);
}

// Update route
async function updateRoute(adjustZoom = true) {
  // Updating route and checking for airport data
  console.log("> func: updateRoute()");

  // Clear existing route line
  if (routeLine) {
    routeMap.removeLayer(routeLine);
    routeLine = null;
  }

  // Clear existing route markers
  routeMarkers.forEach((marker) => routeMap.removeLayer(marker));
  routeMarkers = [];

  const depLatLon = window.flight_plan_data?.DEPARTURE_LATLON || [null, null];
  const arrLatLon = window.flight_plan_data?.ARRIVAL_LATLON || [null, null];
  const df = window.AERODROME_DATA;
  // console.log('Raw coordinates - Departure:', depLatLon, 'Arrival:', arrLatLon);

  // Clear existing airport layer
  if (airportLayer) {
    routeMap.removeLayer(airportLayer);
    airportLayer = null;
  }

  // Reset airport data
  airportData = null;

  // Use departure data as default
  console.log("Departure data available:", df ? "Yes" : "No");

  if (df) {
    // Create fresh airport data
    airportData = createAirportGeoJSON(df);

    // Display airports if checkbox is checked
    if (document.getElementById("aviation-toggle").checked) {
      toggleAirportLayer();
    }
  }

  if (!depLatLon?.[0] || !arrLatLon?.[0]) return;

  if (routeLine) routeLine.remove();
  routeMarkers.forEach((m) => m.remove());
  routeMarkers = [];

  const depCoords = [depLatLon[0], depLatLon[1]];
  const arrCoords = [arrLatLon[0], arrLatLon[1]];
  const weight_line = 8;

  // Create or update initial waypoints array including departure and arrival while preserving user-added waypoints
  if (!Array.isArray(window.waypoints) || window.waypoints.length < 2) {
    // No existing waypoints (first load) — initialize with departure and arrival
    window.waypoints = [depCoords, arrCoords];
  } else {
    // Preserve existing intermediate waypoints added by the user.
    // Ensure the first and last points always match current departure and arrival.
    const eps = 1e-6;
    function coordsEqual(a, b) {
      // return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
      // return a[0] - b[0] < eps && a[1] - b[1] < eps;
      return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
    }

    // Update departure (first) point if it changed
    if (!coordsEqual(window.waypoints[0], depCoords)) {
      window.waypoints[0] = depCoords;
    }
    // Update arrival (last) point if it changed
    if (!coordsEqual(window.waypoints[window.waypoints.length - 1], arrCoords)) {
      window.waypoints[window.waypoints.length - 1] = arrCoords;
    }
    // If somehow waypoints were reduced to <2, re-initialize
    if (window.waypoints.length < 2) {
      window.waypoints = [depCoords, arrCoords];
    }

    // Adust the zoom
    if (adjustZoom) adjustZoomMap();
  }

  // Create the route line with waypoints
  routeLine = L.polyline(window.waypoints, {
    color: "#8A00C4",
    weight: weight_line,
    opacity: 0.6,
    smoothFactor: 1,
    zIndex: 6000, // Highest z-index to stay above everything
    pane: "markerPane", // Use marker pane to ensure line stays on top
    interactive: true, // Make line clickable for adding waypoints
  }).addTo(routeMap);

  // Add waypoint markers
  updateWaypoints();

  // Add click handler to the line to create new waypoints
  routeLine.on("click", function (e) {
    // Highlight the line when clicked
    routeLine.setStyle({ weight: 5, opacity: 1 });
    setTimeout(() => routeLine.setStyle({ weight: weight_line, opacity: 0.8 }), 200);
    const newPoint = [e.latlng.lat, e.latlng.lng];
    // Find the closest segment and insert the new point
    let minDist = Infinity;
    let insertIndex = 1;

    for (let i = 0; i < window.waypoints.length - 1; i++) {
      const dist = pointToSegmentDistance(newPoint, window.waypoints[i], window.waypoints[i + 1]);
      if (dist < minDist) {
        minDist = dist;
        insertIndex = i + 1;
      }
    }

    window.waypoints.splice(insertIndex, 0, newPoint);
    updateWaypoints();
  });

  // ADD MARRKERS FOR DEPARTURE AND ARRIVAL

  // const depICAO = window.flight_plan_data?.DEPARTURE_ICAO_CITY || "Departure";
  // const arrICAO = window.flight_plan_data?.ARRIVAL_ICAO_CITY || "Arrival";

  // // Create departure marker with custom icon
  // const depMarker = L.marker(depCoords, {
  //   draggable: false,
  //   title: depICAO,
  //   zIndexOffset: 7000,
  //   icon: L.divIcon({
  //     className: "departure-marker",
  //     html: '<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
  //     iconSize: [20, 20],
  //     iconAnchor: [10, 10],
  //   }),
  // })
  //   .addTo(routeMap)
  //   .bindPopup(depICAO, { closeButton: false });

  // // Create arrival marker with custom icon
  // const arrMarker = L.marker(arrCoords, {
  //   draggable: false,
  //   title: arrICAO,
  //   zIndexOffset: 7000,
  //   icon: L.divIcon({
  //     className: "arrival-marker",
  //     html: '<div style="background-color: #F44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
  //     iconSize: [20, 20],
  //     iconAnchor: [10, 10],
  //   }),
  // })
  //   .addTo(routeMap)
  //   .bindPopup(arrICAO, { closeButton: false });

  // routeMarkers.push(depMarker, arrMarker);

  // Add tooltip to explain right-click functionality
  waypointMarkers.forEach((marker) => {
    marker.bindTooltip("Right-click to remove waypoint", {
      direction: "top",
      offset: [0, -10],
    });
  });
}

// Helper function to calculate point to segment distance
function pointToSegmentDistance(p, v1, v2) {
  const x = p[0],
    y = p[1];
  const x1 = v1[0],
    y1 = v1[1];
  const x2 = v2[0],
    y2 = v2[1];

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;

  if (len_sq !== 0) param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function addWaypoints(waypoints) {
  if (!Array.isArray(window.waypoints)) {
    window.waypoints = [];
  }
  // Ensure waypoints is an array of arrays (e.g., [[lat, lon], ...])
  if (!Array.isArray(waypoints[0])) {
    waypoints = [waypoints];
  }
  window.waypoints = window.waypoints.concat(waypoints);

  // Remove duplicates
  window.waypoints = window.waypoints.filter((wp, idx, arr) => arr.findIndex((p) => p[0] === wp[0] && p[1] === wp[1]) === idx);

  // console.log("HERE IN addWaypoints: WAYPOINTS");
  // console.log(window.waypoints);
}

// Function to update waypoint markers and route line
function updateWaypoints() {
  // Update existing waypoint markers. This script is only run on every click!

  waypointMarkers.forEach((marker) => routeMap.removeLayer(marker));
  waypointMarkers = [];

  // Update route line
  routeLine.setLatLngs(window.waypoints);

  // Create new waypoint markers (skip first and last points which are airports)
  for (let i = 1; i < window.waypoints.length - 1; i++) {
    const marker = L.marker(window.waypoints[i], {
      draggable: true,
      icon: L.divIcon({
        className: "waypoint-icon",
        html: '<div style="background-color: #FFFFFF; width: 13px; height: 13px; border-radius: 50%; border: 1px solid black;"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      zIndexOffset: 3000,
    }).addTo(routeMap);

    marker.on("dragend", function () {
      // Call updateRoute without adjusting zoom to prevent unwanted zoom changes
      updateRoute(false);
      console.log("TIME");
      console.log(time_dep);
      UpdateFlightInfoFields(time_dep, false, false); // initialize=false, adjustZoom=false
      console.log("   >DRAG and RELEASE");
    });

    // Add drag and hover handlers
    marker.on("drag", function (e) {
      window.waypoints[i] = [e.latlng.lat, e.latlng.lng];
      routeLine.setLatLngs(window.waypoints);
    });

    marker.on("contextmenu", function () {
      // Remove waypoint on right click
      window.waypoints.splice(i, 1);
      console.log("   >REMOVE WAYPOINT");
      updateWaypoints();
      UpdateFlightInfoFields(time_dep, false, false); // initialize=false, adjustZoom=false
    });

    waypointMarkers.push(marker);
    // console.log("Run on click!");
    // console.log(window.waypoints);
    // Update flightinfo when a new marker is created
    // UpdateFlightInfoFields(time_dep, false);
  }
}

function toggleFullscreen() {
  const mapContainer = document.getElementById("map-container");
  const fullscreenBtn = document.getElementById("fullscreen-btn");

  if (!mapContainer || !fullscreenBtn) {
    console.error("Required elements not found for fullscreen toggle");
    return;
  }

  const enterIcon = fullscreenBtn.querySelector(".fullscreen-enter");
  const exitIcon = fullscreenBtn.querySelector(".fullscreen-exit");

  if (!enterIcon || !exitIcon) {
    console.error("Fullscreen icons not found");
    return;
  }

  const isFullscreen =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    mapContainer.classList.contains("mobile-fullscreen");

  if (!isFullscreen) {
    // Enter fullscreen
    if (mapContainer.requestFullscreen) {
      mapContainer.requestFullscreen().catch(() => {});
    } else if (mapContainer.webkitRequestFullscreen) {
      mapContainer.webkitRequestFullscreen();
    } else if (mapContainer.mozRequestFullScreen) {
      mapContainer.mozRequestFullScreen();
    } else if (mapContainer.msRequestFullscreen) {
      mapContainer.msRequestFullscreen();
    } else {
      // Fallback for iPhone / mobile fullscreen
      mapContainer.classList.add("mobile-fullscreen");
      document.body.classList.add("no-scroll");
    }
    enterIcon.style.display = "none";
    exitIcon.style.display = "inline";
    fullscreenBtn.style.position = "fixed";
    fullscreenBtn.style.zIndex = "2000";
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else {
      mapContainer.classList.remove("mobile-fullscreen");
      document.body.classList.remove("no-scroll");
    }
    enterIcon.style.display = "inline";
    exitIcon.style.display = "none";
    fullscreenBtn.style.position = "absolute";
    fullscreenBtn.style.zIndex = "1000";
  }

  // Ensure map resizes properly
  setTimeout(() => {
    if (window.routeMap) window.routeMap.invalidateSize();
  }, 300);
}

// Handle fullscreen changes from any source
function handleFullscreenChange() {
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  if (!fullscreenBtn) return;

  const enterIcon = fullscreenBtn.querySelector(".fullscreen-enter");
  const exitIcon = fullscreenBtn.querySelector(".fullscreen-exit");
  if (!enterIcon || !exitIcon) return;

  const isFullscreen =
    document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

  if (!isFullscreen) {
    enterIcon.style.display = "inline";
    exitIcon.style.display = "none";
    fullscreenBtn.style.position = "absolute";
    fullscreenBtn.style.zIndex = "1000";
  } else {
    enterIcon.style.display = "none";
    exitIcon.style.display = "inline";
    fullscreenBtn.style.position = "fixed";
    fullscreenBtn.style.zIndex = "2000";
  }
}

// Listen for fullscreen changes
document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
document.addEventListener("mozfullscreenchange", handleFullscreenChange);
document.addEventListener("MSFullscreenChange", handleFullscreenChange);

// Initialize map and route on DOM load
// document.addEventListener('DOMContentLoaded', () => {
//     initRouteMap();
//     updateRoute();

//     // Handle tab clicks if present
//     document.querySelectorAll('.tablinks').forEach(tab => {
//         tab.addEventListener('click', () => {
//             console.log('Tab clicked');
//             setTimeout(() => {
//                 routeMap.invalidateSize();
//                 updateRoute();
//             }, 100);
//         });
//     });
// });

// Simple example with a few major airports
// const airportData = {
//   "type": "FeatureCollection",
//   "features": [
//     { "type": "Feature", "properties": { "name": "Schiphol Airport (EHAM)" }, "geometry": { "type": "Point", "coordinates": [4.763385, 52.310539] } },
//     { "type": "Feature", "properties": { "name": "Amsterdam Lelystad (EHLE)" }, "geometry": { "type": "Point", "coordinates": [5.525, 52.460] } },
//     { "type": "Feature", "properties": { "name": "Rotterdam The Hague (EHDR)" }, "geometry": { "type": "Point", "coordinates": [4.435, 51.950] } }
//   ]
// };

// Create GeoJSON from aerodrome data
function createAirportGeoJSON(df) {
  const features = [];

  // console.log('Creating airport GeoJSON from data:', df);
  if (df) {
    for (const row of df) {
      // console.log('Processing row:', row);
      // Convert Proxy to regular object
      //
      const data = {
        lat: row.lat?.valueOf(),
        lon: row.lon?.valueOf(),
        city_icao: row.city_icao?.valueOf(),
        icao: row.icao?.valueOf(),
        use: row.use?.valueOf(),
        country: row.country?.valueOf(),
        runways: String(row.runways?.valueOf() || "").toLowerCase(),
        AERODROME_CTR: row.AERODROME_CTR?.valueOf(),
        elevation_aerodrome: row.elevation_aerodrome?.valueOf(),
      };

      // Determine runway type from runway string
      if (data.lat && data.lon && data.city_icao) {
        // console.log('Valid coordinates found:', data.lat, data.lon, data.city_icao, data.use);
        features.push({
          type: "Feature",
          properties: {
            name: data.city_icao,
            icao: data.icao,
            ctr: data.AERODROME_CTR ? true : false,
            elevation: data.elevation_aerodrome || "N/A",
            use: data.use || "public",
            runways: data.runways,
            runway_number: data.runway_number,
            country: data.country,
          },
          geometry: {
            type: "Point",
            coordinates: [parseFloat(data.lon), parseFloat(data.lat)],
          },
        });
      }
    }
  }

  return {
    type: "FeatureCollection",
    features: features,
  };
}

function extractRunwayNumbers(runwaysString) {
  if (typeof runwaysString !== "string") return [];

  // Extract ALL occurrences of number: [...]
  // Supports 'number' or "number"
  const matches = runwaysString.match(/["']number["']\s*:\s*\[([^\]]*)\]/g);

  if (!matches) return [];

  let allNumbers = [];

  for (const item of matches) {
    // Extract inside brackets of this specific occurrence
    const inside = item.match(/\[([^\]]*)\]/);
    if (!inside) continue;

    // Extract all quoted elements inside the brackets
    const nums = inside[1].match(/["']([^"']+)["']/g);
    if (!nums) continue;

    // Clean + convert to integer
    nums.forEach((n) => {
      const clean = n.replace(/['"]/g, "").trim();
      const val = parseInt(clean, 10);
      if (!isNaN(val)) allNumbers.push(val);
    });
  }

  // Fallback only if *no valid runway numbers* found
  if (allNumbers.length === 0) return [45, 315];

  return allNumbers;
}

function selectRunwayIndices(runwayNumbers) {
  if (runwayNumbers.length >= 6) return [0, 3, 5];
  if (runwayNumbers.length >= 4) return [0, 3];
  if (runwayNumbers.length >= 2) return [0];
  return []; // not enough info
}

function buildRunwayRects(runwayNumbers, runwayColor) {
  const idx = selectRunwayIndices(runwayNumbers);
  if (idx.length === 0) return ""; // nothing to draw

  return idx
    .map((i) => {
      const heading = runwayNumbers[i] * 10; // convert to degrees
      return `
                <rect x="14" y="4" width="4" height="24"
                      fill="${runwayColor}"
                      stroke="#333" stroke-width="1"
                      fill-opacity="0.8" stroke-opacity="0.8"
                      transform="rotate(${heading} 16 16)" />
            `;
    })
    .join("\n");
}

function toggleAirportLayer() {
  // console.log('Toggle airport layer called');
  if (document.getElementById("aviation-toggle").checked) {
    if (airportLayer) return; // Layer already exists
    if (!airportData) return; // No data to display

    console.log("Adding airport layer to map");
    // Create a feature group to hold markers and circles with high z-index
    airportLayer = L.featureGroup({
      zIndex: 1000, // Ensure airport layer stays on top of everything
    }).addTo(routeMap);

    // Add GeoJSON features
    L.geoJSON(airportData, {
      pointToLayer: function (feature, latlng) {
        const props = feature.properties;
        const isMilitary = props.use.toLowerCase() === "military";
        let runwayColor = "#2196F3"; // Blue for others;
        let circleColor = "#FFFFFF"; // White for others;
        let runwayType = props.runways.includes("asphalt") ? "Hard" : props.runways.includes("grass") ? "Soft" : "Unknown";
        let runwayNumbers = extractRunwayNumbers(props.runways);
        let fillOpacity = 0.3;

        const popupContent = `
                    <b>${props.name}</b>
                    <div style='width: 200px; padding: 10px; border: 1px solid lightgrey; border-radius: 5px; background-color: #f9f9f9;'>
                        <b>Country:</b> ${props.country}<br>
                        <b>Type:</b> ${props.use}<br>
                        <b>CTR:</b> ${props.ctr || isMilitary ? "Yes" : "No"}<br>
                        <b>Runway Elevation:</b> ${props.elevation} ft<br>
                        <b>Runway Surface:</b> ${runwayType}
                    </div>
                `;

        if (isMilitary) {
          circleColor = "#8B0000"; // Red for military
          fillOpacity = 0.15;
        } else if (props.ctr || props.runways.includes("asphalt")) {
          circleColor = "#FF69B4"; // pink for CTR
          fillOpacity = 0.15;
        } else {
          circleColor = "#FFFFFF"; // Blue for other
        }

        if (runwayType === "Hard") {
          runwayColor = "#666666"; //Gray for hard/asphalt
        } else if (runwayType === "Soft") {
          runwayColor = "#8BC34A"; //Green for soft/grass
        } else {
          runwayColor = "#2196F3"; //Blue for other
        }

        const runwayRects = buildRunwayRects(runwayNumbers, runwayColor);
        const airstripIcon = L.divIcon({
          className: "airstrip-marker-icon",
          html: `
                        <svg width="32" height="32" viewBox="0 0 32 32">
                            <circle cx="16" cy="16" r="8"
                                    fill="${circleColor}"
                                    stroke="#333"
                                    stroke-width="1.5"
                                    fill-opacity="0.9"
                                    stroke-opacity="0.8"/>
                            ${runwayRects}
                        </svg>
                    `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Create marker with custom icon
        const marker = L.marker(latlng, {
          title: props.name,
          icon: airstripIcon, //markerIcon,
          pane: "markerPane", // Use marker pane to ensure markers stay on top
          zIndexOffset: 4000, // High z-index offset to stay above other markers
        }).bindPopup(popupContent);

        // Add to feature group
        airportLayer.addLayer(marker);

        // If it's a CTR or isMilitary, add a circle with color based on use
        if (props.ctr || isMilitary) {
          const circle = L.circle(latlng, {
            radius: 14900, // 5NM in meters
            color: circleColor,
            weight: 1,
            // opacity: 0.3,
            fillOpacity: fillOpacity,
            pane: "markerPane", // Use marker pane to ensure circles stay on top
          });
          circle.bindPopup(popupContent);
          airportLayer.addLayer(circle);
        }
        return marker;
      },
    });
  } else {
    if (airportLayer) {
      routeMap.removeLayer(airportLayer);
      airportLayer = null;
      console.log("Removed airport layer");
    }
  }
}

function loadAirspaceData() {
  // Return the airspaces data from Python (attached to window)
  if (window.airspaces) {
    return window.airspaces;
  } else {
    console.error("⚠️ No airspace data is available for this region.");
    js.window.alert("⚠️ No airspace data is available for this region.");
    return null;
  }
}

// Global variable to store all airspace layers
let airspaceLayerGroups = {};

async function toggleAirspaceLayer() {
  const airspaceCheckbox = document.getElementById("airspace-toggle");
  const TMZCheckbox = document.getElementById("TMZ-toggle");
  const CTACheckbox = document.getElementById("CTA_TMA-toggle");
  const dangerCheckbox = document.getElementById("danger-toggle");
  const prohibitedCheckbox = document.getElementById("prohibited-toggle");

  if (!airspaceCheckbox) return;

  if (!window.airspaces) {
    console.error("No airspace data available");
    // airspaceCheckbox.checked = false;
    TMZCheckbox.checked = false;
    CTACheckbox.checked = false;
    dangerCheckbox.checked = false;
    prohibitedCheckbox.checked = false;
    return;
  }

  // Always clear existing layers first
  Object.values(airspaceLayerGroups).forEach((layer) => {
    if (routeMap.hasLayer(layer)) {
      routeMap.removeLayer(layer);
    }
  });
  airspaceLayerGroups = {};

  if (airspaceCheckbox.checked) {
    console.log("Adding all airspace layers");
    // Create new layers
    const altitudeValue = parseInt(document.getElementById("airspace-altitude").value) || 1500;
    const layers = createAirspaceLayer(window.airspaces, routeMap, altitudeValue);

    // Store and add each layer by type
    if (layers) {
      Object.entries(layers).forEach(([type, layer]) => {
        if (layer) {
          airspaceLayerGroups[type] = layer;
          layer.addTo(routeMap);
        }
      });
    }
  } else {
    console.log("Removed all airspace layers");
  }

  // Sync TMZ checkbox state with main airspace toggle
  if (!TMZCheckbox.checked) {
    // TMZCheckbox.checked = airspaceCheckbox.checked;
    toggleTMZLayer();
  }

  // Sync other checkboxes with main airspace toggle
  if (!CTACheckbox.checked) {
    // CTACheckbox.checked = airspaceCheckbox.checked;
    toggleCTATMALayer();
  }

  if (!dangerCheckbox.checked) {
    // dangerCheckbox.checked = airspaceCheckbox.checked;
    toggleDangerLayer();
  }

  if (!prohibitedCheckbox.checked) {
    // prohibitedCheckbox.checked = airspaceCheckbox.checked;
    toggleProhibitedLayer();
  }
}

async function toggleCTATMALayer() {
  const checkbox = document.getElementById("CTA_TMA-toggle");
  if (!checkbox || !window.airspaces) return;

  const filtered = {};
  Object.entries(window.airspaces).forEach(([key, space]) => {
    const at = (space.area_type || "").toLowerCase();
    if (at.includes("cta") || at.includes("tma")) {
      filtered[key] = space;
    }
  });

  if (airspaceLayerGroups.CTA_TMA && routeMap.hasLayer(airspaceLayerGroups.CTA_TMA)) {
    routeMap.removeLayer(airspaceLayerGroups.CTA_TMA);
    delete airspaceLayerGroups.CTA_TMA;
  }

  if (checkbox.checked) {
    const altitudeValue = parseInt(document.getElementById("airspace-altitude").value) || 1500;
    const layers = createAirspaceLayer(filtered, routeMap, altitudeValue);
    if (layers && layers.CTA_TMA) {
      airspaceLayerGroups.CTA_TMA = layers.CTA_TMA;
      layers.CTA_TMA.addTo(routeMap);
    }
  } else {
    console.log("Removed CTA/TMA layer");
  }
}

async function toggleDangerLayer() {
  const checkbox = document.getElementById("danger-toggle");
  if (!checkbox || !window.airspaces) return;

  const filtered = {};
  Object.entries(window.airspaces).forEach(([key, space]) => {
    const at = (space.area_type || "").toLowerCase();
    if (at.includes("danger")) {
      filtered[key] = space;
    }
  });

  if (airspaceLayerGroups.danger && routeMap.hasLayer(airspaceLayerGroups.danger)) {
    routeMap.removeLayer(airspaceLayerGroups.danger);
    delete airspaceLayerGroups.danger;
  }

  if (checkbox.checked) {
    const altitudeValue = parseInt(document.getElementById("airspace-altitude").value) || 1500;
    const layers = createAirspaceLayer(filtered, routeMap, altitudeValue);
    if (layers && layers.danger) {
      airspaceLayerGroups.danger = layers.danger;
      layers.danger.addTo(routeMap);
    }
  } else {
    console.log("Removed danger layer");
  }
}

async function toggleProhibitedLayer() {
  const checkbox = document.getElementById("prohibited-toggle");
  if (!checkbox || !window.airspaces) return;

  const filtered = {};
  Object.entries(window.airspaces).forEach(([key, space]) => {
    const at = (space.area_type || "").toLowerCase();
    if (at.includes("prohibited")) {
      filtered[key] = space;
    }
  });

  if (airspaceLayerGroups.prohibited && routeMap.hasLayer(airspaceLayerGroups.prohibited)) {
    routeMap.removeLayer(airspaceLayerGroups.prohibited);
    delete airspaceLayerGroups.prohibited;
  }

  if (checkbox.checked) {
    const altitudeValue = parseInt(document.getElementById("airspace-altitude").value) || 1500;
    const layers = createAirspaceLayer(filtered, routeMap, altitudeValue);
    if (layers && layers.prohibited) {
      airspaceLayerGroups.prohibited = layers.prohibited;
      layers.prohibited.addTo(routeMap);
    }
  } else {
    console.log("Removed prohibited layer");
  }
}

async function toggleTMZLayer() {
  const TMZCheckbox = document.getElementById("TMZ-toggle");
  if (!TMZCheckbox || !window.airspaces) return;

  // Filter and process only TMZ areas
  const tmzAirspaces = {};
  Object.entries(window.airspaces).forEach(([key, space]) => {
    if (space.area_type && space.area_type.toLowerCase().includes("tmz")) {
      tmzAirspaces[key] = space;
    }
  });

  // Always remove existing TMZ layer first
  if (airspaceLayerGroups.TMZ && routeMap.hasLayer(airspaceLayerGroups.TMZ)) {
    routeMap.removeLayer(airspaceLayerGroups.TMZ);
    delete airspaceLayerGroups.TMZ;
  }

  if (TMZCheckbox.checked) {
    console.log("Adding TMZ layer");
    const altitudeValue = parseInt(document.getElementById("airspace-altitude").value) || 1500;
    const layers = createAirspaceLayer(tmzAirspaces, routeMap, altitudeValue);

    // Only add TMZ layer if it exists
    if (layers && layers.TMZ) {
      airspaceLayerGroups.TMZ = layers.TMZ;
      layers.TMZ.addTo(routeMap);
    }
  } else {
    console.log("Removed TMZ layer");
  }
}

// Initialize all airspace feature groups
function initAirspaceLayerGroups(routeMap) {
  const layers = {
    CTR_CTZ: L.featureGroup().addTo(routeMap),
    CTA_TMA: L.featureGroup().addTo(routeMap),
    ATZ: L.featureGroup().addTo(routeMap),
    MATZ: L.featureGroup().addTo(routeMap),
    TMZ: L.featureGroup().addTo(routeMap),
    TRA: L.featureGroup().addTo(routeMap),
    prohibited: L.featureGroup().addTo(routeMap),
    danger: L.featureGroup().addTo(routeMap),
    restricted: L.featureGroup().addTo(routeMap),
    parachuting: L.featureGroup().addTo(routeMap),
    gliding: L.featureGroup().addTo(routeMap),
    various: L.featureGroup().addTo(routeMap),
    // NOTAM: L.featureGroup().addTo(routeMap),
    // NOTAM_ENROUTE: L.featureGroup().addTo(routeMap),
    // Optional runway layers
    // hard_runway: L.featureGroup().addTo(routeMap),
    // soft_runway: L.featureGroup().addTo(routeMap),
    // private_runway: L.featureGroup().addTo(routeMap)
  };

  const area_types = {
    CTR_CTZ: {
      markertype: "polygon",
      fill: true,
      fillColor: "#FF69B4",
      edgeColor: "#FF69B4",
      opacity: 0.3,
      weight: 1,
      layer: layers.CTR_CTZ,
      zIndex: 300,
    },
    CTA_TMA: {
      markertype: "polygon",
      fill: true,
      fillColor: "#000000",
      edgeColor: "#696969",
      opacity: 0.1,
      weight: 1.5,
      layer: layers.CTA_TMA,
      zIndex: 100,
    },
    ATZ: { markertype: "polygon", fill: true, fillColor: "#FF69B4", edgeColor: "#FF69B4", opacity: 0.15, weight: 1, layer: layers.ATZ, zIndex: 300 },
    MATZ: { markertype: "circle", fill: true, fillColor: "#8B0000", edgeColor: "#8B0000", opacity: 0.15, weight: 1, layer: layers.MATZ, zIndex: 300 },
    TMZ: { markertype: "polygon", fill: true, fillColor: "#DA70D6", edgeColor: "#DA70D6", opacity: 0.1, weight: 1.3, layer: layers.TMZ, zIndex: 10 },
    TRA: { markertype: "polygon", fill: true, fillColor: "#FA8072", edgeColor: "#FA8072", opacity: 0.3, weight: 1, layer: layers.TRA, zIndex: 100 },
    prohibited: {
      markertype: "polygon",
      fill: true,
      fillColor: "#8B0000",
      edgeColor: "#8B0000",
      opacity: 0.3,
      weight: 1,
      layer: layers.prohibited,
      zIndex: 3000,
    },
    danger: {
      markertype: "polygon",
      fill: true,
      fillColor: "#8B0000",
      edgeColor: "#8B0000",
      opacity: 0.3,
      weight: 1,
      layer: layers.danger,
      zIndex: 50,
    },
    restricted: {
      markertype: "polygon",
      fill: true,
      fillColor: "#FF9248",
      edgeColor: "#FF9248",
      opacity: 0.3,
      weight: 1,
      layer: layers.restricted,
      zIndex: 3000,
    },
    gliding: {
      markertype: "polygon",
      fill: true,
      fillColor: "#06402B",
      edgeColor: "#06402B",
      opacity: 0.3,
      weight: 1,
      layer: layers.gliding,
      zIndex: 1000,
    },
    parachuting: {
      markertype: "circle",
      fill: true,
      fillColor: "#0096FF",
      edgeColor: "#0096FF",
      opacity: 0.2,
      weight: 1,
      layer: layers.parachuting,
      zIndex: 2500,
    },
    various: {
      markertype: "polygon",
      fill: true,
      fillColor: "#696969",
      edgeColor: "#696969",
      opacity: 0.3,
      weight: 1,
      layer: layers.various,
      zIndex: 300,
    },
    // NOTAM: { markertype: "marker", fill: false, fillColor: "#EFC238", edgeColor: "#EFC238", opacity: 0, weight: 3, layer: layers.NOTAM },
    // NOTAM_ENROUTE: { markertype: "marker", fill: false, fillColor: "#EFC238", edgeColor: "#EFC238", opacity: 0, weight: 3, layer: layers.NOTAM_ENROUTE },
    // hard_runway: { markertype: "circle", fill: true, fillColor: "#696969", edgeColor: "#696969", opacity: 0.5, weight: 1.1, layer: layers.hard_runway },
    // soft_runway: { markertype: "circle", fill: true, fillColor: "#228B22", edgeColor: "#228B22", opacity: 0.5, weight: 1.1, layer: layers.soft_runway },
    // private_runway: { markertype: "circle", fill: true, fillColor: "#ff8c00", edgeColor: "#228B22", opacity: 0.6, weight: 1.1, layer: layers.private_runway }
  };

  return { layers, area_types };
}

function createAirspaceLayer(airspaces, routeMap, maxAltitude = 1500) {
  if (!airspaces) return null;
  // Initialize all layers
  const { layers, area_types } = initAirspaceLayerGroups(routeMap);
  // Keep track of currently highlighted layer
  let highlightedLayer = null;

  // Function to handle highlighting
  function highlightAirspace(layer) {
    // Reset previous highlight if exists
    if (highlightedLayer) {
      highlightedLayer.setStyle({
        weight: highlightedLayer.originalStyle.weight,
        opacity: highlightedLayer.originalStyle.opacity,
        fillOpacity: highlightedLayer.originalStyle.fillOpacity,
        color: highlightedLayer.originalStyle.color,
        fillColor: highlightedLayer.originalStyle.fillColor,
      });
    }

    // Store original style
    layer.originalStyle = {
      weight: layer.options.weight,
      opacity: layer.options.opacity,
      fillOpacity: layer.options.fillOpacity,
      color: layer.options.color,
      fillColor: layer.options.fillColor,
    };

    // Apply highlight style
    layer.setStyle({
      weight: layer.originalStyle.weight * 2,
      opacity: 0.8,
      fillOpacity: 0.5,
      color: "#FFFF00", // Yellow outline for highlighted airspace
    });

    highlightedLayer = layer;

    // Bring to front
    if (layer.bringToFront) {
      layer.bringToFront();
    }
  }

  Object.values(airspaces).forEach((airspace) => {
    if (!airspace.coordinates || airspace.coordinates.length === 0) return;

    const AL = clean_altitude(airspace.altitude_lower);
    const AH = clean_altitude(airspace.altitude_higher);
    const area_type = (airspace.area_type || "").toLowerCase();

    let key = "various";
    let flagToMap = true;
    let radius = 14900;

    // Determine type and flags
    if (area_type.includes("ctr") || area_type.includes("ctz")) {
      key = "CTR_CTZ";
      radius = 14900;
    } else if (area_type.includes("cta") || area_type.includes("tma")) {
      key = "CTA_TMA";
      [flagToMap] = altitude_restriction(AL, AH, maxAltitude);
    } else if (area_type.includes("atz") && !area_type.includes("military")) {
      key = "ATZ";
    } else if (area_type.includes("atz") && area_type.includes("military")) {
      key = "MATZ";
      radius = 14900;
    } else if (area_type.includes("tmz")) {
      key = "TMZ";
      [flagToMap] = altitude_restriction(AL, AH, maxAltitude);
    } else if (area_type.includes("prohibited")) {
      key = "prohibited";
      radius = 5000;
    } else if (area_type.includes("danger")) {
      key = "danger";
      [flagToMap] = altitude_restriction(AL, AH, maxAltitude);
      radius = 2000;
    } else if (area_type.includes("restricted") && !area_type.includes("notam")) {
      key = "restricted";
      [flagToMap] = altitude_restriction(AL, AH, maxAltitude);
    } else if (area_type.includes("notam")) {
      key = "NOTAM";
      flagToMap = false;
    } else if (area_type.includes("temporary reserved")) {
      key = "TRA";
      [flagToMap] = altitude_restriction(AL, AH, maxAltitude);
    } else if (area_type.includes("parachuting")) {
      key = "parachuting";
      radius = 4000;
    } else if (area_type.includes("gliding")) {
      key = "gliding";
      radius = 6000;
    } else if (area_type.includes("laser")) {
      key = "laser";
      flagToMap = false;
      radius = 2000;
    } else if (area_type.includes("gas venting")) {
      key = "laser";
      flagToMap = false;
      radius = 2000;
    } else {
      key = "various";
      [flagToMap] = altitude_restriction(AL, AH, maxAltitude);
      radius = 2000;
    }

    if (!flagToMap) return;
    // if (key === "various") return;

    const popupContent = `
            <div style="font-size: 0.9em;">
                <b>${airspace.name}</b>
                <div style='width:250px; padding:10px; border:1px solid lightgrey; border-radius:5px; background-color:#f9f9f9;'>
                    <b>${airspace.area_type_general}</b><br>
                    <b>Altitude:</b> ${airspace.altitude_lower}${AH ? ` to ${AH} feet` : ""}<br>
                </div>
            </div>
        `;

    const coords = airspace.coordinates.map((c) => [c[0], c[1]]);
    const areaLayer = area_types[key];
    let typeToMap = areaLayer.markertype;
    if (coords.length === 1 && key !== "ATZ") {
      typeToMap = "circle";
    }
    let layer;

    if (typeToMap === "marker" || typeToMap === "circle") {
      coords.forEach((latlon) => {
        if (typeToMap === "marker") {
          layer = L.marker(latlon);
        } else {
          layer = L.circle(latlon, {
            radius: radius,
            color: areaLayer.edgeColor,
            fillColor: areaLayer.fillColor,
            fillOpacity: areaLayer.opacity,
            weight: areaLayer.weight,
            zIndex: areaLayer.zIndex || 400,
          });
        }
        // Add click handler
        layer.on("click", function (e) {
          highlightAirspace(this);
        });
        layer.bindPopup(popupContent).addTo(areaLayer.layer);
      });
    } else if (typeToMap === "polygon") {
      layer = L.polygon(coords, {
        color: areaLayer.edgeColor,
        fillColor: areaLayer.fillColor,
        fillOpacity: areaLayer.opacity,
        weight: areaLayer.weight,
        dashArray: areaLayer.dash || null,
        zIndex: areaLayer.zIndex || 300,
      });
      // Add click handler
      layer.on("click", function (e) {
        highlightAirspace(this);
      });
      layer.bindPopup(popupContent).addTo(areaLayer.layer);
    }
  });

  return layers; // return all layer groups separately
}

document.addEventListener("DOMContentLoaded", () => {
  const airspaceCheckbox = document.getElementById("airspace-toggle");
  if (airspaceCheckbox) {
    airspaceCheckbox.addEventListener("change", toggleAirspaceLayer);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Airport checkbox
  const airportCheckbox = document.getElementById("aviation-toggle");
  if (airportCheckbox) {
    airportCheckbox.addEventListener("change", toggleAirportLayer);
  } else {
    console.error("Airport checkbox not found in DOM!");
  }

  // Altitude input
  const altitudeInput = document.getElementById("airspace-altitude");
  if (altitudeInput) altitudeInput.addEventListener("change", toggleAirspaceLayer);

  // Airspace checkbox
  const airspaceCheckbox = document.getElementById("airspace-toggle");
  if (airspaceCheckbox) airspaceCheckbox.checked = false;
  if (airspaceCheckbox) airspaceCheckbox.addEventListener("change", toggleAirspaceLayer);

  // TMZ CHECKBOX
  const TMZCheckbox = document.getElementById("TMZ-toggle");
  if (TMZCheckbox) TMZCheckbox.checked = false;

  // CTA CHECKBOX
  const CTACheckbox = document.getElementById("CTA_TMA-toggle");
  if (CTACheckbox) CTACheckbox.checked = false;

  // DANGER CHECKBOX
  const dangerCheckbox = document.getElementById("danger-toggle");
  if (dangerCheckbox) dangerCheckbox.checked = false;

  // PROHIBITED CHECKBOX
  const prohibitedCheckbox = document.getElementById("prohibited-toggle");
  if (prohibitedCheckbox) prohibitedCheckbox.checked = false;

  if (TMZCheckbox) {
    // TMZCheckbox.checked = airspaceCheckbox.checked;
    toggleTMZLayer();
  }
  if (TMZCheckbox) {
    TMZCheckbox.addEventListener("change", toggleTMZLayer);
  }
  if (CTACheckbox) {
    // CTACheckbox.checked = airspaceCheckbox.checked;
    toggleCTATMALayer();
  }
  if (CTACheckbox) CTACheckbox.addEventListener("change", toggleCTATMALayer);

  if (dangerCheckbox) {
    // dangerCheckbox.checked = airspaceCheckbox.checked;
    toggleDangerLayer();
  }
  if (dangerCheckbox) dangerCheckbox.addEventListener("change", toggleDangerLayer);

  if (prohibitedCheckbox) {
    // prohibitedCheckbox.checked = airspaceCheckbox.checked;
    toggleProhibitedLayer();
  }
  if (prohibitedCheckbox) prohibitedCheckbox.addEventListener("change", toggleProhibitedLayer);

  // Expose updateRoute globally
  window.updateRoute = updateRoute;
});

// Add save button functionality
// document.getElementById('save_fields_btn')?.addEventListener('click', () => {
//   if (pyscriptReady && window.save_flightplan) {
//     try {
//       // Get flightplan name
//       const flightplanName = document.getElementById('FLIGHTPLAN')?.value;
//       if (!flightplanName) { window.alert("ℹ️ Please enter a flight plan name before saving.");
//         return;
//       }

//       // Save flightplan data to JSON files
//       window.save_flightplan();
//       window.alert("✅ Flight plan saved successfully!");

//     } catch (error) {
//       console.error("Error saving flightplan data:", error);
//     }
//   }
// });

// Haversine distance in km
function haversineDistance(coord1, coord2) {
  const R = 6371;
  const lat1 = (coord1[0] * Math.PI) / 180;
  const lon1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[0] * Math.PI) / 180;
  const lon2 = (coord2[1] * Math.PI) / 180;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function openAerodromeMap(fname) {
  // Get latlon for departure/ arrival
  const latlon = window.flight_plan_data[`${fname}_LATLON`];
  const icao = window.flight_plan_data[`${fname}_ICAO`];

  // Open in google maps
  if (latlon && latlon[0] != null && latlon[1] != null) {
    const [lat, lon] = [parseFloat(latlon[0]), parseFloat(latlon[1])];
    const url = `https://www.google.com/maps?q=${lat},${lon}&z=14`;
    // const url = `https://metar-taf.com/airport/${icao}`;
    window.open(url, "_blank");
  } else {
    console.log(`No coordinates available for ${fname} aerodrome`);
  }
}

// Only adjust zoom if explicitly requested (prevents zoom changes during waypoint dragging)
function adjustZoomMap(fname) {
  console.log("func> adjustZoomMap()");
  let bounds = null;
  if (window.waypoints && window.waypoints.length >= 1) {
    bounds = L.latLngBounds(window.waypoints);
  } else if ((window.flight_plan_data && window.flight_plan_data["DEPARTURE_LATLON"]) || window.flight_plan_data["ARRIVAL_LATLON"]) {
    bounds = L.latLngBounds([window.flight_plan_data["DEPARTURE_LATLON"], window.flight_plan_data["ARRIVAL_LATLON"]]);
  }
  if (bounds) {
    routeMap.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 7,
    });
  }
}

// Function to fetch and display METAR stations on map
// async function addMetarStationsToMap() {
//   console.log("> func: addMetarStationsToMap()");

//   if (!routeMap) {
//     console.warn("Map not initialized");
//     return;
//   }

//   // Remove existing METAR layer if present
//   if (metarLayer) {
//     routeMap.removeLayer(metarLayer);
//     metarLayer = null;
//   }

//   // Get METAR station data
//   const metarStations = getMetarStations();
//   if (!metarStations) {
//     console.warn("No METAR stations available");
//     return;
//   }

//   console.log("METAR Stations:", metarStations);

//   // Create feature group for METAR markers
//   metarLayer = L.featureGroup({
//     zIndex: 5000, // High z-index to stay above other layers
//   }).addTo(routeMap);

//   // Loop through each METAR station
//   const icaoKeys = Object.keys(metarStations);

//   for (const icao of icaoKeys) {
//     try {
//       const station = metarStations[icao];
//       const { lat, lon, country, name } = station;

//       if (!lat || !lon) {
//         console.warn(`Invalid coordinates for ${icao}`);
//         continue;
//       }

//       // Fetch METAR data for this station
//       console.log(`Fetching METAR for ${icao}...`);
//       const metarData = await fetch_metar(icao);

//       if (!metarData || metarData.length < 2) {
//         console.warn(`No METAR data for ${icao}`);
//         continue;
//       }

//       const metar_icao = metarData[0];
//       const stationName = metarData[1];

//       // Create METAR object
//       const metarObject = new Metar(stationName, metar_icao, lat, lon);

//       // Create custom icon using VFR icon
//       const metarIcon = L.divIcon({
//         className: "metar-station-icon",
//         html: `
//           <div style="position: relative; width: 40px; height: 40px;">
//             <img src="${metarObject.icon_vfr}"
//                  alt="${metarObject.flightCategory}"
//                  style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"
//                  title="${icao} - ${metarObject.flightCategory}">
//             <div style="position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
//                         background: rgba(0,0,0,0.7); color: white; padding: 1px 3px;
//                         border-radius: 3px; font-size: 8px; font-weight: bold; white-space: nowrap;">
//               ${icao}
//             </div>
//           </div>
//         `,
//         iconSize: [40, 40],
//         iconAnchor: [20, 20],
//       });

//       // Create popup content with METAR information
//       const popupContent = createMetarPopup(icao, name, country, metarObject);

//       // Create marker
//       const marker = L.marker([lat, lon], {
//         icon: metarIcon,
//         title: `${icao} - ${name}`,
//         zIndexOffset: 5000,
//       })
//         .bindPopup(popupContent, {
//           maxWidth: 350,
//           className: "metar-popup",
//         })
//         .addTo(metarLayer);

//       // Add hover tooltip with key information
//       const tooltipContent = createMetarTooltip(icao, metarObject);
//       marker.bindTooltip(tooltipContent, {
//         direction: "top",
//         offset: [0, -20],
//         opacity: 0.95,
//       });

//       console.log(`✅ Added METAR marker for ${icao}`);
//     } catch (error) {
//       console.error(`Error processing METAR for ${icao}:`, error);
//     }
//   }

//   console.log(`✅ Added ${icaoKeys.length} METAR stations to map`);
// }

// // Create detailed popup content
// function createMetarPopup(icao, name, country, metarObject) {
//   const wind = metarObject.wind || {};
//   const temps = metarObject.temperatures || {};
//   const cloud = metarObject.cloud || {};

//   // Format wind information
//   let windText = "N/A";
//   if (wind.direction && wind.speed) {
//     windText = `${wind.direction}° at ${wind.speed} kt`;
//     if (wind.gust) windText += ` (gust ${wind.gust} kt)`;
//     if (wind.variation) windText += ` varying ${wind.variation}`;
//   } else if (wind.direction === "VRB") {
//     windText = `Variable at ${wind.speed || "?"} kt`;
//   }

//   // Format cloud information
//   let cloudText = "N/A";
//   if (cloud.coverage && cloud.altitude) {
//     cloudText = `${cloud.coverage} at ${cloud.altitude} ft`;
//   }

//   // Weather conditions
//   const weatherConditions = [];
//   if (metarObject.rain) weatherConditions.push("🌧️ Rain");
//   if (metarObject.snow) weatherConditions.push("❄️ Snow");
//   if (metarObject.mist) weatherConditions.push("🌫️ Mist");
//   const weatherText = weatherConditions.length > 0 ? weatherConditions.join(", ") : "Clear";

//   return `
//     <div style="font-family: Arial, sans-serif; font-size: 12px;">
//       <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//                   color: white; padding: 8px; margin: -10px -10px 10px -10px;
//                   border-radius: 3px 3px 0 0;">
//         <div style="font-size: 16px; font-weight: bold;">${icao}</div>
//         <div style="font-size: 11px; opacity: 0.9;">${name}</div>
//         <div style="font-size: 10px; opacity: 0.8;">${country}</div>
//       </div>

//       <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
//         <img src="${metarObject.icon_vfr}"
//              alt="${metarObject.flightCategory}"
//              style="width: 40px; height: 40px;">
//         <div>
//           <div style="font-weight: bold; font-size: 14px; color: ${metarObject.color};">
//             ${metarObject.flightCategory}
//           </div>
//           <div style="font-size: 10px; color: #666;">Flight Category</div>
//         </div>
//       </div>

//       <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
//         <tr style="border-bottom: 1px solid #eee;">
//           <td style="padding: 4px 0; font-weight: bold;">QNH:</td>
//           <td style="padding: 4px 0;">${metarObject.qnh || "N/A"} hPa</td>
//         </tr>
//         <tr style="border-bottom: 1px solid #eee;">
//           <td style="padding: 4px 0; font-weight: bold;">Wind:</td>
//           <td style="padding: 4px 0;">${windText}</td>
//         </tr>
//         <tr style="border-bottom: 1px solid #eee;">
//           <td style="padding: 4px 0; font-weight: bold;">Temperature:</td>
//           <td style="padding: 4px 0;">${temps.temperature || "N/A"}°C / Dewpoint: ${temps.dewpoint || "N/A"}°C</td>
//         </tr>
//         <tr style="border-bottom: 1px solid #eee;">
//           <td style="padding: 4px 0; font-weight: bold;">Visibility:</td>
//           <td style="padding: 4px 0;">${metarObject.visibility || "N/A"}</td>
//         </tr>
//         <tr style="border-bottom: 1px solid #eee;">
//           <td style="padding: 4px 0; font-weight: bold;">Cloud:</td>
//           <td style="padding: 4px 0;">${cloudText}</td>
//         </tr>
//         <tr>
//           <td style="padding: 4px 0; font-weight: bold;">Weather:</td>
//           <td style="padding: 4px 0;">${weatherText}</td>
//         </tr>
//       </table>

//       <div style="margin-top: 10px; padding: 6px; background: #f5f5f5;
//                   border-radius: 3px; font-size: 10px; font-family: monospace;">
//         ${metarObject.raw || "No raw METAR data"}
//       </div>
//     </div>
//   `;
// }

// // Create concise tooltip for hover
// function createMetarTooltip(icao, metarObject) {
//   const wind = metarObject.wind || {};
//   const temps = metarObject.temperatures || {};

//   let windStr = "N/A";
//   if (wind.direction && wind.speed) {
//     windStr = `${wind.direction}°/${wind.speed}kt`;
//     if (wind.gust) windStr += `G${wind.gust}`;
//   }

//   return `
//     <div style="font-family: Arial, sans-serif; font-size: 11px; min-width: 150px;">
//       <div style="font-weight: bold; font-size: 13px; margin-bottom: 3px; color: ${metarObject.color};">
//         ${icao} - ${metarObject.flightCategory}
//       </div>
//       <div><b>Wind:</b> ${windStr}</div>
//       <div><b>Vis:</b> ${metarObject.visibility || "N/A"}</div>
//       <div><b>Temp:</b> ${temps.temperature || "?"}°C / ${temps.dewpoint || "?"}°C</div>
//       <div><b>QNH:</b> ${metarObject.qnh || "N/A"} hPa</div>
//     </div>
//   `;
// }

// // Helper function to get color based on flight category
// function getFlightCategoryColor(category) {
//   const colors = {
//     VFR: "#00AA00",
//     MVFR: "#0000FF",
//     IFR: "#FF0000",
//     LIFR: "#FF00FF",
//   };
//   return colors[category] || "#666666";
// }

// // Toggle METAR layer visibility
// function toggleMetarLayer() {
//   const checkbox = document.getElementById("metar-toggle");

//   if (!checkbox) {
//     console.warn("METAR toggle checkbox not found");
//     return;
//   }

//   if (checkbox.checked) {
//     if (!metarLayer) {
//       // Load METAR stations if not already loaded
//       addMetarStationsToMap();
//     } else {
//       // Show existing layer
//       metarLayer.addTo(routeMap);
//     }
//   } else {
//     // Hide layer
//     if (metarLayer) {
//       routeMap.removeLayer(metarLayer);
//     }
//   }
// }

// // Add event listener for METAR toggle
// document.addEventListener("DOMContentLoaded", () => {
//   const metarCheckbox = document.getElementById("metar-toggle");
//   if (metarCheckbox) {
//     metarCheckbox.addEventListener("change", toggleMetarLayer);
//   }
// });

// // Expose functions globally
// window.addMetarStationsToMap = addMetarStationsToMap;
// window.toggleMetarLayer = toggleMetarLayer;

// Function to clear METAR layer
function clearMetarLayer() {
  console.log("> func: clearMetarLayer()");

  if (metarLayer) {
    routeMap.removeLayer(metarLayer);
    metarLayer.clearLayers(); // Clear all markers from the layer
    metarLayer = null;
  }

  // Clear cache
  metarDataCache.clear();

  console.log("✅ METAR layer cleared");
}

// Function to check if cached data is still valid (e.g., 30 minutes)
function isCacheValid(timestamp, maxAgeMinutes = 30) {
  const now = Date.now();
  const age = (now - timestamp) / 1000 / 60; // Age in minutes
  return age < maxAgeMinutes;
}

// Function to fetch and display METAR stations on map
async function addMetarStationsToMap(forceRefresh = false) {
  console.log(`> func: addMetarStationsToMap(forceRefresh=${forceRefresh})`);

  if (!routeMap) {
    console.warn("Map not initialized");
    return;
  }

  // Clear existing METAR layer if refresh is forced or layer exists
  if (forceRefresh || metarLayer) {
    clearMetarLayer();
  }

  // Get METAR station data
  const metarStations = getMetarStations();
  if (!metarStations) {
    console.warn("No METAR stations available");
    return;
  }

  console.log("METAR Stations:", metarStations);

  // Create feature group for METAR markers
  metarLayer = L.featureGroup({
    zIndex: 5000, // High z-index to stay above other layers
  }).addTo(routeMap);

  // Loop through each METAR station
  const icaoKeys = Object.keys(metarStations);
  let successCount = 0;
  let errorCount = 0;

  for (const icao of icaoKeys) {
    try {
      const station = metarStations[icao];
      const { lat, lon, country, name } = station;

      if (!lat || !lon) {
        console.warn(`Invalid coordinates for ${icao}`);
        errorCount++;
        continue;
      }

      let metarObject;

      // Check cache first
      const cachedData = metarDataCache.get(icao);
      if (!forceRefresh && cachedData && isCacheValid(cachedData.timestamp)) {
        console.log(`Using cached METAR for ${icao}`);
        metarObject = cachedData.metarObject;
      } else {
        // Fetch fresh METAR data
        console.log(`Fetching METAR for ${icao}...`);
        const metarData = await fetch_metar(icao);

        if (!metarData || metarData.length < 2) {
          console.warn(`No METAR data for ${icao}`);
          errorCount++;
          continue;
        }

        const metar_icao = metarData[0];
        const stationName = metarData[1];

        // Create METAR object
        metarObject = new Metar(stationName, metar_icao, lat, lon);

        // Cache the data
        metarDataCache.set(icao, {
          metarObject: metarObject,
          timestamp: Date.now(),
        });
      }

      // Create custom icon using VFR icon
      const metarIcon = L.divIcon({
        className: "metar-station-icon",

        html: `
          <div style="
              position: relative;
              width: 35px;
              display: flex;
              flex-direction: column;
              align-items: center;
          ">

              <!-- ICAO label below icon -->
              <div style="
                  margin-top: 2px;
                  background: rgba(0,0,0,0.7);
                  color: white;
                  padding: 1px 3px;
                  border-radius: 3px;
                  font-size: 8px;
                  font-weight: bold;
                  white-space: nowrap;
              ">
                  ${icao}
              </div>

              <!-- Main station icon -->
              <img src="${metarObject.icon}"
                    alt="${metarObject.flightCategory}"
                    style="
                      width: 35px;
                      height: 35px;
                      object-fit: contain;
                      filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
                    "
                    title="${icao} - ${metarObject.flightCategory}">

          </div>
        `,
        iconSize: [35, 45], // taller to fit label
        iconAnchor: [17, 35], // anchor at bottom of main icon
      });

      // Create popup content with METAR information
      const popupContent = createMetarPopup(icao, name, country, metarObject);

      // Create marker
      const marker = L.marker([lat, lon], {
        icon: metarIcon,
        title: `${icao} - ${name}`,
        zIndexOffset: 5000,
      })
        .bindPopup(popupContent, {
          maxWidth: 350,
          className: "metar-popup",
        })
        .addTo(metarLayer);

      // Add hover tooltip with key information
      const tooltipContent = createMetarTooltip(icao, metarObject);
      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -20],
        opacity: 0.95,
      });

      successCount++;
    } catch (error) {
      console.error(`Error processing METAR for ${icao}:`, error);
      errorCount++;
    }
  }

  console.log(`✅ Added ${successCount} METAR stations to map (${errorCount} errors)`);

  // Show notification to user
  if (successCount > 0) {
    showMapNotification(`Loaded ${successCount} METAR stations`, "success");
  }
}

// Helper function to show notifications on the map
function showMapNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `map-notification map-notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    background: ${type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"};
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    animation: slideDown 0.3s ease-out;
  `;

  document.getElementById("route-map")?.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideUp 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Create detailed popup content (same as before)
function createMetarPopup(icao, name, country, metarObject) {
  const wind = metarObject.wind || {};
  const temps = metarObject.temperatures || {};
  const cloud = metarObject.cloud || {};

  // Get cache age
  const cachedData = metarDataCache.get(icao);
  const cacheAge = cachedData ? Math.floor((Date.now() - cachedData.timestamp) / 1000 / 60) : 0;

  // Format wind information
  let windText = "N/A";
  if (wind.direction && wind.speed) {
    windText = `${wind.direction}° at ${wind.speed} kt`;
    if (wind.gust) windText += ` (gust ${wind.gust} kt)`;
    if (wind.variation) windText += ` varying ${wind.variation}`;
  } else if (wind.direction === "VRB") {
    windText = `Variable at ${wind.speed || "?"} kt`;
  }

  // Format cloud information
  let cloudText = "N/A";
  if (cloud.coverage && cloud.altitude) {
    cloudText = `${cloud.coverage} at ${cloud.altitude} ft`;
  }

  // Weather conditions
  const weatherConditions = [];
  if (metarObject.rain) weatherConditions.push("🌧️ Rain");
  if (metarObject.snow) weatherConditions.push("❄️ Snow");
  if (metarObject.mist) weatherConditions.push("🌫️ Mist");
  const weatherText = weatherConditions.length > 0 ? weatherConditions.join(", ") : "Clear";

  return `
    <div style="font-family: Arial, sans-serif; font-size: 12px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white; padding: 8px; margin: -10px -10px 10px -10px;
                  border-radius: 3px 3px 0 0;">
        <div style="font-size: 16px; font-weight: bold;">${icao}</div>
        <div style="font-size: 11px; opacity: 0.9;">${name}</div>
        <div style="font-size: 10px; opacity: 0.8;">${country}</div>
        ${cacheAge > 0 ? `<div style="font-size: 9px; opacity: 0.7; margin-top: 2px;">Updated ${cacheAge} min ago</div>` : ""}
      </div>

      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <img src="${metarObject.icon}"
             alt="${metarObject.flightCategory}"
             style="width: 40px; height: 40px;"
             title="Category Icon">
        <div>
          <div style="font-weight: bold; font-size: 14px; color: ${getFlightCategoryColor(metarObject.flightCategory)};">
            ${metarObject.flightCategory}
          </div>
          <div style="font-size: 10px; color: #666;">Flight Category</div>
        </div>
      </div>


      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px 0; font-weight: bold;">QNH:</td>
          <td style="padding: 4px 0;">${metarObject.qnh || "N/A"} hPa</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px 0; font-weight: bold;">Wind:</td>
          <td style="padding: 4px 0;">${windText}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px 0; font-weight: bold;">Temperature:</td>
          <td style="padding: 4px 0;">${temps.temperature || "N/A"}°C / Dewpoint: ${temps.dewpoint || "N/A"}°C</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px 0; font-weight: bold;">Visibility:</td>
          <td style="padding: 4px 0;">${metarObject.visibility || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px 0; font-weight: bold;">Cloud:</td>
          <td style="padding: 4px 0;">${cloudText}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: bold;">Weather:</td>
          <td style="padding: 4px 0;">${weatherText}</td>
        </tr>
      </table>

      <div style="margin-top: 10px; padding: 6px; background: #f5f5f5;
                  border-radius: 3px; font-size: 10px; font-family: monospace;">
        ${metarObject.metar || "No raw METAR data"}
      </div>
    </div>
  `;
}

// Create concise tooltip for hover (same as before)
function createMetarTooltip(icao, metarObject) {
  const wind = metarObject.wind || {};
  const temps = metarObject.temperatures || {};

  let windStr = "N/A";
  if (wind.direction && wind.speed) {
    windStr = `${wind.direction}°/${wind.speed}kt`;
    if (wind.gust) windStr += `G${wind.gust}`;
  }

  return `
    <div style="font-family: Arial, sans-serif; font-size: 11px; min-width: 150px;">
      <div style="font-weight: bold; font-size: 13px; margin-bottom: 3px; color: ${getFlightCategoryColor(metarObject.flightCategory)};">
        ${icao} - ${metarObject.flightCategory}
      </div>
      <div><b>Wind:</b> ${windStr}</div>
      <div><b>Vis:</b> ${metarObject.visibility || "N/A"}</div>
      <div><b>Temp:</b> ${temps.temperature || "?"}°C / ${temps.dewpoint || "?"}°C</div>
      <div><b>QNH:</b> ${metarObject.qnh || "N/A"} hPa</div>
    </div>
  `;
}

// Helper function to get color based on flight category (same as before)
function getFlightCategoryColor(category) {
  const colors = {
    VFR: "#00AA00",
    MVFR: "#0000FF",
    IFR: "#FF0000",
    LIFR: "#FF00FF",
  };
  return colors[category] || "#666666";
}

// Toggle METAR layer visibility
function toggleMetarLayer() {
  const checkbox = document.getElementById("metar-toggle");

  if (!checkbox) {
    console.warn("METAR toggle checkbox not found");
    return;
  }

  if (checkbox.checked) {
    if (!metarLayer) {
      // Load METAR stations if not already loaded
      addMetarStationsToMap(false); // Use cache if available
    } else {
      // Show existing layer
      metarLayer.addTo(routeMap);
    }
  } else {
    // Hide layer (but keep data cached)
    if (metarLayer) {
      routeMap.removeLayer(metarLayer);
    }
  }
}

// Refresh METAR data
function refreshMetarData() {
  console.log("> func: refreshMetarData()");
  const checkbox = document.getElementById("metar-toggle");

  if (checkbox && checkbox.checked) {
    clearMetarLayer();
    addMetarStationsToMap(true); // Force refresh
  } else {
    showMapNotification("Please enable METAR stations first", "info");
  }
}

// Clear METAR when country changes
function onCountryChange() {
  console.log("> Detected country change, clearing METAR layer");
  clearMetarLayer();

  // Uncheck the METAR toggle
  const checkbox = document.getElementById("metar-toggle");
  if (checkbox) {
    checkbox.checked = false;
  }
}

function UpdateFlightInfoFields(timeValue = null, initialize = true, adjustZoom = true) {
  console.log("> UpdateFlightInfoFields()");
  // Initialize "MAP" and update route, this will fill the window.waypoints array
  initRouteMap(initialize);
  updateRoute(adjustZoom); // Pass adjustZoom parameter to control zoom behavior

  // Compute the flight info
  const info = computeFlightInfo(window.waypoints, timeValue);
  console.log(info);

  if (!info) {
    console.warn("   >No info for computeFlightInfo() <return>");
    return;
  }
  // Update GUI fields in GENERAL
  document.getElementById("ARRIVAL_FLIGHT_DISTANCE_INFO").textContent = `${info.distance_km} km, ${info.flying_time_min} min.`;
  document.getElementById("distance-km").textContent = info.distance_km;
  document.getElementById("flying-minutes").textContent = info.flying_time_min;

  if (info.departure_time !== "--:--") {
    document.getElementById("departure-time").textContent = info.departure_time;
  }

  if (info.arrival_time !== "--:--") {
    document.getElementById("ARRIVAL_clockField").value = info.arrival_time;
    document.getElementById("arrival-time").textContent = info.arrival_time;
  }
}

// Add event listener for METAR toggle
document.addEventListener("DOMContentLoaded", () => {
  const metarCheckbox = document.getElementById("metar-toggle");
  if (metarCheckbox) {
    metarCheckbox.addEventListener("change", toggleMetarLayer);
  }
});

// Expose functions globally
window.addMetarStationsToMap = addMetarStationsToMap;
window.toggleMetarLayer = toggleMetarLayer;
window.clearMetarLayer = clearMetarLayer;
window.refreshMetarData = refreshMetarData;
window.onCountryChange = onCountryChange;
// Make globally available
window.updateRoute = updateRoute;
window.initRouteMap = initRouteMap;
window.UpdateFlightInfoFields = UpdateFlightInfoFields;
window.addWaypoints = addWaypoints;
