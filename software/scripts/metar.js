// Complete METAR Parser with Flight Category Analysis
// Based on ICAO METAR standards and FAA flight categories

class Metar {
  constructor(code, text = null, lat = null, lon = null) {
    console.log(`>func: Metar()`);

    this.airport = code;
    this.dataDate = null;
    this.lat = lat;
    this.lon = lon;
    this.metar = text;
    this.metarWithoutChangements = text;

    // Parse all components
    this.changements = this.analyzeChangements();
    this.auto = this.analyzeAuto();
    this.dateTime = this.analyzeDateTime();
    this.qnh = this.analyzeQNH();
    this.temperatures = this.analyzeTemperatures();
    this.wind = this.analyzeWind();
    this.visibility = this.analyzeVisibility();
    this.rvr = this.analyzeRVR();
    this.weather = this.analyzeWeather();
    this.cloud = this.analyzeCloud();
    this.cavok = this.analyzeCAVOK();
    this.vmc = this.verifyVMC();
    this.flightCategory = this.determineFlightCategory();
    this.rain = this.determineRain();
    this.snow = this.determineSnow();
    this.mist = this.determineMist();
    this.icon_vfr = this.determineVFRIcon();
    this.color = this.determineColor();
    this.crosswind = this.analyzeCrossWind();
    this.headwind = this.analyzeHeadWind();
    this.sunPosition = this.calculateSunPosition();
    // this.lightingPhase = this.determineLightingPhase();
    this.icon = this.determineMetarIcon();
    this.colorState = this.colorState();

    this.properties = {
      airport: this.airport,
      dateTime: this.dateTime,
      colorstate: this.colorState,
      metar: this.metar,
      auto: this.auto,
      wind: this.wind,
      visibility: this.visibility,
      rvr: this.rvr,
      weather: this.weather,
      cloud: this.cloud,
      temperatures: this.temperatures,
      qnh: this.qnh,
      cavok: this.cavok,
      vmc: this.vmc,
      flightCategory: this.flightCategory,
      rain: this.rain,
      snow: this.snow,
      mist: this.mist,
      icon: this.icon,
      icon_vfr: this.icon_vfr,
      color: this.color,
      changements: this.changements,
      crosswind: this.crosswind,
      headwind: this.headwind,
      sunPosition: this.sunPosition,
      // lightingPhase: this.lightingPhase,
    };

    // Show the details on screen
    console.log("\n   >📅 Airport:", this.airport);
    console.log("\n   >📅 Date/Time:", this.dateTime);
    console.log("\n   >📅 Color state:", this.colorState);
    console.log("   >🤖 Automatic:", this.auto);
    console.log("   >🌬️  Wind:", this.wind);
    console.log("   >👁️  Visibility:", this.visibility, "m");
    console.log("   >🌦️  Weather:", this.weather);
    console.log("   >☁️  Clouds:", this.cloud);
    console.log("   >🌡️  Temp/Dewpoint:", this.temperatures);
    console.log("   >🔽 QNH:", this.qnh);
    console.log("   >☀️  CAVOK:", this.cavok);
    console.log("   >✈️  VMC Status:", this.vmc);
    console.log("   >📊 Flight Category:", this.flightCategory);
    console.log("   >🌧️ Rain:", this.rain);
    console.log("   >❄️ Snow:", this.snow);
    console.log("   >🌫️ Mist:", this.mist);
    console.log("   >👁️ Icon:", this.icon);
    console.log("   >🤖 Color:", this.color);
    console.log("   >🔄 Changements:", this.changements);
    console.log("   >☀️ Sun Position:", this.sunPosition);
    // console.log("   >👁️ lighting Phase:", this.lightingPhase);
  }

  analyzeCrossWind() {
    return;
  }

  analyzeHeadWind() {
    return;
  }

  colorState() {
    /**
     * Extract aerodrome colour state from a METAR string
     * and return it in a fixed object structure.
     *
     * param {string} metar - METAR report
     * returns {{intensity: number|null, colorState: string|null, description: string|null}}
     */

    // Search in original METAR to include weather in TEMPO/BECMG sections
    let searchText = this.metarWithoutChangements;
    // const searchText = this.metar;

    const colorStates = {
      BLU: {
        intensity: 1,
        description: "Excellent weather – no operational restrictions",
      },
      GRN: {
        intensity: 2,
        description: "Good weather – minor operational limitations possible",
      },
      YLO: {
        intensity: 3,
        description: "Marginal weather – increased operational caution",
      },
      AMB: {
        intensity: 4,
        description: "Poor weather – significant operational limitations",
      },
      RED: {
        intensity: 5,
        description: "Very poor weather – operations severely restricted or impossible",
      },
      WHT: {
        intensity: 6,
        description: "Severe winter conditions – snow or ice affecting operations",
      },
    };

    if (!searchText || typeof searchText !== "string") {
      return {
        intensity: null,
        colorState: null,
        description: null,
      };
    }

    const tokens = searchText.toUpperCase().split(/\s+/);

    for (const token of tokens) {
      if (colorStates[token]) {
        return {
          intensity: colorStates[token].intensity,
          colorstate: token,
          description: colorStates[token].description,
        };
      }
    }

    // No colour state found
    return {
      intensity: null,
      colorState: null,
      description: null,
    };
  }

  analyzeChangements() {
    const changementsRecuperation = (marker) => {
      const regex = new RegExp(marker + ".+");
      const search = typeof this.metar === "string" ? this.metar.match(regex) : null;
      if (search) {
        const portion = search[0].replace(marker + " ", "");
        this.metarWithoutChangements = this.metarWithoutChangements.replace(regex, "");
        return portion;
      }
      return null;
    };

    // Check for NOSIG
    if (/NOSIG/.test(this.metar)) {
      this.metarWithoutChangements = this.metar.replace(/NOSIG/, "");
      return null;
    }

    return {
      TEMPO: changementsRecuperation("TEMPO"),
      BECMG: changementsRecuperation("BECMG"),
      GRADU: changementsRecuperation("GRADU"),
      RAPID: changementsRecuperation("RAPID"),
      INTER: changementsRecuperation("INTER"),
      TEND: changementsRecuperation("TEND"),
    };
  }

  analyzeAuto() {
    return /AUTO/.test(this.metar);
  }

  analyzeDateTime() {
    // Parse datetime
    let metar_date_obj = null;
    // const metar_date_obj = parseMetarTime(this.metarWithoutChangements);
    metar_date_obj = parseMetarTime(this.metarWithoutChangements);
    // Contains:
    // metar_date_obj.date
    // metar_date_obj.formatted
    // Return
    return metar_date_obj;
  }

