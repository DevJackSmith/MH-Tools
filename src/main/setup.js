"use strict";

var POPULATION_JSON_URL = "data/populations-setup.json";

$(window).load(function() {
  var bonusLuckParameter, loaded;
  user = SETUP_USER;

  loadBookmarkletFromJS(
    BOOKMARKLET_LOADER_URL,
    "bookmarkletLoader",
    "#bookmarkletloader"
  );

  loadBookmarkletFromJS(
    SETUP_BOOKMARKLET_URL,
    "setupBookmarklet",
    "#bookmarklet"
  );

  loadItemSelection(weaponKeys, "weapon");
  loadItemSelection(baseKeys, "base");
  loadItemSelection(charmKeys, "charm");

  startPopulationLoad(POPULATION_JSON_URL);
  $("#main").show();
  gsParamCheck();
  riftstalkerParamCheck();
  fortRoxParamCheck();
  rankParamCheck();

  bonusLuckParameter = parseInt(getURLParameter("bonusLuck"));
  if (bonusLuckParameter >= 0) {
    document.querySelector("#bonusLuck").value = bonusLuckParameter;
    bonusLuckChanged();
  }

  showHideWidgets();

  document.querySelector("#location").onchange = locationChanged;
  document.querySelector("#phase").onchange = phaseChanged;
  document.querySelector("#cheese").onchange = cheeseChanged;
  document.querySelector("#charm").onchange = charmChanged;
  document.querySelector("#toxic").onchange = toxicChanged;
  document.querySelector("#battery").onchange = batteryChanged;
  document.querySelector("#gs").onchange = gsChanged;
  document.querySelector("#bonusLuck").onchange = bonusLuckChanged;
  document.querySelector("#ballistaLevel").onchange = genericOnChange;
  document.querySelector("#cannonLevel").onchange = genericOnChange;
  document.querySelector("#riftstalker").onchange = riftstalkerChange;
  document.querySelector("#rank").onchange = rankChange;

  $("#save_setup_button").click(saveSetupStorage);

  $("#show_pop_button").click(function() {
    $("#pleaseWaitMessage").css("display", "inline");
    setTimeout(showPop, 0);
  });
  bindSelectorButtons();

  $("#results")
    .bind("sortStart", function() {
      $("#pleaseWaitMessage").show();
    })
    .bind("sortEnd", function() {
      $("#pleaseWaitMessage").hide();
    });

  /**
   * Toggle weapon/charm/base selectors
   */
  function bindSelectorButtons() {
    var weaponsTable = getSelectors("weapon").container;
    var baseTable = getSelectors("base").container;
    var charmTable = getSelectors("charm").container;

    $("#show_weapons_button").click(function() {
      $(weaponsTable).toggle();
      $(baseTable).hide();
      $(charmTable).hide();
    });

    $("#show_bases_button").click(function() {
      $(baseTable).toggle();
      $(weaponsTable).hide();
      $(charmTable).hide();
    });

    $("#show_charms_button").click(function() {
      $(charmTable).toggle();
      $(weaponsTable).hide();
      $(baseTable).hide();
    });
  }

  // Check window.name for bookmarklet data
  if (window.name) {
    try {
      var basesWeaponsCharms = JSON.parse(window.name);
      if (
        basesWeaponsCharms["bases"] &&
        basesWeaponsCharms["weapons"] &&
        basesWeaponsCharms["charms"]
      ) {
        // Write to object along with current arrays.js keys
        var storageObj = {};
        storageObj["all-items"] = {};
        storageObj["all-items"]["bases"] = baseKeys;
        storageObj["all-items"]["charms"] = charmKeys;
        storageObj["all-items"]["weapons"] = weaponKeys;
        storageObj["owned-items"] = {};
        storageObj["owned-items"]["bases"] = basesWeaponsCharms["bases"];
        storageObj["owned-items"]["charms"] = basesWeaponsCharms["charms"];
        storageObj["owned-items"]["weapons"] = basesWeaponsCharms["weapons"];
        localStorage.setItem("best-setup-items", JSON.stringify(storageObj));
        window.name = ""; // Reset name after capturing data
      } else {
        console.log("window.name not properly formatted for Best Setup usage");
      }
    } catch (e) {
      console.log("(Error in window.name) - " + e);
    }
    // called after try...catch
    checkStorage();
  } else {
    // window.name empty
    checkStorage();
  }
});

