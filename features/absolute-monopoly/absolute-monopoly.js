// ? Retrieving the player object from character select
const playerCharacter = JSON.parse(localStorage.getItem("Player"));

// ? Fields to modify [let these load in before loading any saved data]

const raisePrice = document.querySelector("#priceIncrease");
const lowerPrice = document.querySelector("#priceDecrease");
const priceField = document.querySelector("#priceAmount");
const createPaperclip = document.querySelector("#makeItemBtn");
const paperclipQTY = document.querySelector("#inventoryCount");
const materials = document.querySelector("#remainingRawMaterial");
const publicDemand = document.querySelector("#demand");
const funds = document.querySelector("#fundsAmount");
const cps = document.querySelector("#itemsRate");
const purchaseMaterials = document.querySelector("#purchaseMatsBTN");
const purchaseFactories = document.querySelector("#purchaseFactoryBTN");
const factoriesPrice = document.querySelector("#purchaseFactory");
const materialPrice = document.querySelector("#purchaseMats");
const factoryCount = document.querySelector("#factoryCount");
const sassyText = document.querySelector("#npcSpeech");

// ? Loading any saved data
LoadData();

// ? re-usable variables
let paperclipCPS = 0;

// ? Paperclip prices
const increaseValue = 0.01;
const decreaseValue = -0.01;
raisePrice.addEventListener("click", () => ModifyPrice(increaseValue));
lowerPrice.addEventListener("click", () => ModifyPrice(decreaseValue));

/**
 *
 * @param {number} priceMod - price augment / decrement value
 * Takes in a price adjustment and updates the new price visually
 * also updates demand as a consequence
 */
function ModifyPrice(priceMod) {
  const priceModification = parseFloat(priceField.textContent) + priceMod;
  let newPrice = extractDecimalAmount(priceModification);
  // if new price is not 0 then assign price
  if (!(newPrice <= 0)) {
    priceField.textContent = newPrice;
    UpdateDemand(newPrice);
  }
}

// ? Paperclip creation
const baseAddQTY = 1;
createPaperclip.addEventListener("click", () => addPaperClip(baseAddQTY));

/**
 *
 * @param {number} qtyToAdd - Base amount to add to paperclip count
 * Adds in passed-in value if we have enough materials
 * Also handles removing paperclips
 */
function addPaperClip(qtyToAdd) {
  //If we have enough materials
  if (parseInt(materials.textContent) >= 1) {
    paperclipQTY.textContent = parseInt(paperclipQTY.textContent) + qtyToAdd;

    // ! Only remove from materials if the added quantity was positive (i.e we aren't removing any paperclips)
    if (qtyToAdd > 0) {
      materials.textContent = parseInt(materials.textContent) - qtyToAdd;
      // also only count cps if we ADDED paperclips
      paperclipCPS += 1;
    }
  }
}

// ? Solving for demand

/**
 *
 * @param {number} currentPrice - price of paperclip
 * takes in price, does math and displays new demand
 */
function UpdateDemand(currentPrice) {
  const baseMarketingFactor = 2;
  const priceMultiplier = 4;
  // formula for demand
  let demand = Math.floor(
    (baseMarketingFactor / parseFloat(currentPrice)) * priceMultiplier
  );
  publicDemand.textContent = demand;
}

// ? Selling paperclips
/**
 *
 * @param {number} currentPrice - price of a paperclip
 * Add the amount of a paperclip to our funds and display result
 */
function paperclipSold(currentPrice) {
  // ! Use extractDecimalAmount twice to avoid having floating point errors
  funds.textContent = extractDecimalAmount(
    extractDecimalAmount(funds.textContent) + currentPrice
  );
}

// ? Buying factories
purchaseFactories.addEventListener("click", () =>
  BuyFactory(
    //Pass in our factory pricing and funds
    extractDecimalAmount(factoriesPrice.textContent),
    extractDecimalAmount(funds.textContent)
  )
);

/**
 *
 * @param {number} curFactoryPrice - The current factory price
 * @param {number} availableMoney - Our funds
 * Checks if we have enough money for a factory, buys one and then augments the price
 */
function BuyFactory(curFactoryPrice, availableMoney) {
  let factories = parseInt(factoryCount.textContent);
  const priceHike = 0.5;
  if (availableMoney >= curFactoryPrice) {
    factories += 1;
    factoryCount.textContent = factories;
    funds.textContent = availableMoney - curFactoryPrice;
    factoriesPrice.textContent =
      extractDecimalAmount(factoriesPrice.textContent) + priceHike;
  }
}

// ? Buying material
purchaseMaterials.addEventListener("click", () =>
  BuyMaterials(
    // Pass in our funds and the cost of material
    extractDecimalAmount(funds.textContent),
    extractDecimalAmount(materialPrice.textContent)
  )
);

/**
 *
 * @param {number} curFunds - Our Funds
 * @param {number} matCost - Cost for one batch of materials
 */
