import { PLAYER_1 } from "../../constants/player.js";
import { PLAYER_2 } from "../../constants/player.js";
import { PLAYER_3 } from "../../constants/player.js";
import { PLAYER_4 } from "../../constants/player.js";
import { PLAYER_5 } from "../../constants/player.js";
import { PLAYER_6 } from "../../constants/player.js";
import { getAPIPlayers } from "../../services/character-api.js";

const players = [PLAYER_1, PLAYER_2, PLAYER_3, PLAYER_4, PLAYER_5, PLAYER_6];
const APICharacters = await getAPIPlayers();

const formSubmission = document.querySelector("#submit-form");
const playerField = document.querySelector("#player");
formSubmission.addEventListener("submit", (event) => {
  if (playerField.value === "none") {
    alert("Please select a character!");
    event.preventDefault();
  }

  localStorage.setItem("Player", playerField.value);
});

window.addEventListener("myCustomSignal", (e) => {
  // alert(`Signal received: ${e.detail.name}`);

  // ? Is the player in our default pre-made players?
  players.forEach((player) => {
    if (player.playerName === e.detail.name) {
      playerField.value = JSON.stringify(player);
      return;
    }
  });

  // ? Is he in the api players?
  APICharacters.forEach((player) => {
    if (player.playerName === e.detail.name) {
      playerField.value = JSON.stringify(player);
      return;
    }
  });
});