function checkLoadState() {
  var batteryParameter;
  var loadPercentage = (popLoaded + wisdomLoaded) / 2 * 100;
  var status = document.querySelector("#status");
  status.innerHTML = "<td>Loaded " + loadPercentage + "%...</td>";

  if (loadPercentage === 100) {
    loadLocationDropdown();
    checkToxicParam();
    getSliderValue();

    batteryParameter = getURLParameter("battery");
    if (batteryParameter != NULL_URL_PARAM) {
      document.querySelector("#battery").value = parseInt(batteryParameter);
    }

    status.innerHTML = "<td>All set!</td>";
    setTimeout(function() {
      status.innerHTML = "<td><br></td>";
    }, 1420);
  }
}

/**
 * Get jQuery selectors for a specific item type
 * @param {string} type 'weapon', 'base' or 'charm'
 * @return {{checkboxClass, labelClass, checkbox, container, allCheckbox, name: string}}
 */
function getSelectors(type) {
  var checkboxClass = type + "_checkbox";
  return {
    checkboxClass: checkboxClass,
    labelClass: checkboxClass + "-label",
    checkbox: "." + checkboxClass,
    container: "#" + type + "s_selector_table",
    allCheckbox: "#all_" + type + "s_checkbox",
    name: type + "-owned"
  };
}

/**
 * Populate item checkboxes
 * @param {string[]} itemKeys
 * @param {string} type @see {@link getSelectors}
 */
function loadItemSelection(itemKeys, type) {
  var i;
  var select = getSelectors(type);
  for (i = 0; i < itemKeys.length; i++) {
    var checkboxItem = buildCheckboxItem(select, itemKeys[i]);
    $(checkboxItem)
      .appendTo(select.container)
      .wrap("<li>");
  }

  $(select.checkbox).change(function() {
    $(select.allCheckbox).prop("checked", false);
  });

  $(select.allCheckbox).change(function() {
    var checked = this.checked;
    $(select.checkbox).prop("checked", checked);
  });

  /**
   * Builds jQuery object with checkbox to insert
   * @param select
   * @param itemName
   * @return {jQuery}
   */
  function buildCheckboxItem(select, itemName) {
    var row = $("<label></label>");
    $("<input />", {
      type: "checkbox",
      checked: "checked",
      value: itemName,
      class: select.checkboxClass,
      name: select.name
    }).appendTo(row);
    $("<span />", {
      class: select.labelClass,
      text: itemName
    }).appendTo(row);
    return row;
  }
}

/**
 * Check localStorage for saved items
 */
