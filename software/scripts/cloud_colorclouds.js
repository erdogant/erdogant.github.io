const cloudControllers = {};

function startCloud(canvas, img) {
  const ctx = canvas.getContext("2d");
  let running = false;
  let rafId = null;
  let cloudParticles = [];
  let cloudDensity = "regular";
  let cloudSpeed = 1.0;
  let cloudDirection = "left";
  let cloudColor = "white"; // New: cloud color property

  class CloudParticle {
    constructor(x, y, size, velocity) {
      this.x = x;
      this.y = y;
      this.width = size.w;
      this.height = size.h;
      this.baseVelocity = velocity;
      this.opacity = 0.3 + Math.random() * 0.4;
      this.offsets = this.generateOffsets();
    }

    generateOffsets() {
      const layers = 5;
      const offsets = [];
      for (let i = 0; i < layers; i++) {
        offsets.push({
          x: (Math.random() - 0.5) * this.width * 0.3,
          y: (Math.random() - 0.5) * this.height * 0.3,
          scale: 0.6 + Math.random() * 0.4,
        });
      }
      return offsets;
    }

    getColorRGB() {
      // Return RGB values based on cloudColor
      switch (cloudColor) {
        case "white":
          return { r: 255, g: 255, b: 255 };
        case "gray":
          return { r: 160, g: 160, b: 160 };
        case "dark":
          return { r: 80, g: 80, b: 85 };
        default:
          return { r: 255, g: 255, b: 255 };
      }
    }

    draw() {
      ctx.save();
      const color = this.getColorRGB();

      this.offsets.forEach((offset) => {
        const gradient = ctx.createRadialGradient(
          this.x + offset.x,
          this.y + offset.y,
          0,
          this.x + offset.x,
          this.y + offset.y,
          (this.width / 2) * offset.scale,
        );

        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.3})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x + offset.x, this.y + offset.y, (this.width / 2) * offset.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    update() {
      const velocity = this.baseVelocity * cloudSpeed;

      if (cloudDirection === "left") {
        this.x -= velocity;
        if (this.x + this.width < 0) {
          this.x = canvas.width + this.width;
        }
      } else {
        this.x += velocity;
        if (this.x - this.width > canvas.width) {
          this.x = -this.width;
        }
      }
    }
  }

  function resize() {
    const r = img.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
    initializeCloud();
  }

  function initializeCloud() {
    cloudParticles = [];
    const numParticles = cloudDensity;

    for (let i = 0; i < numParticles; i++) {
      const size = {
        w: 100 + Math.random() * 150,
        h: 100 + Math.random() * 150,
      };
      cloudParticles.push(new CloudParticle(Math.random() * canvas.width, Math.random() * canvas.height, size, 0.3 + Math.random() * 0.5));
    }
  }

  function drawCloud() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cloudParticles.forEach((particle) => {
      particle.update();
      particle.draw();
    });

    rafId = requestAnimationFrame(drawCloud);
  }

  function start(level = 1, speed = 1.0, direction = "left", color = "white") {
    if (running && cloudDensity === level && cloudSpeed === speed && cloudDirection === direction && cloudColor === color) return;

    running = true;
    cloudDensity = level;
    cloudSpeed = speed;
    cloudDirection = direction;
    cloudColor = color; // Store the new color

    resize();
    drawCloud();
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cloudParticles = [];
  }

  img.addEventListener("load", resize);
  window.addEventListener("resize", resize);

  return { start, stop };
}

function computeSpeedScore(speedWind, crossWind, maxCrosswind, exponent = 2) {
  console.log(`   > func: computeSpeedScore()`);
  const getMIN = 0.03;
  const getMAX = 1.5;

  let wkt = Math.abs(Number(speedWind));
  let cw = Math.abs(Number(crossWind));
  const maxCw = Number(maxCrosswind);

  if (!Number.isFinite(cw) || !Number.isFinite(maxCw) || maxCw <= 0) {
    return 1;
  }
  if (!Number.isFinite(wkt) || wkt <= 0 || wkt === null) {
    wkt = 0;
  }

  if (maxCw <= 0) return getMIN;

  if (wkt >= 10) {
    cw = cw + Math.min(wkt, 2);
  }

  const clamped = Math.min(Math.max(cw, 0), maxCw);
  const t = clamped / maxCw;
  const curved = Math.pow(t, exponent);
  const score = Math.min(getMIN + curved * (getMAX - getMIN), getMAX);

  console.log(`   > Speed of wind sliding score: ${score.toFixed(2)} in range: ${getMIN}-${getMAX}`);
  return score;
}

