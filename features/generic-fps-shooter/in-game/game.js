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
import enemyTex from "./assets/enemy.png";
// import { Peer } from "peerjs";
//Wait for Rapier to compile
await RAPIER.init();

import { Peer } from "peerjs";

const peer = new Peer();
let conn = null;
const remotePlayers = {}; // Stores { mesh, targetPos }

// 1. Setup UI References
const myIdDisplay = document.getElementById("my-peer-id");
const friendInput = document.getElementById("friend-id-input");
const connectBtn = document.getElementById("connect-btn");

// 2. Handle Peer Events
peer.on("open", (id) => {
  myIdDisplay.innerText = id;
});

// Host: Listen for someone connecting to YOU
peer.on("connection", (connection) => {
  conn = connection;
  setupDataListeners();
  console.log("Connected to: " + connection.peer);
});

// Client: Connect to a friend
connectBtn.addEventListener("click", () => {
  const friendId = friendInput.value;
  if (friendId) {
    conn = peer.connect(friendId);
    setupDataListeners();
  }
});

function setupDataListeners() {
  conn.on("data", (data) => {
    if (data.type === "move") {
      updateRemotePlayer(conn.peer, data);
    }
  });
}

function updateRemotePlayer(id, data) {
  if (!remotePlayers[id]) {
    // Create visual for the other player
    const playerTex = new THREE.TextureLoader().load(weaponTex);
    const mat = new THREE.SpriteMaterial({ map: playerTex, color: 0x00ff00 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 2, 1);
    scene.add(sprite);

    remotePlayers[id] = {
      mesh: sprite,
      targetPos: new THREE.Vector3(data.x, data.y, data.z),
    };
  } else {
    // Update destination
    remotePlayers[id].targetPos.set(data.x, data.y, data.z);
  }
}

//? physics init
const gravity = new RAPIER.Vector3(0, -9.81, 0);
const world = new RAPIER.World(gravity);
const eventQueue = new RAPIER.EventQueue(true);
const sceneObjects = [];
const projectiles = [];
const enemies = [];

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

let playerCollision;
let sprite;
let flashSprite;
let characterController = world.createCharacterController(0.1);
await LoadScene();

async function LoadScene() {
  //? Create lights
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

  //? Create the floor
  const textLoad = new THREE.TextureLoader();
  const floorTexture = textLoad.load(floorTex);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.magFilter = THREE.NearestFilter;
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  const repeats = 50 / 2;
  floorTexture.repeat.set(repeats, repeats);
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshPhongMaterial({
      map: floorTexture,
      side: THREE.DoubleSide,
    })
  );
  floorMesh.rotation.x = -Math.PI / 2; // Rotate to lay flat
  floorMesh.position.y = -1;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const floorBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0)
  );
  const floorShape = RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
  world.createCollider(floorShape, floorBody);

  scene.fog = new THREE.Fog(0x000000, 0, 100);

  //? Create the player
  const playerMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(1, 3, 5),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  playerMesh.castShadow = true;
  playerMesh.position.set(0, 2, -5);

  playerCollision = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 2, -5)
  );
  playerCollision.setAdditionalMass(1000);
  const playerShape = RAPIER.ColliderDesc.capsule(1.5, 1);
  world.createCollider(playerShape, playerCollision);
  sceneObjects.push([playerMesh, playerCollision]);

  const flashMap = new THREE.TextureLoader().load(flashTex);
  const flashMaterial = new THREE.SpriteMaterial({
    map: flashMap,
    transparent: true,
    depthTest: false,
  });
  flashSprite = new THREE.Sprite(flashMaterial);
  flashSprite.position.set(0.8, -0.25, -1.8);
  flashSprite.scale.set(0.5, 0.5, 1);
  flashSprite.visible = false;
  flashSprite.renderOrder = 0;
  camera.add(flashSprite);

  const map = new THREE.TextureLoader().load(weaponTex);
  const material = new THREE.SpriteMaterial({ map: map });
  sprite = new THREE.Sprite(material);
  sprite.renderOrder = 1;
  camera.add(sprite);
  sprite.position.set(0.75, 1, -1);
  scene.add(camera);
}

//? Enable stats for debugging
const stats = new Stats();
document.body.appendChild(stats.dom);

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

document.addEventListener("click", () => {
  controls.lock();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) keys[key] = 1;
});

setInterval(() => {
  // Only spawn if the game is active (optional check)
  if (controls.isLocked) {
    spawnEnemy();
    console.log("A new enemy has entered the arena!");
  }
}, Math.random() * (5000 - 1500) + 1500);

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) keys[key] = 0;
});

let bobTimer = 0;
let yVel = 0;
const BOB_SPEED = 10;
const BOB_AMOUNT = 0.05;

const pauseMenu = document.getElementById("pause-menu");
const resumeBtn = document.getElementById("resume-btn");
const quitBtn = document.getElementById("quit-btn");

controls.addEventListener("lock", () => {
  pauseMenu.style.display = "none";
});

