//* Resources used:
//* Rapier official js documentation:   https://rapier.rs/docs/user_guides/javascript/character_controller
//* Threejs official documentation:     https://threejs.org/manual/
//* SimonDev's fps camera tutorial:     https://www.youtube.com/watch?v=oqKzxPMLWxo
//* Basic syncing physics + mesh:       https://sbcode.net/threejs/physics-rapier/

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import RAPIER from "@dimforge/rapier3d-compat";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import weaponTex from "./assets/weapon.png";
import floorTex from "./assets/floorCheck.png";
import flashTex from "./assets/flash.png";
import skynx from "./assets/nx.png";
import skypx from "./assets/px.png";
import skyny from "./assets/ny.png";
import skypy from "./assets/py.png";
import skynz from "./assets/nz.png";
import skypz from "./assets/pz.png";
//Wait for Rapier to compile
await RAPIER.init();

//? physics init
const gravity = new RAPIER.Vector3(0, -9.81, 0);
const world = new RAPIER.World(gravity);

//? Threejs init
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 2, 5);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

//! Allows dynamic resizing of window
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const light = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 2);
scene.add(light);

const Skylight = new THREE.DirectionalLight(0xffffff, 2);
Skylight.position.set(10, 20, 10);
Skylight.target.position.set(0, 0, -10);
Skylight.castShadow = true;
Skylight.shadow.mapSize.width = 512;
Skylight.shadow.mapSize.height = 512;
Skylight.shadow.camera.left = -50;
Skylight.shadow.camera.right = 50;
Skylight.shadow.camera.top = 50;
Skylight.shadow.camera.bottom = -50;
Skylight.shadow.camera.near = 0.5;
Skylight.shadow.camera.far = 500;
scene.add(Skylight);
scene.add(Skylight.target);

//? Create the bg
const loader = new THREE.CubeTextureLoader();
const texture = loader.load([skypx, skynx, skypy, skyny, skypz, skynz]);
scene.background = texture;

//? Enable stats for debugging
const stats = new Stats();
document.body.appendChild(stats.dom);

//? Create the floor
const textLoad = new THREE.TextureLoader();
const floorTexture = textLoad.load("./assets/floorCheck.png");
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.magFilter = THREE.NearestFilter;
floorTexture.colorSpace = THREE.SRGBColorSpace;
const repeats = 50 / 2;
floorTexture.repeat.set(repeats, repeats);
const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshPhongMaterial({
    // color: 0x00ff00,
    map: floorTexture,
    side: THREE.DoubleSide,
  })
);
floorMesh.rotation.x = -Math.PI / 2; // Rotate to lay flat
floorMesh.position.y = -1;
floorMesh.receiveShadow = true;
scene.add(floorMesh);
// scene.background = new THREE.Color(0x88ccee);
scene.fog = new THREE.Fog(0x000000, 0, 100);

const floorBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0)
);
const floorShape = RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
world.createCollider(floorShape, floorBody);

//? Create the player
const playerMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(1, 3, 5),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
playerMesh.castShadow = true;
playerMesh.position.set(0, 2, -5);

const playerCollision = world.createRigidBody(
  RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 2, -5)
);
const playerShape = RAPIER.ColliderDesc.capsule(1.5, 1);
world.createCollider(playerShape, playerCollision);
let characterController = world.createCharacterController(0.1);

const clock = new THREE.Clock();
let delta;

const keys = {
  w: 0,
  a: 0,
  s: 0,
  d: 0,
  " ": 0,
  shift: 0,
  escape: 0,
};

const speed = 10;

const controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = 0.5;
// Click to lock the mouse and start playing
document.addEventListener("click", () => {
  controls.lock();
});

// Listen for key presses
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) keys[key] = 1;
});

// Listen for key releases
window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) keys[key] = 0;
});

let bobTimer = 0;
let yVel = 0;
const BOB_SPEED = 10;
const BOB_AMOUNT = 0.05;
// let moveDir = new THREE.Vector3();

const pauseMenu = document.getElementById("pause-menu");
const resumeBtn = document.getElementById("resume-btn");
const quitBtn = document.getElementById("quit-btn");

// When the player locks the mouse (starts playing)
controls.addEventListener("lock", () => {
  pauseMenu.style.display = "none";
});

// When the player unlocks the mouse (presses ESC or loses focus)
controls.addEventListener("unlock", () => {
  pauseMenu.style.display = "flex";
});

// Button Logic
resumeBtn.addEventListener("click", () => {
  controls.lock(); // This will automatically trigger the 'lock' event above
});

quitBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to quit?")) {
    window.location.href = `../lobby.html`;
  }
});

