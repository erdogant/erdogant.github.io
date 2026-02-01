/** =====================================================================================
 * CREATE HTML RESULTS TO DISPLAY
========================================================================================= */
function remove_runway_plot_Js(prefix, action = "empty", message = null, submessage = null) {
  document.getElementById(`${prefix}_RUNWAY_THRESHOLD`).innerHTML = "";
  document.getElementById(`${prefix}_RUNWAY_THRESHOLD_50ft`).innerHTML = "";
  document.getElementById(`${prefix}_RUNWAY_PLOT`).innerHTML = "";
  document.getElementById(`${prefix}_RUNWAY_TABLE`).innerHTML = "";
  document.getElementById(`${prefix}_RUNWAY_CONDITION`).innerHTML = "";
  element = document.getElementById(`${prefix}_RUNWAY_MESSAGE`);

  // Set default message
  if (!message) {
    message = `
      Please select aerodome, aircraft and set the requierd details such as runway with the POH information to compute the required runway length.
      Use this information only as an educational aid. Always do your own research, check the weight and balance from official sources.
      `;
  }

  if (submessage !== null) {
    messageContent = `
      <div style="padding: 10px; background: ${WARNINGCOLOR}; border: 1px solid ${WARNINGCOLORDARK}; border-radius: 10px; text-align: center;">
      <div style="color:  ${WARNINGCOLORTEXT};">${message}</div>
      <div style="color:  ${WARNINGCOLORTEXT};">
        <small>${submessage}</small>
      </div>
    </div>
      `;
  } else {
    messageContent = `
      <div style="padding: 10px; background: ${WARNINGCOLOR}; border: 1px solid ${WARNINGCOLORDARK}; border-radius: 10px; text-align: center;">
        <div style="color: ${WARNINGCOLORTEXT};">
          <small>${message}</small>
        </div>
      </div>
      `;
  }

  element.innerHTML = messageContent;
  // Color the collapsible menu
  colorRunwayMenu(prefix, action);
}

function colorRunwayMenu(prefix, action = "default") {
  if (!prefix) {
    console.error("Assertion failed: prefix is required in colorRunwayMenu");
    return;
  }
  const element = document.getElementById(`${prefix}_RUNWAY_MENU`);
  // let icon = "🛬";
  let icon = "✅";
  let color = DEFAULTCOLOR;

  if (action === "warning") {
    icon = "⚠";
    color = WARNINGCOLOR;
  } else if (action === "danger") {
    icon = "❗";
    color = DANGERCOLOR;
  } else if (action === "empty") {
    icon = "⚠";
    color = EMPTYCOLOR;
  }

  element.style.backgroundColor = color;
  element.textContent = `${icon} RUNWAY`;
}

function checkRequiredParameters(prefix) {
  console.log(`> func: checkRequiredParameters(${prefix})`);
  // The first check is whether aircraft data is loaded
  const aircraft = Py2Js(window.flight_plan_data?.AIRCRAFT);
  console.log("window.flight_plan_data.AIRCRAFT:");
  console.log(aircraft);

  // Check whether aircraft is loaded with its parameters
  if (aircraft?.CALLSIGN === null || aircraft?.CALLSIGN === undefined || aircraft?.CALLSIGN === "") {
    const title = "Aircraft details are missing.";
    const message = "Specify the details for your aircraft.<br>☰ More → 📐 Aircraft Specifications).";
    remove_runway_plot_Js(prefix, "empty", title, message);
    return { params_OK: false, message: title + " " + message };
  }

  // Check MTOW
  if (aircraft?.MTOW === null || aircraft?.MTOW === undefined || aircraft?.MTOW === "" || parseFloat(aircraft?.MTOW === 0)) {
    const title = "MTOW is missing or empty.";
    const message = "Specify MTOW for your aircraft.<br>☰ More → 📐 Aircraft Specifications).";
    remove_runway_plot_Js(prefix, "empty", title, message);
    return { params_OK: false, message: title + " " + message };
  }

  // Define validation rules with their error messages
  const validations = [
    {
      id: `${prefix}_ICAO`,
      title: `Aerodrome is missing.`,
      message: `Select and load the ${prefix.toLowerCase()} ICAO code first.`,
    },
    {
      id: `${prefix}_WIND_DIRECTION`,
      title: "Wind direction is missing.",
      message: `Retrieve METAR information or set the wind direction manually.`,
    },
    {
      id: `${prefix}_WIND_STRENGTH`,
      title: "Wind strength is missing.",
      message: `Retrieve METAR information or set the wind strength manually.`,
    },
    {
      id: `${prefix}_ELEVATION`,
      title: "Field elevation is missing.",
      message: `Set the field elevation (ft).`,
    },
    {
      id: `${prefix}_RUNWAY_NR`,
      title: "Runway is missing.",
      message: `Retrieve METAR information or set the runway manually.`,
    },
    {
      id: `${prefix}_RUNWAY_LENGTH`,
      title: `Runway length is missing.`,
      message: `Set the runway length manually.`,
      validate: (value) => value && parseFloat(value) > 0,
    },
    {
      id: `${prefix}_WEIGHT_FUEL_LITERS`,
      title: `Fuel (liters) is undefined.`,
      message: `Set the required aircraft fuel amount.`,
      validate: (value) => value && parseFloat(value) > 0,
    },
    {
      id: `${prefix}_WEIGHT_PILOT`,
      title: "Weights for pilot/passengers/baggage are undefined.",
      message: `Set the expected weights for pilot, passengers, and baggage.`,
      validate: (value) => value && parseFloat(value) > 0,
    },
    {
      id: `${prefix}_RUNWAY_SLOPE`,
      title: "Runway slope is undefined.",
      message: `Set the runway slope percentage (%).`,
    },
    {
      id: `${prefix}_RUNWAY_SURFACE`,
      title: "Runway surface is undefined.",
      message: `Set the runway surface: soft/hard/other.`,
    },
    {
      id: `${prefix}_RUNWAY_SLIPPERY`,
      title: "Runway weather condition is undefined.",
      message: "Set the runway weather condition: wet or dry.",
    },
    {
      id: `${prefix}_TEMPERATURE`,
      title: "Temperature is missing.",
      message: "Set the temperature.",
    },
  ];

  // Run through all validations
  for (const rule of validations) {
    const element = document.getElementById(rule.id);
    const value = element?.value;

    // Check if not empty but also if the value is above the threshold of 0
    let isValid = rule.validate ? rule.validate(value) : value && value.trim() !== "";

    if (!isValid) {
      remove_runway_plot_Js(prefix, "empty", rule.title, rule.message);
      return { params_OK: false, message: rule.title + " " + rule.message };
    }
  }

  // All validations passed
  return { params_OK: true, message: "" };
}