controls.addEventListener("unlock", () => {
  pauseMenu.style.display = "flex";
});

resumeBtn.addEventListener("click", () => {
  controls.lock();
});

quitBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to quit?")) {
    window.location.href = `../lobby.html`;
  }
});

window.addEventListener("mousedown", (event) => {
  // Only fire if the game is active (mouse locked) and it's a left-click (button 0)
  if (controls.isLocked && event.button === 0) {
    fireWeapon();
  }
});

function fireWeapon() {
  // 1. Show flash and light
  flashSprite.visible = true;

  // 2. Randomize rotation so the flash looks different every shot
  flashSprite.material.rotation = Math.random() * Math.PI;

  // 3. Optional: Add a tiny "recoil" to the gun sprite
  sprite.position.z += 0.05;

  const newProjectile = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );

  const projectileCollision = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(
      camera.position.x + flashSprite.position.x,
      camera.position.y,
      camera.position.z + flashSprite.position.z
    )
  );
  projectileCollision.mass(0.1);
  projectileCollision.applyImpulse(new RAPIER.Vector3(0, 10, 0), true);
  const projectileShape = RAPIER.ColliderDesc.ball(0.2).setActiveEvents(
    RAPIER.ActiveEvents.COLLISION_EVENTS
  );
  world.createCollider(projectileShape, projectileCollision);

  newProjectile.receiveShadow = true;
  const projectileSpawnLocation = new THREE.Vector3(
    camera.position.x + flashSprite.position.x,
    camera.position.y,
    camera.position.z + flashSprite.position.z
  );
  newProjectile.position.copy(projectileSpawnLocation);
  scene.add(newProjectile);

  sceneObjects.push([newProjectile, projectileCollision]);
  projectiles.push({ mesh: newProjectile, body: projectileCollision });

  // 4. Hide it after a tiny delay
  setTimeout(() => {
    flashSprite.visible = false;
    sprite.position.z -= 0.05; // Return gun from recoil
  }, 50);
}

function spawnEnemy() {
  const x = (Math.random() - 0.5) * 40;
  const z = (Math.random() - 0.5) * 40;
  const y = 2; // Start slightly higher since sprites pivot from the center

  // 1. Create the Sprite
  // Use your weapon texture or load a new one
  const enemyTexture = new THREE.TextureLoader().load(enemyTex);
  const spriteMaterial = new THREE.SpriteMaterial({ map: enemyTexture });
  const enemySprite = new THREE.Sprite(spriteMaterial);

  // Scale it up so it's visible (Sprites are 1x1 by default)
  enemySprite.scale.set(2, 2, 1);
  scene.add(enemySprite);

  // 2. Physics Body (Keep the Cuboid or use a Ball for smoother sliding)
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z);
  const body = world.createRigidBody(rigidBodyDesc);
  body.mass = 0.1;

  // We keep the cuboid collider so it stands on the floor correctly
  const colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1).setActiveEvents(
    RAPIER.ActiveEvents.COLLISION_EVENTS
  );
  world.createCollider(colliderDesc, body);

  // 3. Store for AI and Syncing
  const enemyData = {
    mesh: enemySprite, // We treat the sprite as the "mesh" now
    body: body,
    speed: 4 + Math.random() * 4,
  };

  sceneObjects.push([enemySprite, body]);
  enemies.push(enemyData);
}