function computeCloudDensityScore(cloudLayers) {
  console.log(`   > func: computeCloudDensityScore()`);
  if (!Array.isArray(cloudLayers) || cloudLayers.length === 0) return 0;

  const MAX_SCORE = 20;
  let totalDensity = 0;

  cloudLayers.forEach((layer) => {
    const maxAltitude = 9999;
    const oktaMin = Number(layer.oktaMin) || 0;
    const oktaMax = Number(layer.oktaMax) || oktaMin;
    let altitude = Number(layer.altitude);
    if (!Number.isFinite(altitude)) altitude = 10000;

    const avgOkta = (oktaMin + oktaMax) / 2;
    const oktaFactor = Math.min(Math.max(avgOkta / 8, 0), 1);
    const altFactor = Math.min(Math.max(1 - altitude / maxAltitude, 0), 1);
    const layerDensity = oktaFactor * altFactor * MAX_SCORE;
    totalDensity += layerDensity;

    console.log(
      `   >Cloud score computation: Oktamax: ${oktaMax} - ${layer.code} at ${altitude} ft → density score: ${layerDensity.toFixed(2)}, total density score: ${totalDensity.toFixed(2)}`,
    );
  });

  const score = Math.min(totalDensity, MAX_SCORE);
  return score;
}

function determineCloudColor(metar_obj, density) {
  /**
   * Determine cloud color based on weather conditions
   * @param {Object} metar_obj - METAR data object
   * @param {number} density - Cloud density score
   * @returns {string} "white", "gray", or "dark"
   */

  // Check for severe weather conditions
  if (metar_obj.weather) {
    let weatherCodes = "";

    // Handle weather as array
    if (Array.isArray(metar_obj.weather)) {
      weatherCodes = metar_obj.weather.map((w) => w.abbreviation || w.code || "").join("");
    }
    // Handle weather as string
    else if (typeof metar_obj.weather === "string") {
      weatherCodes = metar_obj.weather;
    }
    // Handle weather as single object
    else if (typeof metar_obj.weather === "object") {
      weatherCodes = metar_obj.weather.abbreviation || metar_obj.weather.code || "";
    }

    // Dark clouds for thunderstorms, heavy rain, or freezing conditions
    if (weatherCodes.includes("TS") || weatherCodes.includes("+RA") || weatherCodes.includes("FZRA") || weatherCodes.includes("+SN")) {
      return "dark";
    }

    // Gray clouds for moderate precipitation
    if (weatherCodes.includes("RA") || weatherCodes.includes("SN") || weatherCodes.includes("DZ") || weatherCodes.includes("SH")) {
      return "gray";
    }
  }

  // Color based on cloud density
  if (density >= 15) {
    return "dark";
  } else if (density >= 8) {
    return "gray";
  }

  return "white";
}

function animateCloud(prefix, process = "auto", density = 1, speed = 1.0, direction = "left", color = "auto") {
  console.log(`> func: animateCloud(${prefix}, process: ${process}, speed: ${speed}, direction: ${direction}, color: ${color})`);

  if (!cloudControllers[prefix]) {
    const canvas = document.querySelector(`.cloud-canvas[data-prefix="${prefix}"]`);
    const img = document.getElementById(`${prefix}_image_cache`);

    if (!canvas || !img) {
      console.warn(`Cloud setup missing for ${prefix}`);
      return;
    }

    cloudControllers[prefix] = startCloud(canvas, img);
  }

  const controller = cloudControllers[prefix];

  if (process === "start") {
    console.log(`   >Start Cloud animation for ${prefix}`);
    controller.start(density, speed, direction, color === "auto" ? "white" : color);
    return;
  }

  const metar_obj = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;

  if (!metar_obj || metar_obj.cavok === true || process === "stop") {
    console.log(`   >Exit Cloud because process: ${process} or metar: [${metar_obj}] or CAVOK: ${metar_obj.cavok}`);
    controller.stop();
    return;
  }

  const crossWind = document.getElementById(prefix + "_WIND_CROSSWIND").value;
  const headWind = document.getElementById(prefix + "_WIND_HEADWIND").value;
  const speedWind = document.getElementById(prefix + "_WIND_SPEED").value;
  const maxCrosswind = window.settings["MAX_CROSSWIND_LIMIT"];

  direction = crossWind < 0 && headWind > 0 ? "right" : crossWind > 0 && headWind > 0 ? "left" : "left";
  speed = computeSpeedScore(speedWind, crossWind, maxCrosswind, 2);
  density = computeCloudDensityScore(metar_obj.cloud);

  // Determine cloud color automatically or use provided color
  const finalColor = color === "auto" ? determineCloudColor(metar_obj, density) : color;

  console.log(
    `   >Cloud for ${prefix}: density: ${density.toFixed(2)}, crossWind: ${crossWind}kt=${speed.toFixed(2)}, direction: ${direction}, color: ${finalColor}`,
  );
  controller.start(density, speed, direction, finalColor);
}

window.animateCloud = animateCloud;
