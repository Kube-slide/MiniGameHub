// players.js
export const PLAYER_1 = {
  playerName: "Pyramid",
  playerID: "1",
  totalScore: 0,
  totalHealth: 100,
  lat: 20,
  lon: 0,
  stats: {
    RES: 1,
    EXH: 1,
    DEF: 1,
  },
  imageSource: "../../assets/player1.png",
  UpdateScore(addedScore) {
    this.totalScore += addedScore;
    return this.totalScore;
  },
  LoseHealth(incomingAttack) {
    this.totalHealth -=
      incomingAttack * this.stats.EXH - this.stats.DEF / this.stats.RES;
  },
  GainHealth(healAmount) {
    this.totalHealth += (healAmount / this.stats.EXH) * this.stats.RES;
  },
};
export const PLAYER_2 = {
  playerName: "Tesseract",
  playerID: "2",
  totalScore: 0,
  totalHealth: 100,
  lat: -10,
  lon: 72,
  stats: {
    RES: 1,
    EXH: 1,
    DEF: 1,
  },
  imageSource: "../../assets/player2.jpg",
  UpdateScore(addedScore) {
    this.totalScore += addedScore;
    return this.totalScore;
  },
  LoseHealth(incomingAttack) {
    this.totalHealth -=
      incomingAttack * this.stats.EXH - this.stats.DEF / this.stats.RES;
  },
  GainHealth(healAmount) {
    this.totalHealth += (healAmount / this.stats.EXH) * this.stats.RES;
  },
};

export const PLAYER_3 = {
  playerName: "Wolverine",
  playerID: "3",
  totalScore: 16,
  totalHealth: 100,
  lat: 35,
  lon: 144,
  imageSource:
    "https://static.wikia.nocookie.net/marvelvscapcom/images/b/be/Wolverine_Sprite.gif",
  stats: { RES: 5, EXH: 10, DEF: 4 },
};

export const PLAYER_4 = {
  playerName: "Spider-Man",
  playerID: "4",
  totalScore: 16,
  totalHealth: 100,
  lat: -25,
  lon: 216,
  imageSource: "https://clipart-library.com/img1/973061.gif",
  stats: { RES: 8, EXH: 9, DEF: 7 },
};

export const PLAYER_5 = {
  playerName: "Jill",
  playerID: "5",
  totalScore: 16,
  totalHealth: 100,
  lat: 5,
  lon: 300,
  imageSource:
    "https://static.wikia.nocookie.net/residentevil/images/8/8a/MVC2_Jill_Stance.gif",
  stats: { RES: 6, EXH: 7, DEF: 6 },
};

export const PLAYER_6 = {
  playerName: "Ryu",
  playerID: "6",
  totalScore: 16,
  totalHealth: 100,
  lat: -10,
  lon: 150,
  imageSource:
    "https://media.invisioncic.com/z328913/monthly_2024_10/Rayu.thumb.gif.996b2306ce5c2fff21212e4eff65a8ba.gif",
  stats: { RES: 12, EXH: 20, DEF: 8 },
};