function animate() {
  const rotation = new THREE.Euler(0, 0, 0, "YXZ");

  requestAnimationFrame(animate);

  delta = clock.getDelta();
  world.timestep = Math.min(delta, 0.1);

  // Find your projectiles.forEach loop and update it:
  projectiles.forEach((obj) => {
    const bulletBody = obj.body; // Access the body property
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Use bulletBody instead of bulletCollision
    bulletBody.applyImpulse(
      new RAPIER.Vector3(
        direction.x * 0.1,
        direction.y * 0.1,
        direction.z * 0.1
      ),
      true
    );
  });

  world.step(eventQueue);

  eventQueue.drainCollisionEvents((handle1, handle2, started) => {
    if (!started) {
      return;
    }

    let bulletIndex = -1;
    let hitHandle = null;

    // 1. Check if handle1 is a bullet
    const p1Index = projectiles.findIndex(
      (p) => p.body.collider(0).handle === handle1
    );
    if (p1Index !== -1) {
      bulletIndex = p1Index;
      hitHandle = handle2; // The other thing we hit
    }

    // 2. If not, check if handle2 is a bullet
    if (bulletIndex === -1) {
      const p2Index = projectiles.findIndex(
        (p) => p.body.collider(0).handle === handle2
      );
      if (p2Index !== -1) {
        bulletIndex = p2Index;
        hitHandle = handle1; // The other thing we hit
      }
    }

    // If no bullet was involved in this collision, we don't care
    if (bulletIndex === -1) return;

    // 3. Safety Check: Did we shoot ourselves?
    // If the thing we hit is the player, ignore it.
    if (playerCollision.collider(0).handle === hitHandle) return;

    // 4. Check if the thing we hit was an enemy
    const enemyIndex = enemies.findIndex(
      (e) => e.body.collider(0).handle === hitHandle
    );

    if (enemyIndex !== -1) {
      destroyEnemy(enemyIndex); // Hit an enemy! Kill them.
    }

    // 5. Finally, destroy the bullet (because it hit SOMETHING: wall, floor, or enemy)
    destroyProjectile(bulletIndex);
  });

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

  sceneObjects.forEach(([objMesh, objCollision]) => {
    const t = objCollision.translation();
    // 2. Apply it to the Three.js Mesh
    objMesh.position.set(t.x, t.y, t.z);

    // 3. Get the rotation (quaternion) from Rapier
    const r = objCollision.rotation();
    // 4. Apply it to the Three.js Mesh
    objMesh.quaternion.set(r.x, r.y, r.z, r.w);

    const enemyRef = enemies.find((e) => e.body === objCollision);

    if (enemyRef) {
      // Apply smooth sine-wave bobbing
      // Adjust 0.005 for speed and 0.3 for height
      const bob = Math.sin(Date.now() * 0.005) * 0.3;

      // Update sprite position: Physics Position + Bob Offset
      objMesh.position.set(t.x, t.y + bob, t.z);
    }
  });

  bobTimer += delta * BOB_SPEED;

  // 2. Calculate the bob offset
  // We use Math.sin(bobTimer) for the up/down motion
  const bobOffset = Math.sin(bobTimer) * BOB_AMOUNT;

  // SimonDev's trick: The camera height is (Base Height) + (Bob Offset)
  const baseHeight = 0.8; // Your standard eye-level
  camera.position.set(
    playerCollision.translation().x,
    playerCollision.translation().y + baseHeight + bobOffset,
    playerCollision.translation().z
  );
  const weaponBobX = Math.cos(bobTimer * 0.5) * 0.02; // Side to side
  const weaponBobY = Math.sin(bobTimer) * 0.02; // Up and down

  // 0.75 and -0.5 are your original offset values
  sprite.position.x = 0.75 + weaponBobX;
  sprite.position.y = -0.35 + weaponBobY;

  // Get player position once per frame to save calculations
  const playerPos = playerCollision.translation();

  enemies.forEach((enemy) => {
    const enemyPos = enemy.body.translation();

    // 1. Calculate direction vector (Player - Enemy)
    const direction = new THREE.Vector3(
      playerPos.x - enemyPos.x,
      0, // Ignore Y so they don't try to fly up/down to you
      playerPos.z - enemyPos.z
    );

    // 2. Normalize calculates the "steering" direction
    direction.normalize();

    // 3. Move the enemy (Velocity = Direction * Speed)
    // We preserve the enemy's current Y velocity (gravity)
    const currentLinVel = enemy.body.linvel();

    enemy.body.setLinvel(
      {
        x: direction.x * enemy.speed,
        y: currentLinVel.y, // Keep gravity working
        z: direction.z * enemy.speed,
      },
      true
    );

    // 4. Rotate the visual mesh to look at the player
    enemy.mesh.lookAt(playerPos.x, enemyPos.y, playerPos.z);
  });

  if (conn && conn.open) {
    const myPos = playerCollision.translation();
    conn.send({
      type: "move",
      x: myPos.x,
      y: myPos.y,
      z: myPos.z,
    });
  }

  // 2. Smoothly slide remote players to their target
  for (let id in remotePlayers) {
    const p = remotePlayers[id];
    // 0.1 is the smoothing factor (lower = smoother/laggier)
    p.mesh.position.lerp(p.targetPos, 0.1);
  }

  renderer.render(scene, camera);

  stats.update();
}

animate();

function destroyProjectile(index) {
  const p = projectiles[index];

  // 1. Remove from Three.js Scene
  scene.remove(p.mesh);
  p.mesh.geometry.dispose(); // Good practice for memory
  p.mesh.material.dispose();

  // 2. Remove from Rapier World
  world.removeRigidBody(p.body);

  // 3. Remove from sceneObjects (to stop the sync loop from crashing)
  const sceneObjIndex = sceneObjects.findIndex((item) => item[1] === p.body);
  if (sceneObjIndex !== -1) {
    sceneObjects.splice(sceneObjIndex, 1);
  }

  // 4. Remove from projectiles array
  projectiles.splice(index, 1);
}

function destroyEnemy(index) {
  const e = enemies[index];

  // 1. Remove from Three.js Scene
  scene.remove(e.mesh);
  e.mesh.geometry.dispose();
  e.mesh.material.dispose();

  // 2. Remove from Rapier World
  world.removeRigidBody(e.body);

  // 3. Remove from sceneObjects
  const sceneObjIndex = sceneObjects.findIndex((item) => item[1] === e.body);
  if (sceneObjIndex !== -1) {
    sceneObjects.splice(sceneObjIndex, 1);
  }

  // 4. Remove from enemies array
  enemies.splice(index, 1);
}