  analyzeWind() {
    const regexListKt = [/\d{5}KT/, /\d{5}G\d{2}KT/, /VRB\d{2}KT/];
    const regexListMps = [/\d{5}MPS/, /\d{5}G\d{2}MPS/, /VRB\d{2}MPS/];

    let search = null;

    // Try knots first
    for (const regex of regexListKt) {
      search = typeof this.metarWithoutChangements === "string" ? this.metarWithoutChangements.match(regex) : null;
      if (search) break;
    }

    // Try MPS if knots failed
    if (!search) {
      for (const regex of regexListMps) {
        search = typeof this.metarWithoutChangements === "string" ? this.metarWithoutChangements.match(regex) : null;
        if (search) break;
      }
    }

    if (!search) return null;

    const windTot = search[0];
    let direction = windTot.substring(0, 3);

    if (direction !== "VRB") {
      direction = parseInt(direction);
    }

    const speed = parseInt(windTot.substring(3, 5));
    const gustSpeed = windTot.includes("G") ? parseInt(windTot.substring(6, 8)) : null;

    // Check for variations
    const variationMatch = this.metarWithoutChangements.match(/(\d{3})V(\d{3})/);
    const variation = variationMatch ? [parseInt(variationMatch[1]), parseInt(variationMatch[2])] : null;

    return {
      direction,
      speed,
      gust: gustSpeed,
      variation,
      raw: windTot,
    };
  }

  analyzeVisibility() {
    // Check for CAVOK first
    if (/CAVOK/.test(this.metarWithoutChangements)) {
      return 9999;
    }

    const hasVariation = this.wind && this.wind.variation !== null;
    let regex;

    if (!hasVariation) {
      regex = /KT (\d{4}|CAVOK|\d{4}[A-Z]+)/;
    } else {
      regex = /\d{3}V\d{3} (\d{4}|\d{4}[A-Z]+)/;
    }

    const match = typeof this.metarWithoutChangements === "string" ? this.metarWithoutChangements.match(regex) : null;
    if (!match) return null;

    let visibility = match[1];
    if (visibility === "CAVOK") return 9999;

    // Remove any letters at the end (like NDV)
    visibility = visibility.replace(/[A-Z]+$/, "");
    return parseInt(visibility);
  }

  analyzeRVR() {
    const regex = /R(\d{2}[LCR]*)\/([MP]*\d{4})/g;
    const matches = typeof this.metarWithoutChangements === "string" ? [...this.metarWithoutChangements.matchAll(regex)] : null;

    if (!matches || matches.length === 0) return null;

    return matches.map((match) => ({
      runway: match[1],
      visibility: parseInt(match[2].replace(/[MP]/, "")),
    }));
  }

  analyzeWeather() {
    const prefixes = [
      { code: "VC", meaning: "in Vicinity" },
      { code: "MI", meaning: "Thin" },
      { code: "PR", meaning: "Partial" },
      { code: "DR", meaning: "Low Drifting" },
      { code: "BL", meaning: "Blowing" },
      { code: "FZ", meaning: "Freezing" },
      { code: "RE", meaning: "Recent" },
      { code: "BC", meaning: "Bank" },
      { code: "SH", meaning: "Shower" },
      { code: "XX", meaning: "Violent" },
    ];

    const weathers = [
      { code: "RA", meaning: "Rain" },
      { code: "SN", meaning: "Snow" },
      { code: "GR", meaning: "Hail" },
      { code: "DZ", meaning: "Drizzle" },
      { code: "PL", meaning: "Ice Pellets" },
      { code: "GS", meaning: "Gresil" },
      { code: "SG", meaning: "Snow Grains" },
      { code: "IC", meaning: "Ice Crystals" },
      { code: "UP", meaning: "Unknown" },
      { code: "BR", meaning: "Mist" },
      { code: "FG", meaning: "Fog" },
      { code: "HZ", meaning: "Haze" },
      { code: "FU", meaning: "Smoke" },
      { code: "SA", meaning: "Sand" },
      { code: "DU", meaning: "Dust" },
      { code: "VA", meaning: "Volcanic Ash" },
      { code: "PO", meaning: "Dust Whirlpool" },
      { code: "SS", meaning: "Sand Storm" },
      { code: "DS", meaning: "Dust Storm" },
      { code: "SQ", meaning: "Squalls" },
      { code: "FC", meaning: "Funnel Cloud" },
      { code: "TS", meaning: "Thunderstorm" },
    ];

    // Search in original METAR to include weather in TEMPO/BECMG sections
    let searchText = this.metarWithoutChangements;
    // const searchText = this.metar;

    // REMOVE KNOWN FIELDS TO PREVENT FALSE POSITIVES
    searchText = typeof this.metarWithoutChangements === "string" ? this.metarWithoutChangements : null;
    if (!searchText) return null;

    searchText = searchText.replace(/\bMETAR\b/g, "");
    searchText = searchText.replace(/\bAUTO\b/g, "");
    searchText = searchText.replace(/\CAVOK\b/g, "");
    searchText = searchText.replace(/\NSC\b/g, "");
    searchText = searchText.replace(new RegExp(`\\b${this.airport}\\b`, "g"), "");
    searchText = searchText.replace(new RegExp(`\\bQ${String(this.qnh)}\\b`, "g"), "");
    searchText = searchText.replace(new RegExp(`\\b${this.visibility}\\b`, "g"), "");
    searchText = searchText.replace(new RegExp(`\\b${this.colorState?.colorstate}\\b`, "g"), "");
    searchText = searchText.replace(new RegExp(`\\b${this.temperatures?.raw}\\b`, "g"), "");
    searchText = searchText.replace(new RegExp(`\\b${this.wind?.raw}\\b`, "g"), "");
    searchText = searchText.replace(new RegExp(`\\b${this.dateTime?.raw}\\b`, "g"), "");
    searchText = searchText.trim();

    // Find intensity
    const intensityMatches = searchText.match(/[-+]/g);
    const intensity = intensityMatches ? intensityMatches.map((i) => (i === "+" ? true : false)) : null;

    // // Find prefixes
    // const foundPrefixes = prefixes.filter((p) => new RegExp(p.code + "+").test(searchText)).map((p) => p.meaning);
    // // Find weather phenomena
    // const foundWeather = weathers.filter((w) => new RegExp(w.code + "+").test(searchText)).map((w) => w.meaning);

    // Split METAR into tokens (space-separated)
    const tokens = searchText.split(/\s+/);

    let foundPrefixes = [];
    let foundWeather = [];

    for (const token of tokens) {
      // Remove intensity if present
      const codePart = token.replace(/^[-+]/, "");

      // Check prefix at start of token
      const prefixMatch = prefixes.find((p) => codePart.startsWith(p.code));
      if (prefixMatch) foundPrefixes.push(prefixMatch.meaning);

      // Check weather at end of token
      const weatherMatch = weathers.find((w) => codePart.endsWith(w.code));
      if (weatherMatch) foundWeather.push(weatherMatch.meaning);
    }

    if (!intensity && foundPrefixes.length === 0 && foundWeather.length === 0) {
      return null;
    }

    return {
      intensity: intensity,
      prefix: foundPrefixes.length > 0 ? foundPrefixes : null,
      weather: foundWeather.length > 0 ? foundWeather : null,
    };
  }

