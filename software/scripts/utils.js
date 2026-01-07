function updateFlag(prefix, countryCode) {
  /**
   * Update a flag image element by country code (2-letter ISO).
   * - imgId: id of the <img> element
   * - countryCode: two-letter ISO country code (e.g. 'ua', 'nl'). Can be uppercase; function lower-cases it.
   *
   * This function is exposed on window as updateFlag so it can be called from PyScript:
   *   js.window.updateFlag('DEPARTURE', 'ua')
   */

  try {
    console.log(`>func: updateFlag(${prefix}, ${countryCode})`);

    if (countryCode == null || countryCode === "") {
      countryCode = window.flight_plan_data?.[`${prefix}_COUNTRY_CODE`];
    }

    // Create for loop for '_FLAG_1' and '_FLAG_2'
    for (const suffix of ["FLAG_1", "FLAG_2"]) {
      const img = document.getElementById(`${prefix}_${suffix}`);

      if (!img) {
        console.log(`   >Warning: img element not found: ${img}`);
        continue;
      }

      if (!countryCode || String(countryCode).trim() === "" || countryCode === "remove") {
        console.log(`   >Warning: no Country code or flag is set to be removed: ${countryCode}`);
        img.style.display = "none";
        img.alt = "";
        img.src = "";
        continue;
      }

      // Normalize
      const code = String(countryCode).trim().toLowerCase();

      // Only accept two-letter codes (basic check); if not 2 letters, hide
      if (!/^[a-z]{2}$/.test(code)) {
        console.log(`   >Warning: Country code has more then 2 chars`);
        img.style.display = "none";
        img.alt = "";
        img.src = "";
        continue;
      }

      // Build SVG URL (flagcdn). Use svg first; fallback to PNG if error.
      const svgUrl = `https://flagcdn.com/${code}.svg`;
      // const pngUrl = `https://flagcdn.com/w80/${code}.png`;
      cache_and_display_image(svgUrl, `${prefix}_${suffix}`);

      console.log(`   >Set Flag to: ${svgUrl}`);
      // img.src = svgUrl;
      img.alt = countryCode.toUpperCase();
      img.style.display = "inline-block";
    }
  } catch (e) {
    console.warn("> updateFlag() error", e);
  }
}

function createDateTime() {
  console.log("---> createDateTime()");
  document.getElementById("DATETIME").value = nowtime(false);
}

// Make it globally accessible
window.updateFlag = updateFlag;
window.createDateTime = createDateTime;