function checkStorage() {
  var storedData = JSON.parse(localStorage.getItem("best-setup-items"));
  if (storedData) {
    checkForNewItems(storedData);
    processStoredData(storedData);
  }

  /**
   * Compare storedData["all-items"] to arrays.js
   * Generate alert if new items have been added, then update localStorage
   */
  function checkForNewItems(storedData) {
    if (
      storedData["all-items"]["bases"].length !== baseKeys.length ||
      storedData["all-items"]["charms"].length !== charmKeys.length ||
      storedData["all-items"]["weapons"].length !== weaponKeys.length
    ) {
      var newItemString = "";
      for (var i = 0; i < baseKeys.length; i++) {
        if (storedData["all-items"]["bases"].indexOf(baseKeys[i]) < 0) {
          newItemString += "Base - " + baseKeys[i] + "\n";
        }
      }
      for (var i = 0; i < charmKeys.length; i++) {
        if (storedData["all-items"]["charms"].indexOf(charmKeys[i]) < 0) {
          newItemString += "Charm - " + charmKeys[i] + "\n";
        }
      }
      for (var i = 0; i < weaponKeys.length; i++) {
        if (storedData["all-items"]["weapons"].indexOf(weaponKeys[i]) < 0) {
          newItemString += "Weapon - " + weaponKeys[i] + "\n";
        }
      }
      window.alert(
        "> New Items <\n\n" +
          newItemString +
          "\nPlease add appropriate checkmarks or use the bookmarklet at your earliest convenience!"
      );
      storedData["all-items"]["bases"] = baseKeys;
      storedData["all-items"]["charms"] = charmKeys;
      storedData["all-items"]["weapons"] = weaponKeys;
      localStorage.setItem("best-setup-items", JSON.stringify(storedData));
    }
  }

  function processStorageArray(indexArray, ownedItems, type) {
    var currentItem, i;
    var selectors = getSelectors(type);

    $(selectors.checkbox).prop("checked", false);
    $(selectors.allCheckbox).prop("checked", false);
    for (i = 0; i < indexArray.length; i++) {
      currentItem = indexArray[i];
      if (contains(ownedItems, currentItem)) {
        $(selectors.checkbox).get(i).checked = true;
      }
    }
  }

  function processStoredData(storedData) {
    var ownedBases = storedData["owned-items"]["bases"];
    var ownedWeapons = storedData["owned-items"]["weapons"];
    var ownedCharms = storedData["owned-items"]["charms"];

    console.log("Items: owned / total");
    console.log("Bases: " + ownedBases.length + " / " + baseKeys.length);
    console.log("Weapons: " + ownedWeapons.length + " / " + weaponKeys.length);
    console.log("Charms: " + ownedCharms.length + " / " + charmKeys.length);

    if (ownedBases && ownedBases.length > 0) {
      processStorageArray(baseKeys, ownedBases, "base");
    }

    if (ownedWeapons && ownedWeapons.length > 0) {
      // Edge cases
      if (ownedWeapons.indexOf("Isle Idol Trap") > 0) {
        ownedWeapons.push("Isle Idol Hydroplane Skin");
        ownedWeapons.push("Isle Idol Stakeshooter Skin");
      } else if (ownedWeapons.indexOf("Gemstone Trap") > 0) {
        ownedWeapons[ownedWeapons.indexOf("Gemstone Trap")] =
          "Crystal Crucible Trap";
      } else if (ownedWeapons.indexOf("Mouse Mary O\\'Nette") > 0) {
        ownedWeapons[ownedWeapons.indexOf("Mouse Mary O\\'Nette")] =
          "Mouse Mary O'Nette";
      }
      processStorageArray(weaponKeys, ownedWeapons, "weapon");
    }

    if (ownedCharms && ownedCharms.length > 0) {
      processStorageArray(charmKeys, ownedCharms, "charm");
    }
  }
}

/**
 * Saves ticked bases/charms/weapons to localStorage
 * Also stores current total number of items for future comparison
 */
function saveSetupStorage() {
  var storageObj = {};
  storageObj["all-items"] = {};
  storageObj["all-items"]["bases"] = baseKeys;
  storageObj["all-items"]["charms"] = charmKeys;
  storageObj["all-items"]["weapons"] = weaponKeys;
  storageObj["owned-items"] = {};
  storageObj["owned-items"]["bases"] = getCheckboxString(
    getSelectors("base").checkbox
  );
  storageObj["owned-items"]["charms"] = getCheckboxString(
    getSelectors("charm").checkbox
  );
  storageObj["owned-items"]["weapons"] = getCheckboxString(
    getSelectors("weapon").checkbox
  );
  localStorage.setItem("best-setup-items", JSON.stringify(storageObj));

  /**
   * Builds array of item names from selected checkboxes
   * @param {string} selector
   * @return {string[]}
   */
  function getCheckboxString(selector) {
    return $(selector)
      .map(function() {
        if ($(this).prop("checked") === true) {
          return $(this).prop("value");
        }
      })
      .toArray();
  }
}

/**
 * Loads the cheese dropdown menu
 */