  analyzeCloud() {
    // Check for NCD/NSC
    if (/NCD|NSC/.test(this.metarWithoutChangements)) {
      return null;
    }

    // Check for VV///
    if (/VV\/\/\//.test(this.metarWithoutChangements)) {
      return [
        {
          code: "VV",
          meaning: "Invisible Sky",
          oktaMin: null,
          oktaMax: null,
          altitude: null,
        },
      ];
    }

    const classifications = [
      { code: "SKC", meaning: "Sky Clear", oktaMin: 0, oktaMax: 0 },
      { code: "FEW", meaning: "Few", oktaMin: 1, oktaMax: 2 },
      { code: "SCT", meaning: "Scattered", oktaMin: 3, oktaMax: 4 },
      { code: "BKN", meaning: "Broken", oktaMin: 5, oktaMax: 7 },
      { code: "OVC", meaning: "Overcast", oktaMin: 8, oktaMax: 8 },
    ];

    const clouds = [];

    for (const classif of classifications) {
      const regex = new RegExp(classif.code + "(\\d{3})(CB|TCU)?", "g");
      const matches = typeof this.metarWithoutChangements === "string" ? [...this.metarWithoutChangements.matchAll(regex)] : null;
      if (!matches) return null;

      for (const match of matches) {
        clouds.push({
          code: classif.code,
          meaning: classif.meaning,
          oktaMin: classif.oktaMin,
          oktaMax: classif.oktaMax,
          altitude: parseInt(match[1]) * 100,
          presenceCB: match[2] === "CB",
          presenceTCU: match[2] === "TCU",
        });
      }
    }

    // Also check for VV with altitude (vertical visibility)
    const vvMatch = this.metarWithoutChangements.match(/VV(\d{3})/);
    if (vvMatch) {
      clouds.push({
        code: "VV",
        meaning: "Vertical Visibility",
        oktaMin: 8,
        oktaMax: 8,
        altitude: parseInt(vvMatch[1]) * 100,
        presenceCB: false,
        presenceTCU: false,
      });
    }

    return clouds.length > 0 ? clouds : null;
  }

  analyzeTemperatures() {
    const regex = /\s([M]?\d{2})\/([M]?\d{2})\s/;
    const match = typeof this.metarWithoutChangements === "string" ? this.metarWithoutChangements.match(regex) : null;

    if (!match) {
      return {
        raw: null,
        temperature: null,
        dewpoint: null,
      };
    }

    const parseTemp = (str) => {
      const value = parseInt(str.replace("M", ""));
      return str.startsWith("M") ? -value : value;
    };

    return {
      raw: match[0].trim(),
      temperature: parseTemp(match[1]),
      dewpoint: parseTemp(match[2]),
    };
  }

  analyzeQNH() {
    const regex = /Q(\d{4})/;
    const hpaMatch = typeof this.metarWithoutChangements === "string" ? this.metarWithoutChangements.match(regex) : null;
    if (hpaMatch === null) return null;

    if (hpaMatch) {
      return parseInt(hpaMatch[1]);
    }

    const inchMatch = this.metarWithoutChangements.match(/A(\d{4})/);
    if (inchMatch) {
      return parseInt(inchMatch[1]) / 100;
    }

    return null;
  }

  analyzeCAVOK() {
    // CAVOK (Ceiling And Visibility OK) means:
    // - Visibility 10km or more
    // - No cloud below 5000ft or below highest minimum sector altitude
    // - No CB (cumulonimbus)
    // - No significant weather
    return /CAVOK/.test(this.metar);
  }

  verifyVMC() {
    const visibility = this.visibility;
    const clouds = this.cloud;

    if (visibility === null) return null;

    let minAltitude = 1000000; // Very high default
    if (clouds && clouds.length > 0) {
      for (const cloud of clouds) {
        if (cloud.altitude !== null && cloud.altitude < minAltitude) {
          minAltitude = cloud.altitude;
        }
      }
    }

    return {
      uncontrolled: visibility >= 1500,
      controlled: visibility >= 5000 && minAltitude >= 1000,
    };
  }

  determineRain() {
    const { weather, prefix } = this.weather || {};
    const wetWeather = weather?.some((w) => ["Rain", "Drizzle"].includes(w));
    const shower = prefix?.some((p) => p === "Shower");

    return Boolean(wetWeather || shower);
  }

  determineSnow() {
    const weather = this.weather;
    if (!weather) return false;
    const isSnow = Array.isArray(weather.weather) && weather.weather.some((w) => ["Snow", "Hail", "Ice Pellets", "Snow Grains"].includes(w));

    return Boolean(isSnow);
  }

  determineMist() {
    const weather = this.weather;
    if (!weather) return false;
    const isMist =
      Array.isArray(weather.weather) &&
      weather.weather.some((w) =>
        [
          "Mist",
          "Fog",
          "Haze",
          "Smoke",
          "Sand",
          "Dust",
          "Volcanic Ash",
          "Dust Whirlpool",
          "Sand Storm",
          "Dust Storm",
          "Funnel Cloud",
          "Squalls",
        ].includes(w),
      );

    return Boolean(isMist);
  }

  determineColor() {
    const category = this.flightCategory; // "VFR", "MVFR", "IFR", "LIFR"
    const cloud = this.cloud;
    const rainOrSnow = !!(this.rain || this.snow);

    // Base colors by flight category
    const baseColors = {
      VFR: "#D4E0D2", // green
      MVFR: "#D3DBE2", // blue
      IFR: "#F4D5C7", // reddish
      LIFR: "#C0ACD3", // purple
    };

    // Lightness adjustments for clouds/rain
    // returns slightly lighter shades
    function lighten(hex, factor = 0.2) {
      return hex;

      // Convert hex to RGB
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      if (factor >= 0) {
        // Blend with white to make lighter
        const newR = Math.round(r + (255 - r) * factor);
        const newG = Math.round(g + (255 - g) * factor);
        const newB = Math.round(b + (255 - b) * factor);
        return `rgb(${newR}, ${newG}, ${newB})`;
      } else {
        // Negative factor -> blend with black to make darker
        const f = Math.min(1, Math.abs(factor));
        const newR = Math.round(r * (1 - f));
        const newG = Math.round(g * (1 - f));
        const newB = Math.round(b * (1 - f));
        return `rgb(${newR}, ${newG}, ${newB})`;
      }

      return `rgb(${newR}, ${newG}, ${newB})`;
    }

    // Determine color
    let color = baseColors[category] ?? "#6c757d"; // fallback grey
    const make_very_light = 0.5;
    const make_light = 0.3;

    if (category === "VFR") {
      if (cloud && rainOrSnow) {
        color = lighten(color, make_very_light); // very light green
      } else if (cloud) {
        color = lighten(color, make_light); // light green
      }
    }

    if (category === "MVFR") {
      if (cloud && rainOrSnow) {
        color = lighten(color, make_very_light);
      } else if (cloud) {
        color = lighten(color, make_light);
      }
    }

    if (category === "IFR") {
      if (cloud && rainOrSnow) {
        color = lighten(color, make_very_light);
      } else if (cloud) {
        color = lighten(color, make_light);
      }
    }

    if (category === "LIFR") {
      if (cloud && rainOrSnow) {
        color = lighten(color, make_very_light);
      } else if (cloud) {
        color = lighten(color, make_light);
      }
    }

    return color;
  }

