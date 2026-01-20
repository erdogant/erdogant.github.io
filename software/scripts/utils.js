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
        // img.style.display = "none";
        img.style.display = "inline-block";
        img.alt = "Unknown";
        img.src = "./icons/flag_unknown.svg";
        continue;
      }

      // Normalize
      const code = String(countryCode).trim().toLowerCase();

      // Only accept two-letter codes (basic check); if not 2 letters, hide
      if (!/^[a-z]{2}$/.test(code)) {
        console.log(`   >Warning: Country code has more then 2 chars`);
        // img.style.display = "none";
        img.style.display = "inline-block";
        img.alt = "Unknown";
        img.src = "./icons/flag_unknown.svg";
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
  document.getElementById("DATETIME_CREATION").value = nowtime(false);
}

// Function to synchronize weight checkboxes and fields
function syncWeightCheckboxesAndFields(triggerId) {
  console.log("> func: syncWeightCheckboxesAndFields()");
  const depCheckbox = document.getElementById("DEPARTURE_WEIGHT_CHECKBOX");
  const arrCheckbox = document.getElementById("ARRIVAL_WEIGHT_CHECKBOX");

  // Sync the other checkbox to match the one that was clicked
  if (triggerId === "DEPARTURE_WEIGHT_CHECKBOX") {
    arrCheckbox.checked = depCheckbox.checked;
  } else if (triggerId === "ARRIVAL_WEIGHT_CHECKBOX") {
    depCheckbox.checked = arrCheckbox.checked;
  }

  // Disable/enable fields based on the (now synced) state
  if (depCheckbox.checked) {
    document.getElementById("ARRIVAL_WEIGHT_PILOT").disabled = true;
    document.getElementById("ARRIVAL_WEIGHT_COPILOT").disabled = true;
    document.getElementById("ARRIVAL_WEIGHT_REAR_RIGHT").disabled = true;
    document.getElementById("ARRIVAL_WEIGHT_REAR_LEFT").disabled = true;
    document.getElementById("ARRIVAL_WEIGHT_BAGAGE").disabled = true;
    document.getElementById("ARRIVAL_WEIGHT_FUEL_LITERS").disabled = true;
    document.getElementById("ARRIVAL_BTN_WEIGHTS").disabled = true;

    // Copy ARRIVAL weights into DEPARTURE weights
    document.getElementById("ARRIVAL_WEIGHT_PILOT").value = document.getElementById("DEPARTURE_WEIGHT_PILOT").value;
    document.getElementById("ARRIVAL_WEIGHT_COPILOT").value = document.getElementById("DEPARTURE_WEIGHT_COPILOT").value;
    document.getElementById("ARRIVAL_WEIGHT_REAR_RIGHT").value = document.getElementById("DEPARTURE_WEIGHT_REAR_RIGHT").value;
    document.getElementById("ARRIVAL_WEIGHT_REAR_LEFT").value = document.getElementById("DEPARTURE_WEIGHT_REAR_LEFT").value;
    document.getElementById("ARRIVAL_WEIGHT_BAGAGE").value = document.getElementById("DEPARTURE_WEIGHT_BAGAGE").value;

    // Compute the expected fuel
    computeArrivalFuelPerLeg();
  } else {
    document.getElementById("ARRIVAL_WEIGHT_PILOT").disabled = false;
    document.getElementById("ARRIVAL_WEIGHT_COPILOT").disabled = false;
    document.getElementById("ARRIVAL_WEIGHT_REAR_RIGHT").disabled = false;
    document.getElementById("ARRIVAL_WEIGHT_REAR_LEFT").disabled = false;
    document.getElementById("ARRIVAL_WEIGHT_BAGAGE").disabled = false;
    document.getElementById("ARRIVAL_WEIGHT_FUEL_LITERS").disabled = false;
    document.getElementById("ARRIVAL_BTN_WEIGHTS").disabled = false;
  }
}

// Make it globally accessible
window.updateFlag = updateFlag;
window.createDateTime = createDateTime;
window.syncWeightCheckboxesAndFields = syncWeightCheckboxesAndFields;
