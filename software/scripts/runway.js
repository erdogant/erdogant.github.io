// ========================= RUNWAY CALCULATIONS =========================
// Runway performance calculations for takeoff and landing
// Based on POH data with corrections for wind, runway surface, slope, and safety

// Global state for POH models (similar to session_state in Python)
let POH_MODELS = {
  TAKEOFF_MODEL: null,
  TAKEOFF_MODEL_50ft: null,
  LANDING_MODEL: null,
  LANDING_MODEL_50ft: null,
};

// ========================= MAIN CALCULATION FUNCTION =========================
/**
 * Main function to calculate required runway distance with all corrections
 * @param {string} prefix - 'DEPARTURE' or 'ARRIVAL'
 * @param {string} runwayType - 'TAKEOFF' or 'LANDING'
 * @param {string} distanceType - 'distance' (threshold) or '50ft'
 * @returns {Object} - {distance: number, details: Object}
 */
function calculateRunwayDistance(prefix, runwayType, distanceType = "distance") {
  console.log(`> calculateRunwayDistance(${prefix}, ${runwayType}, ${distanceType})`);

  const results = {
    general: {
      type: prefix,
      runway_type: runwayType,
      distance_type: distanceType === "distance" ? "threshold" : "50 ft",
      // correction_factor: undefined,
    },
  };

  let distance;
  try {
    // Step 0: Add runway distance
    // let distance = getRunwayDistance(prefix, results);

    // Step 1: Get POH corrected distance
    distance = getPOHCorrectedDistance(prefix, distanceType, runwayType, results);

    // Step 2: Wind correction
    distance = applyWindCorrection(prefix, distance, results);

    // Step 3: Runway surface correction
    distance = applySurfaceCorrection(prefix, distance, results);

    // Step 4: Slope correction
    distance = applySlopeCorrection(prefix, distance, results);

    // Step 5: Safety factor
    distance = applyCorrectionFactor(prefix, distance, results);

    // Step 6: Runway corrected length
    applySafetyCorrection(prefix, results);

    // Store
    window.RUNWAY = results;
    // Return
    return { distance, details: results };
  } catch (error) {
    console.error("Error in calculateRunwayDistance:", error);
    return { distance: null, details: results, error: error.message };
  }
}

function applySafetyCorrection(prefix, results) {
  // Safety correction (to be computed over the runway length)
  const perfParams = getPerformanceParameters(prefix);
  let runwayLength = parseFloat(document.getElementById(`${prefix}_RUNWAY_LENGTH`).value);
  runwayLength = ft2meter(runwayLength);
  const safety_correction = perfParams.safety_correction;
  const runwayLengthCorrected = Math.round(runwayLength * safety_correction);
  const message = `Runway length (${runwayLength}m.) with safety correction (${safety_correction}): ${runwayLengthCorrected}m`;

  results.safety = {
    message: message,
    distance: runwayLengthCorrected,
    correction_factor: safety_correction,
  };
}

// RUNWAY DISTANCE
// function getRunwayDistance(prefix, results) {
//   // Add a 'default' (starting) entry capturing the POH-derived base distance
//   results.default = {
//     message: "Runway distance",
//     distance: results.distance,
//     correction_factor: undefined,
//   };
// }

// ========================= POH CORRECTION =========================
/**
 * Calculate distance based on POH data (altitude, temperature, weight)
 */
