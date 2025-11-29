const curChar = JSON.parse(localStorage.getItem("Player"));
$("#char-name").text(curChar.playerName);
$(".id-card-img").attr("src", curChar.imageSource);
// console.log(charName);
// console.log(curChar);
