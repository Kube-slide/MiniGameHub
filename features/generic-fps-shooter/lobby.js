// Simple Modal Logic
const modal = document.getElementById("controls-modal");
const btn = document.getElementById("controls-btn");
const close = document.getElementsByClassName("close-btn")[0];

// Open
btn.onclick = function () {
  modal.style.display = "flex";
};

// Close with X
close.onclick = function () {
  modal.style.display = "none";
};

// Close by clicking outside
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};
