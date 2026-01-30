// THESE ARE DEFINED IN: CONFIG.js
// const LOOKUPTABLE_URL;
// const LOOKUPTABLE_COUNTRIES_CACHE
// const LOOKUPTABLE_ICAO_CACHE

function populateDropdown(elementId, countries) {
  console.log("> func: populateDropdown()");
  // Populate the departure/ arrival drowndown countries

  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Select element with ID '${elementId}' not found`);
    return;
  }

  // Get existing options
  const existingOptions = Array.from(element.options);

  // Remove options that are not in the new countries list (except "Select Country")
  existingOptions.forEach((option) => {
    if (option.value !== "Select Country" && !countries.includes(option.value)) {
      element.removeChild(option);
    }
  });

  // Get updated existing values after removal
  const existingValues = Array.from(element.options).map((option) => option.value);

  // Add "Select Country" as first option if it doesn't exist
  if (!existingValues.includes("Select Country")) {
    const selectOption = document.createElement("option");
    selectOption.value = "Select Country";
    selectOption.textContent = "Select Country";
    element.insertBefore(selectOption, element.firstChild);
    existingValues.unshift("Select Country");
  }

  // Add new countries that don't already exist
  countries.forEach((item) => {
    // Skip if item already exists in the dropdown
    if (existingValues.includes(item)) {
      return;
    }

    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    element.appendChild(option);
  });
}

function getUniqueCountries(icaoDict) {
  // Extract unique countries from the ICAO lookup table
  const uniqueCountries = Array.from(
    new Set(
      Object.values(icaoDict)
        .map((entry) => entry.country)
        .filter(Boolean),
    ),
  );
  return uniqueCountries;
}

function LoadCountriesOfInterest() {
  console.log("> func: LoadCountriesOfInterest()");
  // Default
  let uniqueCountries = ["Netherlands", "Belgium"];

  try {
    const cached = localStorage.getItem(LOOKUPTABLE_ICAO_CACHE);
    if (cached) {
      // Parse and verify the cache
      const lookupTableIcao = JSON.parse(cached);
      // Overwrite with new countries
      uniqueCountries = getUniqueCountries(lookupTableIcao);
    }
  } catch (e) {
    console.info(`   >Cached lookup table for ICAO is invalid or empty, creating new lookup tables`);
  }

  // Show log
  return uniqueCountries;
}

async function CreateLookupTableIcaoSelected(countries) {
  // Create new lookup table for all countries with country_code and seperately for user-filtered countries for fast lookup.
  console.log("> func: CreateLookupTableIcaoSelected()");
  const allowed = new Set(countries);
  const countriesSelect = {};
  const uniqueCountries = [];

  // Fetch data from url
  const response = await fetch(LOOKUPTABLE_URL);
  const text = await response.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(";");
  const idxCountry = headers.indexOf("country");

  // Create dict with all countries
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    if (values.length !== headers.length) continue;
    if (countries.length > 0 && !allowed.has(values[idxCountry])) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    // Only store the countries of interest
    const icao = row.icao?.toUpperCase().trim();
    if (icao) {
      countriesSelect[icao] = row;
    }
  }

  console.log(countriesSelect);

  // Store in cache
  localStorage.setItem(LOOKUPTABLE_ICAO_CACHE, JSON.stringify(countriesSelect));
  // Get unique countries
  // uniqueCountries = getUniqueCountries(countriesSelect);
  console.log("   >Unique countries:", countries);
  // Return
  return countries;
}

function getIcaoInformation(icao) {
  // Return icoa information; country, country_code and city_icao
  console.log("> func: getIcaoInformation()");
  try {
    const cached = localStorage.getItem(LOOKUPTABLE_ICAO_CACHE);
    if (cached) {
      // Parse and verify it's valid
      const LookupTable = JSON.parse(cached);
      console.log(`   >Loading cached lookup from lookup ${LOOKUPTABLE_ICAO_CACHE}`);
      const getICAO = LookupTable[icao?.toUpperCase().trim()] || null;
      return getICAO;
    }
  } catch (e) {
    console.info(`   >Cache invalid or empty, creating new ICAO lookup table`);
  }
}

// ======================== CREATE ONE BIG COUNTRY TABLE ===========================
async function CreateLookupTableCountries(loadCache = true) {
  // Create new lookup table for all countries with country_code.
  // This only needs to be done the very first time. The stored cache data is used in all other sessions.

  console.log("> func: CreateLookupTableCountries()");
  const lookupTableCountries = {};

  // Check whether cache exists, and return early.
  if (loadCache) {
    try {
      const cached = localStorage.getItem(LOOKUPTABLE_COUNTRIES_CACHE);
      if (cached) {
        // Parse and verify it's valid
        const tmp = JSON.parse(cached);
        console.log(`   >Cached country lookup tables is OK: ${LOOKUPTABLE_COUNTRIES_CACHE}`);
        return;
      }
    } catch (e) {
      console.info(`   >Cached lookup table for countries is invalid or empty, creating new lookup tables`);
    }
  }

  // Fetch data from url
  const response = await fetch(LOOKUPTABLE_URL);
  const text = await response.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(";");
  const idxCountry = headers.indexOf("country");

  // Create dict with all countries
  const idxCountryCode = headers.indexOf("country_code");
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const country = values[idxCountry];
    const country_code = values[idxCountryCode];

    // Only add if not already present and both fields exist
    if (country && country_code && !(country in lookupTableCountries)) {
      lookupTableCountries[country] = country_code;
    }
  }
  // Store countries in lookup table for later usage.
  console.log(`   >Saving cached country lookup: ${LOOKUPTABLE_COUNTRIES_CACHE}`);
  console.log(lookupTableCountries);
  localStorage.setItem(LOOKUPTABLE_COUNTRIES_CACHE, JSON.stringify(lookupTableCountries));
}

// ======================== CONFIG COUNTRIES SELECTION ===========================

function moveCountries(fromId, toId, action, defaultSelected = []) {
  console.log("> func: moveCountries()");
  // console.log(defaultSelected);
  // Get multiselectbox elements
  const fromSelect = document.getElementById(fromId);
  const toSelect = document.getElementById(toId);

  // Handle initialization with default selected items
  if (defaultSelected.length > 0 && action === "initialize") {
    console.log(`   > Initialize with: ${defaultSelected}`);

    // Get cache
    const cached = localStorage.getItem(LOOKUPTABLE_COUNTRIES_CACHE);
    const uniqueCountries = JSON.parse(cached);

    // Format the country names with flags
    const countryFormatted = [];
    for (let i = 0; i < defaultSelected.length; i++) {
      console.log(defaultSelected[i]);
      const countryCode = uniqueCountries[defaultSelected[i]];
      const flag = getFlagEmoji(countryCode);
      countryFormatted.push(`${flag} ${defaultSelected[i]}`);
    }

    // Move default items from fromSelect to toSelect
    Array.from(fromSelect.options).forEach((option) => {
      // console.log("Checking option text:", option.text);
      const countryText = option.text; // Keep full text with flag
      if (countryFormatted.includes(countryText)) {
        console.log("   >MATCH FOUND - Moving:", countryText);
        option.style.display = "";
        toSelect.appendChild(option);
      } else {
        // console.log("NO MATCH for:", countryText);
      }
    });

    // Sort both selects
    sortSelect(fromSelect);
    sortSelect(toSelect);

    // Store ICAO in cache for selected countries
    CreateLookupTableIcaoSelected(defaultSelected);
    // Update dropdowns with remaining selected countries
    populateDropdown("DEPARTURE_COUNTRY", defaultSelected);
    populateDropdown("ARRIVAL_COUNTRY", defaultSelected);
    // Return
    return;
  }

  // Original logic for user interactions
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

  // Store all selected countries in a list
  let selectedCountries;
  if (action === "add") {
    selectedCountries = Array.from(toSelect.options).map((option) => option.text.replace(/^.*?\s/, ""));
  } else if (action === "remove") {
    selectedCountries = Array.from(fromSelect.options).map((option) => option.text.replace(/^.*?\s/, ""));
  }

  console.log(`Store selected countries in cache: ${selectedCountries}`);
  // Store ICAO in cache for selected countries
  CreateLookupTableIcaoSelected(selectedCountries);
  // populate dropdown
  populateDropdown("DEPARTURE_COUNTRY", selectedCountries);
  populateDropdown("ARRIVAL_COUNTRY", selectedCountries);
  // Return
  return;
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

// Helper function to get country code from country name (simplified mapping)
function getCountryCode(countryName) {
  console.log(`> func: getCountryCode("${countryName}")`);
  try {
    const cached = localStorage.getItem(LOOKUPTABLE_COUNTRIES_CACHE);
    if (cached) {
      // Parse and verify it's valid
      const LookupTable = JSON.parse(cached);
      // Loop through LookupTable to find a row where the 'country' matches countryName
      for (const key in LookupTable) {
        if (
          LookupTable.hasOwnProperty(key) &&
          LookupTable[key].country &&
          LookupTable[key].country.trim().toLowerCase() === countryName.trim().toLowerCase()
        ) {
          return LookupTable[key].country_code ? LookupTable[key].country_code.toLowerCase() : null;
        }
      }
    }
  } catch (e) {
    console.info(`   >Cache invalid or empty.`);
  }
}

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// Helper function to format a country option
function formatCountryOption(countryName) {
  const countryCode = getCountryCode(countryName);
  const flag = getFlagEmoji(countryCode);
  return { value: countryCode, text: `${flag} ${countryName}` };
}

// Function to populate available-countries select with COUNTRIES_DATA
function populateAvailableCountries() {
  console.log("> func: populateAvailableCountries()");
  let uniqueCountries;

  // Get selectionbox element
  const element = document.getElementById("available-countries");
  if (!element) {
    console.warn("element element with ID 'available-countries' not found");
    return;
  }

  // Load cached country data
  try {
    const cached = localStorage.getItem(LOOKUPTABLE_COUNTRIES_CACHE);
    if (cached) {
      uniqueCountries = JSON.parse(cached);
    }
  } catch (e) {
    console.info(`   >Cache invalid or empty, creating new ICAO lookup table`);
  }

  // Clear existing options
  element.innerHTML = "";

  // console.log(uniqueCountries);
  // Populate the select box with uniqueCountries dict
  if (uniqueCountries && typeof uniqueCountries === "object") {
    Object.keys(uniqueCountries).forEach((countryName) => {
      // Get country code
      const countryCode = uniqueCountries[countryName];
      // Get FLAG emoji
      const flag = getFlagEmoji(countryCode);
      // Get options menu and populate
      const option = document.createElement("option");
      option.value = countryCode;
      option.textContent = `${flag} ${countryName}`;
      element.appendChild(option);
    });
  }

  console.log(`   >populated ${element.options.length} countries in available-countries`);
}

// ==============================================================================
// ======================= VARIOUS OTHER FUNCTIONS ==============================
// ==============================================================================
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

function Py2Js(dictString) {
  try {
    // Replace single quotes with double quotes, and False/True/None with JS equivalents
    const jsonStr = dictString
      .replace(/'/g, '"')
      .replace(/\bFalse\b/g, "false")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bNone\b/g, "null");
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn("Failed to parse DEPARTURE_RUNWAY_PROPERTIES:", e, dictString);
    return null;
  }
}

// Make helper functions globally accessible
window.getCountryCode = getCountryCode;
window.getFlagEmoji = getFlagEmoji;
window.formatCountryOption = formatCountryOption;
window.populateAvailableCountries = populateAvailableCountries;

// Make it globally accessible
window.updateFlag = updateFlag;
window.createDateTime = createDateTime;
window.syncWeightCheckboxesAndFields = syncWeightCheckboxesAndFields;
window.CreateLookupTableCountries = CreateLookupTableCountries;
window.CreateLookupTableIcaoSelected = CreateLookupTableIcaoSelected;
window.getIcaoInformation = getIcaoInformation;
window.moveCountries = moveCountries;
window.filterCountry = filterCountry;
window.populateDropdown = populateDropdown;
window.Py2Js = Py2Js;
