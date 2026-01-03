let weightBalanceChart = null;
let weightBalanceChart2 = null;

function calculateWeightBalance() {
  console.log("> func: calculateWeightBalance()");

  // Get weights
  const weight_empty = parseFloat(document.getElementById("weight_empty").value) || 0;

  const fuel_liters = parseFloat(document.getElementById("fuel_liters_departure").value) || 0;
  const weight_pilot = parseFloat(document.getElementById("weight_pilot_departure").value) || 0;
  const weight_copilot = parseFloat(document.getElementById("weight_copilot_departure").value) || 0;
  const weight_rl = parseFloat(document.getElementById("weight_rl_departure").value) || 0;
  const weight_rr = parseFloat(document.getElementById("weight_rr_departure").value) || 0;
  const weight_bagage = parseFloat(document.getElementById("weight_bagage_departure").value) || 0;

  // Get arms
  const arm_fuel = parseFloat(document.getElementById("arm_fuel").value) || 0;
  const arm_empty = parseFloat(document.getElementById("arm_empty").value) || 0;
  const arm_pilot = parseFloat(document.getElementById("arm_pilot").value) || 0;
  const arm_copilot = parseFloat(document.getElementById("arm_copilot").value) || 0;
  const arm_rl = parseFloat(document.getElementById("arm_rl").value) || 0;
  const arm_rr = parseFloat(document.getElementById("arm_rr").value) || 0;
  const arm_bagage = parseFloat(document.getElementById("arm_bagage").value) || 0;

  // Calculate moments
  const fuel_density = parseFloat(document.getElementById("aircraft_fuel_density").value) || 1;
  const weight_fuel_kg = fuel_liters * fuel_density;

  const moment_empty = weight_empty * arm_empty;
  const moment_pilot = weight_pilot * arm_pilot;
  const moment_copilot = weight_copilot * arm_copilot;
  const moment_rl = weight_rl * arm_rl;
  const moment_rr = weight_rr * arm_rr;
  const moment_bagage = weight_bagage * arm_bagage;
  const moment_fuel = weight_fuel_kg * arm_fuel;

  // Update moment fields
  document.getElementById("moment_empty").value = moment_empty.toFixed(0);
  document.getElementById("moment_pilot").value = moment_pilot.toFixed(0);
  document.getElementById("moment_copilot").value = moment_copilot.toFixed(0);
  document.getElementById("moment_rl").value = moment_rl.toFixed(0);
  document.getElementById("moment_rr").value = moment_rr.toFixed(0);
  document.getElementById("moment_bagage").value = moment_bagage.toFixed(0);
  document.getElementById("moment_fuel").value = moment_fuel.toFixed(0);

  // Calculate totals
  const total_moment = moment_empty + moment_pilot + moment_copilot + moment_rl + moment_rr + moment_bagage + moment_fuel;

  const total_weight = weight_empty + weight_pilot + weight_copilot + weight_rl + weight_rr + weight_bagage + weight_fuel_kg;

  const takeoff_cg = total_weight > 0 ? (total_moment / total_weight).toFixed(0) : 0;

  // Update total fields
  document.getElementById("total_moment").value = total_moment.toFixed(0);
  document.getElementById("total_weight").value = total_weight.toFixed(0);
  document.getElementById("takeoff_cg").value = takeoff_cg;

  // Update plots
  updateAllCharts();
}

/* =========================
   ENVELOPE LOGIC
========================= */

function isPointInPolygon(xcoord, ycoord, pointX, pointY) {
  let inside = false;
  for (let i = 0, j = xcoord.length - 1; i < xcoord.length; j = i++) {
    const xi = xcoord[i],
      yi = ycoord[i];
    const xj = xcoord[j],
      yj = ycoord[j];

    const intersect = yi > pointY !== yj > pointY && pointX < ((xj - xi) * (pointY - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

function showEnvelopeMessage(isInside, pointX, pointY, messageId) {
  const messageDiv = document.getElementById(messageId);
  messageDiv.style.display = "block";

  if (isInside) {
    messageDiv.style.background = "#d4edda";
    messageDiv.style.color = "#155724";
    messageDiv.style.border = "1px solid #c3e6cb";
    messageDiv.innerHTML =
      `✓ Aircraft weight is WITHIN the envelope<br>` + `<small>CG: ${pointX.toFixed(0)} mm, Weight: ${pointY.toFixed(0)} kg</small>`;
  } else {
    messageDiv.style.background = "#f8d7da";
    messageDiv.style.color = "#721c24";
    messageDiv.style.border = "1px solid #f5c6cb";
    messageDiv.innerHTML =
      `⚠ Aircraft weight is OUTSIDE the envelope<br>` + `<small>CG: ${pointX.toFixed(0)} mm, Weight: ${pointY.toFixed(0)} kg</small>`;
  }
}

/* =========================
   CHART UPDATE
========================= */

function updateWeightBalancePlot(canvasId, messageId, showCG = true, marker_y_override = null) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  // 🔥 Destroy any chart already attached to this canvas
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }

  // Envelope coordinates
  const xcoord = ["x1", "x2", "x3", "x4", "x5"].map((id) => parseFloat(document.getElementById(id).value) || 0);

  const ycoord = ["y1", "y2", "y3", "y4", "y5"].map((id) => parseFloat(document.getElementById(id).value) || 0);

  const marker_x = parseFloat(document.getElementById("takeoff_cg").value) || 0;
  const marker_y = marker_y_override !== null ? marker_y_override : parseFloat(document.getElementById("total_weight").value) || 0;

  if (messageId) {
    const isInside = isPointInPolygon(xcoord, ycoord, marker_x, marker_y);
    showEnvelopeMessage(isInside, marker_x, marker_y, messageId);
  }

  const envelopeData = xcoord.map((x, i) => ({ x, y: ycoord[i] }));
  envelopeData.push({ x: xcoord[0], y: ycoord[0] });

  // Start with envelope dataset
  const datasets = [
    {
      label: "Aircraft Envelope",
      data: envelopeData,
      borderColor: "#4a90e2",
      backgroundColor: "rgba(74, 144, 226, 0.1)",
      borderWidth: 2,
      showLine: true,
      fill: true,
    },
  ];
  // Optionally add Center of Gravity dataset
  if (showCG) {
    datasets.push({
      label: "Center of Gravity",
      data: [{ x: marker_x, y: marker_y }],
      backgroundColor: "#ff4b4b", // fill color
      borderColor: "#ff4b4b", // outline color
      pointRadius: 10,
      pointHoverRadius: 12,
      pointStyle: "star",
    });
  }

  // Chart.js data object
  const data = { datasets };

  return new Chart(ctx, {
    type: "scatter",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        x: {
          title: { display: true, text: "mm from reference datum" },
        },
        y: {
          title: { display: true, text: "KG" },
        },
      },
    },
  });
}

function updateAllCharts() {
  weightBalanceChart = updateWeightBalancePlot("weightBalanceChart", "envelopeMessage");

  weightBalanceChart2 = updateWeightBalancePlot("weightBalanceChart2", "", false);
}

/* =========================
   GLOBAL EXPORTS
========================= */

window.calculateWeightBalance = calculateWeightBalance;
