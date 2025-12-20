const fogControllers = {};

function startFog(canvas, img) {
  const ctx = canvas.getContext("2d");
  let running = false;
  let rafId = null;
  let fogParticles = [];
  let fogDensity = "regular"; // Density
  let fogSpeed = 1.0; // Speed multiplier
  let fogDirection = "left"; // "left" or "right"

  class FogParticle {
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
      const velocity = this.baseVelocity * fogSpeed;

      if (fogDirection === "left") {
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
    initializeFog();
  }

  function initializeFog() {
    fogParticles = [];
    // const numParticles = fogDensity === "light" ? 8 : fogDensity === "medium" ? 12 : fogDensity === "heavy" ? 20 : 3;
    const numParticles = fogDensity;

    for (let i = 0; i < numParticles; i++) {
      const size = {
        w: 100 + Math.random() * 150,
        h: 100 + Math.random() * 150,
      };
      fogParticles.push(new FogParticle(Math.random() * canvas.width, Math.random() * canvas.height, size, 0.3 + Math.random() * 0.5));
    }
  }

  function drawFog() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all fog particles
    fogParticles.forEach((particle) => {
      particle.update();
      particle.draw();
    });

    rafId = requestAnimationFrame(drawFog);
  }

  function start(level = 3, speed = 1.0, direction = "left") {
    if (running && fogDensity === level && fogSpeed === speed && fogDirection === direction) return;
    // Store new variables if not returned
    running = true;
    fogDensity = level;
    fogSpeed = speed;
    fogDirection = direction;
    // Resize image
    resize();
    // Create the animated Fog
    drawFog();
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fogParticles = [];
  }

  img.addEventListener("load", resize);
  window.addEventListener("resize", resize);

  return { start, stop };
}

function normalizeCrosswind(crossWind, maxCrosswind, exponent = 2) {
  // exponent = 1:  linear)
  // exponent = 2: good default
  // exponent = 3: very aggressive near max (gust-like behavior)

  // Convert to numbers
  const cw = Math.abs(Number(crossWind));
  const maxCw = Number(maxCrosswind);

  // Validate inputs, return 3 when no input
  if (!Number.isFinite(cw) || !Number.isFinite(maxCw) || maxCw <= 0) {
    return 3;
  }

  // Range
  const getMIN = 0.1;
  const getMAX = 5;

  if (maxCw <= 0) return getMIN;
  // Clamp input
  const clamped = Math.min(Math.max(cw, 0), maxCw);
  // Normalize to [0, 1]
  const t = clamped / maxCw;
  // Non-linear emphasis on high end
  const curved = Math.pow(t, exponent);
  // Scale to [getMIN, getMAX]
  return getMIN + curved * (getMAX - getMIN);
}

/* --- PUBLIC API --- */
function animateFog(prefix, density = 3, speed = 1.0, direction = "left") {
  console.log(`> func: animateFog(${prefix}, speed: ${speed}, direction: ${direction})`);

  if (!fogControllers[prefix]) {
    const canvas = document.querySelector(`.fog-canvas[data-prefix="${prefix}"]`);
    const img = document.getElementById(`${prefix}_image_cache`);

    if (!canvas || !img) {
      console.warn(`Fog setup missing for ${prefix}`);
      return;
    }
    fogControllers[prefix] = startFog(canvas, img);
  }

  const controller = fogControllers[prefix];
  const metar_obj = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;

  // if (prefix === "DEPARTURE") {
  //   density = 20;
  //   speed = 0.5;
  //   direction = "right";
  // }
  // if (prefix === "ARRIVAL") {
  //   density = 12;
  //   speed = 1.5;
  //   direction = "left";
  // }

  const visibility = Number(metar_obj.visibility);
  if (!Number.isFinite(visibility) || visibility <= 0) {
    visibility = 9999;
  }

  // // Determine fog level based on visibility
  if (visibility <= 2000) {
    console.log(`   >Heavy fog for ${prefix} (vis: ${visibility}m)`);
    density = 20;
  } else if (visibility <= 5000) {
    console.log(`   >Medium fog for ${prefix} (vis: ${visibility}m)`);
    density = 15;
  } else if (visibility <= 8000) {
    console.log(`   >Light fog for ${prefix} (vis: ${visibility}m)`);
    density = 8;
  } else if (visibility >= 9999) {
    console.log(`   >No fog for ${prefix} (vis: ${visibility}m)`);
    density = 0;
  }

  // Return when needed
  if (!metar_obj || !metar_obj.visibility || density === 0 || metar_obj.cavok === true) {
    console.log(`   >Exit Fog because no metar: ${metar_obj} or Visibility: ${metar_obj.visibility}m) with density: ${density} or CAVOK=${metar_obj.cavok}`);
    controller.stop();
    return;
  }

  // When there is no fog density, stop and return
  // controller.start(10, 5, "left");
  // return;

  const crossWind = document.getElementById(prefix + "_WIND_CROSSWIND").value;
  const headWind = document.getElementById(prefix + "_WIND_HEADWIND").value;
  const maxCrosswind = window.settings["MAX_CROSSWIND_LIMIT"];

  // Compute left or right direction with respect to the runway. Note that this is the other way arround over here!
  if (crossWind < 0 && headWind > 0) {
    direction = "right";
  } else if (crossWind > 0 && headWind > 0) {
    direction = "left";
  }

  // Compute the animated speed
  speed = normalizeCrosswind(crossWind, maxCrosswind, (exponent = 2));

  // Start the Fog
  console.log(`   >Fog for ${prefix}: visibility: ${visibility}m=${density}, crossWind: ${crossWind}kt=${speed}, direction: ${direction}`);
  controller.start(density, speed, direction);
}

// Make it globally accessible
window.animateFog = animateFog;
