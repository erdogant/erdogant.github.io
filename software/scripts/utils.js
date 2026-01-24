function getCountryForIcao(icao) {
  console.log("> func: getIcaoByIcao()");
  const cache_key = "ICAO_LOOKUP_TABLE";
  try {
    const cached = localStorage.getItem(cache_key);
    if (cached) {
      // Parse and verify it's valid
      const ICAO_LOOKUP = JSON.parse(cached);
      console.log(`   >Loading cached lookup from lookup ${cache_key}`);
      const getICAO = ICAO_LOOKUP[icao?.toUpperCase().trim()] || null;
      return getICAO;
    }
  } catch (e) {
    console.info(`   >Cache invalid or empty, creating new ICAO lookup table`);
  }
}

async function initIcaoLookup(url, countries = [], loadCache = true) {
  console.log("> func: initIcaoLookup()");
  const cache_key = "ICAO_LOOKUP_TABLE";

  if (loadCache) {
    try {
      const cached = localStorage.getItem(cache_key);
      if (cached) {
        // Parse and verify it's valid
        const ICAO_LOOKUP = JSON.parse(cached);
        console.log(`   >Loading cached lookup from ${cache_key}`);
        return;
      }
    } catch (e) {
      console.info(`   >Cache invalid or empty, creating new ICAO lookup table`);
    }
  }

  const allowed = new Set(countries);
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(";");
  const ICAO_LOOKUP = {};

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    if (values.length !== headers.length) continue;
    if (countries.length > 0 && !allowed.has(values[0])) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    const icao = row.icao?.toUpperCase().trim();
    if (icao) {
      ICAO_LOOKUP[icao] = row;
    }
  }

  console.log(`   >Saving cached lookup: ${cache_key}`);
  // Convert object to JSON string before saving
  localStorage.setItem(cache_key, JSON.stringify(ICAO_LOOKUP));
  return;
}

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

// ======================== CONFIG COUNTRIES SELECTION ===========================

function moveCountries(fromId, toId) {
  const fromSelect = document.getElementById(fromId);
  const toSelect = document.getElementById(toId);

  const selectedOptions = Array.from(fromSelect.selectedOptions);

  if (selectedOptions.length === 0) {
    return;
  }

  selectedOptions.forEach((option) => {
    // Remove the hidden attribute when moving
    option.style.display = "";
    toSelect.appendChild(option);
  });

  // Sort options alphabetically
  sortSelect(toSelect);

  // Clear search filters
  if (fromId === "available-countries") {
    document.getElementById("search-available").value = "";
    filterCountry("available-countries", "");
  } else {
    document.getElementById("search-selected").value = "";
    filterCountry("selected-countries", "");
  }
}

function sortSelect(selectElement) {
  const options = Array.from(selectElement.options);
  options.sort((a, b) => a.text.localeCompare(b.text));
  selectElement.innerHTML = "";
  options.forEach((option) => selectElement.appendChild(option));
}

function filterCountry(selectId, searchText) {
  const select = document.getElementById(selectId);
  const options = select.options;
  const search = searchText.toLowerCase();

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const text = option.text.toLowerCase();
    const value = option.value.toLowerCase();

    if (text.includes(search) || value.includes(search)) {
      option.style.display = "";
    } else {
      option.style.display = "none";
    }
  }
}

function getSelectedCountries() {
  const selected = document.getElementById("selected-countries");
  return Array.from(selected.options).map((opt) => opt.value);
}

// Make it globally accessible
window.updateFlag = updateFlag;
window.createDateTime = createDateTime;
window.syncWeightCheckboxesAndFields = syncWeightCheckboxesAndFields;
window.initIcaoLookup = initIcaoLookup;
window.getCountryForIcao = getCountryForIcao;
window.moveCountries = moveCountries;
window.filterCountry = filterCountry;