function getPOHCorrectedDistance(prefix, distanceType, runwayType, results) {
  // POH table is defined based on the MTOW
  const modelKey = `${runwayType}_MODEL${distanceType === "50ft" ? "_50ft" : ""}`;

  // Get or create model
  if (!POH_MODELS[modelKey]) {
    const pohData = getPOHData(runwayType);
    POH_MODELS[modelKey] = fitLinearModel(pohData, distanceType);
  }

  const model = POH_MODELS[modelKey];

  // Get current conditions
  let altitude = parseFloat(document.getElementById(`${prefix}_ELEVATION`).value);
  const temperature = parseFloat(document.getElementById(`${prefix}_TEMPERATURE`).value);
  // const weight = parseFloat(document.getElementById(`${prefix}_total_weight`).value);
  const weight = window.flight_plan_data?.AIRCRAFT?.MTOW;

  // Convert altitude elevation to meter
  // if (altitude !== null && altitude !== "") {
  //   altitude = meter2ft(altitude);
  // }

  // Make sure all distances are in meters
  // console.log(`HERE: ${runwayType}`);
  // console.log(results);
  // console.log(model);

  // Calculate distance using linear model
  const distance = Math.max(model.minDistance, model.altitude * altitude + model.temperature * temperature + model.intercept);
  const message = `POH corrected distance for with altitude (${altitude}ft), temperature (${temperature}°C) and MTOW (${weight}kg): ${Math.round(distance)}m`;
  console.log(`   >[${prefix}]` + message);

  if (results) {
    results.POH = {
      message,
      elevation: altitude,
      temperature,
      weight,
      distance,
      correction_factor: undefined,
    };
  }

  return distance;
}

// ========================= WIND CORRECTION =========================
function applyWindCorrection(prefix, distance, results) {
  const windDirection = parseFloat(document.getElementById(`${prefix}_WIND_DIRECTION`)?.value);
  const windStrength = parseFloat(document.getElementById(`${prefix}_WIND_STRENGTH`)?.value);
  const runwayNumber = document.getElementById(`${prefix}_RUNWAY_NR`)?.value;

  // Convert runway number to heading (e.g., "09" -> 90, "27" -> 270)
  const runwayDirection = correctRunwayNumber_js(runwayNumber) * 10;

  // Calculate headwind component
  const headwind = calculateHeadwind(windDirection, windStrength, runwayDirection);
  // const headwind = window.headwind(windDirection, windStrength, runwayDirection);
  console.log("applyWindCorrection vars:", { windDirection, windStrength, runwayNumber, runwayDirection, headwind });

  let correctionFactor = 1;
  let windType = "windstill";

  if (headwind === null || windStrength < 1) {
    correctionFactor = 1;
    windType = "No wind data";
  } else if (headwind > 0) {
    // Headwind correction - get from performance parameters
    const headwindInfluence = getPerformanceParam(prefix, "headwind_influence");
    correctionFactor = getWindCorrectionValue(headwind, headwindInfluence);
    windType = "headwind";
  } else {
    // Tailwind correction - increases required distance
    const tailwindInfluence = getPerformanceParam(prefix, "tailwind_influence");
    console.log(tailwindInfluence);
    correctionFactor = 1 + (Math.abs(headwind) / tailwindInfluence[0][0]) * tailwindInfluence[0][1];
    windType = "tailwind";
  }

  const newDistance = distance * correctionFactor;
  const message = `Correction for runway [${runwayNumber}] with [${windType}] (${Math.round(headwind)}kt): ${correctionFactor.toFixed(2)}. New distance: ${Math.round(newDistance)}m`;
  console.log(`   >[${prefix}]` + message);

  if (results) {
    results.wind = {
      message,
      direction: windDirection,
      strength: windStrength,
      runway: runwayDirection,
      headwind,
      headwind_or_tailwind: windType,
      correction_factor: correctionFactor,
      distance: newDistance,
    };
  }

  return newDistance;
}

/**
 * Calculate headwind component from wind and runway direction
 */
function calculateHeadwind(windDirection, windStrength, runwayDirection) {
  if (!windDirection || !windStrength || !runwayDirection) return null;

  // Calculate angle difference
  let angleDiff = Math.abs(windDirection - runwayDirection);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  // Calculate headwind component
  const headwind = windStrength * Math.cos((angleDiff * Math.PI) / 180);

  return headwind;
}

