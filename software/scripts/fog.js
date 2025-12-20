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

    // Soft gradient fog
    // const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.1, canvas.width / 2, canvas.height / 2, canvas.width);

    // Linear gradient fog (top to bottom)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

    gradient.addColorStop(0, `rgba(250,250,250, ${fogDensity})`); // Top (denser fog)
    gradient.addColorStop(1, `rgba(220,220,220, ${fogDensity - 0.3})`); // Bottom (transparent fog)
    // gradient.addColorStop(2, `rgba(150,150,150, 0)`); // Bottom (transparent fog)

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
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  img.addEventListener("load", resize);
  window.addEventListener("resize", resize);

  return { start, stop };
}

/* --- PUBLIC API --- */
function animateFog(prefix) {
  console.log(`> func: animateFog(${prefix})`);

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

  // Check visiblity
  let visibility = Number(metar_obj.visibility);
  if (!Number.isFinite(visibility) || visibility <= 0) {
    visibility = 9999;
  }

  if (!metar_obj || !metar_obj.visibility || visibility >= 9999 || metar_obj.cavok === true) {
    console.log(`   >Exit cloud because no metar: ${metar_obj} or Visibility: ${metar_obj.visibility}m) with density: ${density} or CAVOK=${metar_obj.cavok}`);
    controller.stop();
    return;
  }

  // DEMO
  metar_obj.visibility = 1500;

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
