(function () {
  const cloudControllers = {};

  function startCloud(canvas, img) {
    const ctx = canvas.getContext("2d");
    let running = false;
    let rafId = null;
    let cloudParticles = [];
    let cloudDensity = "regular"; // Density
    let cloudSpeed = 1.0; // Speed multiplier
    let cloudDirection = "left"; // "left" or "right"

    class CloudParticle {
      constructor(x, y, size, velocity) {
        this.x = x;
        this.y = y;
        this.width = size.w;
        this.height = size.h;
        this.baseVelocity = velocity;
        this.opacity = 0.3 + Math.random() * 0.4;
      }

      draw() {
        ctx.save();
        ctx.filter = "blur(40px)";
        ctx.fillStyle = `rgba(179, 184, 187, ${this.opacity})`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      update() {
        const velocity = this.baseVelocity * cloudSpeed;

        if (cloudDirection === "left") {
          this.x -= velocity;
          // Wrap around when particle goes off left edge
          if (this.x + this.width < 0) {
            this.x = canvas.width + this.width;
          }
        } else {
          this.x += velocity;
          // Wrap around when particle goes off right edge
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

      // Draw all cloud particles
      cloudParticles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      rafId = requestAnimationFrame(drawCloud);
    }

    function start(level = 1, speed = 1.0, direction = "left") {
      if (running && cloudDensity === level && cloudSpeed === speed && cloudDirection === direction) return;
      // Store new variables if not returned
      running = true;
      cloudDensity = level;
      cloudSpeed = speed;
      cloudDirection = direction;
      // Resize image
      resize();
      // Create the animated cloud
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

  function computeSpeedScore(crossWind, maxCrosswind, exponent = 2) {
    // exponent = 1:  linear)
    // exponent = 2: good default
    // exponent = 3: very aggressive near max (gust-like behavior)
    // Defaults
    console.log(`   > func: computeSpeedScore()`);
    const getMIN = 0.05;
    const getMAX = 1.5;

    // Convert to numbers
    const cw = Math.abs(Number(crossWind));
    const maxCw = Number(maxCrosswind);
    // Validate inputs, return 1 when no input
    if (!Number.isFinite(cw) || !Number.isFinite(maxCw) || maxCw <= 0) {
      return 1;
    }

    if (maxCw <= 0) return getMIN;
    // Clamp input
    const clamped = Math.min(Math.max(cw, 0), maxCw);
    // Normalize to [0, 1]
    const t = clamped / maxCw;
    // Non-linear emphasis on high end
    const curved = Math.pow(t, exponent);
    // Scale to [getMIN, getMAX]
    const score = Math.min(getMIN + curved * (getMAX - getMIN), getMAX);
    console.log(`   > Wind score: ${score.toFixed(2)}`);

    // return
    return score;
  }

  function computeCloudDensityScore(cloudLayers) {
    /**
     * Compute total cloud density for an array of cloud layers (linear scaling)
     * @param {Array} cloudLayers - Array of clouds { code, oktaMin, oktaMax, altitude }
     * @returns {number} total density score (0-20)
     */
    console.log(`   > func: computeCloudDensityScore()`);
    if (!Array.isArray(cloudLayers) || cloudLayers.length === 0) return 0;

    const MAX_SCORE = 20;
    let totalDensity = 0;

    cloudLayers.forEach((layer) => {
      const oktaMin = Number(layer.oktaMin) || 0;
      const oktaMax = Number(layer.oktaMax) || oktaMin;
      let altitude = Number(layer.altitude);
      if (!Number.isFinite(altitude)) altitude = 10000;

      // Average okta
      const avgOkta = (oktaMin + oktaMax) / 2;

      // Linear factors
      const oktaFactor = Math.min(Math.max(avgOkta / 8, 0), 1); // From 0 (low okta) to 1 (high okta)
      const altFactor = Math.min(Math.max(1 - altitude / 9999, 0), 1); // From 0 (high alt) to 1 (low alt)

      const layerDensity = oktaFactor * altFactor * MAX_SCORE;
      totalDensity += layerDensity;

      // console.log(`   >oktaFactor: ${oktaFactor} - altFactor: ${altFactor}`);
      console.log(`   >Oktamax: ${oktaMax} - ${layer.code} at ${altitude} ft → density score: ${layerDensity.toFixed(2)}, total density score: ${totalDensity.toFixed(2)}`);
    });

    // Clamp total to MAX_SCORE
    const score = Math.min(totalDensity, MAX_SCORE);
    return score;
  }

  /* --- PUBLIC API --- */
  function animateCloud(prefix, density = 1, speed = 1.0, direction = "left") {
    console.log(`> func: animateCloud(${prefix}, speed: ${speed}, direction: ${direction})`);

    if (!cloudControllers[prefix]) {
      const canvas = document.querySelector(`.cloud-canvas[data-prefix="${prefix}"]`);
      const img = document.getElementById(`${prefix}_image_cache`);

      if (!canvas || !img) {
        console.warn(`Cloud setup missing for ${prefix}`);
        return;
      }
      cloudControllers[prefix] = startCloud(canvas, img);
    }

    // Get controller
    const controller = cloudControllers[prefix];
    const metar_obj = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;

    // Return when needed
    if (!metar_obj || metar_obj.cavok === true) {
      console.log(`   >Exit Cloud because no metar: [${metar_obj}] or CAVOK=${metar_obj.cavok}`);
      controller.stop();
      return;
    }

    // Get variables from app
    const crossWind = document.getElementById(prefix + "_WIND_CROSSWIND").value;
    const headWind = document.getElementById(prefix + "_WIND_HEADWIND").value;
    const maxCrosswind = window.settings["MAX_CROSSWIND_LIMIT"];

    // Compute left or right direction with respect to the runway. Note that this is the other way arround over here!
    direction = crossWind < 0 && headWind > 0 ? "right" : crossWind > 0 && headWind > 0 ? "left" : "left";
    // Compute the animated speed
    speed = computeSpeedScore(crossWind, maxCrosswind, 2);
    // Compute cloud density score based on okta and altitude clouds
    density = computeCloudDensityScore(metar_obj.cloud);

    // Start the animateCloud
    console.log(`   >Cloud for ${prefix}: density: ${density}, crossWind: ${crossWind}kt=${speed.toFixed(2)}, direction: ${direction}`);
    controller.start(density, speed, direction);
  }

  // Make it globally accessible
  window.animateCloud = animateCloud;
})();
