const RUNWAY_HALF_WIDTH = 2; // rect width = 4
const RUNWAY_HALF_LENGTH = 20; // rect height = 40
const CROP_PADDING = 8;

function setRunwaySurface(prefix, forceUpdate = false) {
  console.log(`> func: setRunwaySurface(${prefix})`);
  const runwayNr = document.getElementById(`${prefix}_RUNWAY_NR`)?.value;
  let runwayProps = window.flight_plan_data[`${prefix}_RUNWAY_PROPERTIES`];

  // Check runway number
  if (runwayNr === "" || runwayNr === null || runwayNr === "undefined") {
    console.warn(`   >Runway number is missing: ${runwayNr}`);
    return;
  }
  // Convert to dict in case of string
  if (typeof runwayProps === "string" || typeof runwayProps === "undefined" || runwayProps === null) {
    runwayProps = Py2Js(runwayProps);
  }

  // Check whether missing data
  if (!Array.isArray(runwayProps)) {
    console.warn(`   >Runway properties are missing: ${runwayProps}`);
    return;
  }

  // Find matching runway entry
  const getRunway = runwayProps.find((rwy) => rwy.id?.includes(runwayNr) || rwy.number?.includes(runwayNr));

  // console.log("HERE");
  // console.log(runwayProps);

  // Create runway image
  // buildRunwayOverviewSvg(prefix);
  // if (runwayProps) {
  //   const svg = buildRunwayOverviewSvg(prefix);
  // }

  // Get GUI elements
  const surfaceSelect = document.getElementById(`${prefix}_RUNWAY_SURFACE`);
  const lengthSelect = document.getElementById(`${prefix}_RUNWAY_LENGTH`);
  const slopeSelect = document.getElementById(`${prefix}_RUNWAY_SLOPE`);
  const conditionSelect = document.getElementById(`${prefix}_RUNWAY_CONDITION`);

  // Default settings are loaded when available. Only overwrite when empty.
  if (getRunway && (lengthSelect.value === "" || forceUpdate)) {
    lengthSelect.value = getRunway.length;
  }
  if (getRunway && (slopeSelect.value === "" || forceUpdate)) {
    slopeSelect.value = getRunway.slope;
  }
  if (getRunway && (surfaceSelect.value === "" || forceUpdate)) {
    surfaceSelect.value = getRunway.surface.type;
  }
  if (getRunway && (conditionSelect.value === "" || forceUpdate)) {
    let condition = "";
    if (getRunway.surface.id) condition = `Runway: ${getRunway.id}`;
    if (getRunway.surface.surface) condition = `Surface: ${getRunway.surface.surface}`;
    if (getRunway.surface.condition) condition = condition + `, ${getRunway.surface.condition}`;
    // Set value
    conditionSelect.value = condition;
  }
}

function setRunwaySlippery(prefix, rain, snow) {
  console.log(`> func: setRunwaySlippery(${prefix})`);
  // Determine runway condition
  let condition = "dry";
  if (rain || snow) {
    condition = "wet";
  }

  // Get GUI elements
  const slipparySelect = document.getElementById(`${prefix}_RUNWAY_SLIPPERY`);
  slipparySelect.value = condition;
}

function getRunwaySettings(prefix) {
  const condition = document.getElementById(`${prefix}_RUNWAY_CONDITION`)?.value;
  const surface = document.getElementById(`${prefix}_RUNWAY_SURFACE`)?.value;

  if (!condition || !surface) {
    return null;
  }

  return { condition, surface };
}

// function setRunwayProperties(prefix, rain, snow) {
//   console.log(`> func: setRunwayProperties(${prefix})`);
//   // Set runway surface
//   setRunwaySurface(prefix);
//   // Set runway weather condition based on rain/snow input
//   setRunwaySlippery(prefix, rain, snow);
//   // Return
//   return;
// }

// ========================= CREATE RUNWAY SVG =========================
// function buildRunwayOverviewSvg(prefix) {
//   console.log(`> func: buildRunwayOverviewSvg(${prefix})`);

//   let runwayProps = window.flight_plan_data[`${prefix}_RUNWAY_PROPERTIES`];

//   if (typeof runwayProps === "string" || runwayProps == null) {
//     runwayProps = Py2Js(runwayProps);
//   }

//   if (!Array.isArray(runwayProps)) {
//     console.warn(`   > Runway properties are missing:`, runwayProps);
//     return;
//   }

//   const geometry = extractRunwayGeometry(runwayProps);
//   const points = normalizeAndCenterToSvg(geometry);
//   const bounds = computeSvgBounds(points);
//   const elements = buildRunwaySvgElements(points);

//   const svg = `
//     <svg
//       viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}"
//       preserveAspectRatio="xMinYMin slice"
//       style="display:block; width:100%; height:auto;"
//     >
//       ${elements}
//     </svg>
//   `;

//   document.getElementById(`${prefix}_RUNWAY_SVG`).innerHTML = svg;
// }