function getWindCorrectionValue(headwind, influenceData) {
  /**
   * Get wind correction value using linear interpolation
   */
  if (!influenceData || influenceData.length === 0) return 1;

  // Convert to numbers and sort by headwind value
  const data = influenceData.map((row) => [parseFloat(row[0]), parseFloat(row[1])]).sort((a, b) => a[0] - b[0]);

  // If headwind is less than minimum, return 1 (no correction)
  if (headwind < data[0][0]) return 1;

  // If headwind equals a data point exactly, return that value
  const exactMatch = data.find((d) => d[0] === headwind);
  if (exactMatch) return exactMatch[1];

  // Find the two points to interpolate between
  let lowerPoint = data[0];
  let upperPoint = data[data.length - 1];

  for (let i = 0; i < data.length - 1; i++) {
    if (headwind >= data[i][0] && headwind <= data[i + 1][0]) {
      lowerPoint = data[i];
      upperPoint = data[i + 1];
      break;
    }
  }

  // Linear interpolation between the two points
  const x0 = lowerPoint[0];
  const y0 = lowerPoint[1];
  const x1 = upperPoint[0];
  const y1 = upperPoint[1];

  // Handle case where both points are the same
  if (x1 === x0) return y0;

  return y0 + ((y1 - y0) * (headwind - x0)) / (x1 - x0);
}

// ========================= RUNWAY SURFACE CORRECTION =========================
/**
 * Apply runway surface correction based on surface type and condition
 */
function applySurfaceCorrection(prefix, distance, results) {
  const surface = document.getElementById(`${prefix}_RUNWAY_SURFACE`)?.value;
  const condition = document.getElementById(`${prefix}_RUNWAY_SLIPPERY`)?.value;
  const correctionFactor = getRunwayCorrectionFactor(prefix, surface, condition);

  // Apply the correction
  const newDistance = distance * correctionFactor;
  const message = `Correction factor for surface type [${surface}] with [${condition}]: ${correctionFactor}. New distance: ${Math.round(newDistance)}m`;
  console.log(`   >[${prefix}]` + message);

  if (results) {
    results.runway = {
      message,
      surface,
      condition,
      correction_factor: correctionFactor,
      distance: newDistance,
    };
  }

  return newDistance;
}

/**
 * Get runway correction factor based on surface and condition
 */
function getRunwayCorrectionFactor(prefix, surface, condition) {
  const perfParams = getPerformanceParameters(prefix);

  const key = `${surface}_${condition}`;
  const correctionMap = {
    hard_dry: perfParams.hard_dry,
    hard_wet: perfParams.hard_wet,
    soft_dry: perfParams.soft_dry,
    soft_wet: perfParams.soft_wet,
    other_dry: perfParams.other_dry,
    other_wet: perfParams.other_wet,
  };

  return correctionMap[key];
}

// ========================= SLOPE CORRECTION =========================
/**
 * Apply slope correction
 */
function applySlopeCorrection(prefix, distance, results) {
  const slopePercentage = parseFloat(document.getElementById(`${prefix}_RUNWAY_SLOPE`)?.value);
  const perfParams = getPerformanceParameters(prefix);
  const slope_factor = perfParams.slope_factor;

  // Calculate slope correction
  const slopeCorrection = slopePercentage * slope_factor;
  let newDistance = distance;

  if (slopeCorrection > 0) {
    newDistance = distance * (1 + slopeCorrection);
  }

  const message = `Correction factor for slope [angle: ${slopePercentage}%, factor: ${slope_factor}]: ${slopeCorrection.toFixed(3)}. New distance: ${Math.round(newDistance)}m`;
  console.log(`   >[${prefix}]` + message);

  if (results) {
    results.slope = {
      message,
      slope_angle: slopePercentage,
      slope_factor: slope_factor,
      correction_factor: slopeCorrection,
      distance: newDistance,
    };
  }

  return newDistance;
}

// ========================= SAFETY CORRECTION =========================
/**
 * Apply safety factor
 */