function loadCheeseDropdown(location, phase) {
  var cheeseDropdown = document.querySelector("#cheese");
  var cheeseDropdownHTML = "";

  var insertedCheeses = [];

  function addCheeseOption(insertedCheeses, cheeseName, cheeseDropdownHTML) {
    if (!contains(insertedCheeses, cheeseName)) {
      cheeseDropdownHTML += "<option>" + cheeseName + "</option>\n";
      insertedCheeses.push(cheeseName);
    }
    return cheeseDropdownHTML;
  }

  function splitCheeseOption(option) {
    var optionArray = option.split("/");
    for (var j = 0; j < Object.size(optionArray); j++) {
      cheeseDropdownHTML = addCheeseOption(
        insertedCheeses,
        optionArray[j],
        cheeseDropdownHTML
      );
    }
  }

  for (var cheeseOption in popArray[location][phase]) {
    if (cheeseOption.indexOf("/") < 0 || contains(cheeseOption, "Combat")) {
      //Todo: Fix this master cheese thingy
      cheeseDropdownHTML = addCheeseOption(
        insertedCheeses,
        cheeseOption,
        cheeseDropdownHTML
      );
    } else {
      splitCheeseOption(cheeseOption);
    }
  }

  cheeseDropdown.innerHTML = cheeseDropdownHTML;
  cheeseDropdown.selectedIndex = 0;

  var select = document.querySelector("#cheese");
  var cheeseParameter = getURLParameter("cheese");
  if (cheeseParameter !== NULL_URL_PARAM) {
    select.value = cheeseParameter;
  }
  if (select.selectedIndex === -1) {
    select.selectedIndex = 0;
  }

  cheeseChanged();
}

function loadCharmDropdown(location, phase, cheese) {
  /**
   * Population array for Location-Phase-Cheese
   */
  var popArrayLPC = popArray[location][phase][cheese];

  function fillPopArray(searchCheese) {
    var popArrayLP;
    if (!popArrayLPC) {
      popArrayLP = popArray[location][phase];
      // Search through popArrayLP for cheese matching currently armed cheese
      // TODO: Improve
      for (var popcheese in popArrayLP) {
        if (contains(popcheese, searchCheese)) {
          popArrayLPC = popArray[location][phase][searchCheese];
        }
      }
    }
  }

  function populateDropdown(items, selector) {
    var dropdown = $(selector).html("<option>-</option>");
    if (items) {
      for (var i = 0; i < items.length; i++) {
        if (items[i] != EMPTY_SELECTION) {
          $("<option/>", {
            text: items[i],
            value: items[i]
          }).appendTo(dropdown);
        }
      }
    }
  }

  fillPopArray(cheese);

  var charms;
  if (popArrayLPC) {
    charms = Object.keys(popArrayLPC);
    charms.sort();
  }
  populateDropdown(charms, "#charm");

  var charmParameter = getURLParameter("charm");
  var select = document.querySelector("#charm");
  if (charmParameter != NULL_URL_PARAM) {
    select.value = charmParameter;
  }
  if (select.selectedIndex == -1) {
    select.selectedIndex = 0;
  }
  charmChanged();
}

function updateLink() {
  var select = document.querySelector("#charm");
  var selectedCharm = select.value;

  var urlParams = {
    location: locationName,
    phase: phaseName,
    cheese: cheeseName,
    charm: selectedCharm,
    toxic: isToxic,
    battery: batteryPower,
    gs: !gsLuck,
    bonusLuck: bonusLuck,
    tourney: tournamentName,
    riftstalker: riftStalkerCodex,
    ballistaLevel: fortRox.ballistaLevel,
    cannonLevel: fortRox.cannonLevel,
    rank: rank,
    amplifier: ztAmp
  };

  var urlString = buildURL("setup.html", urlParams);
  document.querySelector("#link").href = urlString;

  ga("send", "event", "link", "updated", urlString);
}

function weaponChanged() {
  populateWeaponData(weaponName);
  calculateTrapSetup();
}

function cheeseChanged() {
  cheeseName = document.querySelector("#cheese").value;
  updateLink();
  checkToxicWidget();
  loadCharmDropdown(locationName, phaseName, cheeseName);
}

function baseChanged() {
  // Bases with special effects when paired with particular charm
  if (specialCharm[baseName]) {
    calcSpecialCharms(charmName);
  } else {
    populateCharmData(charmName);
  }

  populateBaseData(baseName);
  calculateTrapSetup();
}

function charmChanged(customValue) {
  var selectedVal = $("#charm").val();
  if (selectedVal !== EMPTY_SELECTION) {
    selectedVal += " Charm";
  }
  charmChangeCommon(customValue || selectedVal);
  calculateTrapSetup();
}