function buildRunwayOverviewSvg(prefix) {
  console.log(`> func: buildRunwayOverviewSvg(${prefix})`);
  let runwayProps = window.flight_plan_data[`${prefix}_RUNWAY_PROPERTIES`];

  // Convert to dict in case of string
  if (typeof runwayProps === "string" || typeof runwayProps === "undefined" || runwayProps === null) {
    runwayProps = Py2Js(runwayProps);
  }
  if (!Array.isArray(runwayProps)) {
    console.warn(`   >Runway properties are missing: ${runwayProps}`);
    svg = `<svg></svg>`;
    document.getElementById(`${prefix}_RUNWAY_SVG`).innerHTML = svg;
    return;
  }

  const geometry = extractRunwayGeometry(runwayProps);
  const points = normalizeAndCenterToSvg(geometry);
  const bounds = computeSvgBounds(points);
  const rects = buildRunwaySvgRects(points);
  // const rects = buildRunwaySvgElements(points);

  svg = `
    <svg
      viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}"
      preserveAspectRatio="xMinYMin slice"
      style="display:block; width:100%; height:auto;"
    >
      ${rects}
    </svg>
  `;

  // Plot the runways
  document.getElementById(`${prefix}_RUNWAY_SVG`).innerHTML = svg;
}

function buildRunwaySvgElements(runways) {
  return runways
    .map((rwy) => {
      const { cx, cy, length, width, heading, label } = rwy;

      return `
      <!-- Runway -->
      <rect
        x="${cx - length / 2}"
        y="${cy - width / 2}"
        width="${length}"
        height="${width}"
        fill="#444"
        rx="${width * 0.15}"
        transform="rotate(${heading} ${cx} ${cy})"
      />

      <!-- Runway number -->
      <text
        x="${cx}"
        y="${cy}"
        fill="white"
        font-size="${width * 0.7}"
        font-family="Arial, sans-serif"
        font-weight="bold"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(${heading} ${cx} ${cy})"
        pointer-events="none"
      >
        ${label}
      </text>
    `;
    })
    .join("");
}

function extractRunwayGeometry(runways) {
  return runways
    .map((rwy) => {
      const nums = rwy.number;
      if (!nums || nums.length < 2) return null;

      const a = rwy[nums[0]];
      const b = rwy[nums[1]];

      if (!a?.latlon || !b?.latlon) return null;

      const lat = (a.latlon[0] + b.latlon[0]) / 2;
      const lon = (a.latlon[1] + b.latlon[1]) / 2;

      const heading = parseFloat(a.heading ?? rwy.surface?.heading ?? 0);

      return {
        id: rwy.id,
        lat,
        lon,
        heading,
        surface: rwy.surface?.surface ?? "other",
      };
    })
    .filter(Boolean);
}

function normalizeAndCenterToSvg(points, size = 200, padding = 20) {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // First: normalize to [0, size - 2*padding]
  const normalized = points.map((p) => ({
    ...p,
    x: ((p.lon - minLon) / (maxLon - minLon || 1)) * (size - 2 * padding),
    y: ((maxLat - p.lat) / (maxLat - minLat || 1)) * (size - 2 * padding),
  }));

  // Compute centroid of normalized points
  const cx = normalized.reduce((s, p) => s + p.x, 0) / normalized.length;
  const cy = normalized.reduce((s, p) => s + p.y, 0) / normalized.length;

  const targetCx = size / 2;
  const targetCy = size / 2;

  const dx = targetCx - cx;
  const dy = targetCy - cy;

  // Second: translate everything so centroid is centered
  return normalized.map((p) => ({
    ...p,
    x: p.x + dx,
    y: p.y + dy,
  }));
}

function computeSvgBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach((p) => {
    // max radius from center after rotation
    const r = Math.hypot(RUNWAY_HALF_WIDTH, RUNWAY_HALF_LENGTH);

    minX = Math.min(minX, p.x - r);
    maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r);
    maxY = Math.max(maxY, p.y + r);
  });

  return {
    minX: minX - CROP_PADDING,
    minY: minY - CROP_PADDING,
    width: maxX - minX + 2 * CROP_PADDING,
    height: maxY - minY + 2 * CROP_PADDING,
  };
}

function surfaceToColor(surface) {
  if (surface.includes("asphalt") || surface.includes("concrete")) {
    return "#666666"; // hard
  }
  if (surface.includes("grass")) {
    return "#8BC34A"; // soft
  }
  return "#2196F3"; // other
}

function buildRunwaySvgRects(runwayPoints) {
  return runwayPoints
    .map((p) => {
      const color = surfaceToColor(p.surface);

      return `
      <g transform="translate(${p.x}, ${p.y}) rotate(${p.heading})">
        <rect x="-2" y="-20" width="4" height="40"
              fill="${color}"
              stroke="#333"
              stroke-width="1"
              fill-opacity="0.85"/>
      </g>
    `;
    })
    .join("\n");
}
// ======================================================================

window.getRunwaySettings = getRunwaySettings;
window.setRunwaySurface = setRunwaySurface;
window.buildRunwayOverviewSvg = buildRunwayOverviewSvg;
// window.setRunwayProperties = setRunwayProperties;
