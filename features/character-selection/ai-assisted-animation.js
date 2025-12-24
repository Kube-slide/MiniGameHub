import { PLAYER_1, PLAYER_4 } from "../../constants/player.js";
import { PLAYER_2 } from "../../constants/player.js";
import { PLAYER_3 } from "../../constants/player.js";
import { PLAYER_5 } from "../../constants/player.js";
import { PLAYER_6 } from "../../constants/player.js";
import { getAPIPlayers } from "../../services/character-api.js";

const PLAYERS = [PLAYER_1, PLAYER_2, PLAYER_3, PLAYER_4, PLAYER_5, PLAYER_6];
const APICharacters = await getAPIPlayers();

function RemoveIcon(name) {
  const refIndex = iconRefs.findIndex(
    (ref) => ref.el.getAttribute("aria-label") === name
  );
  if (refIndex !== -1) {
    const ref = iconRefs[refIndex];
    ref.el.remove(); // Remove from DOM
    iconRefs.splice(refIndex, 1); // Remove from animation list
  }
}

function ClearSelection() {
  const slotEl = document.getElementById("slot");
  const portraitEl = document.getElementById("portrait");
  const statsEl = document.getElementById("stats");
  // Clear content fields
  slotEl.textContent = "---";
  portraitEl.src = "";

  statsEl.innerHTML = "";

  const selectedIconEl = document.getElementById("selected-icon");
  selectedIconEl.style.backgroundImage = "";
}

const sphere = document.getElementById("sphere");
const radius = parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue("--radius")
);
const tiltDeg = parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue("--tilt")
);

const iconRefs = [];

const slotEl = document.getElementById("slot");
const portraitEl = document.getElementById("portrait-img");
const statsEl = document.getElementById("stats");

function createIcon({ playerName, lat, lon, imageSource, stats, age }) {
  const el = document.createElement("button");
  el.className = "icon";
  el.type = "button";
  el.setAttribute("aria-label", playerName);

  el.addEventListener("click", () => {
    document
      .querySelectorAll(".icon.selected")
      .forEach((i) => i.classList.remove("selected"));
    el.classList.add("selected");

    slotEl.textContent = playerName;
    portraitEl.src = imageSource;

    statsEl.innerHTML = Object.entries(stats)
      .map(([key, val]) => `<div><span>${key}</span><span>${val}</span></div>`)
      .join("");

    const selectedIconEl = document.getElementById("selected-icon-img");
    selectedIconEl.src = imageSource;

    // Create and dispatch a custom event with  data
    const player = { name: playerName };
    const signalEvent = new CustomEvent("myCustomSignal", {
      detail: player,
    });

    window.dispatchEvent(signalEvent); // Send signal globally
  });

  el.style.transform = `rotateY(${lon}deg) rotateX(${-lat}deg) translateZ(${radius}px)`;

  const billboard = document.createElement("div");
  billboard.className = "billboard";

  const faceFront = document.createElement("div");
  faceFront.className = "face front";
  faceFront.textContent = playerName;

  const faceBack = document.createElement("div");
  faceBack.className = "face back";
  faceBack.textContent = playerName;

  billboard.appendChild(faceFront);
  billboard.appendChild(faceBack);
  el.appendChild(billboard);

  iconRefs.push({ billboardEl: billboard, lat, lon, el, currentAngle: 0 });
  return el;
}

function renderCharacter(char) {
  return `<button
  class="icon"
  type="button"
  aria-label="${char.playerName}"
  style="transform: rotateY(300deg) rotateX(-5deg) translateZ(240px); opacity: 0.5;"
>
  <div
    class="billboard"
    style="transform: rotateY(-308.683deg) rotateX(-12deg);"
  >
    <div class="face front">${char.playerName}</div>
    <div class="face back">${char.playerName}</div>
  </div>
</button>;`;
}

function renderPage(char) {
  const player = $("<button>").html(renderCharacter(char));
  $("#sphere").append(player);
}

// Generate icons
PLAYERS.forEach((char) => {
  sphere.appendChild(createIcon(char));
  // renderPage(char);
});