function displayRunwayResultsDiv(prefix) {
  console.log("> func: displayRunwayResultsDiv()");
  let runwayLength = parseFloat(document.getElementById(`${prefix}_RUNWAY_LENGTH`)?.value);
  runwayLength = ft2meter(runwayLength);

  const containerMessage = document.getElementById(`${prefix}_RUNWAY_MESSAGE`);
  const containerThr = document.getElementById(`${prefix}_RUNWAY_THRESHOLD`);
  const container50ft = document.getElementById(`${prefix}_RUNWAY_THRESHOLD_50ft`);
  const containerPlot = document.getElementById(`${prefix}_RUNWAY_PLOT`);
  const containerTable = document.getElementById(`${prefix}_RUNWAY_TABLE`);
  // const elementMinDistance = document.getElementById(`${prefix}_RUNWAY_MINDISTANCE`);

  // Setup required variables
  const runwayType = prefix === "DEPARTURE" ? "TAKEOFF" : "LANDING";
  const resultThreshold = window.calculateRunwayDistance(prefix, runwayType, "distance");
  const result50ft = window.calculateRunwayDistance(prefix, runwayType, "50ft");

  // Make check
  if (!resultThreshold || !result50ft) {
    containerThr.innerHTML = '<p style="color: red;">Unable to calculate runway performance</p>';
    container50ft.innerHTML = '<p style="color: red;">Unable to calculate runway performance</p>';
    return;
  }

  // Make runway input checks
  const checks = checkRequiredParameters(prefix);
  if (!checks.params_OK) {
    return;
  }

  const perfParams = window.getPerformanceParameters(prefix);
  // runwayLength must be in meters(!)
  const availableLength = Math.round(runwayLength * perfParams.safety_correction);
  const requiredThreshold = Math.round(resultThreshold.distance);
  const required50ft = Math.round(result50ft.distance);
  // Compute
  const thresholdOK = requiredThreshold < availableLength;
  const ft50OK = required50ft < availableLength;

  // Show available runway
  // elementMinDistance.innerHTML = createRunwayDistanceTextbox(availableLength);

  // Messagebox
  containerMessage.innerHTML = createRunwayMessage(prefix, requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK);
  // Show available distance for threshold
  containerThr.innerHTML = createThresholdTextbox(requiredThreshold, thresholdOK, availableLength);
  // Show available distance for 50ft threshold
  container50ft.innerHTML = createThreshold50ftTextbox(required50ft, ft50OK, availableLength);
  //Runwayplot
  containerPlot.innerHTML = createRunwayPlot(prefix, requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK, runwayLength);
  // Table computation details
  containerTable.innerHTML = createRunwayTable(resultThreshold, result50ft);
}

/**
 * Draw runway results visualization on canvas
 */
function drawRunwayResultsCanvas(canvas, prefix, resultThreshold, result50ft) {
  const ctx = canvas.getContext("2d");

  // Set canvas size
  const width = canvas.offsetWidth || 600;
  const height = 400;
  canvas.width = width;
  canvas.height = height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Get runway length
  const runwayLength = parseFloat(document.getElementById(`${prefix}_RUNWAY_LENGTH`)?.value);

  // Check if runway length is valid
  if (runwayLength <= 0) {
    containerMessage.innerHTML = `
      <div style="margin-top: 15px; padding: 10px; background: ${DANGERCOLOR}; border: 1px solid ${DANGERCOLORDARK}; border-radius: 4px;">
        <strong style="color: ${DANGERCOLORTEXT};">⚠️ Warning:</strong>
        <div style="color: ${DANGERCOLORTEXT}; margin-top: 5px;">
          Please enter a valid runway length.
        </div>
      </div>
    `;
    return;
  }
  const perfParams = window.getPerformanceParameters(prefix);
  // runwayLength must be in meters(!)
  const availableLength = Math.round(ft2meter(runwayLength) * perfParams.safety_correction);

  const requiredThreshold = Math.round(resultThreshold.distance);
  const required50ft = Math.round(result50ft.distance);

  // Calculate status
  const thresholdOK = requiredThreshold < availableLength;
  const ft50OK = required50ft < availableLength;

  // Draw title
  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(`Runway Performance - ${prefix}`, width / 2, 30);

  // Draw runway visualization
  drawRunwayBar(ctx, width, 60, availableLength, requiredThreshold, required50ft, thresholdOK, ft50OK);

  // Draw breakdown table
  drawBreakdownTable(ctx, width, 180, resultThreshold, result50ft);

  // Draw legend
  drawLegend(ctx, width, height - 40);
}

