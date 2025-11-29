//* Import our basic players from the player.js file at the root of the project
import { PLAYER_1 } from "../../constants/player.js";
import { PLAYER_2 } from "../../constants/player.js";

/**
 *
 * @param {object} player
 *
 * Takes in a player and increases their score [cookie count] by a set amount
 */
function bake(player) {
  //declare const for how much our score increases per click & update the player's score
  const scoreIncrease = 1;
  player.UpdateScore(scoreIncrease);
}

/**
 *
 * @param {object} player
 *
 * Takes in a player and makes him take damage. Only gets damaged if HP is above 0
 */
function smack(player) {
  // Declare const damage to avoid magic numbers. This will be the damaged recieved by the player
  const damage = 10;
  // * Only apply damage if player still has health
  if (player.totalHealth > 0) {
    player.LoseHealth(damage);
  }
}

/**
 *
 * @param {object} player
 *
 * Takes in a player and heals him, at the cost of some of his score.
 * Only heals if player has lost HP or if he has cookies
 */
function consume(player) {
  //Declare a constant to avoid magic numbers. This will be how many cookies to heal
  const healCost = 1;

  // * Make sure the player can/is allowed to heal before healing & affecting score
  if (player.totalHealth < 100 && player.totalScore > 0) {
    player.GainHealth(healCost);
    player.UpdateScore(-healCost);
  }
}

/**
 *
 * @param {object} player
 *
 * Takes in a player and updates his stats [Cookie count and HP]
 */
function displayStats(player) {
  // ! Would be way better to update both players at once but this works fine

  // Get our current player using a nifty ternary
  const curPlayer =
    player == PLAYER_1
      ? document.querySelector("#player1")
      : document.querySelector("#player2");

  //Get the player's cookie count and set his score to the player's score
  const playerCookies = curPlayer.querySelector(".cookie-count");
  playerCookies.textContent = "TOTAL COOKIES: " + player.totalScore;

  //Repeat for health to show changes in real time
  const playerHealth = curPlayer.querySelector(".green");
  playerHealth.style.width = `${player.totalHealth}%`;

  //After updating stats, check if we have a winner
  checkForWin();
}

/**
 * checks several conditions to see if we have a winning player. Returns void
 */
function checkForWin() {
  //Check if one of the players is dead
  let healthWinCondition =
    PLAYER_1.totalHealth <= 0 || PLAYER_2.totalHealth <= 0;
  // Check if player 1 has 3x player two's score.
  //! Make sure scores are not 0
  let scoreWinConditionP1 =
    PLAYER_1.totalScore / 3 > PLAYER_2.totalScore &&
    PLAYER_1.totalScore > 0 &&
    PLAYER_2.totalScore > 0;

  //Same idea but for player 2
  let scoreWinConditionP2 =
    PLAYER_2.totalScore / 3 > PLAYER_1.totalScore &&
    PLAYER_1.totalScore > 0 &&
    PLAYER_2.totalScore > 0;

  //Get the hidden win panel from the index.html
  const winPanel = document.querySelector("#winner-panel");
  const winPanelClasses = winPanel.classList;
  const winnerText = winPanel.querySelector(".winner-text");

  //* Check if any win conditions are true
  if (healthWinCondition || scoreWinConditionP1 || scoreWinConditionP2) {
    //If one player has no HP
    if (healthWinCondition) {
      //Check which player has HP left and change winner accordingly
      winnerText.textContent =
        PLAYER_1.totalHealth > 0 ? "Player 1 wins!" : "Player 2 wins!";
    }
    //Check if player one won by score
    else if (scoreWinConditionP1) {
      winnerText.textContent = "Player 1 wins!";
    }
    //Otherwise, player two won by score
    else {
      winnerText.textContent = "Player 2 wins!";
    }

    //* Unhide the winner panel
    winPanelClasses.remove("hidden");
  }
}

//Grab our two players from the index.html
const playerOne = document.querySelector("#player1");
const playerTwo = document.querySelector("#player2");

//Grab all the buttons of each player
//! store in seperate variables to be able to know who pressed what
const playerOneButtons = playerOne.querySelectorAll("button");
const playerTwoButtons = playerTwo.querySelectorAll("button");

//* Add an event listener to each button for player one. Do the corresponding action via a switch statement
playerOneButtons.forEach((option) =>
  option.addEventListener("click", () => {
    switch (option.textContent) {
      //* Always update stats after any action
      case "Bake 🍪":
        bake(PLAYER_1);
        displayStats(PLAYER_1);
        break;
      case "Smack 🤚":
        //! Smack targets the ENEMY player, so we tell the game to smack player two and update THEIR health
        smack(PLAYER_2);
        displayStats(PLAYER_2);
        break;
      case "Consume 🍴":
        consume(PLAYER_1);
        displayStats(PLAYER_1);
        break;
      default:
        break;
    }
  })
);

//* Add an event listener to each button for player two. Do the corresponding action via a switch statement
playerTwoButtons.forEach((option) =>
  option.addEventListener("click", () => {
    switch (option.textContent) {
      //* Always update stats after any action
      case "Bake 🍪":
        bake(PLAYER_2);
        displayStats(PLAYER_2);
        break;
      case "Smack 🤚":
        //! Smack targets the ENEMY player, so we tell the game to smack player one and update THEIR health
        smack(PLAYER_1);
        displayStats(PLAYER_1);
        break;
      case "Consume 🍴":
        consume(PLAYER_2);
        displayStats(PLAYER_2);
        break;
      default:
        break;
    }
  })
);

//Get the win panel's retry button
const winRetry = document.querySelector("#close-winner-btn");
// Refresh the game page if the retry button is pressed
winRetry.addEventListener("click", () => location.reload());
