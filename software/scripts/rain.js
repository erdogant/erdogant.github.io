(function () {
  const rainControllers = {};

  function startRain(canvas, img) {
    const ctx = canvas.getContext("2d");
    let running = false;
    let rafId = null;
    let particles = [];
    let pIndex = 0;

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
      // this.alpha = Math.random() * 0.15 + 0.05;
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

      // for (let i = 0; i < 300; i++) {
      //   new Dot(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 10 - 5, Math.random() * 80 + 40);
      // }
      for (let i = 0; i < cfg.count; i++) {
        new Dot(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 6 - 3, Math.random() * (cfg.lenMax - cfg.lenMin) + cfg.lenMin);
      }

      for (let i in particles) particles[i].draw();
      rafId = requestAnimationFrame(loop);
    }

    return {
      start(newIntensity = "medium") {
        currentIntensity = newIntensity;

        if (running) return;

        running = true;
        particles = []; // reset for clean intensity switch
        resize();
        loop();
      },

      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        particles = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
    };

    // return {
    //   start(intensity) {
    //     if (running) return;
    //     intensity = intensity;
    //     running = true;
    //     resize();
    //     loop();
    //   },
    //   stop,
    // };

    // function start() {
    //   if (running) return;
    //   running = true;
    //   resize();
    //   loop();
    // }

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      particles = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    img.addEventListener("load", resize);
    window.addEventListener("resize", resize);

    return { start, stop };
  }

  /* --- PUBLIC API --- */
  window.updateRain = function (prefix) {
    console.log(`>func: updateRain(${prefix})`);

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

    const controller = rainControllers[prefix];
    const metar_obj = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;

    if (!metar_obj || !metar_obj.rain) {
      console.log(`   >No METAR data for ${prefix}`);
      controller.stop();
      return;
    }

    // light, medium, heavy
    let rainIntensity = "medium";

    if (metar_obj.rain === true) {
      const weatherIntensity = metar_obj.weather?.intensity?.[0];
      // Set the intensity
      if (weatherIntensity === true) {
        rainIntensity = "heavy"; // +
      }
      if (weatherIntensity === false) {
        rainIntensity = "light"; // -
      }

      // Start the rain
      console.log(`   >Rain ${rainIntensity} for ${prefix}`);
      controller.start(rainIntensity);
    } else {
      console.log(`   >No rain for ${prefix}`);
      controller.stop();
    }
  };
})();

const INTENSITY = {
  light: { count: 120, lenMin: 30, lenMax: 50, alphaMin: 0.04, alphaMax: 0.08 },
  medium: { count: 220, lenMin: 50, lenMax: 100, alphaMin: 0.05, alphaMax: 0.15 },
  heavy: { count: 350, lenMin: 80, lenMax: 160, alphaMin: 0.08, alphaMax: 0.25 },
};

// let rainIntensity = "medium"; // default
