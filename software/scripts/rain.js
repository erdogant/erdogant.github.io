const rainControllers = {};
const INTENSITY = {
  light: { count: 220, lenMin: 40, lenMax: 80, alphaMin: 0.05, alphaMax: 0.13 },
  medium: { count: 275, lenMin: 60, lenMax: 120, alphaMin: 0.06, alphaMax: 0.15 },
  heavy: { count: 350, lenMin: 80, lenMax: 160, alphaMin: 0.08, alphaMax: 0.25 },
};

// function startRain(canvas, img) {
//   const ctx = canvas.getContext("2d");
//   let running = false;
//   let rafId = null;
//   let particles = [];
//   let pIndex = 0;

function startRain(canvas, img) {
  const ctx = canvas.getContext("2d");
  let running = false;
  let rafId = null;
  let particles = [];
  let pIndex = 0;
  let currentIntensity = "medium";

  function resize() {
    const r = img.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
  }

  function Dot(x, y, w, h) {
    const cfg = INTENSITY[currentIntensity];

    this.id = pIndex;
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.life = 0;
    this.maxlife = Math.random() * 2 + 1;
    this.alpha = Math.random() * (cfg.alphaMax - cfg.alphaMin) + cfg.alphaMin;
    particles[pIndex++] = this;
  }

  // function Dot(x, y, w, h) {
  //   const cfg = INTENSITY[currentIntensity];
  //   console.log(cfg);

  //   this.x = x;
  //   this.y = y;
  //   this.width = w;
  //   this.height = h;
  //   this.life = 0;
  //   this.maxlife = Math.random() * 2 + 1;
  //   // this.alpha = Math.random() * (cfg.alphaMax - cfg.alphaMin) + cfg.alphaMin;
  //   this.alpha = Math.random() * cfg.alphaMax + cfg.alphaMin;
  //   particles[pIndex++] = this;
  // }

  Dot.prototype.draw = function () {
    ctx.strokeStyle = `rgba(125,125,125,${this.alpha})`;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.stroke();

    this.life++;
    if (this.life >= this.maxlife) delete particles[this.id];
  };

  function loop() {
    if (!running) return;
    // Get intensity
    const cfg = INTENSITY[currentIntensity];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < cfg.count; i++) {
      new Dot(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 6 - 3,
        Math.random() * (cfg.lenMax - cfg.lenMin) + cfg.lenMin,
      );
    }

    for (let i in particles) particles[i].draw();
    rafId = requestAnimationFrame(loop);
  }

  function start(newIntensity = "medium") {
    currentIntensity = newIntensity;
    if (running) return;

    running = true;
    particles = [];
    resize();
    loop();
  }

  function stop() {
    // this is like a pause. You can continue with the animation at any time.
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // function destroy() {
  //   controller.stop();
  //   img.removeEventListener("load", resize);
  //   window.removeEventListener("resize", resize);
  // }

  // Resize the images correctly
  img.addEventListener("load", resize);
  window.addEventListener("resize", resize);
  // Return
  return { start, stop };
}

/* --- PUBLIC API --- */
function animateRain(prefix, process = "auto", intensity = "medium") {
  // process:
  //      'auto':  Starts based on METAR data
  //      'start': Starts with intensity
  //      'stop':  Stops rain animation
  // intensity:
  //      'light'
  //      'medium'
  //      'heavy'

  console.log(`>func: animateRain(${prefix})`);

  // Initialization of the controllers
  if (!rainControllers[prefix]) {
    // Get the canvas
    const canvas = document.querySelector(`.rain-canvas[data-prefix="${prefix}"]`);
    // Get the image
    const img = document.getElementById(`${prefix}_image_cache`);

    if (!canvas || !img) {
      console.warn(`Rain setup missing for ${prefix}`);
      return;
    }

    rainControllers[prefix] = startRain(canvas, img);
  }

  // Spin up the controllers
  const controller = rainControllers[prefix];

  // Force animate to start
  if (process === "start") {
    console.log(`   >Start Rain animation for ${prefix}`);
    controller.start(intensity);
    return;
  }

  // Get METAR data
  const metar_obj = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;

  // Stop animation and return
  if (!metar_obj || !metar_obj.rain || process === "stop") {
    console.log(`   >Stop Rain animation. No METAR data for ${prefix}`);
    controller.stop();
    return;
  }

  // Parameters to define rain strength
  const weatherIntensity = metar_obj.weather?.intensity?.[0];
  // let intensity = "medium";
  if (weatherIntensity === true) intensity = "heavy";
  else if (weatherIntensity === false) intensity = "light";

  // Start the rain
  console.log(`   >Rain ${intensity} for ${prefix}`);
  controller.start(intensity);
}

// Make it globally accessible
window.animateRain = animateRain;
