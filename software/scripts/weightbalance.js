let weightBalanceChart = null;

function calculateWeightBalance() {
  console.log("> func: calculateWeightBalance()");
  // Get weights
  const weight_empty = parseFloat(document.getElementById("weight_empty").value) || 0;
  const weight_pilot = parseFloat(document.getElementById("weight_pilot").value) || 0;
  const weight_copilot = parseFloat(document.getElementById("weight_copilot").value) || 0;
  const weight_rl = parseFloat(document.getElementById("weight_rl").value) || 0;
  const weight_rr = parseFloat(document.getElementById("weight_rr").value) || 0;
  const weight_bagage = parseFloat(document.getElementById("weight_bagage").value) || 0;
  const weight_fuel = parseFloat(document.getElementById("weight_fuel").value) || 0;

  // Get arms
  const arm_empty = parseFloat(document.getElementById("arm_empty").value) || 0;
  const arm_pilot = parseFloat(document.getElementById("arm_pilot").value) || 0;
  const arm_copilot = parseFloat(document.getElementById("arm_copilot").value) || 0;
  const arm_rl = parseFloat(document.getElementById("arm_rl").value) || 0;
  const arm_rr = parseFloat(document.getElementById("arm_rr").value) || 0;
  const arm_bagage = parseFloat(document.getElementById("arm_bagage").value) || 0;
  const arm_fuel = parseFloat(document.getElementById("arm_fuel").value) || 0;

  // Calculate moments
  const moment_empty = weight_empty * arm_empty;
  const moment_pilot = weight_pilot * arm_pilot;
  const moment_copilot = weight_copilot * arm_copilot;
  const moment_rl = weight_rl * arm_rl;
  const moment_rr = weight_rr * arm_rr;
  const moment_bagage = weight_bagage * arm_bagage;
  const moment_fuel = weight_fuel * arm_fuel;

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
  const total_weight = weight_empty + weight_pilot + weight_copilot + weight_rl + weight_rr + weight_bagage + weight_fuel;
  const takeoff_cg = total_weight > 0 ? (total_moment / total_weight).toFixed(0) : 0;

  // Update total fields
  document.getElementById("total_moment").value = total_moment.toFixed(0);
  document.getElementById("total_weight").value = total_weight.toFixed(0);
  document.getElementById("takeoff_cg").value = takeoff_cg;

  // Update the plot after calculation
  updateWeightBalancePlot();
}

