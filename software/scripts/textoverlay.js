/**
 * textoverlay.js
 * Unified 4-column METAR overlay (canvas)
 */

class TextOverlay {
  constructor(canvas) {
    this.canvas = canvas;
    if (!canvas) return;

    this.ctx = canvas.getContext("2d");
    this.isRunning = false;
    this.isExpanded = true;
    this.metarObject = null;
    this.animationFrame = null;
    this.toggleButtonBounds = null;

    this.setupCanvas();
    this.setupVisibilityHandler();
    this.setupClickHandler();
  }

  setupCanvas() {
    const resize = () => {
      const p = this.canvas.parentElement;
      this.canvas.width = p.clientWidth;
      this.canvas.height = p.clientHeight;
      if (this.isRunning) this.draw();
    };
    resize();
    window.addEventListener("resize", resize);
  }

  setupVisibilityHandler() {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.isRunning) {
        this.animate();
      }
    });
  }

  setupClickHandler() {
    this.canvas.addEventListener("click", (e) => {
      if (!this.toggleButtonBounds) return;
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const b = this.toggleButtonBounds;

      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.toggleExpanded();
      }
    });

    // Cursor change on hover
    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.toggleButtonBounds) return;
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const b = this.toggleButtonBounds;

      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.canvas.style.cursor = "pointer";
      } else {
        this.canvas.style.cursor = "default";
      }
    });
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    if (this.isRunning) {
      this.draw();
    }
  }

  auto(metar_obj) {
    if (!metar_obj) {
      console.warn("   >TextOverlay.auto(): No METAR object provided");
      this.stop();
      return;
    }

    this.metarObject = metar_obj;
    this.start();
  }

  start(metar) {
    if (metar) {
      this.metarObject = metar;
    }

    if (!this.metarObject) {
      console.warn("   >TextOverlay.start(): No METAR object available");
      return;
    }

    this.isRunning = true;
    this.canvas.style.display = "block";
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = "none";
  }

  animate() {
    if (!this.isRunning) return;
    this.draw();
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  drawToggleButton(x, y) {
    const ctx = this.ctx;
    const w = 34;
    const h = 22;
    const radius = 3;

    this.toggleButtonBounds = { x, y, w, h };

    // Button background
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();

    // Button border
    ctx.strokeStyle = "#00D4FF";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.stroke();

    // Arrow icon
    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.isExpanded ? "◄" : "►", x + w / 2, y + h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.metarObject) return;

    const padding = 10;
    const rowH = 18;

    // Calculate panel width based on expanded state
    const panelW = this.isExpanded ? Math.min(500, this.canvas.width - padding * 2) : 50;
    const panelX = padding;
    const panelY = padding;
    const panelH = this.canvas.height - padding * 2;

    // Panel background
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // Draw toggle button
    this.drawToggleButton(panelX + 6, panelY + 6);

    // If collapsed, only show button
    if (!this.isExpanded) return;

    // Set text shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Column configuration
    const labelWidth = 70;
    const valueWidth = 110;
    const col1X = panelX + 10;
    const col2X = col1X + labelWidth;
    const col3X = col2X + valueWidth + 10;
    const col4X = col3X + labelWidth;

    let y = panelY + 40;

    const label = (txt, x) => {
      ctx.font = "10px 'Segoe UI', Arial, sans-serif";
      ctx.fillStyle = "#AAAAAA";
      ctx.fillText(txt, x, y);
    };

    const value = (txt, x, color = "#FFFFFF") => {
      ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(String(txt), x, y);
    };

    const section = (title, color = "#00D4FF") => {
      ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(title, col1X, y);
      y += rowH + 2;
    };

    const metar = this.metarObject;

    // === METAR INFO ===
    section("METAR INFO", "#00D4FF");
    label("Station:", col1X);
    value(metar.airport || "-", col2X);
    label("Time:", col3X);
    value(metar.dateTime?.formatted?.slice(0, 9) || "-", col4X);
    y += rowH;

    // === WEATHER ===
    section("WEATHER", "#FFD700");

    if (metar.visibility != null) {
      const visColor = metar.visibility < 5000 ? "#FF6B6B" : "#4ADE80";
      label("Visibility:", col1X);
      value((metar.visibility / 1000).toFixed(1) + " km", col2X, visColor);
    }

    if (metar.temperatures) {
      const temp = metar.temperatures.temperature;
      const tempColor = temp < 0 ? "#87CEEB" : temp > 30 ? "#FF6B6B" : "#4ADE80";
      label("Temp:", col3X);
      value(`${temp}°C`, col4X, tempColor);
    }
    y += rowH;

    if (metar.temperatures) {
      label("Dewpt:", col1X);
      value(`${metar.temperatures.dewpoint}°C`, col2X);
    }

    if (metar.qnh) {
      label("QNH:", col3X);
      value(`${metar.qnh} hPa`, col4X);
    }
    y += rowH;

    // === WIND & CLOUDS ===
    section("WIND & CLOUDS", "#87CEEB");

    if (metar.wind) {
      const windSpeed = metar.wind.speed || 0;
      const windDir = metar.wind.direction === "VRB" ? "VRB" : `${metar.wind.direction}°`;
      const windColor = windSpeed > 25 ? "#FF6B6B" : "#4ADE80";
      let windText = `${windDir}/${windSpeed}kt`;
      if (metar.wind.gust) {
        windText += `G${metar.wind.gust}`;
      }
      label("Wind:", col1X);
      value(windText, col2X, windColor);
    }

    if (metar.cloud && metar.cloud.length > 0) {
      const lowestCloud = metar.cloud[0];
      label("Clouds:", col3X);
      value(lowestCloud.code, col4X);
      y += rowH;

      if (lowestCloud.altitude !== null) {
        const cloudColor = lowestCloud.altitude < 1000 ? "#FF6B6B" : "#4ADE80";
        label("Base:", col1X);
        value(`${lowestCloud.altitude} ft`, col2X, cloudColor);
      }

      if (lowestCloud.presenceCB) {
        label("Type:", col3X);
        value("CB", col4X, "#FF6B6B");
      } else if (lowestCloud.presenceTCU) {
        label("Type:", col3X);
        value("TCU", col4X, "#FFA500");
      }
    } else if (metar.cavok) {
      label("Sky:", col3X);
      value("CAVOK", col4X, "#4ADE80");
    }
    y += rowH;

    if (metar.weather) {
      const wx = metar.weather;
      let weatherText = "";

      if (wx.intensity && wx.intensity[0] !== null) {
        weatherText += wx.intensity[0] ? "+" : "-";
      }

      if (wx.weather && wx.weather.length > 0) {
        weatherText += wx.weather[0];
      }

      if (weatherText) {
        const wxColor = metar.rain || metar.snow ? "#87CEEB" : "#FFA500";
        label("Weather:", col1X);
        value(weatherText, col2X, wxColor);
      }
    }
    y += rowH;

    // === DAYLIGHT ===
    if (metar.sunPosition) {
      section("DAYLIGHT", "#FFA500");
      const s = metar.sunPosition;

      if (s.phase) {
        const phaseColors = {
          day: "#FFD700",
          golden_hour: "#FF8C00",
          civil_twilight: "#FF6347",
          nautical_twilight: "#4169E1",
          astronomical_twilight: "#191970",
          night: "#000080",
        };
        let phaseName = s.phase.replace(/_/g, " ");
        phaseName = phaseName.replace("twilight", "tw").replace("astronomical", "astro").replace("nautical", "naut");
        label("Phase:", col1X);
        value(phaseName.toUpperCase(), col2X, phaseColors[s.phase] || "#FFFFFF");
      }

      if (s.altitude !== undefined) {
        label("Sun Alt:", col3X);
        value(`${s.altitude.toFixed(1)}°`, col4X);
      }
      y += rowH;

      if (s.daylight !== undefined) {
        const daylightColor = s.daylight ? "#FFD700" : "#191970";
        label("Daylight:", col1X);
        value(s.daylight ? "YES" : "NO", col2X, daylightColor);
      }
      y += rowH;
    }

    // === FLIGHT CONDITIONS ===
    section("FLIGHT", "#32CD32");

    if (metar.flightCategory) {
      const categoryColors = {
        VFR: "#4ADE80",
        MVFR: "#3B82F6",
        IFR: "#F59E0B",
        LIFR: "#DC2626",
      };
      label("Category:", col1X);
      value(metar.flightCategory, col2X, categoryColors[metar.flightCategory]);
    }

    if (metar.vmc) {
      const vmcU = metar.vmc.uncontrolled ? "Yes" : "No";
      const colorU = metar.vmc.uncontrolled ? "#4ADE80" : "#FF6B6B";
      label("VMC (U):", col3X);
      value(vmcU, col4X, colorU);
    }
    y += rowH;

    if (metar.vmc) {
      const vmcC = metar.vmc.controlled ? "Yes" : "No";
      const colorC = metar.vmc.controlled ? "#4ADE80" : "#FF6B6B";
      label("VMC (C):", col1X);
      value(vmcC, col2X, colorC);
    }

    const utc = new Date().toUTCString().split(" ")[4];
    label("UTC:", col3X);
    value(utc, col4X);

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

/* ---- PUBLIC API ---- */
const textOverlayControllers = {};

function animateTextOverlay(prefix, process = "auto") {
  console.log(`> func: animateTextOverlay(${prefix}, process: ${process})`);

  if (!textOverlayControllers[prefix]) {
    const canvas = document.querySelector(`.textoverlay-canvas[data-prefix="${prefix}"]`);
    if (!canvas) {
      console.warn(`   >TextOverlay canvas missing for ${prefix}`);
      return;
    }
    textOverlayControllers[prefix] = new TextOverlay(canvas);
  }

  const ctrl = textOverlayControllers[prefix];

  // Force stop
  if (process === "stop") {
    console.log(`   >TextOverlay stopped for ${prefix}`);
    ctrl.stop();
    return;
  }

  // Get METAR data
  const metar = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;

  if (!metar) {
    console.log(`   >TextOverlay stopped for ${prefix}. metar_obj is missing`);
    ctrl.stop();
    return;
  }

  // Force start with metar object
  if (process === "start") {
    console.log(`   >Force Start TextOverlay for ${prefix}`);
    ctrl.start(metar);
    return;
  }

  // Auto mode - use METAR data
  ctrl.auto(metar);
}

window.animateTextOverlay = animateTextOverlay;
