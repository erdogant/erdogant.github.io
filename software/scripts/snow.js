const snowControllers = {};

function startSnow(canvas, img) {
  const ctx = canvas.getContext("2d");
  let running = false;
  let rafId = null;
  let particles = [];
  let snowIntensity = "medium"; // light, medium, heavy
  let snowSpeed = 0.3;

  class Snowflake {
    constructor(x, y, radius, color) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.radiusY = radius; //+ Math.random(); // * 2 Vertical stretch
      this.color = color;
      this.radians = Math.random() * Math.PI * 1;
      this.baseVelocity = 0.003 + Math.random() * 0.002;
      this.velocity = this.baseVelocity * snowSpeed;
      this.drift = 50 + Math.random() * 50; // Horizontal drift amount
      this.fallSpeed = 0.5 + Math.random() * 1.0; // Vertical fall speed
      this.startX = x;
      this.startY = y;
    }

    update() {
      // Horizontal drift using cosine (left-right swaying)
      this.radians += this.velocity;
      this.x = this.startX + Math.cos(this.radians) * this.drift;

      // Vertical fall - always downward
      this.y += this.fallSpeed * snowSpeed;

      // Wrap around when snowflake goes off bottom
      if (this.y - this.radiusY > canvas.height) {
        this.y = -this.radiusY;
        this.startY = -this.radiusY;
        this.startX = Math.random() * canvas.width; // Randomize X position on reset
        this.x = this.startX;
        this.radians = Math.random() * Math.PI * 2;
      }

      // Wrap around horizontal edges
      if (this.x - this.radius > canvas.width) {
        this.startX = this.startX - canvas.width;
      } else if (this.x + this.radius < 0) {
        this.startX = this.startX + canvas.width;
      }
    }

    draw() {
      ctx.save();
      ctx.beginPath();
      // Draw ellipse (oval shape) - stretched vertically
      ctx.ellipse(this.x, this.y, this.radius, this.radiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.closePath();
      ctx.restore();
    }

    updateSpeed() {
      this.velocity = this.baseVelocity * snowSpeed;
    }
  }

  function resize() {
    const r = img.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
    initializeSnow();
  }

  function initializeSnow() {
    particles = [];

    // Determine particle count based on intensity
    let particleCount;
    let sizeMultiplier; // Add size control based on intensity

    if (snowIntensity === "light") {
      particleCount = 75;
      sizeMultiplier = 0.4; // Smaller flakes
    } else if (snowIntensity === "heavy") {
      particleCount = 150;
      sizeMultiplier = 0.8; // Larger flakes
    } else {
      particleCount = 125; // medium
      sizeMultiplier = 0.6; // Normal size
    }

    const colors = ["#ccc", "#eee", "#fff", "#ddd"];

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = (0.5 + Math.random() * 3) * sizeMultiplier; // Base size * multiplier
      const color = colors[Math.floor(Math.random() * colors.length)];

      particles.push(new Snowflake(x, y, radius, color));
    }
  }

  function drawSnow() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      particle.update();
      particle.draw();
    });

    rafId = requestAnimationFrame(drawSnow);
  }

  function start(intensity = "light", speed = 0.2) {
    const needsReinit = !running || snowIntensity !== intensity;

    running = true;
    snowIntensity = intensity;
    snowSpeed = speed;

    if (needsReinit) {
      resize();
    } else {
      // Update speed of existing particles
      particles.forEach((particle) => {
        particle.updateSpeed();
      });
    }

    if (!rafId) {
      drawSnow();
    }
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];
  }

  img.addEventListener("load", resize);
  window.addEventListener("resize", resize);

  return { start, stop };
}

/* --- PUBLIC API --- */
function animateSnow(prefix, process = "auto", intensity = "light", speed = 0.2) {
  // https://codepen.io/mattpill/pen/OJJKZOO
  // process:
  //      'auto':  Starts based on METAR data
  //      'start': Starts with rainIntensity
  //      'stop':  Stops rain animation
  // intensity:
  //      'light'
  //      'medium'
  //      'heavy'

  console.log(`> func: animateSnow(${prefix}, intensity: ${intensity}, speed: ${speed})`);

  // Initialization of the controllers
  if (!snowControllers[prefix]) {
    // Get the canvas
    const canvas = document.querySelector(`.snow-canvas[data-prefix="${prefix}"]`);
    // Get the image
    const img = document.getElementById(`${prefix}_image_cache`);

    if (!canvas || !img) {
      console.warn(`Snow setup missing for ${prefix}`);
      return;
    }
    snowControllers[prefix] = startSnow(canvas, img);
  }

  // Spin up the controllers
  const controller = snowControllers[prefix];

  // Force animate to start
  if (process === "start") {
    console.log(`   >Start Cloud animation for ${prefix}`);
    controller.start(intensity, speed);
    return;
  }

  // Get METAR data
  const metar_obj = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;

  if (!metar_obj || !metar_obj.snow || process === "stop") {
    console.log(`   >Stop Snow animation. No METAR data for ${prefix}`);
    controller.stop();
    return;
  }

  // Parameters to define rain strength
  const snowIntensity = metar_obj.weather?.intensity?.[0];
  // let intensity = "medium";
  if (snowIntensity === true) {
    intensity = "heavy";
    speed = 0.8;
  } else if (snowIntensity === false) {
    intensity = "light";
    speed = 0.4;
  } else {
    intensity = "medium";
    speed = 0.7;
  }

  console.log(`   >Snow for ${prefix}: ${snowIntensity} intensity`);
  controller.start(intensity, speed);
}

// Make it globally accessible
window.animateSnow = animateSnow;