/**
 * Draw runway length bar visualization
 */
function drawRunwayBar(ctx, width, y, available, threshold, ft50, thresholdOK, ft50OK) {
  const barHeight = 60;
  const margin = 80;
  const barWidth = width - 2 * margin;

  // Calculate scale
  const maxDistance = Math.max(available, threshold, ft50);
  const scale = barWidth / maxDistance;

  // Draw available runway
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(margin, y, available * scale, barHeight);

  // Draw available runway border
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, y, available * scale, barHeight);

  // Draw threshold required
  const thresholdWidth = Math.min(threshold * scale, barWidth);
  ctx.fillStyle = thresholdOK ? "#4CAF80" : "#F44336";
  ctx.fillRect(margin, y + 5, thresholdWidth, 20);

  // Draw 50ft required
  const ft50Width = Math.min(ft50 * scale, barWidth);
  ctx.fillStyle = ft50OK ? RUNWAYREQCOLOR + "80" : "#FF980080";
  ctx.fillRect(margin, y + 35, ft50Width, 20);

  // Labels
  ctx.font = "12px Arial";
  ctx.fillStyle = "#333";
  ctx.textAlign = "left";

  // Available runway label
  ctx.fillText(`Available: ${available}m`, margin, y - 5);

  // Threshold label
  ctx.fillText(`Threshold: ${threshold}m ${thresholdOK ? "✓" : "✗"}`, margin, y + 20);

  // 50ft label
  ctx.fillText(`50ft: ${ft50}m ${ft50OK ? "✓" : "✗"}`, margin, y + 50);

  // Scale markers
  drawScaleMarkers(ctx, margin, y + barHeight + 5, barWidth, maxDistance);
}

/**
 * Draw scale markers below the bar
 */
function drawScaleMarkers(ctx, x, y, width, maxDistance) {
  ctx.strokeStyle = "#999";
  ctx.lineWidth = 1;
  ctx.font = "10px Arial";
  ctx.fillStyle = "#666";
  ctx.textAlign = "center";

  const numMarkers = 5;
  const step = maxDistance / numMarkers;
  const stepWidth = width / numMarkers;

  for (let i = 0; i <= numMarkers; i++) {
    const xPos = x + i * stepWidth;
    const distance = Math.round(i * step);

    // Draw tick
    ctx.beginPath();
    ctx.moveTo(xPos, y);
    ctx.lineTo(xPos, y + 5);
    ctx.stroke();

    // Draw label
    ctx.fillText(`${distance}m`, xPos, y + 18);
  }
}

/**
 * Draw calculation breakdown table
 */
function drawBreakdownTable(ctx, width, y, resultThreshold, result50ft) {
  ctx.font = "bold 14px Arial";
  ctx.fillStyle = "#333";
  ctx.textAlign = "left";
  ctx.fillText("Calculation Breakdown:", 20, y);

  y += 25;

  // Table headers
  ctx.font = "bold 12px Arial";
  ctx.fillStyle = "#555";
  ctx.fillText("Step", 20, y);
  ctx.fillText("Threshold", 180, y);
  ctx.fillText("50ft", 280, y);
  ctx.fillText("Factor", 360, y);

  y += 5;

  // Draw horizontal line
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, y);
  ctx.lineTo(width - 20, y);
  ctx.stroke();

  y += 15;

  // Draw rows
  const steps = [
    { name: "POH", data: "POH" },
    { name: "Wind", data: "wind" },
    { name: "Runway", data: "runway" },
    { name: "Slope", data: "slope" },
    { name: "Correction", data: "correction" },
  ];

  ctx.font = "11px Arial";
  ctx.fillStyle = "#333";

  // console.log("HERE1");
  // console.log(`   >Working on ${resultThreshold}`);
  // console.log(`   >Working on ${result50ft}`);

  // console.log("HERE2");
  steps.forEach((step, index) => {
    const thresholdData = resultThreshold.details[step.data];
    const ft50Data = result50ft.details[step.data];
    // console.log(`   >Working on ${step}, ${thresholdData}. ${ft50Data}`);

    if (thresholdData) {
      const rowY = y + index * 20;
      // Step name
      ctx.fillText(step.name, 20, rowY);
      // Threshold distance
      ctx.fillText(`${Math.round(thresholdData.distance)}m`, 180, rowY);
      // 50ft distance
      ctx.fillText(`${Math.round(ft50Data.distance)}m`, 280, rowY);
      // Correction factor
      if (thresholdData.correction_factor !== undefined) {
        ctx.fillText(`×${thresholdData.correction_factor.toFixed(2)}`, 360, rowY);
      } else {
        ctx.fillText("-", 360, rowY);
      }
    }
  });
}

/**
 * Draw legend
 */
function drawLegend(ctx, width, y) {
  ctx.font = "11px Arial";
  ctx.textAlign = "left";

  const items = [
    { color: "rgba(76, 175, 80, 0.5)", text: "Threshold OK" },
    { color: "rgba(244, 67, 54, 0.5)", text: "Threshold Insufficient" },
    { color: "rgba(33, 150, 243, 0.5)", text: "50ft OK" },
    { color: "rgba(255, 152, 0, 0.5)", text: "50ft Insufficient" },
  ];

  const startX = 20;
  const boxSize = 12;
  let x = startX;

  items.forEach((item, index) => {
    // Draw color box
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y - boxSize / 2, boxSize, boxSize);
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y - boxSize / 2, boxSize, boxSize);

    // Draw text
    ctx.fillStyle = "#555";
    ctx.fillText(item.text, x + boxSize + 5, y + 3);

    // Move to next position (2 items per row)
    if (index % 2 === 0) {
      x += 180;
    } else {
      x = startX;
      y += 20;
    }
  });
}

