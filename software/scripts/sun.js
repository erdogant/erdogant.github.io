const flareControllers = {};

function startFlare(canvas, img) {
  const ctx = canvas.getContext("2d");
  let running = false;
  let rafId = null;
  let flares = [];
  let flareIntensity = 1.0;
  let flarePosition = { x: 0.8, y: 0.2 }; // Relative position (0-1)
  let flarePulseSpeed = 1.0; // Pulse speed multiplier
  let flareSize = 1.0; // Size multiplier

  class Flare {
    constructor(x, y, size, color, opacity, offset) {
      this.baseX = x;
      this.baseY = y;
      this.x = x + offset.x;
      this.y = y + offset.y;
      this.baseSize = size;
      this.size = size * flareSize;
      this.color = color;
      this.baseOpacity = opacity;
      this.opacity = opacity;
      this.pulse = Math.random() * Math.PI * 2;
      this.basePulseSpeed = 0.02 + Math.random() * 0.03;
      this.pulseSpeed = this.basePulseSpeed * flarePulseSpeed;
    }

    draw() {
      // Animate pulse
      this.pulse += this.pulseSpeed;
      this.opacity = this.baseOpacity * (0.7 + Math.sin(this.pulse) * 0.3) * flareIntensity;

      // Draw glow
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      gradient.addColorStop(0, `${this.color}, ${this.opacity})`);
      gradient.addColorStop(0.4, `${this.color}, ${this.opacity * 0.5})`);
      gradient.addColorStop(1, `${this.color}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    updateSize() {
      this.size = this.baseSize * flareSize;
    }

    updatePulseSpeed() {
      this.pulseSpeed = this.basePulseSpeed * flarePulseSpeed;
    }

    updatePosition(centerX, centerY) {
      // Recalculate position based on center
      const offsetX = this.x - this.baseX;
      const offsetY = this.y - this.baseY;
      this.baseX = centerX;
      this.baseY = centerY;
      this.x = centerX + offsetX;
      this.y = centerY + offsetY;
    }
  }

  function resize() {
    const r = img.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
    initializeFlares();
  }

  function initializeFlares() {
    flares = [];

    // Main sun position
    const sunX = canvas.width * flarePosition.x;
    const sunY = canvas.height * flarePosition.y;

    // Main sun core (bright white/yellow)
    // White-hot saturated core
    flares.push(new Flare(sunX, sunY, 55, "rgba(255,255,255", 0.98, { x: 0, y: 0 }));
    // Slightly warm white
    flares.push(new Flare(sunX, sunY, 90, "rgba(255,248,220", 0.75, { x: 0, y: 0 }));
    // Yellow falloff
    flares.push(new Flare(sunX, sunY, 140, "rgba(255,230,150", 0.45, { x: 0, y: 0 }));
    // Golden halo
    flares.push(new Flare(sunX, sunY, 200, "rgba(255,200,80", 0.25, { x: 0, y: 0 }));

    // Lens flare artifacts along axis from center to sun
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = sunX - centerX;
    const dy = sunY - centerY;

    // Varying colors and sizes
    const colors = [
      "rgba(255,255,255", // neutral ghost
      "rgba(220,255,255", // cyan (glass reflection)
      "rgba(200,255,200", // green tint
      "rgba(255,220,200", // warm amber
      "rgba(255,200,255", // magenta edge
      "rgba(180,220,255", // blue-ish flare
    ];

    // Create multiple lens flares along the axis
    const flareCount = 6;
    for (let i = 1; i <= flareCount; i++) {
      const t = (i / flareCount) * 1.5 - 0.5; // Position along axis
      const x = centerX + dx * t;
      const y = centerY + dy * t;
      const color = colors[i % colors.length];
      const size = 30 + Math.random() * 50;
      const opacity = 0.2 + Math.random() * 0.3;

      flares.push(
        new Flare(x, y, size, color, opacity, {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 20,
        }),
      );
    }

    /* ===============================
       Hexagonal flares (classic lens artifact)
       =============================== */
    for (let i = 0; i < 3; i++) {
      const t = 0.3 + i * 0.3;
      // const t = 0.25 + i * 0.25;
      const x = centerX + dx * t;
      const y = centerY + dy * t;
      flares.push(new Flare(x, y, 40 + i * 20, "rgba(200, 200, 255", 0.15, { x: 0, y: 0 }));
      // flares.push(new Flare(x, y, 35 + i * 18, "rgba(245,245,255)", 0.08, { x: 0, y: 0 }));
    }
  }

  function drawFlares() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all flares
    flares.forEach((flare) => {
      flare.draw();
    });

    rafId = requestAnimationFrame(drawFlares);
  }

  // function drawFlares() {
  //   if (!running) return;

  //   ctx.clearRect(0, 0, canvas.width, canvas.height);

  //   // Draw radial flares
  //   flares.forEach((flare) => {
  //     flare.draw();
  //   });

  //   /* ===============================
  //      ANAMORPHIC CINEMATIC STREAKS
  //      =============================== */

  //   const sunX = canvas.width * flarePosition.x;
  //   const sunY = canvas.height * flarePosition.y;

  //   ctx.save();
  //   ctx.globalCompositeOperation = "screen";
  //   ctx.filter = "blur(6px)";

  //   // Main blue streak
  //   addAnamorphicStreak(sunX, sunY, canvas.width * 0.9, 8, "rgba(180,220,255", 0.12 * flareIntensity);
  //   // Secondary faint streak slightly offset
  //   addAnamorphicStreak(sunX, sunY + 10, canvas.width * 0.6, 5, "rgba(200,235,255", 0.08 * flareIntensity);
  //   ctx.restore();
  //   rafId = requestAnimationFrame(drawFlares);
  // }

  // function addAnamorphicStreak(x, y, width, height, color, opacity) {
  //   const gradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);

  //   gradient.addColorStop(0.0, `${color}, 0)`);
  //   gradient.addColorStop(0.45, `${color}, ${opacity})`);
  //   gradient.addColorStop(0.5, `${color}, ${opacity * 1.2})`);
  //   gradient.addColorStop(0.55, `${color}, ${opacity})`);
  //   gradient.addColorStop(1.0, `${color}, 0)`);

  //   ctx.fillStyle = gradient;
  //   ctx.fillRect(x - width / 2, y - height / 2, width, height);
  // }

  function start(intensity = 1.5, position = { x: 0.05, y: 0.1 }, pulseSpeed = 0.2, size = 1.1) {
    const needsReinit = !running || flarePosition.x !== position.x || flarePosition.y !== position.y || flareSize !== size;

    running = true;
    flareIntensity = intensity;
    flarePosition = position;
    flarePulseSpeed = pulseSpeed;
    flareSize = size;

    if (needsReinit) {
      resize();
    } else {
      // Update existing flares
      flares.forEach((flare) => {
        flare.updatePulseSpeed();
        flare.updateSize();
      });
    }

    if (!rafId) {
      drawFlares();
    }
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    flares = [];
  }

  img.addEventListener("load", resize);
  window.addEventListener("resize", resize);

  return { start, stop };
}

function shouldShowSun(metar_obj, min_visibility = 8000) {
  // Show sun if:
  // 1. CAVOK, OR
  // 2. Good visibility (>8km) AND not overcast below 5000

  if (metar_obj.cavok) {
    return true;
  }

  const goodVisibility = metar_obj.visibility > min_visibility;

  // Check cloud coverage
  let hasOvercast = false;
  if (metar_obj.cloud && Array.isArray(metar_obj.cloud)) {
    for (const layer of metar_obj.cloud) {
      if (["BKN", "OVC", "VV"].includes(layer.code) && layer.altitude < 5000) {
        hasOvercast = true;
        break;
      }
    }
  }

  return goodVisibility && !hasOvercast;
}

/* --- PUBLIC API --- */
function animateFlare(prefix, process = "auto", intensity = 1.5, position = { x: 0.05, y: 0.1 }, pulseSpeed = 0.2, size = 1.1) {
  console.log(
    `> func: animateFlare(${prefix}, intensity: ${intensity}, position: ${position.x},${position.y}, pulseSpeed: ${pulseSpeed}, size: ${size})`,
  );

  // Initialization of the controllers
  if (!flareControllers[prefix]) {
    // Get the canvas
    const canvas = document.querySelector(`.flare-canvas[data-prefix="${prefix}"]`);
    // Get the images
    const img = document.getElementById(`${prefix}_image_cache`);

    if (!canvas || !img) {
      console.warn(`Flare canvas or image is missing for ${prefix}`);
      return;
    }

    flareControllers[prefix] = startFlare(canvas, img);
  }

  // Spin up the controllers
  const controller = flareControllers[prefix];

  // Force animate to start
  if (process === "start") {
    console.log(`   >Start SunFlare animation for ${prefix}`);
    controller.start(intensity, position, pulseSpeed, size);
    return;
  }

  // Get METAR data
  const metar_obj = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;

  // Stop animation and return
  if (!metar_obj || process === "stop") {
    controller.stop();
    return;
  }

  // Check for clear/sunny conditions (no heavy clouds, good visibility)
  const hasSun = shouldShowSun(metar_obj);

  if (hasSun) {
    console.log(`   >Sun flare for ${prefix}: intensity ${intensity}, pulseSpeed ${pulseSpeed}, size ${size}`);
    controller.start(intensity, position, pulseSpeed, size);
  } else {
    console.log(`   >No sun for ${prefix} (cloudy/poor visibility)`);
    controller.stop();
  }
}

// Make it globally accessible
window.animateFlare = animateFlare;