function applyCorrectionFactor(prefix, distance, results) {
  const perfParams = getPerformanceParameters(prefix);
  // Correction factor (to be computed over the final corrected length)
  const correction_factor = perfParams.correction_factor;

  const newDistance = distance * correction_factor;
  const message = `Correction correction factor: ${correction_factor}. New distance: ${Math.round(newDistance)}m`;
  console.log(`   >[${prefix}]` + message);

  if (results) {
    results.correction = {
      message,
      correction_factor: correction_factor,
      distance: newDistance,
    };
  }

  return newDistance;
}

// ========================= HELPER FUNCTIONS =========================

/**
 * Get performance parameters for the aircraft
 */
function getPerformanceParameters(prefix) {
  const runwayType = prefix === "DEPARTURE" ? "TAKEOFF" : "LANDING";

  let POHdata;
  if (runwayType === "TAKEOFF") {
    POHdata = window.flight_plan_data?.AIRCRAFT?.TAKEOFF;
  } else {
    POHdata = window.flight_plan_data?.AIRCRAFT?.LANDING;
  }

  // console.log(`HERE5: ${runwayType}`);
  // console.log(window.flight_plan_data?.AIRCRAFT?.MTOW);
  // console.log(POHdata);

  return {
    // Surface corrections
    hard_dry: POHdata.runway_hard_dry ?? 0,
    hard_wet: POHdata.runway_hard_wet ?? 0,
    soft_dry: POHdata.runway_soft_dry ?? 0,
    soft_wet: POHdata.runway_soft_wet ?? 0,
    other_dry: POHdata.runway_custom_dry ?? 0,
    other_wet: POHdata.runway_custom_wet ?? 0,
    // Slope correction
    slope_factor: POHdata.runway_slope_paved ?? 0,
    // Correction factor (to be computed over the final corrected length)
    correction_factor: POHdata.runway_correction_factor ?? 0,
    // Safety correction (to be computed over the original runway length)
    safety_correction: POHdata.runway_safety_correction,
    // Wind influence (headwind kt, correction factor)
    headwind_influence: [
      [POHdata.headwind_kts_0 ?? 0, POHdata.headwind_cor_0 ?? 0],
      [POHdata.headwind_kts_1 ?? 0, POHdata.headwind_cor_1 ?? 0],
      [POHdata.headwind_kts_2 ?? 0, POHdata.headwind_cor_2 ?? 0],
      [POHdata.headwind_kts_3 ?? 0, POHdata.headwind_cor_3 ?? 0],
    ],

    // Tailwind influence (kt per unit, correction per unit)
    tailwind_influence: [[POHdata.tailwind_kts ?? 0, POHdata.tailwind_cor ?? 0]],
  };
}

/**
 * Get specific performance parameter
 */
function getPerformanceParam(prefix, paramName) {
  const params = getPerformanceParameters(prefix);
  return params[paramName];
}

/**
 * Get POH data for the aircraft
 */
function getPOHData(prefix) {
  // This should get POH data from your aircraft configuration
  // For now, returning example data for Robin 400
  // altitude: ft
  // temparture in degrees celcius
  // distance in meters
  // 50ft in meters
  const runwayType = prefix === "DEPARTURE" ? "TAKEOFF" : "LANDING";

  if (runwayType === "TAKEOFF") {
    return {
      altitude: [0, 0, 0, 1000, 1000, 1000, 2000, 2000, 2000, 3000, 3000, 3000, 4000, 4000, 4000],
      temperature: [15, 25, 35, 15, 25, 35, 15, 25, 35, 15, 25, 35, 15, 25, 35],
      // weight: [980, 980, 980, 980, 980, 980, 980, 980, 980, 980, 980, 980, 980, 980, 980],
      distance: [240, 260, 280, 260, 270, 290, 270, 290, 310, 280, 300, 320, 300, 320, 340],
      "50ft": [440, 480, 520, 470, 500, 540, 490, 530, 570, 510, 550, 590, 540, 580, 630],
    };
  } else {
    return {
      altitude: [0, 0, 0, 2000, 2000, 2000, 3000, 3000, 3000, 4000, 4000, 4000],
      temperature: [-5, 15, 35, -9, 11, 31, -11, 9, 29, -13, 7, 27],
      // weight: [980, 980, 980, 980, 980, 980, 980, 980, 980, 980, 980, 980],
      distance: [266, 282, 298, 277, 294, 310, 284, 301, 318, 291, 308, 326],
      "50ft": [479, 507, 535, 498, 528, 558, 510, 541, 572, 527, 559, 591],
    };
  }
}

