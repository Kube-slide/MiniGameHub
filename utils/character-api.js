export async function getAPIPlayers(name) {
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