//  ======================================= CREATE AVAILABLE DISTANCES =======================================
function createRunwayDistanceTextbox(availableLength) {
  return `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
      <div style="text-align: center; padding: 10px; background: white; border-radius: 4px; border: 2px solid #e0e0e0;">
      <div style="font-size: 12px; color: #666;">Available Length</div>
      <div style="font-size: 24px; font-weight: bold; color: #333;">${availableLength}m</div>
    </div>
    `;
}
function createThresholdTextbox(requiredThreshold, thresholdOK, availableLength) {
  const runwayExcess = requiredThreshold - availableLength;

  return `
    <div style="text-align: center; padding: 10px; background: ${thresholdOK ? GOODCOLOR : DANGERCOLOR}; border-radius: 4px; border: 2px solid ${thresholdOK ? GOODCOLORDARK : DANGERCOLORDARK};">
      <div style="font-size: 12px; color: #666;">Threshold Required</div>
      <div style="font-size: 24px; font-weight: bold; color: ${thresholdOK ? GOODCOLORTEXT : DANGERCOLORTEXT};">${requiredThreshold}m</div>
      <div style="font-size: 14px; margin-top: 5px;">${thresholdOK ? "✓ OK" : `✗ ${runwayExcess}m. short`}</div>
    </div>
    `;
}
function createThreshold50ftTextbox(required50ft, ft50OK, availableLength) {
  const runwayExcess = required50ft - availableLength;

  return `
    <div style="text-align: center; padding: 10px; background:  ${ft50OK ? GOODCOLOR : DANGERCOLOR}; border-radius: 4px; border: 2px solid ${ft50OK ? GOODCOLORDARK : DANGERCOLORDARK};">
      <div style="font-size: 12px; color: #666;">50ft Required</div>
      <div style="font-size: 24px; font-weight: bold; color: ${ft50OK ? GOODCOLORTEXT : DANGERCOLORTEXT};">${required50ft}m</div>
      <div style="font-size: 14px; margin-top: 5px;">${ft50OK ? "✓ OK" : `✗ ${runwayExcess}m. short.`}</div>
    </div>
    `;
}
//  ======================================= CREATE RUNWAY TABLE COMPUTATIONS =======================================
function createRunwayTable(resultThreshold, result50ft) {
  return `

    <!-- Breakdown table -->
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Step</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Threshold</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">50ft</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Factor</th>
            </tr>
          </thead>
          <tbody>
            ${createBreakdownRows(resultThreshold, result50ft)}
          </tbody>
        </table>
`;
}

//  ======================================= CREATE RUNWAY MESSAGE =======================================
function createRunwayMessage(prefix, requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK) {
  // Default message
  let action = "default";
  let message = `
    <div style="padding: 10px; background: ${GOODCOLOR}; border: 1px solid ${GOODCOLORDARK}; border-radius: 10px; text-align: center;">
      <style="color: ${GOODCOLORTEXT};">✓ Runway within limits.
      <div style="color: ${GOODCOLORTEXT};">
        <small>All distances are within available runway limits for ${prefix.toLowerCase()}.</small>
      </div>
    </div>
  `;

  if (!thresholdOK) {
    const thresholdExcess = requiredThreshold - availableLength;
    const ft50Excess = required50ft - availableLength;
    action = "danger";

    message = `
      <div style="padding: 10px; background: ${DANGERCOLOR}; border: 1px solid ${DANGERCOLORDARK}; border-radius: 10px; text-align: center;">
        <style="color: ${DANGERCOLORTEXT};">✗ Runway too short!
        <div style="color: ${DANGERCOLORTEXT};">
          <small>Threshold runway distance exceeds by <b>${thresholdExcess}m.</b></small><br>
          <small>${!ft50OK ? `50ft runway distance exceeds by <b>${ft50Excess}m.</b></small>` : ""}
        </div>
      </div>
    `;
  } else if (!ft50OK) {
    const ft50Excess = required50ft - availableLength;
    action = "warning";

    message = `
      <div style="padding: 10px; background: ${WARNINGCOLOR}; border: 1px solid ${WARNINGCOLORDARK}; border-radius: 10px; text-align: center;">
        <style="color: ${WARNINGCOLORTEXT};">✗ Runway too short!
        <div style="color: ${WARNINGCOLORTEXT};">
          <small>50ft runway distance exceeds by <b>${ft50Excess}m.</b></small>
        </div>
      </div>
    `;
  }

  // Set collapsible menu color
  colorRunwayMenu(prefix, action);
  // Return
  return message;
}

// function createRunwayPlot(prefix, requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK, runwayLength) {
//   const surfaceType = document.getElementById(`${prefix}_RUNWAY_SURFACE`)?.value || "hard";

//   // Calculate the position of the safety marker as a percentage
//   const safetyMarkerPercent = (availableLength / runwayLength) * 100;

//   html = `
//     <!-- Realistic Runway Visualization -->
//     <div style="margin-bottom: 20px; margin-top: 10px; background: transparent; padding: 5px; border-radius: 0px;">
//       <div style="position: relative; height: 120px; background: #1a1a1a; border-radius: 2px; overflow: visible; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">

//         <!-- Runway surface with grass edges (lighter green) -->
//         <div style="position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px; background: transparent;"></div>