// 1. Load Muzzle Flash Texture
const flashMap = new THREE.TextureLoader().load("./assets/flash.png");
const flashMaterial = new THREE.SpriteMaterial({
  map: flashMap,
  transparent: true,
  depthTest: false, // Same as gun to prevent wall clipping
});

const flashSprite = new THREE.Sprite(flashMaterial);

// 2. Position it SLIGHTLY further away than the gun (e.g., -0.9 instead of -0.8)
// And offset it to align with the barrel
flashSprite.position.set(0.8, -0.25, -1.8);
flashSprite.scale.set(0.5, 0.5, 1);
flashSprite.visible = false; // Hidden by default

// 3. Add a light effect
const flashLight = new THREE.PointLight(0xffaa00, 0, 10);
flashSprite.add(flashLight);

// 4. IMPORTANT: RENDER ORDER
// Lower number = Renders first (Behind)
// Higher number = Renders last (On Top)
flashSprite.renderOrder = 0;

camera.add(flashSprite);

const map = new THREE.TextureLoader().load(weaponTex);
const material = new THREE.SpriteMaterial({ map: map });
const sprite = new THREE.Sprite(material);
sprite.renderOrder = 1;
camera.add(sprite);
sprite.position.set(0.75, 1, -1);
scene.add(camera);

window.addEventListener("mousedown", (event) => {
  // Only fire if the game is active (mouse locked) and it's a left-click (button 0)
  if (controls.isLocked && event.button === 0) {
    fireWeapon();
  }
});

function fireWeapon() {
  // 1. Show flash and light
  flashSprite.visible = true;
  flashLight.intensity = 20;

  // 2. Randomize rotation so the flash looks different every shot
  flashSprite.material.rotation = Math.random() * Math.PI;

  // 3. Optional: Add a tiny "recoil" to the gun sprite
  sprite.position.z += 0.05;

  // 4. Hide it after a tiny delay
  setTimeout(() => {
    flashSprite.visible = false;
    flashLight.intensity = 0;
    sprite.position.z -= 0.05; // Return gun from recoil
  }, 50);
}

function animate() {
  const rotation = new THREE.Euler(0, 0, 0, "YXZ");

  requestAnimationFrame(animate);

  delta = clock.getDelta();
  world.timestep = Math.min(delta, 0.1);
  world.step();

  const moveDir = new THREE.Vector3(keys.d - keys.a, 0, keys.s - keys.w);

  rotation.setFromQuaternion(camera.quaternion);
  rotation.x = 0; // Lock rotation to the Y axis for movement
  moveDir.applyEuler(rotation);
  moveDir.normalize().multiplyScalar(delta * speed);
  if (characterController.computedGrounded()) {
    // We are on the floor.
    if (keys[" "] === 1) {
      yVel = 15;
    } else {
      yVel = -0.5;
    }
  } else {
    yVel -= 25 * delta;
  }

  const finalMove = new THREE.Vector3(moveDir.x, yVel * delta, moveDir.z);

  characterController.computeColliderMovement(
    playerCollision.collider(0), // Ensure you pass the collider, not the body
    finalMove
  );

  // 2. Get the relative movement result
  const movement = characterController.computedMovement();

  // 3. Get current absolute position
  const currentPos = playerCollision.translation();

  // 4. ADD them together to get the NEXT absolute position
  playerCollision.setNextKinematicTranslation({
    x: currentPos.x + movement.x,
    y: currentPos.y + movement.y,
    z: currentPos.z + movement.z,
  });

  const t = playerCollision.translation();
  // 2. Apply it to the Three.js Mesh
  playerMesh.position.set(t.x, t.y, t.z);

  // 3. Get the rotation (quaternion) from Rapier
  const r = playerCollision.rotation();
  // 4. Apply it to the Three.js Mesh
  playerMesh.quaternion.set(r.x, r.y, r.z, r.w);
  const camPos = new THREE.Vector3(
    playerMesh.position + new THREE.Vector3(0, 2, 0)
  );

  bobTimer += delta * BOB_SPEED;

  // 2. Calculate the bob offset
  // We use Math.sin(bobTimer) for the up/down motion
  const bobOffset = Math.sin(bobTimer) * BOB_AMOUNT;

  // SimonDev's trick: The camera height is (Base Height) + (Bob Offset)
  const baseHeight = 0.8; // Your standard eye-level
  camera.position.set(t.x, t.y + baseHeight + bobOffset, t.z);
  const weaponBobX = Math.cos(bobTimer * 0.5) * 0.02; // Side to side
  const weaponBobY = Math.sin(bobTimer) * 0.02; // Up and down

  // 0.75 and -0.5 are your original offset values
  sprite.position.x = 0.75 + weaponBobX;
  sprite.position.y = -0.35 + weaponBobY;
  renderer.render(scene, camera);

  stats.update();
}

animate();
