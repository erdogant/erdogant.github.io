function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function computeBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360; // degrees
}

function computeHeadwind(trackDeg, windDirDeg, windSpeedKt) {
  const angle = toRad(windDirDeg - trackDeg);
  return windSpeedKt * Math.cos(angle); // + headwind, − tailwind
}

function computeLegInfo({ lat1, lon1, lat2, lon2, cruiseSpeedKt, fuelConsumptionLph, windDirDeg, windSpeedKt }) {
  /* Compute fuel per leg

  plit the route into legs using the waypoints

  For each leg:
  Compute track angle
  Interpolate wind (dir/speed) between departure & arrival
  Compute headwind component
  Compute ground speed
  Compute time
  Compute fuel
  Sum fuel burned and subtract from departure fuel
  */

  const bearing = computeBearing(lat1, lon1, lat2, lon2);

  const headwind = computeHeadwind(bearing, windDirDeg, windSpeedKt);
  const groundSpeed = cruiseSpeedKt - headwind;

  if (groundSpeed <= 0) {
    throw new Error("Ground speed <= 0 on leg");
  }

  // Distance (km)
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  const timeH = distanceKm / (groundSpeed * 1.852);
  const fuelL = timeH * fuelConsumptionLph;

  return {
    bearing,
    headwind,
    groundSpeed,
    distanceKm,
    timeH,
    fuelL,
  };
}

function computeArrivalFuel() {
  console.log("> func: computeArrivalFuel()");
  // Get input values
  let headwind = parseFloat(document.getElementById("DEPARTURE_WIND_HEADWIND")?.value) || 0;
  let fuelDeparture = parseFloat(document.getElementById("DEPARTURE_WEIGHT_FUEL_LITERS")?.value) || 0;

  // Compute flight distance
  info = computeFlightInfo(window.waypoints);

  // Aircraft data
  const aircraft = window.flight_plan_data?.AIRCRAFT;
  if (!aircraft) return;

  const cruiseSpeed = parseFloat(aircraft.CRUISESPEED) || 0; // in knots
  const fuelConsumption = parseFloat(aircraft.FUEL?.consumption) || 0; // liters per hour

  // Adjust cruise speed for headwind based on the waypoints
  // 1. Use the waypoints to compute the headwind for each leg.
  // 2. Compute per leg the angle
  // 3. Compute the headwind per leg
  // 4. compute the time needed per leg
  // 5. compute the fuel needed per leg
  // 6. Sum the total fuel burned and substract
  // the first [lat1, lon1] is departure coordinates and the last [lat-k, lon-k] is the arrival

  // Waypoints are stored like this:
  // window.waypoints = [[lat1, lon1], [lat2, lon2], .., [lat-k, lon-k]]
  // const groundSpeed = cruiseSpeed - headwind;
  // Wind direction and speed (kt) can be get here:
  // windDirectionFieldDep = document.getElementById("DEPARTURE_WIND_DIRECTION").value;
  // windSpeedFieldDep = document.getElementById("DEPARTURE_WIND_SPEED"); // in kt
  // windDirectionFieldArr = document.getElementById("ARRIVAL_WIND_DIRECTION");
  // windSpeedFieldArr = document.getElementById("ARRIVAL_WIND_SPEED"); // in kt
  // Compute headwind with:
  // const headwind_value = headwind(direction, speed, runwayField.value);

  const groundSpeed = cruiseSpeed;

  if (groundSpeed <= 0) {
    console.warn("Ground speed <= 0! Check headwind or cruise speed.");
    document.getElementById("ARRIVAL_WEIGHT_FUEL_LITERS").value = "Error";
    return;
  }

  // Compute flight distance from window.flight_plan_data (km)
  const distanceKm = parseFloat(info.distance_km) || 0;
  // Flight time in hours
  const flightTimeH = distanceKm / (groundSpeed * 1.852); // knots * 1.852 = km/h
  // Fuel needed
  const fuelNeeded = flightTimeH * fuelConsumption;
  // Remaining fuel
  const fuelRemaining = fuelDeparture - fuelNeeded;
  // Update output field
  console.log(`${flightTimeH}, ${distanceKm}, ${groundSpeed}`);
  console.log(`${fuelRemaining}, ${fuelDeparture}, ${fuelNeeded}`);
  document.getElementById("ARRIVAL_WEIGHT_FUEL_LITERS").value = fuelRemaining.toFixed(0);

  // Optionally return the values
  return {
    fuelNeeded: fuelNeeded,
    fuelRemaining: fuelRemaining,
  };
}