/**
 * Fit linear regression model to POH data
 */
function fitLinearModel(pohData, yName) {
  const X = pohData.altitude.map((alt, i) => [alt, pohData.temperature[i]]);
  const y = pohData[yName];

  // Simple multiple linear regression
  const n = X.length;
  const k = 2; // number of features

  // Calculate means
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const meanX = [0, 1, 2].map((j) => X.reduce((sum, row) => sum + row[j], 0) / n);

  // Build normal equations (X'X and X'y)
  const XtX = Array(k + 1)
    .fill(0)
    .map(() => Array(k + 1).fill(0));
  const Xty = Array(k + 1).fill(0);

  for (let i = 0; i < n; i++) {
    const xi = [1, ...X[i]]; // Add intercept term
    for (let j = 0; j <= k; j++) {
      Xty[j] += xi[j] * y[i];
      for (let l = 0; l <= k; l++) {
        XtX[j][l] += xi[j] * xi[l];
      }
    }
  }

  // Solve using Gaussian elimination (simplified for 4x4)
  const coeffs = solveLinearSystem(XtX, Xty);

  return {
    intercept: coeffs[0],
    altitude: coeffs[1],
    temperature: coeffs[2],
    minDistance: Math.min(...y),
  };
}

/**
 * Solve linear system Ax = b using Gaussian elimination
 */
function solveLinearSystem(A, b) {
  const n = b.length;
  const augmented = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];

    if (Math.abs(augmented[i][i]) < 1e-12) {
      console.warn("Singular matrix: check for collinearity");
    }
  }

  return x;
}

// ========================= UI UPDATE FUNCTIONS =========================

/**
 * Update the UI with calculation results
 */
function updateRunwayCalculationUI(prefix) {
  const runwayType = prefix === "DEPARTURE" ? "TAKEOFF" : "LANDING";

  // Calculate both threshold and 50ft distances
  const resultThreshold = calculateRunwayDistance(prefix, runwayType, "distance");
  const result50ft = calculateRunwayDistance(prefix, runwayType, "50ft");

  // Update display elements
  document.getElementById(`${prefix}_DISTANCE_REQUIRED`)?.setAttribute("value", Math.round(resultThreshold.distance));
  document.getElementById(`${prefix}_DISTANCE_REQUIRED_50ft`)?.setAttribute("value", Math.round(result50ft.distance));

  // Log results
  console.log("Threshold distance:", resultThreshold);
  console.log("50ft distance:", result50ft);

  // You can also update status messages, warnings, etc.
  displayCalculationResults(prefix, resultThreshold, result50ft);

  return { resultThreshold, result50ft };
}

/**
 * Display calculation results in UI
 */
