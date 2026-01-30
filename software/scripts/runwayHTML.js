// ========================= RUNWAY RESULTS VISUALIZATION =========================
// This module creates visual displays for runway calculation results

/**
 * Create and display runway calculation results in a visual format
 * @param {string} prefix - 'DEPARTURE' or 'ARRIVAL'
 * @param {string} canvasId - ID of the canvas element
 */
function displayRunwayResults(prefix, canvasId = `${prefix}_RUNWAY_RESULTS`) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`Canvas ${canvasId} not found`);
    return;
  }

  const runwayType = prefix === "DEPARTURE" ? "TAKEOFF" : "LANDING";

  // Calculate both threshold and 50ft distances
  const resultThreshold = window.calculateRunwayDistance(prefix, runwayType, "distance");
  const result50ft = window.calculateRunwayDistance(prefix, runwayType, "50ft");

  if (!resultThreshold || !result50ft) {
    console.error("Calculation failed");
    return;
  }

  // Draw results on canvas
  drawRunwayResultsCanvas(canvas, prefix, resultThreshold, result50ft);
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
  const runwayLength = parseFloat(document.getElementById(`${prefix}_RUNWAY_LENGTH`)?.value || 0);
  const perfParams = window.getPerformanceParameters(prefix);
  const availableLength = Math.round(runwayLength * 0.3048 * perfParams.minimum_distance_available);

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
  ctx.fillStyle = ft50OK ? "#2196F380" : "#FF980080";
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
    { name: "Safety", data: "safety" },
  ];

  ctx.font = "11px Arial";
  ctx.fillStyle = "#333";

  steps.forEach((step, index) => {
    const thresholdData = resultThreshold.details[step.data];
    const ft50Data = result50ft.details[step.data];

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

/** =====================================================================================
 * CREATE HTML RESULTS TO DISPLAY
========================================================================================= */
function displayRunwayResultsDiv(prefix, action = null) {
  console.log("> func: displayRunwayResultsDiv()");
  const containerThr = document.getElementById(`${prefix}_RUNWAY_THRESHOLD`);
  const container50ft = document.getElementById(`${prefix}_RUNWAY_THRESHOLD_50ft`);
  const containerBar = document.getElementById(`${prefix}_RUNWAY_BAR`);
  const containerDetails = document.getElementById(`${prefix}_RUNWAY_DETAILS`);
  const containerMessage = document.getElementById(`${prefix}_RUNWAY_MESSAGE`);
  // const elementMinDistance = document.getElementById(`${prefix}_RUNWAY_MINDISTANCE`);

  if (action === "remove") {
    console.log("   > Remove plot and runway information");
    containerThr.innerHTML = "";
    container50ft.innerHTML = "";
    containerBar.innerHTML = "";
    containerDetails.innerHTML = "";
    containerMessage.innerHTML = "";
  }

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

  const runwayLength = parseFloat(document.getElementById(`${prefix}_RUNWAY_LENGTH`)?.value || 0);
  const perfParams = window.getPerformanceParameters(prefix);
  const availableLength = Math.round(runwayLength * 0.3048 * perfParams.minimum_distance_available);
  const requiredThreshold = Math.round(resultThreshold.distance);
  const required50ft = Math.round(result50ft.distance);
  // Compute
  const thresholdOK = requiredThreshold < availableLength;
  const ft50OK = required50ft < availableLength;

  // Show available runway
  // elementMinDistance.innerHTML = createRunwayDistanceTextbox(availableLength);
  // Show available distance for threshold
  containerThr.innerHTML = createThresholdTextbox(requiredThreshold, thresholdOK);
  // Show available distance for 50ft threshold
  container50ft.innerHTML = createThreshold50ftTextbox(required50ft, ft50OK);
  // Messagebox
  containerMessage.innerHTML = createRunwayMessage(requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK);
  //Runwayplot
  containerBar.innerHTML = createRunwayPlot(prefix, requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK);
  // Table computation details
  containerDetails.innerHTML = createRunwayTable(resultThreshold, result50ft);
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
function createThresholdTextbox(requiredThreshold, thresholdOK) {
  // #4CAF50 is a shade of green (Material Design Green 500), used for "OK" status.
  // #F44336 is a shade of red (Material Design Red 500), used for "INSUFFICIENT" status.
  return `
    <div style="text-align: center; padding: 10px; background: white; border-radius: 4px; border: 2px solid ${thresholdOK ? "#4CAF50" : "#F44336"};">
      <div style="font-size: 12px; color: #666;">Threshold Required</div>
      <div style="font-size: 24px; font-weight: bold; color: ${thresholdOK ? "#4CAF50" : "#F44336"};">${requiredThreshold}m</div>
      <div style="font-size: 14px; margin-top: 5px;">${thresholdOK ? "✓ OK" : "✗ INSUFFICIENT"}</div>
    </div>
    `;
}
function createThreshold50ftTextbox(required50ft, ft50OK) {
  // The color blue in this section is "#2196F3"
  // It is used for the border and text color when ft50OK is true (i.e., 50ft requirement is met)
  // The color orange in this section is "#FF9800"
  // It is used for the border color when ft50OK is false (i.e., 50ft requirement is NOT met)
  return `
    <div style="text-align: center; padding: 10px; background: white; border-radius: 4px; border: 2px solid ${ft50OK ? "#4CAF50" : "#F44336"};">
      <div style="font-size: 12px; color: #666;">50ft Required</div>
      <div style="font-size: 24px; font-weight: bold; color: ${ft50OK ? "#4CAF50" : "#F44336"};">${required50ft}m</div>
      <div style="font-size: 14px; margin-top: 5px;">${ft50OK ? "✓ OK" : "✗ INSUFFICIENT"}</div>
    </div>
    `;
}
//  ======================================= CREATE RUNWAY TABLE COMPUTATIONS =======================================
function createRunwayTable(resultThreshold, result50ft) {
  return `
  <div style="padding: 15px; background: #f9f9f9; border-radius: 4px;">

    <!-- Breakdown table -->
      <div style="margin-top: 10px; overflow-x: auto;">
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
      </div>
  </div>
`;
}

//  ======================================= CREATE RUNWAY MESSAGE =======================================
// function createRunwayMessage(requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK) {
//   let message = `
//     <div style="margin-top: 15px; padding: 10px; background: ${GOODCOLOR}; border: 1px solid #28a745; border-radius: 4px;">
//       <strong style="color: #155724;">✅ Runway limits:</strong>
//       <div style="color: #155724; margin-top: 5px;">
//         All required distances are within available runway limits.
//       </div>
//     </div>
//   `;

//   if (!thresholdOK) {
//     message = `
//       <div style="margin-top: 15px; padding: 10px; background: ${DANGERCOLOR}; border: 1px solid ${DANGERCOLORDARK}; border-radius: 4px;">
//         <strong style="color: #721c24;">❗ Warning:</strong>
//         <div style="color: #721c24; margin-top: 5px;">
//           Threshold distance exceeds available runway by ${requiredThreshold - availableLength}m.<br>
//           ${!ft50OK ? `50ft distance exceeds available runway by ${required50ft - availableLength}m.` : ""}
//         </div>
//       </div>
//     `;
//   } else if (!ft50OK) {
//     message = `
//       <div style="margin-top: 15px; padding: 10px; background: ${DANGERCOLOR}; border: 1px solid ${DANGERCOLORDARK}; border-radius: 4px;">
//         <strong style="color: #856404;">⚠️ Warning:</strong>
//         <div style="color: #856404; margin-top: 5px;">
//           50ft distance exceeds available runway by ${required50ft - availableLength}m.
//         </div>
//       </div>
//     `;
//   }
//   return message;
// }
function createRunwayMessage(requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK) {
  let message = `
    <div style="margin-top: 15px; padding: 10px; background: ${GOODCOLOR}; border: 1px solid ${GOODCOLORDARK}; border-radius: 4px;">
      <strong style="color: ${GOODCOLORTEXT};">✅ Runway limits:</strong>
      <div style="color: ${GOODCOLORTEXT}; margin-top: 5px;">
        All required distances are within available runway limits.
      </div>
    </div>
  `;

  if (!thresholdOK) {
    const thresholdExcess = requiredThreshold - availableLength;
    const ft50Excess = required50ft - availableLength;

    message = `
      <div style="margin-top: 15px; padding: 10px; background: ${DANGERCOLOR}; border: 1px solid ${DANGERCOLORDARK}; border-radius: 4px;">
        <strong style="color: ${DANGERCOLORTEXT};">❗ Warning:</strong>
        <div style="color: ${DANGERCOLORTEXT}; margin-top: 5px;">
          Threshold distance exceeds available runway by ${thresholdExcess}m.<br>
          ${!ft50OK ? `50ft distance exceeds available runway by ${ft50Excess}m.` : ""}
        </div>
      </div>
    `;
  } else if (!ft50OK) {
    const ft50Excess = required50ft - availableLength;

    message = `
      <div style="margin-top: 15px; padding: 10px; background: ${DANGERCOLOR}; border: 1px solid ${DANGERCOLORDARK}; border-radius: 4px;">
        <strong style="color: ${DANGERCOLORTEXT};">⚠️ Warning:</strong>
        <div style="color: ${DANGERCOLORTEXT}; margin-top: 5px;">
          50ft distance exceeds available runway by ${ft50Excess}m.
        </div>
      </div>
    `;
  }

  return message;
}

//  ======================================= RUNWAY PLOT =======================================
function createRunwayPlot(prefix, requiredThreshold, required50ft, availableLength, thresholdOK, ft50OK) {
  const surfaceType = document.getElementById(`${prefix}_RUNWAY_SURFACE`)?.value || "hard";
  html = `
    <!-- Realistic Runway Visualization -->
    <div style="margin-bottom: 20px; background: transparent; padding: 20px; border-radius: 4px;">
      <div style="position: relative; height: 120px; background: #1a1a1a; border-radius: 2px; overflow: visible; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">

        <!-- Runway surface with grass edges (lighter green) -->
        <div style="position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px; background: transparent;"></div>

        <!-- Main runway surface (asphalt or grass - get from surface type) -->
        ${(() => {
          const runwayColor = surfaceType === "soft" ? "#306632" : "#2a2a2a";
          return `<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: ${runwayColor};"></div>`;
        })()}

        <!-- Runway centerline stripes -->
        <div style="position: absolute; left: 0; top: 50%; width: 100%; height: 3px; transform: translateY(-50%); background: repeating-linear-gradient(to right, white 0px, white 30px, transparent 30px, transparent 50px);"></div>

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
        <div style="position: absolute; left: 5%; top: 10%; width: ${Math.min((requiredThreshold / availableLength) * 100 - 5, 95)}%; height: 30%; background: ${thresholdOK ? "rgba(33, 150, 243, 0.4)" : "rgba(183, 28, 28, 0.4)"}; border-right: 3px solid ${thresholdOK ? "#2196F3" : DANGERCOLORDARK};">
          <span style="position: absolute; right: 5px; top: 5px; font-size: 10px; color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px;">THRESHOLD</span>
        </div>

        <!-- 50ft required distance indicator (starts after threshold marks at 5%, smaller height) -->
        <div style="position: absolute; left: 5%; bottom: 10%; width: ${Math.min((required50ft / availableLength) * 100 - 5, 95)}%; height: 30%; background: ${ft50OK ? "rgba(33, 150, 243, 0.4)" : "rgba(183, 28, 28, 0.4)"}; border-right: 3px solid ${ft50OK ? "#2196F3" : DANGERCOLORDARK};">
          <span style="position: absolute; right: 5px; bottom: 5px; font-size: 10px; color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 2px;">50FT</span>
        </div>

        <!-- Distance markers below runway -->
        <div style="position: absolute; top: 100%; left: 0; width: 100%; height: 30px; display: flex; justify-content: space-between; padding-top: 5px;">
          <span style="font-size: 10px; color: black;">0m</span>
          <span style="font-size: 10px; color: black;">${Math.round(availableLength / 4)}m</span>
          <span style="font-size: 10px; color: black;">${Math.round(availableLength / 2)}m</span>
          <span style="font-size: 10px; color: black;">${Math.round((3 * availableLength) / 4)}m</span>
          <span style="font-size: 10px; color: black;">${availableLength}m</span>
        </div>
      </div>

    </div>
    `;

  // <div style="display: flex; gap: 15px; margin-top: 40px; flex-wrap: wrap; justify-content: center;">
  // <div style="display: flex; align-items: center; gap: 5px;">
  //   <div style="width: 20px; height: 12px; background: ${thresholdOK ? GOODCOLOR : DANGERCOLOR}; border: 1px solid ${thresholdOK ? "#4CAF50" : "#F44336"};"></div>
  //   <span style="font-size: 11px; color: black;">Threshold: ${requiredThreshold}m ${thresholdOK ? "✓" : "✗"}</span>
  // </div>
  // <div style="display: flex; align-items: center; gap: 5px;">
  //   <div style="width: 20px; height: 12px; background: ${ft50OK ? GOODCOLOR : DANGERCOLOR}; border: 1px solid ${ft50OK ? "#4CAF50" : "#F44336"};"></div>
  //   <span style="font-size: 11px; color: black;">50ft: ${required50ft}m ${ft50OK ? "✓" : "✗"}</span>
  // </div>
  // </div>

  legend = `
      <div style="display: flex; align-items: center; gap: 5px; justify-content: center;">
        <div style="width: 20px; height: 12px; background: #2a2a2a; border: 1px solid black;"></div>
        <span style="font-size: 11px; color: black;">Available: ${availableLength}m</span>
      </div>
    `;

  return html + legend;
}

/**
 * Create breakdown table rows
 */
function createBreakdownRows(resultThreshold, result50ft) {
  const steps = [
    { name: "POH (Altitude, Temp)", data: "POH" },
    { name: "Wind Correction", data: "wind" },
    { name: "Runway Surface & Condition", data: "runway" },
    { name: "Slope Correction", data: "slope" },
    { name: "Safety Factor", data: "safety" },
  ];

  return steps
    .map((step) => {
      const thresholdData = resultThreshold.details[step.data];
      const ft50Data = result50ft.details[step.data];

      if (thresholdData) {
        const factor = thresholdData.correction_factor !== undefined ? `×${thresholdData.correction_factor.toFixed(2)}` : "-";

        return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${step.name}</td>
          <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${Math.round(thresholdData.distance)}m</td>
          <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${Math.round(ft50Data.distance)}m</td>
          <td style="padding: 8px; text-align: center; border: 1px solid #ddd; color: #4CAF50; font-weight: bold;">${factor}</td>
        </tr>
      `;
      }
      return "";
    })
    .join("");
}

// ========================= EXPORTS =========================

// window.displayRunwayResults = displayRunwayResults;
window.displayRunwayResultsDiv = displayRunwayResultsDiv;
window.AutoUpdateRunwayResults = AutoUpdateRunwayResults;
// window.drawRunwayResultsCanvas = drawRunwayResultsCanvas;
