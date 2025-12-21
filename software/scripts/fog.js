const fogControllers = {};

function startFog(canvas, img) {
  const ctx = canvas.getContext("2d");
  let running = false;
  let rafId = null;
  let fogDensity = 0.4; // default

  function resize() {
    const r = img.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
  }

  function drawFog() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Linear gradient fog (top to bottom)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

    gradient.addColorStop(0, `rgba(250,250,250, ${fogDensity})`); // Top (denser fog)
    gradient.addColorStop(1, `rgba(220,220,220, ${fogDensity - 0.3})`); // Bottom (transparent fog)

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    rafId = requestAnimationFrame(drawFog);
  }

  function start(level = "medium") {
    if (running) return;
    running = true;

    if (level === "light") fogDensity = 0.6;
    else if (level === "heavy") fogDensity = 0.9;
    else fogDensity = 0.7;

    resize();
    drawFog();
  }

  function stop() {
    // this is like a pause. You can continue with the animation at any time.
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
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

function determineMistLight(metar_obj) {
  const weather = metar_obj?.weather;
  if (!weather || !Array.isArray(weather.weather)) return false;

  isMist = weather.weather.some((w) => ["Mist", "Fog", "Haze", "Smoke", "Sand", "Dust"].includes(w));
  return Boolean(isMist);
}

function determineMistHeavy(metar_obj) {
  const weather = metar_obj?.weather;
  if (!weather || !Array.isArray(weather.weather)) return false;

  isMist = weather.weather.some((w) => ["Volcanic Ash", "Dust Whirlpool", "Sand Storm", "Dust Storm", "Funnel Cloud", "Squalls"].includes(w));

  return Boolean(isMist);
}

/* --- PUBLIC API --- */
function animateFog(prefix, process = "auto", intensity = "light") {
  // process:
  //      'auto':  Starts based on METAR data
  //      'start': Starts with rainIntensity
  //      'stop':  Stops rain animation
  // intensity:
  //      'light'
  //      'medium'
  //      'heavy'

  console.log(`> func: animateFog(${prefix})`);

  // Initialization of the controllers
  if (!fogControllers[prefix]) {
    // Get the canvas
    const canvas = document.querySelector(`.fog-canvas[data-prefix="${prefix}"]`);
    // Get the images
    const img = document.getElementById(`${prefix}_image_cache`);

    if (!canvas || !img) {
      console.warn(`Fog setup missing for ${prefix}`);
      return;
    }

    fogControllers[prefix] = startFog(canvas, img);
  }

  // Spin up the controllers
  const controller = fogControllers[prefix];

  // Force animate to start
  if (process === "start") {
    console.log(`   >Start Fog animation for ${prefix}`);
    controller.start(intensity);
  }

  // Get METAR data
  const metar_obj = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;
  // Check visiblity
  let visibility = Number(metar_obj.visibility);
  if (!Number.isFinite(visibility) || visibility <= 0) {
    visibility = 9999;
  }

  // Stop animation and return
  if (!metar_obj || metar_obj.cavok === true || process === "stop") {
    console.log(`   >Exit Fog: METAR: ${metar_obj}, CAVOK=${metar_obj.cavok}`);
    controller.stop();
    return;
  }

  // Override visibility based on the mist from the METAR
  if (determineMistLight(metar_obj) === true) visibility = 5000;
  if (determineMistHeavy(metar_obj) === true) visibility = 2500;
  console.log(
    `   >Visibility is: ${visibility}. Light mist: ${determineMistLight(metar_obj) === true}, Heavy mist: ${determineMistHeavy(metar_obj) === true}`,
  );

  // Add to image
  if (visibility <= 2500) {
    controller.start("heavy");
  } else if (visibility <= 5000) {
    controller.start("medium");
  } else if (visibility <= 8000) {
    controller.start("light");
  } else {
    controller.stop();
  }
}
// Make it globally accessible
window.animateFog = animateFog;