  determineVFRIcon(flightCategory = null, name = null) {
    // Determine the icon
    flightCategory = flightCategory ?? this.flightCategory;
    name = name ?? "FLIGHT";

    // const iconDir = "./icons";

    // ---- LIFR ----
    if (flightCategory === "LIFR") {
      // return `${iconDir}/LIFR.png`;
      // return "https://img.shields.io/badge/flight-LIFR-purple?style=for-the-badge";
      return `https://img.shields.io/badge/${name}-LIFR-purple`;
    }
    // ---- IFR ----
    if (flightCategory === "IFR") {
      // return `${iconDir}/IFR.png`;
      // return "https://img.shields.io/badge/flight-IFR-red?style=for-the-badge";
      return `https://img.shields.io/badge/${name}-IFR-red`;
    }
    // ---- MVFR ----
    if (flightCategory === "MVFR") {
      // return `${iconDir}/MVFR.png`;
      // return `https://img.shields.io/badge/flight-MVFR-blue?style=for-the-badge";
      return `https://img.shields.io/badge/${name}-MVFR-blue`;
    }
    // ---- VFR  ----
    if (flightCategory === "VFR") {
      // return `${iconDir}/VFR.png`;
      // return `https://img.shields.io/badge/flight-VFR-green?style=for-the-badge";
      return `https://img.shields.io/badge/${name}-VFR-green`;
    }

    // ---- Fallback ----
    // return `${iconDir}/label_unknown.png`;
    // return `https://img.shields.io/badge/flight-UNKNOWN-black?style=for-the-badge";
    return `https://img.shields.io/badge/${name}-UNKNOWN-black`;
  }

  calculateSunPosition() {
    // Calculate sun position using solar position algorithm
    // Sun altitude phases:
    // > 6° = Day
    // 0° to 6° = Golden Hour
    // -6° to 0° = Civil Twilight (sunset/sunrise glow)
    // -12° to -6° = Nautical Twilight
    // -18° to -12° = Astronomical Twilight
    // < -18° = Night
    const lat = this.lat;
    const lon = this.lon;
    const date = this.dateTime.date;

    console.log(`   > func: calculateSunPosition($lat: ${lat}, lon: ${lon}), date: ${date})`);
    // console.log(`   > func: calculateSunPosition(`);
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

    // Calculate sun altitude
    const sunAltitude = (altitude * 180) / Math.PI; // Convert to degrees

    // Caclulate lightning phase
    const lightingPhase = this.determineLightingPhase(sunAltitude);

    // Daylight is when the altitude of the sun is > 0 degrees.
    let dayLight = false;
    if (sunAltitude > 0) {
      dayLight = true;
    }

    return {
      altitude: sunAltitude,
      azimuth: ((azimuth * 180) / Math.PI + 360) % 360, // Convert to degrees, 0-360
      phase: lightingPhase.phase,
      darkness: lightingPhase.darkness,
      daylight: dayLight,
    };
  }

  determineLightingPhase(sunAltitude) {
    // Sun altitude phases:
    // > 6° = Day
    // 0° to 6° = Golden Hour
    // -6° to 0° = Civil Twilight (sunset/sunrise glow)
    // -12° to -6° = Nautical Twilight
    // -18° to -12° = Astronomical Twilight
    // < -18° = Night
    // const sunAltitude = this.sunPosition.altitude;

    if (sunAltitude > 6) {
      return { phase: "day", darkness: 0 };
    } else if (sunAltitude > 0) {
      // Golden hour: 0-6 degrees
      // const darkness = 0.1 + ((6 - sunAltitude) / 6) * 0.05; // 0.1 to 0.15
      const darkness = 0.2 + ((6 - sunAltitude) / 6) * 0.15; // 0.1 to 0.25
      return { phase: "golden_hour", darkness };
    } else if (sunAltitude > -6) {
      // Civil twilight: 0 to -6 degrees
      // const darkness = 0.25 + ((0 - sunAltitude) / 6) * 0.1; // 0.25 to 0.35
      const darkness = 0.4 + ((0 - sunAltitude) / 6) * 0.25; // 0.25 to 0.5
      return { phase: "civil_twilight", darkness };
    } else if (sunAltitude > -12) {
      // Nautical twilight: -6 to -12 degrees
      // const darkness = 0.35 + ((-6 - sunAltitude) / 6) * 0.1; // 0.35 to 0.45
      const darkness = 0.6 + ((-6 - sunAltitude) / 6) * 0.2; // 0.5 to 0.7
      return { phase: "nautical_twilight", darkness };
    } else if (sunAltitude > -18) {
      // Astronomical twilight: -12 to -18 degrees
      // const darkness = 0.5 + ((-12 - sunAltitude) / 6) * 0.05; // 0.45 to 0.55
      const darkness = 0.8 + ((-12 - sunAltitude) / 6) * 0.2; // 0.7 to 0.9
      return { phase: "astronomical_twilight", darkness };
    } else {
      // Full night
      // return { phase: "night", darkness: 0.55 };
      return { phase: "night", darkness: 0.9 };
    }
  }

  determineMetarIcon() {
    // Determine the icon
    const flightCategory = this.flightCategory;
    const cloud = this.cloud;
    const cavok = this.cavok;
    // const weather = this.weather;
    const sunAltitude = this.sunPosition.altitude;
    const rainOrSnow = !!(this.rain || this.snow);
    let dayLight = this.sunPosition.daylight;
    const iconDir = "./icons";

    // Compute cloud ceiling
    let cloud_ceiling = null;
    if (cloud) {
      for (const layer of cloud) {
        if (["BKN", "OVC", "VV"].includes(layer.code) && layer.altitude !== null) {
          if (cloud_ceiling === null || layer.altitude < cloud_ceiling) {
            cloud_ceiling = layer.altitude;
          }
        }
      }
    }

    // Normalize
    if (cloud_ceiling === null) cloud_ceiling = 99999;

    // ---- LIFR ----
    if (flightCategory === "LIFR" && rainOrSnow) {
      return `${iconDir}/clouds_rain_LIFR.png`;
    }
    if (flightCategory === "LIFR") {
      return `${iconDir}/clouds_LIFR.png`;
    }

    // ---- IFR ----
    if (flightCategory === "IFR" && rainOrSnow) {
      return `${iconDir}/clouds_rain_IFR.png`;
    }
    if (flightCategory === "IFR") {
      return `${iconDir}/clouds_IFR.png`;
    }

    // ---- MVFR ----
    if (flightCategory === "MVFR" && rainOrSnow) {
      return `${iconDir}/clouds_rain_MVFR.png`;
    }
    if (flightCategory === "MVFR") {
      return `${iconDir}/clouds_MVFR.png`;
    }

    // ---- VFR + rain/snow ----
    if (flightCategory === "VFR" && rainOrSnow) {
      return `${iconDir}/clouds_rain_VFR.png`;
    }

    // ---- Day VFR ----
    if (flightCategory === "VFR" && dayLight) {
      if (cavok) {
        return `${iconDir}/CAVOK_sun.png`;
      }
      if (cloud_ceiling >= 10000 && !cloud) {
        return `${iconDir}/sun_VFR.png`;
      }
      if (cloud_ceiling > 5000 && cloud) {
        return `${iconDir}/clouds_sun_VFR.png`;
      }
    }

    // ---- Night VFR ----
    if (flightCategory === "VFR" && !dayLight) {
      if (cavok) {
        return `${iconDir}/moon_VFR.png`;
      }
      if (cloud_ceiling >= 10000 && !cloud) {
        return `${iconDir}/moon_VFR.png`;
      }
      if (cloud_ceiling > 5000 && cloud) {
        return `${iconDir}/clouds_moon_VFR.png`;
      }
    }

    // ---- Default VFR ----
    if (flightCategory === "VFR") {
      return `${iconDir}/clouds_VFR.png`;
    }

    // ---- Fallback ----
    return `${iconDir}/clouds_unknown.png`;
  }