function showPop() {
  if (!locationName || !cheeseName) {
    document.querySelector("#results").innerHTML = "";
    $("#pleaseWaitMessage").hide();
    return;
  } else {
    charmChanged();
    var selectedCharm = $("#charm").val();
    var population = getPopulation(selectedCharm);
    console.time("printCombinations (total)");
    printCombinations(population, getHeader(population));
    console.timeEnd("printCombinations (total)");
    console.log("------------------------------");
  }

  /**
   * Build the results table header
   * @param population
   * @return {string}
   */
  function getHeader(population) {
    var resultsHeader = "<thead><tr><th align='left'>Setup</th>";
    for (var mouseName in population) {
      resultsHeader += "<th data-filter='false'>" + mouseName + "</th>";
    }
    resultsHeader += "<th id='overallHeader' data-filter='false'>Overall</th>";
    if (rank) {
      resultsHeader +=
        "<th data-filter='false' title='Rank progress per 100 hunts'>Rank</th>";
    }
    resultsHeader += "</tr></thead>";
    return resultsHeader;
  }
}

/**
 * Get mouse population for current location/phase/cheese and the selected charm
 * @param {string} selectedCharm
 * @return Mouse Populations
 */
function getPopulation(selectedCharm) {
  var popArrayLPC = popArray[locationName][phaseName][cheeseName];
  if (!popArrayLPC) {
    popArrayLPC = checkPopArray();
  }
  return popArrayLPC[selectedCharm];

  /**
   * Handle cases where cheese names bundled together with '/' between
   * @return Charm Populations
   */
  function checkPopArray() {
    var popArrayL = popArray[locationName][phaseName];
    var cheeseNameKeys = Object.keys(popArrayL);
    var popArrayLLength = Object.size(popArray[locationName][phaseName]);
    var commonCheeseIndex;
    for (var i = 0; i < popArrayLLength; i++) {
      if (
        cheeseNameKeys[i].indexOf(cheeseName) >= 0 &&
        cheeseNameKeys[i].indexOf("/") >= 0
      ) {
        commonCheeseIndex = cheeseNameKeys[i];
        break;
      }
    }
    return popArray[locationName][phaseName][commonCheeseIndex];
  }
}

/**
 * Builds associative array of chosen power type's effectiveness against the mice population
 * @param micePopulation
 * @return {{string: number}} Object with Mouse : Effectiveness
 */
function buildEffectivenessArray(micePopulation) {
  var eff = {};
  for (var mouse in micePopulation) {
    eff[mouse] = findEff(mouse);
  }
  return eff;
}

/**
 * Builds associative array of mouse powers from current micePopulation
 * @param micePopulation
 * @return {{string: number}} -  Object with Mouse : Power
 */
function buildPowersArray(micePopulation) {
  var power = {};
  for (var mouse in micePopulation) {
    power[mouse] = powersArray[mouse][0];
  }
  return power;
}

// sample: [{catches: [0.5, 0.4], rank: 0.001, link: "url", cr: 0.9}, {}, etc]
var unsortedOverallCR = [];

/**
 * Build an array of objects for faster sorting
 * Used in printCombinations
 * @param micePopulation
 * @param powersArray Array of location's mouse power values
 * @param {array} mpKeys micePopulation object keys
 * @param {number} mpLen Length of mpKeys
 * @param {string} selectedCharm Current charm for CRE link generation
 * @param {string} headerHtml
 */
function buildOverallCR(
  micePopulation,
  powersArray,
  mpKeys,
  mpLen,
  selectedCharm,
  headerHtml
) {
  var overallAR = getCheeseAttraction();
  var effArray = buildEffectivenessArray(micePopulation);
  var overallCR = 0;
  var overallProgress = 0;
  var fullRow = {};
  fullRow["catches"] = [];
  var i = mpLen;
  while (i--) {
    var mouse = mpKeys[mpLen - i - 1];
    var catches = getMouseCatches(
      micePopulation,
      mouse,
      overallAR,
      effArray,
      powersArray
    );
    overallCR += catches;
    fullRow["catches"].push(catches);
    if (rank) {
      // handle missing data
      if (mouseWisdom[mouse]) {
        overallProgress += mouseWisdom[mouse] / rankupDiff[rank] * catches;
      }
    }
  }
  fullRow["rank"] = overallProgress;
  fullRow["link"] = getLinkCell(
    selectedCharm,
    weaponName,
    baseName,
    headerHtml
  );
  fullRow["cr"] = overallCR;
  unsortedOverallCR.push(fullRow);
}