function displayCalculationResults(prefix, resultThreshold, result50ft) {
  let runwayLength = parseFloat(document.getElementById(`${prefix}_RUNWAY_LENGTH`)?.value);
  runwayLength = ft2meter(runwayLength);
  const perfParams = getPerformanceParameters(prefix);
  const correctedRunwayLength = runwayLength * perfParams.safety_correction;

  // Create status message
  let statusHtml = '<div style="margin-top: 10px;">';

  // Threshold check
  const thresholdOK = resultThreshold.distance < correctedRunwayLength;
  statusHtml += `<div style="color: ${thresholdOK ? "green" : "red"}; font-weight: bold;">`;
  statusHtml += `Threshold: ${Math.round(resultThreshold.distance)}m / ${Math.round(correctedRunwayLength)}m ${thresholdOK ? "✓" : "✗"}`;
  statusHtml += "</div>";

  // 50ft check
  const ft50OK = result50ft.distance < correctedRunwayLength;
  statusHtml += `<div style="color: ${ft50OK ? "green" : "red"}; font-weight: bold;">`;
  statusHtml += `50ft: ${Math.round(result50ft.distance)}m / ${Math.round(correctedRunwayLength)}m ${ft50OK ? "✓" : "✗"}`;
  statusHtml += "</div>";

  statusHtml += "</div>";

  // Update status element if it exists
  const statusElement = document.getElementById(`${prefix}_RUNWAY_STATUS`);
  if (statusElement) {
    statusElement.innerHTML = statusHtml;
  }
}

// ========================== COMPUTE RUNWAY SURFACE ==========================
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

  // Create runway image
  // buildRunwayOverviewSvg(prefix);

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

function load_performance_defaults(name) {
  // Default values for takeoff performance
  const defaults = {};
  defaults[`${name}_headwind_kts_0`] = 0;
  defaults[`${name}_headwind_cor_0`] = 0.85;
  defaults[`${name}_headwind_kts_1`] = 10;
  defaults[`${name}_headwind_cor_1`] = 0.85;
  defaults[`${name}_headwind_kts_2`] = 20;
  defaults[`${name}_headwind_cor_2`] = 0.65;
  defaults[`${name}_headwind_kts_3`] = 30;
  defaults[`${name}_headwind_cor_3`] = 0.55;
  defaults[`${name}_tailwind_kts`] = 2;
  defaults[`${name}_tailwind_cor`] = 1.1;
  defaults[`${name}_runway_slope_paved`] = 0.05;
  defaults[`${name}_runway_hard_dry`] = 1;
  defaults[`${name}_runway_hard_wet`] = 1.05;
  defaults[`${name}_runway_soft_dry`] = 1.15;
  defaults[`${name}_runway_soft_wet`] = 1.25;
  defaults[`${name}_runway_custom_dry`] = 1.15;
  defaults[`${name}_runway_custom_wet`] = 1.25;

  if (name === "landing") {
    defaults[`${name}_runway_correction_factor`] = 1.43;
    defaults[`${name}_runway_safety_correction`] = 0.7;
  } else {
    defaults[`${name}_runway_correction_factor`] = 1.25;
    defaults[`${name}_runway_safety_correction`] = 1;
  }

  for (const [id, value] of Object.entries(defaults)) {
    const el = document.getElementById(id);
    if (el) {
      el.value = value;
    }
  }
}

function correctRunwayNumber_js(runwayDirection, format = false) {
  // Normalize to string
  let val = String(runwayDirection);

  // Keep only digits
  val = val.replace(/\D+/g, "");

  // Convert to integer
  const num = parseInt(val, 10);

  // Validate runway range 0–36
  if (isNaN(num) || num < 0 || num > 36) {
    return runwayDirection;
  }

  // If format=false → return integer
  if (!format) {
    return num;
  }

  // If format=true → return 2-digit string
  return num.toString().padStart(2, "0");
}
// function correctRunwayNumber_js(runwayDirection) {
//   return formatRunwayNumber(String(runwayDirection));
// }

// function formatRunwayInput(input) {
//   let val = input.value.toUpperCase();

//   // Strip invalid characters immediately
//   val = val.replace(/[^0-9LRC]/g, "");

//   // Split numeric part and optional suffix
//   let match = val.match(/^(\d{0,2})([LRC]?)$/);
//   if (!match) {
//     input.value = "";
//     return;
//   }

//   let numStr = match[1];
//   let suffix = match[2] || "";

//   // Allow empty / partial input
//   if (numStr === "") {
//     input.value = suffix;
//     return;
//   }