  determineFlightCategory() {
    // Get ceiling (lowest BKN, OVC, or VV layer)

    // | Category | Ceiling (ft) | Visibility (SM) |
    // | -------- | ------------ | --------------- |
    // | **LIFR** | < 500        | < 1             |
    // | **IFR**  | 500–999      | 1–<3            |
    // | **MVFR** | 1000–3000    | 3–5             |
    // | **VFR**  | > 3000       | > 5             |

    let ceiling = null;
    if (this.cloud) {
      for (const layer of this.cloud) {
        if (["BKN", "OVC", "VV"].includes(layer.code) && layer.altitude !== null) {
          if (ceiling === null || layer.altitude < ceiling) {
            ceiling = layer.altitude;
          }
        }
      }
    }

    // Convert visibility from meters to statute miles (for international METARs)
    let visMiles = null;
    if (this.visibility !== null) {
      if (this.visibility >= 9000) {
        visMiles = 10; // CAVOK or 9999m = >10SM
      } else if (this.visibility < 100) {
        // Assume already in SM for US METARs
        visMiles = this.visibility;
      } else {
        // Convert meters to statute miles
        visMiles = this.visibility * 0.000621371;
      }
    }

    // Determine category based on FAA definitions
    // https://wiki.ivao.aero/en/home/flightoperations/Procedures/LMML/VFR
    if ((ceiling !== null && ceiling < 500) || (visMiles !== null && visMiles < 1)) {
      return "LIFR";
    }

    if ((ceiling !== null && ceiling >= 500 && ceiling < 1000) || (visMiles !== null && visMiles >= 1 && visMiles < 3)) {
      return "IFR";
    }

    if ((ceiling !== null && ceiling >= 1000 && ceiling <= 3000) || (visMiles !== null && visMiles >= 3 && visMiles <= 5)) {
      return "MVFR";
    }

    return "VFR";
  }

  getAttribute(attribute) {
    return this[attribute];
  }

  getAll() {
    return this.properties;
  }
}

function checkMetarAge() {
  /* Check datetime of METAR data and update UI colors.
   *
   * This function checks the datetime of displayed METAR data and updates the UI to indicate staleness.
   * If METAR data is older than 10 minutes:
   * - Sets elements' background to light red
   * Used to visually alert user that METAR data should be refreshed.
   */
  function createTimeObject(dateField) {
    // Parse the date parts
    const [datePart, timePart] = dateField.split(" ");
    const [day, month, year] = datePart.split("-");
    const [hours, minutes] = timePart.split(":");

    // Create date objects with the same timezone
    const timeObject = new Date();
    timeObject.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
    timeObject.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return timeObject;
  }

  function compareTime(prefix) {
    const dateField = document.getElementById(`DATETIME-METAR-${prefix}`);
    const metarField = document.getElementById(`METAR-FIELD-${prefix}`);
    // const metarText = document.getElementById('METAR-TEXT-' + prefix);

    // if (!dateField?.value) {
    //   console.log(`   >No METAR date is found for ${prefix}.This is checked every minute.`);
    //   return;
    // }
    const metarObject = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;
    if (!metarObject) {
      console.warn(`   >No METAR date is found for ${prefix}.This is checked every minute.`);
      return;
    }
    const metarTime = metarObject.dateTime.date;

    // Parse the METAR date parts
    // const dateFieldClean = formatDateDMY(dateField.value, "ddmmyyyy", "-");
    // const metarTime = createTimeObject(dateFieldClean);
    // console.log(metarTime);

    // Parse the NOW date parts
    const now = nowtime((utc = false));
    const currenTime = createTimeObject(now);

    // Compute difference
    const diff = Math.abs(currenTime - metarTime);
    const maxMinutes = 35;
    const isOld = diff > maxMinutes * 60 * 1000; // 35 minutes in milliseconds
    const minutesOld = Math.round(diff / 1000 / 60);

    console.log(`   >${prefix}\n   >currenTime: ${currenTime}.\n   >Metar time: ${metarTime}\n   >Diff: ${minutesOld}min\n   >isOld: ${isOld}`);

    if (isOld) {
      // colorMetarFields(prefix, false);
      message = `METAR weather info is ${minutesOld} minutes off. Reload the METAR information to retrieve the latest one.`;
      dateField.title = message;
      dateField.value = ` METAR: ${minutesOld} min. diff`;
      metarField.title = message;
      dateField.style.backgroundColor = "#ffebee";
      metarField.style.backgroundColor = "#ffebee";
      // Update flight catagory icon
      updateFlightCatagoryIcon(prefix, true);
    } else {
      // colorMetarFields(prefix, enable=true);
      dateField.title = "The UTC date/time for the retrieved METAR data";
      metarField.title = `METAR information for the ${prefix.toLowerCase()} aerodrome.`;
      dateField.style.backgroundColor = "transparent";
      metarField.style.backgroundColor = "";

      // Update flight catagory icon
      updateFlightCatagoryIcon(prefix);
    }
  }

  console.log(`> func: checkMetarAge()`);
  compareTime("DEPARTURE");
  compareTime("ARRIVAL");
}

function parseMetarTime(metar_string) {
  console.log(`>Func: parseMetarTime(${metar_string})`);

  // Example metarTime: "241055Z"
  if (typeof metar_string !== "string" || metar_string.trim() === "") {
    console.warn("   >Return because metar is not a string.");
    return { formatted: null, date: null };
  }

  // Extract datetime element from metar
  const timeMatch = metar_string.match(/\s(\d{6}Z)/);
  const metarTime = timeMatch ? timeMatch[1] : "";
  // Example metarTime: "241055Z"

  const day = parseInt(metarTime.slice(0, 2), 10);
  const hour = parseInt(metarTime.slice(2, 4), 10);
  const minute = parseInt(metarTime.slice(4, 6), 10);

  // Use UTC-based "now"
  const nowUTC = new Date();
  let year = nowUTC.getUTCFullYear();
  let month = nowUTC.getUTCMonth(); // 0-based

  // Initial candidate date (UTC)
  let dateUTC = new Date(Date.UTC(year, month, day, hour, minute));

  // Handle month rollover (METAR from previous month)
  if (dateUTC.getTime() - nowUTC.getTime() > 24 * 60 * 60 * 1000) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    dateUTC = new Date(Date.UTC(year, month, day, hour, minute));
  }

  // Format explicitly in UTC
  const dd = String(dateUTC.getUTCDate()).padStart(2, "0");
  const mm = String(dateUTC.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = dateUTC.getUTCFullYear();
  const timePart = `${String(dateUTC.getUTCHours()).padStart(2, "0")}:${String(dateUTC.getUTCMinutes()).padStart(2, "0")}`;

  return {
    formatted: `${dd}-${mm}-${yyyy} ${timePart} UTC`,
    date: dateUTC,
    raw: metarTime,
  };
}

// async function fetch_metar(metar_stations, splitlines = true, decoded = false, prefix) {
//   console.log(`>Func: fetch_metar(${metar_stations})`);
//   const metarField = document.getElementById("METAR-FIELD-" + prefix);
//   const stations = Array.isArray(metar_stations) ? metar_stations : [metar_stations];

//   for (const icao of stations) {
//     console.log(`  >Fetching METAR for ${icao}`);
//     if (metarField) {
//       metarField.value = `Be patient while fetching METAR weather information from closest station: ${icao}`;
//     }