/**
 * Build mouse population <td> elements for each row
 * Used in printCharmCombinations
 * @param micePopulation
 * @return {string}
 */
function buildMiceCRCells(micePopulation) {
  var overallCR = 0;
  var overallProgress = 0;
  var overallAR = getCheeseAttraction();
  var effectivenessArray = buildEffectivenessArray(micePopulation);
  var powersArray = buildPowersArray(micePopulation);
  var html = "";

  for (var mouse in micePopulation) {
    var catches = getMouseCatches(
      micePopulation,
      mouse,
      overallAR,
      effectivenessArray,
      powersArray
    );
    overallCR += catches;
    if (rank) {
      // handle missing data
      if (mouseWisdom[mouse]) {
        overallProgress += mouseWisdom[mouse] / rankupDiff[rank] * catches;
      }
    }
    html += "<td align='right'>" + catches.toFixed(2) + "</td>";
  }

  html += "<td align='right'>" + overallCR.toFixed(2) + "</td>";
  if (rank) {
    // numbers are usually 0.00##% per hunt, but per 100 hunts is consistent with values shown
    html += "<td>" + (overallProgress * 100).toFixed(2) + "%</td>";
  }
  return html;
}

/**
 * Prints weapon/base combinations for user input
 * @param micePopulation
 * @param headerHtml
 */
function printCombinations(micePopulation, headerHtml) {
  var weaponSelectors = getSelectors("weapon");
  var baseSelectors = getSelectors("base");
  var selectedCharm = document.querySelector("#charm").value;
  var tableHTML = headerHtml + "<tbody>";
  charmName = selectedCharm;

  console.log(
    "Weapons: " +
      $(weaponSelectors.checkbox + ":checked").length +
      " / Bases: " +
      $(baseSelectors.checkbox + ":checked").length +
      " / Mice: " +
      Object.keys(micePopulation).length
  );

  var powersArray = buildPowersArray(micePopulation);
  var mousePopKeys = Object.keys(micePopulation);
  var mousePopLength = mousePopKeys.length;
  unsortedOverallCR = [];

  console.time("weapon & base $.each() loop");
  $(weaponSelectors.checkbox + ":checked").each(function(index, weaponElement) {
    weaponName = weaponElement.value;
    weaponChanged();

    $(baseSelectors.checkbox + ":checked").each(function(index, baseElement) {
      baseName = baseElement.value;
      baseChanged();

      buildOverallCR(
        micePopulation,
        powersArray,
        mousePopKeys,
        mousePopLength,
        selectedCharm,
        headerHtml
      );
    });
  });
  console.timeEnd("weapon & base $.each() loop");

  // Sort in place based on greater overall catch rate
  unsortedOverallCR.sort(function(a, b) {
    return b["cr"] - a["cr"];
  });

  // Grab user defined number of rows to pass into tablesorter
  var rowIterations = $("input[name=rowLimit]:checked").val();
  if (rowIterations === "All" || rowIterations > unsortedOverallCR.length) {
    rowIterations = unsortedOverallCR.length;
  }

  // Concatenate into single HTML string
  for (var i = 0; i < rowIterations; i++) {
    var obj = unsortedOverallCR[i];
    tableHTML += "<tr>" + obj["link"];
    for (var j = 0; j < obj["catches"].length; j++) {
      tableHTML +=
        "<td align='right'>" + obj["catches"][j].toFixed(2) + "</td>";
    }
    tableHTML += "<td align='right'>" + obj["cr"].toFixed(2) + "</td>";
    if (rank) {
      // numbers are usually 0.00##% per hunt, but per 100 hunts is consistent with values shown
      tableHTML += "<td>" + (obj["rank"] * 100).toFixed(2) + "%</td>";
    }
  }
  $("#results").html(tableHTML);

  console.time("tablesorter update trigger");
  var resort = true;
  var callback = function() {
    var header = $("#overallHeader");
    if (header.hasClass("tablesorter-headerAsc")) {
      header.click();
      header.click();
    } else if (header.hasClass("tablesorter-headerUnSorted")) {
      header.click();
    }
  };
  $("#results").trigger("updateAll", [resort, callback]);
  console.timeEnd("tablesorter update trigger");
}

