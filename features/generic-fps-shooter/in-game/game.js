//* Resources used:
//* Rapier official js documentation:   https://rapier.rs/docs/user_guides/javascript/character_controller
//* Threejs official documentation:     https://threejs.org/manual/
//* SimonDev's fps camera tutorial:     https://www.youtube.com/watch?v=oqKzxPMLWxo
//* Basic syncing physics + mesh:       https://sbcode.net/threejs/physics-rapier/

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import RAPIER from "@dimforge/rapier3d-compat";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

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

const light = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 1);
scene.add(light);

const Skylight = new THREE.DirectionalLight(0xffffff, 1);
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
const texture = loader.load([
  "./assets/px.png",
  "./assets/nx.png",
  "./assets/py.png",
  "./assets/ny.png",
  "./assets/pz.png",
  "./assets/nz.png",
]);
scene.background = texture;

//? Enable stats for debugging
const stats = new Stats();
document.body.appendChild(stats.dom);

//? Create the floor
const floorMesh = new THREE.Mesh(
  new THREE.BoxGeometry(100, 1, 100),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
floorMesh.position.y = -1;
floorMesh.receiveShadow = true;
scene.add(floorMesh);
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
scene.add(playerMesh);
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
const BOB_SPEED = 10;
const BOB_AMOUNT = 0.05;

function animate() {
  requestAnimationFrame(animate);

  const rotation = new THREE.Euler(0, 0, 0, "YXZ");

  delta = clock.getDelta();
  world.timestep = Math.min(delta, 0.1);
  world.step();

  let moveDir = new THREE.Vector3(keys.d - keys.a, 0, keys.s - keys.w);

  rotation.setFromQuaternion(camera.quaternion);
  rotation.x = 0; // Lock rotation to the Y axis for movement
  moveDir.applyEuler(rotation);

  moveDir.normalize().multiplyScalar(delta * speed);

  characterController.computeColliderMovement(
    playerCollision.collider(0), // Ensure you pass the collider, not the body
    moveDir
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
  renderer.render(scene, camera);

  stats.update();
}

animate();