//     let baseUrl;
//     if (decoded === true) {
//       baseUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=decoded&hours=1`;
//       // https://tgftp.nws.noaa.gov/data/observations/metar/decoded/${icao}.TXT
//     } else {
//       baseUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=raw&hours=1`;
//       // https://tgftp.nws.noaa.gov/data/observations/metar/stations/${icao}.TXT
//     }

//     // Use CORS proxy to avoid CORS errors
//     const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;

//     try {
//       const response = await fetch(url);

//       if (!response.ok) {
//         console.log(`  >${icao}: HTTP error ${response.status}`);
//         continue;
//       }

//       const text = await response.text();
//       console.log(text);

//       if (!text || text.trim() === "") {
//         console.log(`  >${icao}: No data returned`);
//         continue;
//       }

//       // Split into lines and get the first (most recent) METAR
//       const lines = text.trim().split("\n");
//       let metar_string = lines[0] || null; // The top line contains the full METAR

//       console.log(`   >Retrieved METAR: ${metar_string}`);
//       // console.log(`   >Retrieved Time: ${metar_date_str}`);
//       // console.log(`   >Retrieved Time: ${metar_date_obj}`);

//       // Return when metar_string is successfully found
//       if (metar_string) {
//         return [metar_string, icao];
//       }

//       // Wait 0.5 seconds before continuing to next station
//       await new Promise((resolve) => setTimeout(resolve, 500));
//     } catch (err) {
//       console.log(`  >${icao}: Could not fetch the METAR report: ${url}`);
//       console.error(err);
//     }
//   }

//   // Return when empty and nothing found
//   return [null, null, null];
// }
//