/**
 * String concatenation for CRE setup link and 'Find best charm' button handler
 * @param {string} selectedCharm
 * @param {string} weaponName
 * @param {string} baseName
 * @return {string}
 */
function getLinkCell(selectedCharm, weaponName, baseName, headerHtml) {
  var cell = "</td><td>" + getCRELinkElement();

  // prettier-ignore
  if (selectedCharm === EMPTY_SELECTION) {
      cell += '<span style="float: right"><button onclick="weaponName=\''
      + weaponName.replace(/'/g, "\\'")
        + '\';baseName=\''
      + baseName.replace(/'/g, "\\'")
      + '\';weaponChanged();baseChanged();printCharmCombinations(getPopulation(EMPTY_SELECTION), \''
        + headerHtml.replace(/'/g, "\\'")
        + '\')">Find best charm</button></span>';
    }

  return cell;
}

/**
 * Creates <a> tag for the CRE link
 * @return {string}
 */
function getCRELinkElement() {
  var urlString = buildCRELink();
  var caption = weaponName + " / " + baseName;
  if (charmName && charmName != EMPTY_SELECTION) {
    caption += " / " + charmName;
  }
  return (
    "<a href='" +
    urlString +
    "' target='_blank' rel='noopener'>" +
    caption +
    "</a>"
  );

  /**
   * Builds the actual url with parameter to the CRE page
   * @return {string}
   */
  function buildCRELink() {
    var urlParams = {
      location: locationName,
      phase: phaseName,
      cheese: cheeseName,
      charm: charmName,
      gs: !gsLuck,
      bonusLuck: bonusLuck,
      weapon: weaponName,
      base: baseName,
      toxic: isToxic,
      battery: batteryPower,
      riftstalker: riftStalkerCodex,
      ballistaLevel: fortRox.ballistaLevel,
      cannonLevel: fortRox.cannonLevel,
      rank: rank,
      amplifier: ztAmp
    };
    var urlString = buildURL("cre.html", urlParams);
    urlString = urlString.replace(/'/g, "%27"); //TODO: Verify necessity
    return urlString;
  }
}

/**
 * Gets mouse attraction and catch rate
 * @param {{string: number}} micePopulation Mouse population percentages for the current location
 * @param {string} mouseName Mouse name
 * @param {number} overallAR Setup attraction rate
 * @param {{string: number}} effectivenessArray Power type effectiveness array
 * @param {{string: number}} powersArray Mouse powers array
 * @return {{attractions: number, catchRate: number}}
 */
function getMouseACR(
  micePopulation,
  mouseName,
  overallAR,
  effectivenessArray,
  powersArray
) {
  var attractions = micePopulation[mouseName] * overallAR;
  var mousePower = powersArray[mouseName];
  var trapEffectiveness = effectivenessArray[mouseName];

  if (contains(mouseName, "Rook") && charmName === "Rook Crumble Charm") {
    charmBonus += 300;
  }
  if (locationName === "Fort Rox") {
    if (
      (contains(wereMice, mouseName) && fortRox.ballistaLevel >= 1) ||
      (contains(cosmicCritters, mouseName) && fortRox.cannonLevel >= 1)
    ) {
      mousePower /= 2;
    }
  }
  if (contains(dragons, mouseName) && charmName === "Dragonbane Charm") {
    charmBonus += 300;
  }

  if (locationName === "Fiery Warpath") {
    if (charmName.indexOf("Super Warpath Archer Charm") >= 0) {
      var warpathArcher = ["Desert Archer", "Flame Archer", "Crimson Ranger"];
      if (contains(warpathArcher, mouseName)) {
        charmBonus += 50;
      }
    } else if (charmName.indexOf("Super Warpath Warrior Charm") >= 0) {
      var warpathWarrior = ["Desert Soldier", "Flame Warrior", "Crimson Titan"];
      if (contains(warpathWarrior, mouseName)) {
        charmBonus += 50;
      }
    } else if (charmName.indexOf("Super Warpath Scout Charm") >= 0) {
      var warpathScout = ["Vanguard", "Sentinel", "Crimson Watch"];
      if (contains(warpathScout, mouseName)) {
        charmBonus += 50;
      }
    } else if (charmName.indexOf("Super Warpath Cavalry Charm") >= 0) {
      var warpathCavalry = ["Sand Cavalry", "Sandwing Cavalry"];
      if (contains(warpathCavalry, mouseName)) {
        charmBonus += 50;
      }
    } else if (charmName.indexOf("Super Warpath Mage Charm") >= 0) {
      var warpathMage = ["Inferno Mage", "Magmarage"];
      if (contains(warpathMage, mouseName)) {
        charmBonus += 50;
      }
    } else if (charmName.indexOf("Super Warpath Commander's Charm") >= 0) {
      if (mouseName === "Crimson Commander") {
        charmBonus += 50;
      }
    }
  }

  calculateTrapSetup();
  var catchRate = calcCR(trapEffectiveness, trapPower, trapLuck, mousePower);
  return { attractions: attractions, catchRate: catchRate };
}

/**
 * Gets the number of catches per 100 hunts
 * @param micePopulation
 * @param {string} mouse Mouse name
 * @param {number} overallAR Setup attraction rate
 * @param {{string: number}} effectivenessArray
 * @param {{string: number}} powersArray
 * @return {number} Mouse catches in 100 hunts
 */
function getMouseCatches(
  micePopulation,
  mouse,
  overallAR,
  effectivenessArray,
  powersArray
) {
  var mouseACDetails = getMouseACR(
    micePopulation,
    mouse,
    overallAR,
    effectivenessArray,
    powersArray
  );
  var attractions = mouseACDetails.attractions;
  var catchRate = mouseACDetails.catchRate;

  // Exceptions and final modifications to catch rates
  if (charmName == "Ultimate Charm") {
    catchRate = 1;
  } else if (
    locationName == "Sunken City" &&
    charmName == "Ultimate Anchor Charm" &&
    phaseName != "Docked"
  ) {
    catchRate = 1;
  } else if (mouse == "Bounty Hunter" && charmName == "Sheriff's Badge Charm") {
    catchRate = 1;
  } else if (
    mouse == "Zurreal the Eternal" &&
    weaponName != "Zurreal's Folly"
  ) {
    catchRate = 0;
  } else if (
    locationName === "Zugzwang's Tower" ||
    locationName === "Seasonal Garden"
  ) {
    if (ztAmp > 0 && weaponName === "Zugzwang's Ultimate Move") {
      catchRate += (1 - catchRate) / 2;
    }
  } else if (locationName === "Fort Rox") {
    if (
      (contains(wereMice, mouse) && fortRox.ballistaLevel >= 2) ||
      (contains(cosmicCritters, mouse) && fortRox.cannonLevel >= 2)
    ) {
      catchRate += (1 - catchRate) / 2;
    }
    if (
      (fortRox.cannonLevel >= 3 && mouse === "Nightfire") ||
      (fortRox.ballistaLevel >= 3 && mouse === "Nightmancer")
    ) {
      catchRate = 1;
    }
  }

  if (weaponName.startsWith("Anniversary")) {
    catchRate += (1 - catchRate) / 10;
  }

  return attractions * catchRate;
}

/**
 * Print result of 'Find best charm'
 * Compare different charms with a specific weapon and base setup
 * @param micePopulation
 * @param {string} headerHTML
 */
function printCharmCombinations(micePopulation, headerHTML) {
  var charmSelectors = getSelectors("charm");
  var tableHTML = headerHTML + "<tbody>";

  $(charmSelectors.checkbox + ":checked").each(function(index, element) {
    charmChanged(element.value);
    tableHTML +=
      "<tr><td>" +
      getCRELinkElement() +
      "</td>" +
      buildMiceCRCells(micePopulation);
  });
  $("#results").html(tableHTML);

  var resort = true;
  var callback = function() {
    var header = $("#overallHeader");
    if (
      header.hasClass("tablesorter-headerAsc") ||
      header.hasClass("tablesorter-headerUnSorted")
    ) {
      header.click();
    }
  };
  $("#results").trigger("updateAll", [resort, callback]);
}
