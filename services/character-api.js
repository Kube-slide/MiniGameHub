/**
 *Retrieves a list of characters from the valorant API and matches their data to that of 
 the standard format of player characters in Character-selection
 * 
 * @returns an array containing the properly mapped and formatted API characters
 */
export async function getAPIPlayers() {
  try {
    const response = await fetch(
      "https://valorant-api.com/v1/agents?isPlayableCharacter=true"
    );
    const values = await response.json();
    const data = values.data;
    const formattedData = data.map((player) => fixPlayer(player));
    return formattedData;
  } catch (error) {
    console.error(error.message);
  }
}

/**
 *  A helper function which intakes an object and formats it in order to create a new object,
 * following the template of character-selection's characters
 * @param {player object to adjust values} player
 * @returns Player with appropriate object data values
 */
function fixPlayer(player) {
  return {
    playerName: player.displayName,
    totalScore: 0,
    totalHealth: 100,
    lat: -25,
    lon: 216,
    imageSource: player.fullPortraitV2,
    stats: {
      RES: player.developerName.length / 2,
      EXH: player.developerName.length % 4,
      DEF: (player.developerName.length * 3) / 2,
    },
  };
}