// function computeArrivalFuelPerLeg() {
//   console.log("> func: computeArrivalFuel()");

//   const fuelDeparture = parseFloat(document.getElementById("DEPARTURE_WEIGHT_FUEL_LITERS")?.value) || 0;

//   const aircraft = window.flight_plan_data?.AIRCRAFT;
//   if (!aircraft) return;

//   const cruiseSpeed = parseFloat(aircraft.CRUISESPEED) || 0;
//   const fuelConsumption = parseFloat(aircraft.FUEL?.consumption) || 0;

//   const waypoints = window.waypoints;
//   if (!waypoints || waypoints.length < 2) return;

//   // Wind (simple linear interpolation dep → arr)
//   const windDirDep = parseFloat(document.getElementById("DEPARTURE_WIND_DIRECTION")?.value) || 0;
//   const windSpdDep = parseFloat(document.getElementById("DEPARTURE_WIND_SPEED")?.value) || 0;
//   const windDirArr = parseFloat(document.getElementById("ARRIVAL_WIND_DIRECTION")?.value) || windDirDep;
//   const windSpdArr = parseFloat(document.getElementById("ARRIVAL_WIND_SPEED")?.value) || windSpdDep;

//   let totalFuelBurned = 0;
//   let totalTimeH = 0;

//   const nLegs = waypoints.length - 1;

//   for (let i = 0; i < nLegs; i++) {
//     const t = i / Math.max(1, nLegs - 1);

//     const windDir = windDirDep + t * (windDirArr - windDirDep);
//     const windSpd = windSpdDep + t * (windSpdArr - windSpdDep);

//     const [lat1, lon1] = waypoints[i];
//     const [lat2, lon2] = waypoints[i + 1];

//     // If any coordinate is missing or empty, return early
//     if ([lat1, lon1].some((v) => v === undefined || v === null || v === "")) {
//       return;
//     }
//     if ([lat2, lon2].some((v) => v === undefined || v === null || v === "")) {
//       return;
//     }

//     const leg = computeLegInfo({
//       lat1,
//       lon1,
//       lat2,
//       lon2,
//       cruiseSpeedKt: cruiseSpeed,
//       fuelConsumptionLph: fuelConsumption,
//       windDirDeg: windDir,
//       windSpeedKt: windSpd,
//     });

//     console.log(`LEG: ${i}`);
//     console.log(leg);

//     totalFuelBurned += leg.fuelL;
//     totalTimeH += leg.timeH;
//   }

//   const fuelRemaining = fuelDeparture - totalFuelBurned;

//   document.getElementById("ARRIVAL_WEIGHT_FUEL_LITERS").value = Math.max(0, fuelRemaining).toFixed(0);

//   console.log(`totalFuelBurned: ${totalFuelBurned}, fuel remaining: ${fuelRemaining}, Total time: ${totalTimeH}`);

//   showFuelMessage("ARRIVAL_fuelMessage", totalFuelBurned, fuelRemaining, totalTimeH, fuelConsumption);

//   return {
//     fuelBurned: totalFuelBurned,
//     fuelRemaining: fuelRemaining,
//     flightTimeH: totalTimeH,
//   };
// }