//         <!-- Main runway surface (asphalt or grass - get from surface type) -->
//         ${(() => {
//           const RUNWAYSURFACECOLOR = surfaceType === "soft" ? "#306632" : "#2a2a2a";
//           return `<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(to left, ${RUNWAYSURFACECOLOR} 0%, #111 100%);"></div>`;
//         })()}

//         <!-- Runway centerline stripes -->
//         <div style="position: absolute; left: 0; top: 50%; width: 100%; height: 3px; transform: translateY(-50%); background: repeating-linear-gradient(to right, white 0px, white 30px, transparent 30px, transparent 50px);"></div>

//         <!-- Threshold markings (white blocks at start) -->
//         <div style="position: absolute; left: 2%; top: 15%; width: 3%; height: 15%; background: white;"></div>
//         <div style="position: absolute; left: 2%; top: 42.5%; width: 3%; height: 15%; background: white;"></div>
//         <div style="position: absolute; left: 2%; top: 70%; width: 3%; height: 15%; background: white;"></div>

//         <!-- Edge markings (white lines on sides) -->
//         <div style="position: absolute; left: 0; top: 5px; width: 100%; height: 2px; background: white;"></div>
//         <div style="position: absolute; left: 0; bottom: 5px; width: 100%; height: 2px; background: white;"></div>

//         <!-- Available runway length overlay with transparency -->
//         <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.3);"></div>

//         <!-- Threshold required distance indicator (starts after threshold marks at 5%, smaller height) -->
//         <div style="position: absolute; left: 5%; top: 10%; width: ${Math.min((requiredThreshold / runwayLength) * 100 - 5, 95)}%; height: 30%; background: linear-gradient(to right, ${thresholdOK ? "rgba(100, 181, 246, 0.6)" : "rgba(244, 67, 54, 0.5)"}, ${thresholdOK ? "rgba(33, 150, 243, 0.4)" : "rgba(183, 28, 28, 0.4)"} 80%); border-right: 3px solid ${thresholdOK ? RUNWAYREQCOLOR : DANGERCOLORDARK};">
//           <span style="position: absolute; right: 5px; top: 5px; font-size: 10px; color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px;">THRESHOLD</span>
//         </div>

//         <!-- 50ft required distance indicator (starts after threshold marks at 5%, smaller height) -->
//         <div style="position: absolute; left: 5%; bottom: 10%; width: ${Math.min((required50ft / runwayLength) * 100 - 5, 95)}%; height: 30%; background: linear-gradient(to right, ${ft50OK ? "rgba(100, 181, 246, 0.6), rgba(33, 150, 243, 0.4) 80%" : "rgba(244, 67, 54, 0.5), rgba(183, 28, 28, 0.4) 80%"}); border-right: 3px solid ${ft50OK ? RUNWAYREQCOLOR : DANGERCOLORDARK};">
//           <span style="position: absolute; right: 5px; bottom: 5px; font-size: 10px; color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px;">50FT</span>
//         </div>

//         <!-- Red dashed vertical line at safety point (availableLength) -->
//         <div style="position: absolute; left: ${safetyMarkerPercent}%; top: 0; bottom: 0; width: 3px; background: repeating-linear-gradient(to bottom, #ff0000 0px, #ff0000 8px, transparent 8px, transparent 16px); z-index: 10;">
//           <!-- Label for safety marker -->
//           <span style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #ff0000; font-weight: bold; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 2px; white-space: nowrap; border: 1px solid #ff0000; text-align: center; display: block;">SAFETY LIMIT<br>${availableLength}m</span>
//         </div>

//         <!-- Tree on left side (bottom, centered with 50ft marker) -->
//         <div style="position: absolute; left: -25px; bottom: 25%; transform: translateY(50%); width: 20px; height: 20px; z-index: 5;">
//           <!-- Tree crown (top view - circular with darker center) -->
//           <div style="width: 20px; height: 20px; background: radial-gradient(circle, #2d5016 0%, #3d6b1f 40%, #4a7c28 100%); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
//         </div>

//         <!-- Tree on right side (bottom, centered with 50ft marker) -->
//         <div style="position: absolute; right: -25px; bottom: 25%; transform: translateY(50%); width: 20px; height: 20px; z-index: 5;">
//           <!-- Tree crown (top view - circular with darker center) -->
//           <div style="width: 20px; height: 20px; background: radial-gradient(circle, #2d5016 0%, #3d6b1f 40%, #4a7c28 100%); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
//         </div>

//         <!-- Distance markers below runway -->
//         <div style="position: absolute; top: 100%; left: 0; width: 100%; height: 30px; display: flex; justify-content: space-between; padding-top: 5px;">
//           <span style="font-size: 10px; color: black;">0m</span>
//           <span style="font-size: 10px; color: black;">${Math.round(runwayLength / 4)}m</span>
//           <span style="font-size: 10px; color: black;">${Math.round(runwayLength / 2)}m</span>
//           <span style="font-size: 10px; color: black;">${Math.round((3 * runwayLength) / 4)}m</span>
//           <span style="font-size: 10px; color: black;">${runwayLength}m</span>
//         </div>
//       </div>

//     </div>
//     `;

//   legend = `
//     <div style="display: flex; align-items: center; gap: 5px; justify-content: center;">
//       <div style="width: 20px; height: 12px; background: #2a2a2a; border: 1px solid black;"></div>
//       <span style="font-size: 11px; color: black;">Available: ${runwayLength} m.</span>
//     </div>
//     `;

//   return html + legend;
// }

// function createRunwayPlot(prefix, requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK, runwayLength) {
//   const surfaceType = document.getElementById(`${prefix}_RUNWAY_SURFACE`)?.value || "hard";