async function fetch_metar(metar_stations, decoded = false, prefix) {
  console.log(`>Func: fetch_metar(${metar_stations})`);
  const metarField = document.getElementById("METAR-FIELD-" + prefix);
  const stations = Array.isArray(metar_stations) ? metar_stations : [metar_stations];

  for (const icao of stations) {
    console.log(`  >Fetching METAR for ${icao}`);
    if (metarField) {
      metarField.value = `Be patient while fetching METAR weather information from closest station: ${icao}`;
    }

    // Try multiple CORS proxies and data sources
    const sources = [
      // corsproxy.io - usually more reliable
      {
        url: decoded
          ? `https://corsproxy.io/?${encodeURIComponent(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=decoded&hours=1`)}`
          : `https://corsproxy.io/?${encodeURIComponent(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=raw&hours=1`)}`,
        name: "corsproxy.io",
      },
      // NOAA TXT files with AllOrigins
      {
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(
          decoded
            ? `https://tgftp.nws.noaa.gov/data/observations/metar/decoded/${icao}.TXT`
            : `https://tgftp.nws.noaa.gov/data/observations/metar/stations/${icao}.TXT`,
        )}`,
        name: "NOAA via AllOrigins",
      },
      // CheckWX API (no key required for basic usage)
      {
        url: `https://api.checkwx.com/metar/${icao}/decoded`,
        name: "CheckWX",
        headers: { "X-API-Key": "" },
      },
      // Aviation Weather with different proxy
      {
        url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(
          decoded
            ? `https://aviationweather.gov/api/data/metar?ids=${icao}&format=decoded&hours=1`
            : `https://aviationweather.gov/api/data/metar?ids=${icao}&format=raw&hours=1`,
        )}`,
        name: "codetabs proxy",
      },
    ];

    for (const source of sources) {
      try {
        console.log(`  >Trying: ${source.name}`);

        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const fetchOptions = {
          signal: controller.signal,
          headers: {
            Accept: "text/plain",
            ...(source.headers || {}),
          },
        };

        const response = await fetch(source.url, fetchOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.log(`  >${icao}: HTTP error ${response.status} from ${source.name}`);
          continue; // Try next source
        }

        const text = await response.text();

        if (!text || text.trim() === "") {
          console.log(`  >${icao}: No data returned from ${source.name}`);
          continue; // Try next source
        }

        // Handle CheckWX JSON response
        if (source.name === "CheckWX") {
          try {
            const json = JSON.parse(text);
            if (json.data && json.data.length > 0) {
              const metar_string = json.data[0];
              console.log(`   >Retrieved METAR from ${source.name}: ${metar_string}`);
              return [metar_string, icao];
            }
          } catch (e) {
            console.log(`  >${icao}: Invalid JSON from CheckWX`);
            continue;
          }
        }

        // Handle text responses
        const lines = text.trim().split("\n");
        let metar_string = lines[0] || null;

        // For NOAA decoded format, the METAR might be on the second line
        if (decoded && lines.length > 1 && !metar_string.includes(icao)) {
          metar_string = lines[1];
        }

        console.log(`   >Retrieved METAR from ${source.name}: ${metar_string}`);

        // Return when metar_string is successfully found and contains ICAO
        if (metar_string && (metar_string.includes(icao) || metar_string.includes("METAR"))) {
          return [metar_string, icao];
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log(`  >${icao}: Request timeout for ${source.name}`);
        } else {
          console.log(`  >${icao}: Fetch error from ${source.name}`);
          console.error(err);
        }
        // Continue to next source
      }
    }

    // Wait 0.5 seconds before trying next station
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Return when empty and nothing found
  if (metarField) {
    metarField.value = `Unable to fetch METAR data. All sources failed.`;
  }
  return [null, null];
}

function updateFlightCatagoryIcon(prefix, remove = false) {
  console.log(`>func: updateFlightCatagory(${prefix})`);
  // Get elements
  const imgCat = document.getElementById(`${prefix}_CATAGORY_ICON`);
  const imgVFR = document.getElementById(`${prefix}_VFR_ICON`);
  const borderFieldAerodrome1 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_1");
  const borderFieldAerodrome2 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_2");
  const borderFieldAerodrome3 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_3");

  // Get metar data for aerodrome
  // metarObject = window.flight_plan_data[`${prefix}_METAR`];
  if (prefix === "DEPARTURE") {
    metarObject = window.METAR_DEPARTURE;
  } else {
    metarObject = window.METAR_ARRIVAL;
  }

  // Do not show image when metar data is not present
  if (remove || !metarObject) {
    console.log("   >VFR icon removed.");
    imgCat.alt = "Unknown";
    imgCat.src = "./icons/clouds_unknown.png";
    // imgCat.style.display = "inline-block";
    imgCat.style.display = "none";

    imgVFR.alt = "Unknown";
    imgVFR.src = "https://img.shields.io/badge/FLIGHT-UNKNOWN-black";
    imgVFR.style.display = "inline-block";
    // imgVFR.style.display = "none";

    // Update border color
    borderFieldAerodrome1.style.backgroundColor = "E9E9E9";
    borderFieldAerodrome2.style.backgroundColor = "f5f5f5";
    borderFieldAerodrome3.style.backgroundColor = "f5f5f5";
    return;
  }

  console.log("   >📊 Flight Category:", metarObject.flightCategory);
  // console.log(metarObject.icon);
  // Get flight catagory
  imgCat.src = metarObject.icon;
  imgCat.alt = metarObject.flightCategory;
  imgCat.style.display = "inline-block";
  // Get VFR icon
  imgVFR.src = metarObject.icon_vfr;
  imgVFR.alt = metarObject.flightCategory;
  imgVFR.style.display = "inline-block";
  // Color the Div
  borderFieldAerodrome1.style.backgroundColor = metarObject.color;
  borderFieldAerodrome2.style.backgroundColor = metarObject.color;
  borderFieldAerodrome3.style.backgroundColor = metarObject.color;
}

async function colorMetarFields(prefix, enable) {
  // const buttonMetar = document.getElementById('BTN-METAR-' + prefix);
  const metarText = document.getElementById("METAR-TEXT-" + prefix);
  const dateField = document.getElementById("DATETIME-METAR-" + prefix);
  const metarField = document.getElementById("METAR-FIELD-" + prefix);
  const windDirectionField = document.getElementById(prefix + "_WIND_DIRECTION");
  const windSpeedField = document.getElementById(prefix + "_WIND_STRENGTH");
  const windGustField = document.getElementById(prefix + "_WIND_GUST");
  const windVariationField = document.getElementById(prefix + "_WIND_VARIATION");
  const windHeadwindField = document.getElementById(prefix + "_WIND_HEADWIND");
  const windCrosswindField = document.getElementById(prefix + "_WIND_CROSSWIND");
  const TempField = document.getElementById(prefix + "_TEMPERATURE");
  const QNHField = document.getElementById(prefix + "_QNH");
  const borderFieldAerodrome1 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_1");
  const borderFieldAerodrome2 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_2");
  const borderFieldAerodrome3 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_3");

  if (enable) {
    // buttonMetarIcon2.disabled = false;
    // buttonMetarIcon2.style.cursor = 'pointer';
    // buttonMetarIcon1.disabled = false;
    // buttonMetarIcon1.style.cursor = 'pointer';
    // buttonMetar.disabled = false;
    // buttonMetar.style.cursor = 'pointer';
    // buttonMetar.setAttribute('aria-disabled', 'false');
    // buttonMetar.style.opacity = '1';
    // buttonMetar.style.backgroundColor = '#80B0C0';
    metarField.style.backgroundColor = "transparent";
    metarText.style.backgroundColor = "transparent";
    dateField.style.backgroundColor = "transparent";
    windDirectionField.style.backgroundColor = "transparent";
    windSpeedField.style.backgroundColor = "transparent";
    windGustField.style.backgroundColor = "transparent";
    windVariationField.style.backgroundColor = "transparent";
    windHeadwindField.style.backgroundColor = "transparent";
    windCrosswindField.style.backgroundColor = "transparent";
    TempField.style.backgroundColor = "transparent";
    QNHField.style.backgroundColor = "transparent";
  } else {
    // buttonMetarIcon2.disabled = true;
    // buttonMetarIcon2.style.cursor = "not-allowed";

    // buttonMetarIcon1.disabled = true;
    // buttonMetarIcon1.style.cursor = "not-allowed";
    // buttonMetar.disabled = true;
    // buttonMetar.style.cursor = "not-allowed";
    // buttonMetar.setAttribute('aria-disabled', 'true');
    // buttonMetar.style.opacity = '0.6';

    metarText.value = " ";
    // metarField.value = "Be patient while fetching METAR weather information..";
    // Change background color to light red/pink
    metarField.style.backgroundColor = "#ffebee";
    dateField.style.backgroundColor = "#ffebee";
    metarText.style.backgroundColor = "#ffebee";
    windDirectionField.style.backgroundColor = "#ffebee";
    windSpeedField.style.backgroundColor = "#ffebee";
    windGustField.style.backgroundColor = "#ffebee";
    windVariationField.style.backgroundColor = "#ffebee";
    windHeadwindField.style.backgroundColor = "#ffebee";
    windCrosswindField.style.backgroundColor = "#ffebee";
    TempField.style.backgroundColor = "#ffebee";
    QNHField.style.backgroundColor = "#ffebee";
    borderFieldAerodrome1.style.backgroundColor = "#E9E9E9";
    borderFieldAerodrome2.style.backgroundColor = "#f5f5f5";
    borderFieldAerodrome3.style.backgroundColor = "#f5f5f5";
  }
}

// async function colorMetarFields(prefix, enable = true) {
//   const metarText = document.getElementById("METAR-TEXT-" + prefix);
//   const dateField = document.getElementById("DATETIME-METAR-" + prefix);
//   const metarField = document.getElementById("METAR-FIELD-" + prefix);
//   const windDirectionField = document.getElementById(prefix + "_WIND_DIRECTION");
//   const windSpeedField = document.getElementById(prefix + "_WIND_STRENGTH");
//   const windGustField = document.getElementById(prefix + "_WIND_GUST");
//   const windVariationField = document.getElementById(prefix + "_WIND_VARIATION");
//   const windHeadwindField = document.getElementById(prefix + "_WIND_HEADWIND");
//   const windCrosswindField = document.getElementById(prefix + "_WIND_CROSSWIND");
//   const borderFieldAerodrome1 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_1");
//   const borderFieldAerodrome2 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_2");
//   const borderFieldAerodrome3 = document.getElementById(prefix + "_SELECT_AERODROME_BORDER_3");

//   if (enable) {
//     // Reset all fields to transparent/normal
//     if (metarField) metarField.style.setProperty("background-color", "transparent", "important");
//     if (metarText) metarText.style.setProperty("background-color", "transparent", "important");
//     if (dateField) dateField.style.setProperty("background-color", "transparent", "important");
//     if (windDirectionField) windDirectionField.style.setProperty("background-color", "transparent", "important");
//     if (windSpeedField) windSpeedField.style.setProperty("background-color", "transparent", "important");
//     if (windGustField) windGustField.style.setProperty("background-color", "transparent", "important");
//     if (windVariationField) windVariationField.style.setProperty("background-color", "transparent", "important");
//     if (windHeadwindField) windHeadwindField.style.setProperty("background-color", "transparent", "important");
//     if (windCrosswindField) windCrosswindField.style.setProperty("background-color", "transparent", "important");
//   } else {
//     // Set fields to pink/red to indicate error or outdated data
//     if (metarText) metarText.value = " ";

//     // METAR fields
//     if (metarField) metarField.style.setProperty("background-color", "#ffebee", "important");
//     if (dateField) dateField.style.setProperty("background-color", "#ffebee", "important");
//     if (metarText) metarText.style.setProperty("background-color", "#ffebee", "important");

//     // Wind fields
//     if (windDirectionField) windDirectionField.style.setProperty("background-color", "#ffebee", "important");
//     if (windSpeedField) windSpeedField.style.setProperty("background-color", "#ffebee", "important");
//     if (windGustField) windGustField.style.setProperty("background-color", "#ffebee", "important");
//     if (windVariationField) windVariationField.style.setProperty("background-color", "#ffebee", "important");
//     if (windHeadwindField) windHeadwindField.style.setProperty("background-color", "#ffebee", "important");
//     if (windCrosswindField) windCrosswindField.style.setProperty("background-color", "#ffebee", "important");

//     // Border fields
//     if (borderFieldAerodrome1) borderFieldAerodrome1.style.setProperty("background-color", "#E9E9E9", "important");
//     if (borderFieldAerodrome2) borderFieldAerodrome2.style.setProperty("background-color", "#f5f5f5", "important");
//     if (borderFieldAerodrome3) borderFieldAerodrome3.style.setProperty("background-color", "#f5f5f5", "important");
//   }
// }

async function retrieve_metar(prefix, verbose = "info", metar_custom = "") {
  console.log(`> func: retrieve_metar(${prefix})`);
  // Get the values from the input fields
  const name = document.getElementById(prefix + "_NAME").value || "";
  const icao = document.getElementById(prefix + "_ICAO").value || "";
  const country = document.getElementById(prefix + "_COUNTRY").value || "";
  // Get the button element that we can fill with METAR data
  const dateField = document.getElementById("DATETIME-METAR-" + prefix);
  const metarField = document.getElementById("METAR-FIELD-" + prefix);
  const metarText = document.getElementById("METAR-TEXT-" + prefix);

  // Set default values
  let metar_icao = "";
  let metar_message = "";
  let runway_predicted = "";
  let icao_stations = [""];
  let stationName = "";
  let metarObject = {};

  // If ICAO is empty or not provided, notify the user and return early
  if (!icao || !country) {
    if (verbose === "info") alert("ℹ️ To retrieve METAR information, please select a country and load the aerodrome (ICAO) first.");
    return;
  }

  // Color button and fields pink: Disable
  colorMetarFields(prefix, false);
  // Early return test
  // return;

  // Fetch METAR data from URL
  try {
    // Stop animations
    animations(prefix, "stop");
    // metar_icao = "METAR EDDH 191350Z AUTO 22009KT 9999 OVC013 12/09 Q1015 TEMPO 4500 -RADZ BKN009";
    // metar_icao = "METAR EHGR 171825Z AUTO 08003KT 060V150 9999 OVC240 05/05 Q1019 BLU";

    // RETRIEVE METAR FOR ICAO
    if (metar_custom === "" || metar_custom === null) {
      // Retrieve the METAR data for the closest station
      icao_stations = get_top_metar_stations(prefix, 5, false).toJs();
      console.log("   >Closest METAR stations:");
      console.log(`   >${icao_stations}`);
      // Fetch the METAR data for the closest station (pass decoded flag)
      metarData = await fetch_metar(icao_stations, false, prefix);
      // Store data
      metar_icao = metarData[0];
      stationName = metarData[1];
    } else {
      console.log("   >Custom  METAR information provided");
      metar_icao = metar_custom;
      stationName = icao;
    }

    // Update GUI text field for METAR
    metarText.value = stationName ? `Closest available METAR station is ${stationName}` : "No nearby METAR stations found";
  } catch (error) {
    console.log(`   >Error retrieving METAR data. ${prefix} has likely no weather station. Error:`, error);
    metar_message = `${icao} METAR weather information could not be processed.`;
    metarField.value = metar_message;
  }

  // Update the expected runway based on wind direction and runway orientation
  // if (typeof metar_icao === "string" && metar_icao.trim() !== "") {
  if (metar_icao !== "" && metar_icao !== null) {
    // Retrieve details about METAR
    try {
      // Get lat/lon
      const latlon = window.flight_plan_data?.[`${prefix}_LATLON`];
      // Extract features from METAR
      metarObject = new Metar(stationName, metar_icao, latlon[0], latlon[1]);

      // Set GUI fields
      dateField.value = metarObject.dateTime.formatted;
      metarField.value = metar_icao || metar_message;

      // Compute expected runway number based on wind direction and runway orientation
      runway_predicted = predict_runway_number(prefix, metarObject.wind.direction, metarObject.wind.speed);
      // Compute wind parameters from METAR data and update wind GUI fields
      window.update_wind_gui_fields(prefix, metar_icao, metarObject);
      // Create wind envelope plot
      window.windEnvelope_js(prefix, 25, 15, false);

      // Store RUNWAY number in flight plan data
      window.flight_plan_data[`${prefix}_RUNWAY_NR`] = runway_predicted;
      // Store METAR in flight plan data
      window.flight_plan_data[`${prefix}_METAR_ICAO`] = metar_icao;
      // Store METAR in flight plan data. This will break the saving functionality!
      if (prefix === "DEPARTURE") {
        // Convert metar object to plain so that it can be used in pyton dictionary for later usage
        window.METAR_DEPARTURE = metarObject.getAll();
      } else {
        window.METAR_ARRIVAL = metarObject.getAll();
      }

      // Update runway settings
      setRunwaySlippery(prefix, metarObject.rain, metarObject.snow);
      // Compute runway length
      displayRunwayResultsDiv(prefix);
      // Update flight catagory icon (this is also periodically checked in checkMetarAge())
      updateFlightCatagoryIcon(prefix);
      // Animations
      animations(prefix, "start");
      // Update GUI elements
      colorMetarFields(prefix, true);
    } catch (error) {
      console.warn(`   >Warning: METAR information could not be processed: ${error}`);
      colorMetarFields(prefix, false);
      return;
    }
  }

  if (metarObject && metarObject.dateTime) {
    // Check METAR age and show
    checkMetarAge();
    console.log(`   >✅ METAR information is loaded from the closest station: ${stationName}.\n   >✅ The predicted runway is: ${runway_predicted}`);
  }
}

function animations(prefix, process = "start") {
  console.log(`>func: animations(${prefix}, ${process})`);

  // const metarObject = prefix === "DEPARTURE" ? window.METAR_DEPARTURE : window.METAR_ARRIVAL;
  let metarObject = null;
  if (prefix === "DEPARTURE") {
    metarObject = window.METAR_DEPARTURE ?? null;
  } else if (prefix === "ARRIVAL") {
    metarObject = window.METAR_ARRIVAL ?? null;
  }

  // Stopping the processes before starting is important, otherwise it does not start(!)
  if (!metarObject || process === "stop" || process === "start") {
    console.log(`   >Stop Animations: metarObject: [${metarObject}] or ${process}`);
    animateRain(prefix, "stop");
    animateCloud(prefix, "stop");
    animateFog(prefix, "stop");
    animateFlare(prefix, "stop");
    animateSnow(prefix, "stop");
    animateDark(prefix, "stop");
    // animateControls(prefix, "stop");
  }

  if (process === "start") {
    console.log("   >Start Animations");
    animateRain(prefix);
    animateCloud(prefix);
    animateFog(prefix);
    animateSnow(prefix);
    animateFlare(prefix);
    animateDark(prefix);
    // animateControls(prefix);
    // animateTextOverlay(prefix);
  }
}

function retrieveMetars() {
  console.log(`>func: retrieveMetars()`);
  metarStations = getMetarStations();
  console.log(metarStations);
}

function getMetarStations(prefix = null) {
  let AERODROME_DATA;

  if (prefix === "DEPARTURE") {
    AERODROME_DATA = window.AERODROME_DEPARTURE_DATA;
  } else if (prefix === "ARRIVAL") {
    AERODROME_DATA = window.AERODROME_ARRIVAL_DATA;
  } else {
    AERODROME_DATA = window.AERODROME_DATA;
  }

  // Dict-like: ICAO → metadata
  return AERODROME_DATA.reduce((acc, item) => {
    if (item.metar_station === true) {
      acc[item.icao] = {
        lat: item.lat,
        lon: item.lon,
        country: item.country,
        name: item.name,
      };
    }
    return acc;
  }, {});
}

// Make it globally accessible
window.animations = animations;
window.retrieveMetars = retrieveMetars;
window.updateFlightCatagoryIcon = updateFlightCatagoryIcon;