function computeArrivalFuelPerLeg() {
  console.log("> func: computeArrivalFuelPerLeg()");

  const fuelDeparture = parseFloat(document.getElementById("DEPARTURE_WEIGHT_FUEL_LITERS")?.value) || 0;

  const aircraft = window.flight_plan_data?.AIRCRAFT;
  if (!aircraft) {
    console.warn("No aircraft data available");
    return;
  }

  const cruiseSpeed = parseFloat(aircraft.CRUISESPEED) || 0;
  const fuelConsumption = parseFloat(aircraft.FUEL?.consumption) || 0;

  const waypoints = window.waypoints;
  if (!waypoints || waypoints.length < 2) {
    console.warn("Invalid waypoints");
    return;
  }

  // Validate all waypoints have coordinates BEFORE processing
  const hasInvalidCoordinates = waypoints.some((wp) => {
    if (!Array.isArray(wp) || wp.length < 2) return true;
    const [lat, lon] = wp;
    return (
      lat === undefined ||
      lat === null ||
      lat === "" ||
      lon === undefined ||
      lon === null ||
      lon === "" ||
      isNaN(parseFloat(lat)) ||
      isNaN(parseFloat(lon))
    );
  });

  if (hasInvalidCoordinates) {
    console.warn("Invalid coordinates in waypoints - cannot compute fuel");
    document.getElementById("ARRIVAL_WEIGHT_FUEL_LITERS").value = "--";
    const messageDiv = document.getElementById("ARRIVAL_fuelMessage");
    if (messageDiv) {
      messageDiv.style.display = "block";
      messageDiv.style.background = "#f8d7da";
      messageDiv.style.color = "#721c24";
      messageDiv.innerHTML = "⚠️ Invalid waypoint coordinates";
    }
    return;
  }

  // Wind (simple linear interpolation dep → arr)
  const windDirDep = parseFloat(document.getElementById("DEPARTURE_WIND_DIRECTION")?.value) || 0;
  const windSpdDep = parseFloat(document.getElementById("DEPARTURE_WIND_SPEED")?.value) || 0;
  const windDirArr = parseFloat(document.getElementById("ARRIVAL_WIND_DIRECTION")?.value) || windDirDep;
  const windSpdArr = parseFloat(document.getElementById("ARRIVAL_WIND_SPEED")?.value) || windSpdDep;

  let totalFuelBurned = 0;
  let totalTimeH = 0;

  const nLegs = waypoints.length - 1;

  for (let i = 0; i < nLegs; i++) {
    const t = i / Math.max(1, nLegs - 1);

    const windDir = windDirDep + t * (windDirArr - windDirDep);
    const windSpd = windSpdDep + t * (windSpdArr - windSpdDep);

    const [lat1, lon1] = waypoints[i];
    const [lat2, lon2] = waypoints[i + 1];

    try {
      const leg = computeLegInfo({
        lat1: parseFloat(lat1),
        lon1: parseFloat(lon1),
        lat2: parseFloat(lat2),
        lon2: parseFloat(lon2),
        cruiseSpeedKt: cruiseSpeed,
        fuelConsumptionLph: fuelConsumption,
        windDirDeg: windDir,
        windSpeedKt: windSpd,
      });

      console.log(`LEG ${i}:`, leg);

      totalFuelBurned += leg.fuelL;
      totalTimeH += leg.timeH;
    } catch (error) {
      console.error(`Error computing leg ${i}:`, error);
      return;
    }
  }

  const fuelRemaining = fuelDeparture - totalFuelBurned;

  document.getElementById("ARRIVAL_WEIGHT_FUEL_LITERS").value = Math.max(0, fuelRemaining).toFixed(0);

  console.log(`totalFuelBurned: ${totalFuelBurned}, fuel remaining: ${fuelRemaining}, Total time: ${totalTimeH}`);

  showFuelMessage("ARRIVAL_fuelMessage", totalFuelBurned, fuelRemaining, totalTimeH, fuelConsumption);

  return {
    fuelBurned: totalFuelBurned,
    fuelRemaining: fuelRemaining,
    flightTimeH: totalTimeH,
  };
}

function showFuelMessage(messageId, totalFuelBurned, fuelRemaining, totalTimeH, fuelConsumption) {
  const messageDiv = document.getElementById(messageId);
  if (!messageDiv) return;

  messageDiv.style.display = "block";

  const burned = Number(totalFuelBurned) || 0;
  const remaining = Number(fuelRemaining) || 0;
  const timeH = Number(totalTimeH) || 0;
  const consumption = Number(fuelConsumption) || 0;

  // Remaining endurance in hours
  const enduranceH = consumption > 0 ? remaining / consumption : 0;
  const reserveLimitH = 0.75; // 45 minutes

  // ❌ Not enough fuel to arrive
  if (remaining < 0) {
    messageDiv.style.background = "#f8d7da";
    messageDiv.style.color = "#721c24";
    messageDiv.style.border = "1px solid #f5c6cb";
    messageDiv.innerHTML = `
      ⛽❌ Insufficient fuel for arrival<br>
      <small>
        Flight time: ${timeH.toFixed(2)} h<br>
        Fuel burned: ${burned.toFixed(0)} L<br>
        Fuel shortfall: ${Math.abs(remaining).toFixed(0)} L
      </small>
    `;
    return;
  }

  // ⚠️ Arrives, but reserve < 45 min
  if (enduranceH < reserveLimitH) {
    messageDiv.style.background = "#fff3cd";
    messageDiv.style.color = "#856404";
    messageDiv.style.border = "1px solid #ffeeba";
    messageDiv.innerHTML = `
      ⛽⚠ Fuel BELOW 45-minute reserve<br>
      <small>
        Flight time: ${timeH.toFixed(2)} h<br>
        Fuel burned: ${burned.toFixed(0)} L<br>
        Fuel remaining: ${remaining.toFixed(0)} L<br>
        Endurance: ${(enduranceH * 60).toFixed(0)} min
      </small>
    `;
    return;
  }

  // ✅ Fuel OK + reserve respected
  messageDiv.style.background = "#d4edda";
  messageDiv.style.color = "#155724";
  messageDiv.style.border = "1px solid #c3e6cb";
  messageDiv.innerHTML = `
    ⛽✓ Fuel OK (≥ 45-min reserve)<br>
    <small>
      Flight time: ${timeH.toFixed(2)} h<br>
      Fuel burned: ${burned.toFixed(0)} L<br>
      Fuel remaining: ${remaining.toFixed(0)} L<br>
      Endurance: ${(enduranceH * 60).toFixed(0)} min
    </small>
  `;
}