//   // Calculate the position of the safety marker as a percentage
//   const safetyMarkerPercent = (availableLength / runwayLength) * 100;

//   html = `
//     <!-- Realistic Runway Visualization -->
//     <div style="margin-bottom: 20px; margin-top: 10px; background: transparent; padding: 5px; border-radius: 0px;">
//       <div style="position: relative; height: 120px; background: #1a1a1a; border-radius: 2px; overflow: visible; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">

//         <!-- Runway surface with grass edges (lighter green) -->
//         <div style="position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px; background: transparent;"></div>

//         <!-- Main runway surface (asphalt or grass - get from surface type) -->
//         ${(() => {
//           const RUNWAYSURFACECOLOR = surfaceType === "soft" ? "#306632" : "#2a2a2a";
//           return `<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(to left, ${RUNWAYSURFACECOLOR} 0%, #111 100%);"></div>`;
//         })()}

//         <!-- Runway centerline stripes -->
//         <div style="position: absolute; left: 0; top: 50%; width: 100%; height: 3px; transform: translateY(-50%); background: repeating-linear-gradient(to right, white 0px, white 30px, transparent 30px, transparent 50px);"></div>

//         <!-- Threshold markings (white blocks at start) -->
//         <div style="position: absolute; left: 2%; top: 15%; width: 3%; height: 15%; background: white;"></div>
//         <div style="position: absolute; left: 2%; top: 42.5%; width: 3%; height: 15%; background: white;"></div>
//         <div style="position: absolute; left: 2%; top: 70%; width: 3%; height: 15%; background: white;"></div>

//         <!-- Edge markings (white lines on sides) -->
//         <div style="position: absolute; left: 0; top: 5px; width: 100%; height: 2px; background: white;"></div>
//         <div style="position: absolute; left: 0; bottom: 5px; width: 100%; height: 2px; background: white;"></div>

//         <!-- Available runway length overlay with transparency -->
//         <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.3);"></div>

//         <!-- Threshold required distance indicator (starts after threshold marks at 5%, smaller height) -->
//         <div style="position: absolute; left: 5%; top: 10%; width: ${Math.min((requiredThreshold / runwayLength) * 100 - 5, 95)}%; height: 30%; background: linear-gradient(to right, ${thresholdOK ? "rgba(100, 181, 246, 0.6)" : "rgba(244, 67, 54, 0.5)"}, ${thresholdOK ? "rgba(33, 150, 243, 0.4)" : "rgba(183, 28, 28, 0.4)"} 80%); border-right: 3px solid ${thresholdOK ? RUNWAYREQCOLOR : DANGERCOLORDARK};">
//           <span style="position: absolute; right: 5px; top: 5px; font-size: 10px; color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px;">THRESHOLD</span>
//         </div>

//         <!-- 50ft required distance indicator (starts after threshold marks at 5%, smaller height) -->
//         <div style="position: absolute; left: 5%; bottom: 10%; width: ${Math.min((required50ft / runwayLength) * 100 - 5, 95)}%; height: 30%; background: linear-gradient(to right, ${ft50OK ? "rgba(100, 181, 246, 0.6), rgba(33, 150, 243, 0.4) 80%" : "rgba(244, 67, 54, 0.5), rgba(183, 28, 28, 0.4) 80%"}); border-right: 3px solid ${ft50OK ? RUNWAYREQCOLOR : DANGERCOLORDARK};">
//           <span style="position: absolute; right: 5px; bottom: 5px; font-size: 10px; color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px;">50FT</span>
//         </div>

//         <!-- Red dashed vertical line at safety point (availableLength) -->
//         <div style="position: absolute; left: ${safetyMarkerPercent}%; top: 0; bottom: 0; width: 3px; background: repeating-linear-gradient(to bottom, #ff0000 0px, #ff0000 8px, transparent 8px, transparent 16px); z-index: 10;">
//           <!-- Label for safety marker -->
//           <span style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #ff0000; font-weight: bold; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 2px; white-space: nowrap; border: 1px solid #ff0000; text-align: center; display: block;">SAFETY LIMIT<br>${availableLength}m</span>
//         </div>

//         <!-- Distance markers below runway -->
//         <div style="position: absolute; top: 100%; left: 0; width: 100%; height: 30px; display: flex; justify-content: space-between; padding-top: 5px;">
//           <span style="font-size: 10px; color: black;">0m</span>
//           <span style="font-size: 10px; color: black;">${Math.round(runwayLength / 4)}m</span>
//           <span style="font-size: 10px; color: black;">${Math.round(runwayLength / 2)}m</span>
//           <span style="font-size: 10px; color: black;">${Math.round((3 * runwayLength) / 4)}m</span>
//           <span style="font-size: 10px; color: black;">${runwayLength}m</span>
//         </div>
//       </div>

//     </div>
//     `;

//   legend = `
//     <div style="display: flex; align-items: center; gap: 5px; justify-content: center;">
//       <div style="width: 20px; height: 12px; background: #2a2a2a; border: 1px solid black;"></div>
//       <span style="font-size: 11px; color: black;">Available: ${runwayLength} m.</span>
//     </div>
//     `;

//   return html + legend;
// }

