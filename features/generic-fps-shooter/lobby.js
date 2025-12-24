const modal = document.getElementById("controls-modal");
const btn = document.getElementById("controls-btn");
const close = document.getElementsByClassName("close-btn")[0];

btn.onclick = function () {
  modal.style.display = "flex";
};

close.onclick = function () {
  modal.style.display = "none";
};

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};
