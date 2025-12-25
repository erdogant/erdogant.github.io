const darkControllers = {};

function startDark(canvas, img) {
  const ctx = canvas.getContext("2d");
  let running = false;
  let rafId = null;
  let currentPhase = "day";
  let darknessLevel = 0; // 0 = full day, 1 = full night
  let sunPosition = null; // { altitude, azimuth }

  function resize() {
    const r = img.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
  }

  function calculateSunPosition(lat = null, lon = null, date = null) {
    // Calculate sun position using solar position algorithm
    // Sun altitude phases:
    // > 6° = Day
    // 0° to 6° = Golden Hour
    // -6° to 0° = Civil Twilight (sunset/sunrise glow)
    // -12° to -6° = Nautical Twilight
    // -18° to -12° = Astronomical Twilight
    // < -18° = Night
    console.log(`   > func: calculateSunPosition($lat: ${lat}, lon: ${lon}), date: ${date})`);
    if (lat === null || lon === null || date === null) {
      console.warn("   > Return with default daylight altitude because no lat/lon or date");
      return { altitude: 7, azimuth: 0 };
    }

    const julianDate = date.getTime() / 86400000 + 2440587.5;
    const century = (julianDate - 2451545.0) / 36525.0;

    // Mean longitude of sun
    const meanLong = (280.46646 + century * (36000.76983 + century * 0.0003032)) % 360;

    // Mean anomaly
    const meanAnomaly = 357.52911 + century * (35999.05029 - 0.0001537 * century);
    const meanAnomalyRad = (meanAnomaly * Math.PI) / 180;

    // Equation of center
    const center =
      Math.sin(meanAnomalyRad) * (1.914602 - century * (0.004817 + 0.000014 * century)) +
      Math.sin(2 * meanAnomalyRad) * (0.019993 - 0.000101 * century) +
      Math.sin(3 * meanAnomalyRad) * 0.000289;

    // True longitude
    const trueLong = meanLong + center;

    // Apparent longitude (corrected for nutation and aberration)
    const omega = 125.04 - 1934.136 * century;
    const lambda = trueLong - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);

    // Obliquity of ecliptic
    const obliquity = 23.439291 - century * (0.0130042 + century * (0.00000016 - century * 0.000000504));
    const obliquityCorr = obliquity + 0.00256 * Math.cos((omega * Math.PI) / 180);
    const obliquityRad = (obliquityCorr * Math.PI) / 180;

    // Right ascension and declination
    const lambdaRad = (lambda * Math.PI) / 180;
    const rightAscension = Math.atan2(Math.cos(obliquityRad) * Math.sin(lambdaRad), Math.cos(lambdaRad));
    const declination = Math.asin(Math.sin(obliquityRad) * Math.sin(lambdaRad));

    // Greenwich Mean Sidereal Time
    const gmst =
      (280.46061837 + 360.98564736629 * (julianDate - 2451545.0) + 0.000387933 * century * century - (century * century * century) / 38710000.0) %
      360;

    // Local sidereal time
    const lst = (gmst + lon) % 360;

    // Hour angle
    const hourAngle = (lst - (rightAscension * 180) / Math.PI + 360) % 360;
    // Adjust to -180 to 180 range
    const ha = hourAngle > 180 ? hourAngle - 360 : hourAngle;
    const hourAngleRad = (ha * Math.PI) / 180;

    // Convert latitude to radians
    const latRad = (lat * Math.PI) / 180;

    // Calculate altitude
    const altitude = Math.asin(Math.sin(latRad) * Math.sin(declination) + Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngleRad));

    // Calculate azimuth
    const azimuth = Math.atan2(-Math.sin(hourAngleRad), Math.cos(latRad) * Math.tan(declination) - Math.sin(latRad) * Math.cos(hourAngleRad));

    return {
      altitude: (altitude * 180) / Math.PI, // Convert to degrees
      azimuth: ((azimuth * 180) / Math.PI + 360) % 360, // Convert to degrees, 0-360
    };
  }

  function determineLightingPhase(sunAltitude) {
    // Sun altitude phases:
    // > 6° = Day
    // 0° to 6° = Golden Hour
    // -6° to 0° = Civil Twilight (sunset/sunrise glow)
    // -12° to -6° = Nautical Twilight
    // -18° to -12° = Astronomical Twilight
    // < -18° = Night

    if (sunAltitude > 6) {
      return { phase: "day", darkness: 0 };
    } else if (sunAltitude > 0) {
      // Golden hour: 0-6 degrees
      const darkness = 0.1 + ((6 - sunAltitude) / 6) * 0.05; // 0.1 to 0.15
      return { phase: "golden_hour", darkness };
    } else if (sunAltitude > -6) {
      // Civil twilight: 0 to -6 degrees
      const darkness = 0.25 + ((0 - sunAltitude) / 6) * 0.1; // 0.25 to 0.35
      return { phase: "civil_twilight", darkness };
    } else if (sunAltitude > -12) {
      // Nautical twilight: -6 to -12 degrees
      const darkness = 0.35 + ((-6 - sunAltitude) / 6) * 0.1; // 0.35 to 0.45
      return { phase: "nautical_twilight", darkness };
    } else if (sunAltitude > -18) {
      // Astronomical twilight: -12 to -18 degrees
      const darkness = 0.5 + ((-12 - sunAltitude) / 6) * 0.05; // 0.45 to 0.55
      return { phase: "astronomical_twilight", darkness };
    } else {
      // Full night
      return { phase: "night", darkness: 0.55 };
    }
  }

  function getGlowColor(phase, sunAltitude) {
    // Return gradient colors based on sun position
    switch (phase) {
      case "golden_hour":
        const goldenProgress = (6 - sunAltitude) / 6; // 0 at 6°, 1 at 0°
        return {
          // top: `rgba(255, 200, 100, ${0.3 - sunAltitude / 60})`,
          // middle: `rgba(255, 180, 80, ${0.4 - sunAltitude / 60})`,
          // bottom: `rgba(255, 150, 60, ${0.5 - sunAltitude / 60})`,
          top: `rgba(255, 200, 100, ${0.05 + goldenProgress * 0.1})`, // 0.05 to 0.15
          middle: `rgba(255, 180, 80, ${0.08 + goldenProgress * 0.12})`, // 0.08 to 0.2
          bottom: `rgba(255, 150, 60, ${0.1 + goldenProgress * 0.15})`, // 0.1 to 0.25
        };
      case "civil_twilight":
        const civilProgress = (0 - sunAltitude) / 6;
        return {
          top: `rgba(30, 60, 120, ${0.3 * civilProgress})`,
          middle: `rgba(255, 120, 60, ${0.5 * (1 - civilProgress)})`,
          bottom: `rgba(255, 100, 40, ${0.6 * (1 - civilProgress)})`,
        };
      case "nautical_twilight":
        return {
          top: `rgba(10, 20, 50, ${0.4})`,
          middle: `rgba(30, 40, 80, ${0.5})`,
          bottom: `rgba(60, 40, 60, ${0.4})`,
        };
      case "astronomical_twilight":
        return {
          top: `rgba(5, 10, 30, ${0.5})`,
          middle: `rgba(10, 15, 40, ${0.5})`,
          bottom: `rgba(20, 20, 40, ${0.3})`,
        };
      default:
        return null;
    }
  }

  function drawDarkness() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentPhase === "day") {
      // No overlay during full day
      rafId = requestAnimationFrame(drawDarkness);
      return;
    }

    // Draw gradient overlay based on sun position
    const glowColors = getGlowColor(currentPhase, sunPosition.altitude);

    if (glowColors) {
      // Draw gradient for twilight phases
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, glowColors.top);
      gradient.addColorStop(0.8, glowColors.middle);
      gradient.addColorStop(1, glowColors.bottom);
      // gradient.addColorStop(0, glowColors.top);
      // gradient.addColorStop(0.8, glowColors.middle);
      // gradient.addColorStop(1, glowColors.bottom);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply overall darkness overlay
    // if (darknessLevel > 0) {
    //   ctx.fillStyle = `rgba(0, 0, 20, ${darknessLevel})`;
    //   ctx.fillRect(0, 0, canvas.width, canvas.height);
    // }

    // Apply darkness overlay with gradient
    if (darknessLevel > 0) {
      // Create a radial gradient from center to corners
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Calculate distance from center to corner
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0, // Inner circle (center)
        centerX,
        centerY,
        maxRadius, // Outer circle (corners)
      );

      // if (currentPhase === "night" || currentPhase === "astronomical_twilight") {}
      // Center is more transparent. change 0.7 to make it darker
      gradient.addColorStop(0, `rgba(0, 0, 20, ${darknessLevel * 0.7})`);
      // Mid-way transition
      gradient.addColorStop(0.5, `rgba(0, 0, 20, ${darknessLevel * 0.8})`);
      // Corners are darkest
      gradient.addColorStop(1, `rgba(0, 0, 20, ${darknessLevel})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    rafId = requestAnimationFrame(drawDarkness);
  }

  function start(lat, lon, date = new Date(), sunAltitude = null) {
    if (!running) {
      running = true;
      resize();
    }

    // Determine lighting phase
    let phase, darkness, altitude;
    if (sunAltitude === null) {
      // Calculate sun position
      sunPosition = calculateSunPosition(lat, lon, date);
      altitude = sunPosition.altitude;
      // Calculate phase
      ({ phase, darkness } = determineLightingPhase(sunPosition.altitude));
    } else {
      ({ phase, darkness } = determineLightingPhase(sunAltitude));
      altitude = sunAltitude;
    }
    currentPhase = phase;
    darknessLevel = darkness;

    console.log(`   >Sun altitude: ${altitude.toFixed(2)}°, Phase: ${phase}, Darkness: ${darkness.toFixed(2)}`);

    if (!rafId) {
      drawDarkness();
    }
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  img.addEventListener("load", resize);
  window.addEventListener("resize", resize);

  return { start, stop };
}

// Helper function to update darkness in real-time
function updateDarkness(prefix, lat, lon) {
  if (darkControllers[prefix]) {
    animateDark(prefix, lat, lon, new Date());
  }
}

// Optional: Auto-update every 5 minutes
// function startAutoUpdate(prefix, lat, lon, intervalMinutes = 5) {
//   animateDark(prefix, lat, lon);
//   return setInterval(
//     () => {
//       updateDarkness(prefix, lat, lon);
//     },
//     intervalMinutes * 60 * 1000,
//   );
// }

/* --- PUBLIC API --- */
function animateDark(prefix, process = "auto", lat = null, lon = null, date = null, sunAltitude = null) {
  // process:
  //      'auto':  Starts based on METAR data
  //      'start': Starts with rainIntensity
  //      'stop':  Stops rain animation
  //
  // Sun altitude phases:
  // > 6° = Day
  // 0° to 6° = Golden Hour
  // -6° to 0° = Civil Twilight (sunset/sunrise glow)
  // -12° to -6° = Nautical Twilight
  // -18° to -12° = Astronomical Twilight
  // < -18° = Night
  //

  if (date === null) {
    date = new Date();
  }

  console.log(`> func: animateDark(${prefix}, lat: ${lat}, lon: ${lon}), date: ${date})`);

  if (!darkControllers[prefix]) {
    // Get the canvas
    const canvas = document.querySelector(`.dark-canvas[data-prefix="${prefix}"]`);
    // Get the image
    const img = document.getElementById(`${prefix}_image_cache`);

    if (!canvas || !img) {
      console.warn(`   >Dark setup missing for ${prefix}`);
      return;
    }

    darkControllers[prefix] = startDark(canvas, img);
  }

  // Spin up the controllers
  const controller = darkControllers[prefix];

  // Force animate to start
  if (process === "start") {
    console.log(`   >Force Start Darkness animation for sunAltitude: ${sunAltitude}`);
    // Take latlon of europe
    if (lat === null) lat = 54.526;
    if (lon === null) lon = 15.2551;
    controller.start(lat, lon, date, sunAltitude);
    return;
  }

  // Get coordinates from METAR or other source
  if (lat === null || lon === null || process === "stop") {
    console.log(`   >Darkness is stopped for ${prefix}. Either there are no coordinates or was stopped: ${process}`);
    controller.stop();
    return;
  }

  // Spin up the controllers
  controller.start(lat, lon, date);
}

// Make it globally accessible
window.animateDark = animateDark;
window.updateDarkness = updateDarkness;
// window.startDarkAutoUpdate = startAutoUpdate;