function createRunwayPlot(prefix, requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK, runwayLength) {
  const surfaceType = document.getElementById(`${prefix}_RUNWAY_SURFACE`)?.value || "hard";

  // Calculate the position of the safety marker as a percentage
  const safetyMarkerPercent = (availableLength / runwayLength) * 100;

  html = `
    <!-- Realistic Runway Visualization -->
    <div style="margin-bottom: 20px; margin-top: 40px; background: transparent; padding: 5px 30px; border-radius: 0px;">
      <div style="position: relative; height: 120px; background: #1a1a1a; border-radius: 2px; overflow: visible; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">

        <!-- Runway surface with grass edges (lighter green) -->
        <div style="position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px; background: transparent;"></div>

        <!-- Main runway surface (asphalt or grass - get from surface type) -->
        ${(() => {
          const RUNWAYSURFACECOLOR = surfaceType === "soft" ? "#306632" : "#2a2a2a";
          return `<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(to left, ${RUNWAYSURFACECOLOR} 0%, #111 100%);"></div>`;
        })()}

        <!-- Runway centerline stripes -->
        <div style="position: absolute; left: 0; top: 50%; width: 100%; height: 3px; transform: translateY(-50%); background: repeating-linear-gradient(to right, white 0px, white 25px, transparent 25px, transparent 40px);"></div>

        <!-- Threshold markings (white blocks at start) -->
        <div style="position: absolute; left: 2%; top: 15%; width: 3%; height: 15%; background: white;"></div>
        <div style="position: absolute; left: 2%; top: 42.5%; width: 3%; height: 15%; background: white;"></div>
        <div style="position: absolute; left: 2%; top: 70%; width: 3%; height: 15%; background: white;"></div>

        <!-- Edge markings (white lines on sides) -->
        <div style="position: absolute; left: 0; top: 5px; width: 100%; height: 2px; background: white;"></div>
        <div style="position: absolute; left: 0; bottom: 5px; width: 100%; height: 2px; background: white;"></div>

        <!-- Available runway length overlay with transparency -->
        <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.3);"></div>

        <!-- Threshold required distance indicator (starts after threshold marks at 5%, smaller height) -->
        <div style="position: absolute; left: 5%; top: 10%; width: ${Math.min((requiredThreshold / runwayLength) * 100 - 5, 95)}%; height: 30%; background: linear-gradient(to right, ${thresholdOK ? "rgba(100, 181, 246, 0.6)" : "rgba(244, 67, 54, 0.5)"}, ${thresholdOK ? "rgba(33, 150, 243, 0.4)" : "rgba(183, 28, 28, 0.4)"} 80%); border-right: 3px solid ${thresholdOK ? RUNWAYREQCOLOR : DANGERCOLORDARK};">
          <span style="position: absolute; right: 5px; top: 5px; font-size: 10px; color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px;">THRESHOLD</span>
        </div>

        <!-- 50ft required distance indicator (starts after threshold marks at 5%, smaller height) -->
        <div style="position: absolute; left: 5%; bottom: 10%; width: ${Math.min((required50ft / runwayLength) * 100 - 5, 95)}%; height: 30%; background: linear-gradient(to right, ${ft50OK ? "rgba(100, 181, 246, 0.6), rgba(33, 150, 243, 0.4) 80%" : "rgba(244, 67, 54, 0.5), rgba(183, 28, 28, 0.4) 80%"}); border-right: 3px solid ${ft50OK ? RUNWAYREQCOLOR : DANGERCOLORDARK};">
          <span style="position: absolute; right: 5px; bottom: 5px; font-size: 10px; color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px;">50FT</span>
        </div>

        <!-- Red dashed vertical line at safety point (availableLength) -->
        <div style="position: absolute; left: ${safetyMarkerPercent}%; top: 0; bottom: 0; width: 3px; background: repeating-linear-gradient(to bottom, #ff0000 0px, #ff0000 8px, transparent 8px, transparent 16px); z-index: 10;">
          <!-- Label for safety marker -->
          <span style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #ff0000; font-weight: bold; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 2px; white-space: nowrap; border: 1px solid #ff0000; text-align: center; display: block;">SAFETY LIMIT<br>${availableLength}m</span>
        </div>

        <!-- Trees on left side (bottom) -->
        <div style="position: absolute; left: -25px; bottom: 15%; width: 18px; height: 18px; z-index: 5;">
          <div style="width: 18px; height: 18px; background: radial-gradient(circle, #2d5016 0%, #3d6b1f 40%, #4a7c28 100%); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
        <div style="position: absolute; left: -25px; bottom: 25%; width: 18px; height: 18px; z-index: 5;">
          <div style="width: 18px; height: 18px; background: radial-gradient(circle, #2d5016 0%, #3d6b1f 40%, #4a7c28 100%); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
        <div style="position: absolute; left: -25px; bottom: 35%; width: 18px; height: 18px; z-index: 5;">
          <div style="width: 18px; height: 18px; background: radial-gradient(circle, #2d5016 0%, #3d6b1f 40%, #4a7c28 100%); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>

        <!-- Trees on right side (bottom) -->
        <div style="position: absolute; right: -25px; bottom: 15%; width: 18px; height: 18px; z-index: 5;">
          <div style="width: 18px; height: 18px; background: radial-gradient(circle, #2d5016 0%, #3d6b1f 40%, #4a7c28 100%); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
        <div style="position: absolute; right: -25px; bottom: 25%; width: 18px; height: 18px; z-index: 5;">
          <div style="width: 18px; height: 18px; background: radial-gradient(circle, #2d5016 0%, #3d6b1f 40%, #4a7c28 100%); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
        <div style="position: absolute; right: -25px; bottom: 35%; width: 18px; height: 18px; z-index: 5;">
          <div style="width: 18px; height: 18px; background: radial-gradient(circle, #2d5016 0%, #3d6b1f 40%, #4a7c28 100%); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>

        <!-- Distance markers below runway -->
        <div style="position: absolute; top: 100%; left: 0; width: 100%; height: 30px; display: flex; justify-content: space-between; padding-top: 5px;">
          <span style="font-size: 10px; color: black;">0m</span>
          <span style="font-size: 10px; color: black;">${Math.round(runwayLength / 4)}m</span>
          <span style="font-size: 10px; color: black;">${Math.round(runwayLength / 2)}m</span>
          <span style="font-size: 10px; color: black;">${Math.round((3 * runwayLength) / 4)}m</span>
          <span style="font-size: 10px; color: black;">${runwayLength}m</span>
        </div>
      </div>

    </div>
    `;

  legend = `
    <div style="display: flex; align-items: center; gap: 5px; justify-content: center;">
      <div style="width: 20px; height: 12px; background: #2a2a2a; border: 1px solid black;"></div>
      <span style="font-size: 11px; color: black;">Available: ${runwayLength} m.</span>
    </div>
    `;

  return html + legend;
}
/**
 * Create breakdown table rows
 */
function createBreakdownRows(resultThreshold, result50ft) {
  const steps = [
    { name: "Runway Length", data: "default" },
    { name: "POH (Altitude, Temp)", data: "POH" },
    { name: "Wind Correction", data: "wind" },
    { name: "Runway Surface & Condition", data: "runway" },
    { name: "Slope Correction", data: "slope" },
    { name: "Correction Factor", data: "correction" },
  ];

  console.log("HERE2");
  console.log(resultThreshold);
  console.log(result50ft);

  return steps
    .map((step) => {
      const thresholdData = resultThreshold.details[step.data];
      const ft50Data = result50ft.details[step.data];

      if (thresholdData) {
        // console.log(thresholdData);

        let factor = "-";
        if (thresholdData.correction_factor !== undefined) {
          const cf = thresholdData.correction_factor;

          // Only call toFixed if it's a number and not NaN
          if (typeof cf === "number" && !isNaN(cf) && cf !== 0) {
            factor = `×${cf.toFixed(2)}`;
          } else if (!isNaN(parseFloat(cf)) && cf !== 0) {
            factor = `×${parseFloat(cf).toFixed(2)}`;
          } else {
            factor = "-";
          }
        }

        return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${step.name}</td>
          <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${Math.round(thresholdData.distance)}m</td>
          <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${Math.round(ft50Data.distance)}m</td>
          <td style="padding: 8px; text-align: center; border: 1px solid #ddd; color: #4CAF50; font-weight: bold;">${factor}</td>
        </tr>
        ${
          thresholdData.message
            ? `<tr>
                <td colspan="4" style="padding: 8px; border: 1px solid #ddd; background: #f7f7f7; color: #333; font-size: 12px;">
                  <em>${thresholdData.message}</em>
                </td>
              </tr>`
            : ""
        }
      `;
      }
      return "";
    })
    .join("");
}