function BuyMaterials(curFunds, matCost) {
  const purchaseMatsBoost = 1000;
  const matsPriceHike = 1.25;
  //If we have the funds to purchase materials
  if (curFunds >= matCost) {
    // add mats to display, hike price and remove money from funds
    materials.textContent = parseInt(materials.textContent) + purchaseMatsBoost;
    funds.textContent = curFunds - matCost;
    materialPrice.textContent =
      extractDecimalAmount(materialPrice.textContent) + matsPriceHike;
  }
}

// ? Helper functions
/**
 *
 * @param {number} value - Value to extract to decimal
 * @returns number - The passed in value rounded to 2 decimal points
 */
function extractDecimalAmount(value) {
  return Math.round(parseFloat(value) * 100) / 100;
}

// ? gameplay loop timer
// * Execute this gameplay loop every 1 second
setInterval(function () {
  // ? selling paperclips according to demand
  let randomTickResult = extractDecimalAmount(Math.random());
  if (
    //if the random result is within demand and we have paperclips
    randomTickResult <= parseInt(publicDemand.textContent) / 100 &&
    parseInt(paperclipQTY.textContent) > 0
  ) {
    //Remove one paperclip from our inventory and sell at market price
    addPaperClip(-1);
    paperclipSold(extractDecimalAmount(priceField.textContent));
  }

  // ? Purchasing clips per factory

  // For every factory, make 1 paperclip
  for (let i = 0; i < parseInt(factoryCount.textContent); i++) {
    addPaperClip(1);
  }

  // ? Calculating CPS
  //Display our cps for this second, then reset counter for next
  cps.textContent = paperclipCPS;
  paperclipCPS = 0;

  // ? Auto-Save data every second
  SaveData();

  //  ? Sass me
  // Managing the sass of Papa Louie since 1987
  sassyText.textContent = SassCheck(
    parseInt(paperclipQTY.textContent),
    extractDecimalAmount(funds.textContent),
    parseInt(publicDemand.textContent)
  );
}, 1000);

// ! Only restore saved variables if we played the game for at least what can be considered 1 "tick"
localStorage.setItem("SaveActive", true);

// ? Sass check
function SassCheck(clipsTotal, money, demand) {
  if (money > 1000) {
    return "Ok fine you win or whatever";
  }

  if (money < 5) {
    return "broke lol";
  }

  if (demand >= 100) {
    return "Woah look at Mr Popular over here";
  }

  if (demand <= 30) {
    return "Nobody wants u loser";
  }

  if (clipsTotal < 10) {
    return "Click Harder";
  }

  if (clipsTotal > 50) {
    return "Stop clicking so fast";
  }

  return "You are SO mediocre its crazy";
}

// ? Saving / Loading
function SaveData() {
  localStorage.setItem("money", extractDecimalAmount(funds.textContent));
  localStorage.setItem("mats", parseInt(materials.textContent));
  localStorage.setItem("factories", parseInt(factoryCount.textContent));
  localStorage.setItem("clipInventory", parseInt(paperclipQTY.textContent));
  localStorage.setItem("demand", parseInt(publicDemand.textContent));
  localStorage.setItem(
    "itemPrice",
    extractDecimalAmount(priceField.textContent)
  );
  localStorage.setItem(
    "matsPrice",
    extractDecimalAmount(materialPrice.textContent)
  );
  localStorage.setItem(
    "factoriesPrice",
    extractDecimalAmount(factoriesPrice.textContent)
  );
}

function LoadData() {
  const playerImg = document.querySelector("#playerAvatar");
  playerImg.src = `${playerCharacter.imageSource}`;

  const playerName = document.querySelector("#playerName");
  playerName.textContent = playerCharacter.playerName;

  const playerStats = document.querySelector("#playerStats");
  playerStats.textContent = `DEFENSE: ${playerCharacter.stats.DEF}\nRESLIENCE: ${playerCharacter.stats.RES}\nEXHAUSTION: ${playerCharacter.stats.EXH}`;

  //! Only load the rest of the data if we had any actively saved data
  if (JSON.parse(localStorage.getItem("SaveActive")) !== true) {
    return;
  }

  funds.textContent = JSON.parse(localStorage.getItem("money"));
  materials.textContent = JSON.parse(localStorage.getItem("mats"));
  factoryCount.textContent = JSON.parse(localStorage.getItem("factories"));
  paperclipQTY.textContent = JSON.parse(localStorage.getItem("clipInventory"));
  publicDemand.textContent = JSON.parse(localStorage.getItem("demand"));
  priceField.textContent = JSON.parse(localStorage.getItem("itemPrice"));
  materialPrice.textContent = JSON.parse(localStorage.getItem("matsPrice"));
  factoriesPrice.textContent = JSON.parse(
    localStorage.getItem("factoriesPrice")
  );
}