const imageInput = document.getElementById("custom-image");
const imagePreview = document.getElementById("image-preview-img");

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = `${e.target.result}`;
    };
    reader.readAsDataURL(file);
  } else {
    imagePreview.src = "";
  }
});

function getSafePosition(
  existing,
  iconSizePx = 64,
  sphereRadiusPx = 240,
  marginFactor = 2,
  poleBufferDeg = 20
) {
  let lat, lon, safe;

  // Angular size of icon → minimum spacing
  const angularSizeRad = iconSizePx / sphereRadiusPx;
  const minDistanceDeg = ((angularSizeRad * 180) / Math.PI) * marginFactor;

  do {
    lon = Math.random() * 360;

    // Cosine distribution for even coverage, but avoid poles
    const u =
      Math.random() *
        (Math.sin(((90 - poleBufferDeg) * Math.PI) / 180) -
          Math.sin(((-90 + poleBufferDeg) * Math.PI) / 180)) +
      Math.sin(((-90 + poleBufferDeg) * Math.PI) / 180);
    lat = Math.asin(u) * (180 / Math.PI);

    safe = existing.every((c) => {
      const lat1 = (c.lat * Math.PI) / 180;
      const lon1 = (c.lon * Math.PI) / 180;
      const lat2 = (lat * Math.PI) / 180;
      const lon2 = (lon * Math.PI) / 180;

      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      const cAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distanceDeg = (cAngle * 180) / Math.PI;
      return distanceDeg >= minDistanceDeg;
    });
  } while (!safe);

  return { lat, lon };
}

const createBtn = document.getElementById("create-character");
// const imageInput = document.getElementById("custom-image");
const nameInput = document.getElementById("custom-name");
const ageInput = document.getElementById("custom-age");
const resilienceInput = document.getElementById("custom-resilience");
const exhaustionInput = document.getElementById("custom-exhaustion");
const defenseInput = document.getElementById("custom-defense");

createBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  const age = ageInput.value.trim();
  const res = resilienceInput.value.trim();
  const exh = exhaustionInput.value.trim();
  const def = defenseInput.value.trim();
  const file = imageInput.files[0];

  // Validation checks
  if (name.length <= 3) {
    return alert("Name must be longer than 3 characters.");
  }

  if (!age || !res || !exh || !def) {
    return alert("Please fill in age and all stat fields.");
  }

  if (age < 16) {
    return alert("Create an older character!");
  }

  if (!file) {
    return alert("Please upload an image for your character.");
  }

  const existingPositions = iconRefs.map((ref) => ({
    lat: ref.lat,
    lon: ref.lon,
  }));
  const { lat, lon } = getSafePosition(existingPositions);

  const stats = { RES: parseInt(res), EXH: parseInt(exh), DEF: parseInt(def) };

  const addCharacter = (portrait) => {
    const newChar = { name, lat, lon, portrait, stats, age };
    const icon = createIcon(newChar);
    sphere.appendChild(icon);
  };

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    addCharacter(e.target.result);
  };
  reader.readAsDataURL(file);
});

const existingPositions = iconRefs.map((ref) => ({
  lat: ref.lat,
  lon: ref.lon,
}));

APICharacters.forEach((char) => {
  const { lat, lon } = getSafePosition(existingPositions);
  char.lat = lat;
  char.lon = lon;
  sphere.appendChild(createIcon(char));
});

// Animate rotation
let last = performance.now();
let angle = 0;
const degPerMs = 360 / 18000;

function tick(now) {
  const dt = now - last;
  last = now;
  angle = (angle + degPerMs * dt) % 360;

  sphere.style.transform = `rotateY(${angle}deg) rotateX(${tiltDeg}deg)`;

  iconRefs.forEach((ref) => {
    const targetAngle = -angle;
    const diff = targetAngle - ref.currentAngle;
    ref.currentAngle += diff * 0.1;

    ref.billboardEl.style.transform = `rotateY(${
      ref.currentAngle
    }deg) rotateX(${-tiltDeg}deg)`;

    const relativeAngle = (angle + ref.lon) % 360;
    ref.el.style.opacity = relativeAngle > 90 && relativeAngle < 270 ? 0.5 : 1;
  });

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