// WIND ENVELOPE PLOT
function isPointInPolygon(xcoord, ycoord, pointX, pointY) {
  // Ray casting algorithm to check if point is inside polygon
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

function showEnvelopeMessage(isInside, pointX, pointY) {
  const messageDiv = document.getElementById("envelopeMessage");
  messageDiv.style.display = "block";

  if (isInside) {
    messageDiv.style.background = "#d4edda";
    messageDiv.style.color = "#155724";
    messageDiv.style.border = "1px solid #c3e6cb";
    messageDiv.innerHTML = `✓ Aircraft is WITHIN the envelope<br><small>CG: ${pointX.toFixed(0)} mm, Weight: ${pointY.toFixed(2)} kg</small>`;
  } else {
    messageDiv.style.background = "#f8d7da";
    messageDiv.style.color = "#721c24";
    messageDiv.style.border = "1px solid #f5c6cb";
    messageDiv.innerHTML = `⚠ Aircraft is OUTSIDE the envelope<br><small>CG: ${pointX.toFixed(0)} mm, Weight: ${pointY.toFixed(2)} kg</small>`;
  }
}

function updateWeightBalancePlot() {
  // Get envelope coordinates
  const xcoord = [
    parseFloat(document.getElementById("x1").value) || 0,
    parseFloat(document.getElementById("x2").value) || 0,
    parseFloat(document.getElementById("x3").value) || 0,
    parseFloat(document.getElementById("x4").value) || 0,
    parseFloat(document.getElementById("x5").value) || 0,
  ];

  const ycoord = [
    parseFloat(document.getElementById("y1").value) || 0,
    parseFloat(document.getElementById("y2").value) || 0,
    parseFloat(document.getElementById("y3").value) || 0,
    parseFloat(document.getElementById("y4").value) || 0,
    parseFloat(document.getElementById("y5").value) || 0,
  ];

  // Get CG and total weight from calculated values
  const marker_x = parseFloat(document.getElementById("takeoff_cg").value) || 0;
  const marker_y = parseFloat(document.getElementById("total_weight").value) || 0;

  // Check if point is inside polygon
  const isInside = isPointInPolygon(xcoord, ycoord, marker_x, marker_y);
  showEnvelopeMessage(isInside, marker_x, marker_y);

  // Prepare data for chart
  const envelopeData = xcoord.map((x, i) => ({ x: x, y: ycoord[i] }));
  // Close the polygon by adding the first point at the end
  envelopeData.push({ x: xcoord[0], y: ycoord[0] });

  const ctx = document.getElementById("weightBalanceChart").getContext("2d");

  // Destroy existing chart if it exists
  if (weightBalanceChart) {
    weightBalanceChart.destroy();
  }

  // Create new chart
  weightBalanceChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Aircraft Envelope",
          data: envelopeData,
          borderColor: "#4a90e2",
          backgroundColor: "rgba(74, 144, 226, 0.1)",
          borderWidth: 2,
          showLine: true,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#4a90e2",
        },
        {
          label: "Center of Gravity",
          data: [{ x: marker_x, y: marker_y }],
          borderColor: "#ff4b4b",
          backgroundColor: "#ff4b4b",
          pointRadius: 10,
          pointHoverRadius: 12,
          pointStyle: "star",
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#333",
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `CG: ${context.parsed.x.toFixed(2)} mm, Weight: ${context.parsed.y.toFixed(2)} kg`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: {
            display: true,
            text: "mm from reference datum",
            color: "#333",
            font: {
              size: 12,
              weight: "600",
            },
          },
          ticks: {
            color: "#666",
          },
          grid: {
            color: "#e0e0e0",
          },
        },
        y: {
          title: {
            display: true,
            text: "KG",
            color: "#333",
            font: {
              size: 12,
              weight: "600",
            },
          },
          ticks: {
            color: "#666",
          },
          grid: {
            color: "#e0e0e0",
          },
        },
      },
    },
  });
}

function updateWeightBalance() {
  // Collect all data
  const data = {
    weights: {
      empty: document.getElementById("weight_empty").value,
      pilot: document.getElementById("weight_pilot").value,
      copilot: document.getElementById("weight_copilot").value,
      rl: document.getElementById("weight_rl").value,
      rr: document.getElementById("weight_rr").value,
      bagage: document.getElementById("weight_bagage").value,
      fuel: document.getElementById("weight_fuel").value,
    },
    arms: {
      empty: document.getElementById("arm_empty").value,
      pilot: document.getElementById("arm_pilot").value,
      copilot: document.getElementById("arm_copilot").value,
      rl: document.getElementById("arm_rl").value,
      rr: document.getElementById("arm_rr").value,
      bagage: document.getElementById("arm_bagage").value,
      fuel: document.getElementById("arm_fuel").value,
    },
    envelope: {
      x1: document.getElementById("x1").value,
      y1: document.getElementById("y1").value,
      x2: document.getElementById("x2").value,
      y2: document.getElementById("y2").value,
      x3: document.getElementById("x3").value,
      y3: document.getElementById("y3").value,
      x4: document.getElementById("x4").value,
      y4: document.getElementById("y4").value,
      x5: document.getElementById("x5").value,
      y5: document.getElementById("y5").value,
    },
  };

  console.log("Updated weight and balance data:", data);
  alert("Weight and balance scheme updated!");
}

// Make it globally accessible
window.calculateWeightBalance = calculateWeightBalance;
window.updateWeightBalancePlot = updateWeightBalancePlot;