//   let num = parseInt(numStr, 10);

//   // Hard clamp, but do NOT reformat while typing
//   if (num > 36) {
//     input.value = "36" + suffix;
//     return;
//   }

//   input.value = numStr + suffix;
// }

// function finalizeRunwayInput(input) {
//   input.value = formatRunwayNumber(input.value);
// }

// function formatRunwayNumber(value) {
//   if (typeof value !== "string") value = String(value);

//   const match = value
//     .toUpperCase()
//     .trim()
//     .match(/^(\d{1,2})([LRC]?)$/);
//   if (!match) return "";

//   const num = parseInt(match[1], 10);
//   if (num < 0 || num > 36) return "";

//   return String(num).padStart(2, "0") + (match[2] || "");
// }

// ========================== BUILD RUNWAY SVG ==========================
//
// const RUNWAY_HALF_WIDTH = 2; // rect width = 4
// const RUNWAY_HALF_LENGTH = 20; // rect height = 40
// const CROP_PADDING = 8;
//
// function buildRunwayOverviewSvg(prefix) {
//   console.log(`> func: buildRunwayOverviewSvg(${prefix})`);
//   let runwayProps = window.flight_plan_data[`${prefix}_RUNWAY_PROPERTIES`];

//   // Convert to dict in case of string
//   if (typeof runwayProps === "string" || typeof runwayProps === "undefined" || runwayProps === null) {
//     runwayProps = Py2Js(runwayProps);
//   }
//   if (!Array.isArray(runwayProps)) {
//     console.warn(`   >Runway properties are missing: ${runwayProps}`);
//     svg = `<svg></svg>`;
//     document.getElementById(`${prefix}_RUNWAY_SVG`).innerHTML = svg;
//     return;
//   }

//   const geometry = extractRunwayGeometry(runwayProps);
//   const points = normalizeAndCenterToSvg(geometry);
//   const bounds = computeSvgBounds(points);
//   const rects = buildRunwaySvgRects(points);
//   // const rects = buildRunwaySvgElements(points);

//   svg = `
//     <svg
//       viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}"
//       preserveAspectRatio="xMinYMin slice"
//       style="display:block; width:100%; height:auto;"
//     >
//       ${rects}
//     </svg>
//   `;

//   // Plot the runways
//   document.getElementById(`${prefix}_RUNWAY_SVG`).innerHTML = svg;
// }

// function buildRunwaySvgElements(runways) {
//   return runways
//     .map((rwy) => {
//       const { cx, cy, length, width, heading, label } = rwy;

//       return `
//       <!-- Runway -->
//       <rect
//         x="${cx - length / 2}"
//         y="${cy - width / 2}"
//         width="${length}"
//         height="${width}"
//         fill="#444"
//         rx="${width * 0.15}"
//         transform="rotate(${heading} ${cx} ${cy})"
//       />

//       <!-- Runway number -->
//       <text
//         x="${cx}"
//         y="${cy}"
//         fill="white"
//         font-size="${width * 0.7}"
//         font-family="Arial, sans-serif"
//         font-weight="bold"
//         text-anchor="middle"
//         dominant-baseline="middle"
//         transform="rotate(${heading} ${cx} ${cy})"
//         pointer-events="none"
//       >
//         ${label}
//       </text>
//     `;
//     })
//     .join("");
// }

// function extractRunwayGeometry(runways) {
//   return runways
//     .map((rwy) => {
//       const nums = rwy.number;
//       if (!nums || nums.length < 2) return null;

//       const a = rwy[nums[0]];
//       const b = rwy[nums[1]];

//       if (!a?.latlon || !b?.latlon) return null;

//       const lat = (a.latlon[0] + b.latlon[0]) / 2;
//       const lon = (a.latlon[1] + b.latlon[1]) / 2;

//       const heading = parseFloat(a.heading ?? rwy.surface?.heading ?? 0);