// function createBreakdownRows(resultThreshold, result50ft) {
//   const steps = [
//     { name: "Runway Length", data: "default" },
//     { name: "POH (Altitude, Temp)", data: "POH" },
//     { name: "Wind Correction", data: "wind" },
//     { name: "Runway Surface & Condition", data: "runway" },
//     { name: "Slope Correction", data: "slope" },
//     { name: "Correction Factor", data: "correction" },
//   ];

//   const rows = steps
//     .map((step) => {
//       const thresholdData = resultThreshold.details[step.data];
//       const ft50Data = result50ft.details[step.data];
//       if (thresholdData) {
//         let factor = "-";
//         if (thresholdData.correction_factor !== undefined) {
//           const cf = thresholdData.correction_factor;
//           // Only call toFixed if it's a number and not NaN
//           if (typeof cf === "number" && !isNaN(cf) && cf !== 0) {
//             factor = `×${cf.toFixed(2)}`;
//           } else if (!isNaN(parseFloat(cf)) && cf !== 0) {
//             factor = `×${parseFloat(cf).toFixed(2)}`;
//           } else {
//             factor = "-";
//           }
//         }
//         return `
//         <tr>
//           <td style="padding: 8px; border: 1px solid #ddd;">${step.name}</td>
//           <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${Math.round(thresholdData.distance)}m</td>
//           <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${Math.round(ft50Data.distance)}m</td>
//           <td style="padding: 8px; text-align: center; border: 1px solid #ddd; color: #4CAF50; font-weight: bold;">${factor}</td>
//         </tr>
//         ${
//           thresholdData.message
//             ? `<tr>
//                 <td colspan="4" style="padding: 8px; border: 1px solid #ddd; background: #f7f7f7; color: #333; font-size: 12px;">
//                   <em>${thresholdData.message}</em>
//                 </td>
//               </tr>`
//             : ""
//         }
//       `;
//       }
//       return "";
//     })
//     .join("");

//   console.log("HERE2");
//   console.log(resultThreshold);
//   console.log(result50ft);

//   // Add final row with runway corrected message
//   const finalMessage = resultThreshold.details?.runway?.message || "";
//   const finalRow = finalMessage
//     ? `
//     <tr>
//       <td colspan="4" style="padding: 12px; border: 1px solid #ddd; background: #e8f5e9; color: #2e7d32; font-size: 13px; font-weight: bold;">
//         <em>${finalMessage}</em>
//       </td>
//     </tr>`
//     : "";

//   return rows + finalRow;
// }

// ========================= EXPORTS =========================

window.displayRunwayResultsDiv = displayRunwayResultsDiv;
window.AutoUpdateRunwayResults = AutoUpdateRunwayResults;
window.remove_runway_plot_Js = remove_runway_plot_Js;
window.colorRunwayMenu = colorRunwayMenu;