function computeFlightInfo(waypoints, departureTimeHHMM = null, speedKt = 105) {
  // Early validation: check waypoints
  if (!waypoints || waypoints.length < 2) {
    console.warn("computeFlightInfo: Invalid waypoints");
    return {
      distance_km: "-",
      flying_time_min: "-",
      departure_time: "--:--",
      arrival_time: "--:--",
      error: "Invalid waypoints",
    };
  }

  // Validate that all waypoints have valid coordinates
  const hasInvalidCoordinates = waypoints.some((wp) => {
    if (!Array.isArray(wp) || wp.length < 2) return true;
    const [lat, lon] = wp;
    return (
      lat === undefined ||
      lat === null ||
      lat === "" ||
      lon === undefined ||
      lon === null ||
      lon === "" ||
      isNaN(parseFloat(lat)) ||
      isNaN(parseFloat(lon))
    );
  });

  if (hasInvalidCoordinates) {
    console.warn("computeFlightInfo: Invalid coordinates in waypoints");
    return {
      distance_km: "-",
      flying_time_min: "-",
      departure_time: "--:--",
      arrival_time: "--:--",
      error: "Invalid coordinates",
    };
  }

  // Compute total distance
  let totalDistanceKm = 0;
  try {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const dist = haversineDistance(waypoints[i], waypoints[i + 1]);
      if (isNaN(dist)) {
        console.warn(`Invalid distance at leg ${i}`);
        continue;
      }
      totalDistanceKm += dist;
    }
  } catch (error) {
    console.error("Error computing distance:", error);
    return {
      distance_km: "-",
      flying_time_min: "-",
      departure_time: "--:--",
      arrival_time: "--:--",
      error: "Distance calculation failed",
    };
  }

  // Calculate time
  const speedKmH = speedKt * 1.852;
  const timeHours = totalDistanceKm / speedKmH;
  const timeMinutes = Math.round(timeHours * 60);

  // Calculate departure and arrival times
  let departureTime = "--:--";
  let arrivalTime = "--:--";

  if (departureTimeHHMM && typeof departureTimeHHMM === "string" && departureTimeHHMM.includes(":")) {
    try {
      const [depH, depM] = departureTimeHHMM.split(":").map(Number);
      if (!isNaN(depH) && !isNaN(depM)) {
        const depDate = new Date();
        depDate.setHours(depH, depM, 0, 0);
        depDate.setMinutes(depDate.getMinutes() + timeMinutes);

        const arrH = String(depDate.getHours()).padStart(2, "0");
        const arrM = String(depDate.getMinutes()).padStart(2, "0");

        departureTime = departureTimeHHMM;
        arrivalTime = `${arrH}:${arrM}`;
      }
    } catch (error) {
      console.warn("Error calculating arrival time:", error);
    }
  }

  // Build result object
  const result = {
    distance_km: (isNaN(totalDistanceKm) ? 0 : totalDistanceKm).toFixed(1),
    flying_time_min: isNaN(timeMinutes) ? 0 : timeMinutes,
    departure_time: departureTime,
    arrival_time: arrivalTime,
  };

  console.log("computeFlightInfo result:", result);

  return result;
}

/* =========================
   GLOBAL EXPORTS
========================= */
window.computeArrivalFuel = computeArrivalFuel;
window.computeArrivalFuelPerLeg = computeArrivalFuelPerLeg;
window.computeFlightInfo = computeFlightInfo;