//       return {
//         id: rwy.id,
//         lat,
//         lon,
//         heading,
//         surface: rwy.surface?.surface ?? "other",
//       };
//     })
//     .filter(Boolean);
// }

// function normalizeAndCenterToSvg(points, size = 200, padding = 20) {
//   const lats = points.map((p) => p.lat);
//   const lons = points.map((p) => p.lon);

//   const minLat = Math.min(...lats);
//   const maxLat = Math.max(...lats);
//   const minLon = Math.min(...lons);
//   const maxLon = Math.max(...lons);

//   // First: normalize to [0, size - 2*padding]
//   const normalized = points.map((p) => ({
//     ...p,
//     x: ((p.lon - minLon) / (maxLon - minLon || 1)) * (size - 2 * padding),
//     y: ((maxLat - p.lat) / (maxLat - minLat || 1)) * (size - 2 * padding),
//   }));

//   // Compute centroid of normalized points
//   const cx = normalized.reduce((s, p) => s + p.x, 0) / normalized.length;
//   const cy = normalized.reduce((s, p) => s + p.y, 0) / normalized.length;

//   const targetCx = size / 2;
//   const targetCy = size / 2;

//   const dx = targetCx - cx;
//   const dy = targetCy - cy;

//   // Second: translate everything so centroid is centered
//   return normalized.map((p) => ({
//     ...p,
//     x: p.x + dx,
//     y: p.y + dy,
//   }));
// }

// function computeSvgBounds(points) {
//   let minX = Infinity;
//   let minY = Infinity;
//   let maxX = -Infinity;
//   let maxY = -Infinity;

//   points.forEach((p) => {
//     // max radius from center after rotation
//     const r = Math.hypot(RUNWAY_HALF_WIDTH, RUNWAY_HALF_LENGTH);

//     minX = Math.min(minX, p.x - r);
//     maxX = Math.max(maxX, p.x + r);
//     minY = Math.min(minY, p.y - r);
//     maxY = Math.max(maxY, p.y + r);
//   });

//   return {
//     minX: minX - CROP_PADDING,
//     minY: minY - CROP_PADDING,
//     width: maxX - minX + 2 * CROP_PADDING,
//     height: maxY - minY + 2 * CROP_PADDING,
//   };
// }

// function surfaceToColor(surface) {
//   if (surface.includes("asphalt") || surface.includes("concrete")) {
//     return "#666666"; // hard
//   }
//   if (surface.includes("grass")) {
//     return "#8BC34A"; // soft
//   }
//   return "#2196F3"; // other
// }

// function buildRunwaySvgRects(runwayPoints) {
//   return runwayPoints
//     .map((p) => {
//       const color = surfaceToColor(p.surface);

//       return `
//       <g transform="translate(${p.x}, ${p.y}) rotate(${p.heading})">
//         <rect x="-2" y="-20" width="4" height="40"
//               fill="${color}"
//               stroke="#333"
//               stroke-width="1"
//               fill-opacity="0.85"/>
//       </g>
//     `;
//     })
//     .join("\n");
// }
// ========================= EXPORTS =========================

window.getRunwaySettings = getRunwaySettings;
window.setRunwaySurface = setRunwaySurface;
window.load_performance_defaults = load_performance_defaults;
// window.buildRunwayOverviewSvg = buildRunwayOverviewSvg;
// window.setRunwayProperties = setRunwayProperties;

// Make functions available globally
window.calculateRunwayDistance = calculateRunwayDistance;
window.updateRunwayCalculationUI = updateRunwayCalculationUI;
window.getPOHCorrectedDistance = getPOHCorrectedDistance;
window.applyWindCorrection = applyWindCorrection;
window.applySurfaceCorrection = applySurfaceCorrection;
window.applySlopeCorrection = applySlopeCorrection;
window.applyCorrectionFactor = applyCorrectionFactor;
window.correctRunwayNumber_js = correctRunwayNumber_js;
