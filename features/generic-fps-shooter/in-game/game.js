//* Resources used:
//* Rapier official js documentation:   https://rapier.rs/docs/user_guides/javascript/character_controller
//* Threejs official documentation:     https://threejs.org/manual/
//* SimonDev's fps camera tutorial:     https://www.youtube.com/watch?v=oqKzxPMLWxo
//* Basic syncing physics + mesh:       https://sbcode.net/threejs/physics-rapier/
import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import RAPIER from "@dimforge/rapier3d-compat";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { Peer } from "peerjs";
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

//Wait for Rapier to compile
await RAPIER.init();

// --- MULTIPLAYER SETUP ---
const peer = new Peer();
const connections = [];
const remotePlayers = {};
const remoteProjectiles = []; // Visual bullets from other players

// Helper: Am I the host? (First person in the list is host)
function isHost() {
  if (connections.length === 0) return true;
  const allIds = connections.map((c) => c.peer);
  allIds.push(peer.id);
  allIds.sort();
  return allIds[0] === peer.id;
}

// Helper: Send data to everyone
function broadcast(data) {
  connections.forEach((conn) => {
    if (conn.open) conn.send(data);
  });
}

// 1. Connect to Peer
function connectToPeer(id) {
  if (id === peer.id || connections.find((c) => c.peer === id)) return;
  const conn = peer.connect(id);
  setupConnection(conn);
}

peer.on("connection", (conn) => {
  setupConnection(conn);
});

function setupConnection(conn) {
  conn.on("open", () => {
    if (!connections.find((c) => c.peer === conn.peer)) {
      connections.push(conn);
      console.log("Connected to", conn.peer);

      // If I am host, send the peer list to the new guy so they connect to everyone else
      if (isHost()) {
        const others = connections
          .map((c) => c.peer)
          .filter((id) => id !== conn.peer);
        conn.send({ type: "peerList", list: others });

        // Also sync existing enemies to the new player
        const enemyList = enemies.map((e) => ({
          id: e.body.handle,
          x: e.body.translation().x,
          y: e.body.translation().y,
          z: e.body.translation().z,
        }));
        conn.send({ type: "enemySync", list: enemyList });
      }
    }
  });

  conn.on("data", (data) => handleData(data, conn.peer));

  conn.on("close", () => {
    const idx = connections.findIndex((c) => c.peer === conn.peer);
    if (idx !== -1) connections.splice(idx, 1);
    // Remove their visual mesh
    if (remotePlayers[conn.peer]) {
      scene.remove(remotePlayers[conn.peer].mesh);
      delete remotePlayers[conn.peer];
    }
  });
}

function handleData(data, senderId) {
  switch (data.type) {
    case "peerList":
      data.list.forEach((id) => connectToPeer(id));
      break;
    case "move":
      if (!remotePlayers[senderId]) {
        // Create new player sprite
        const tex = new THREE.TextureLoader().load(weaponTex);
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: tex, color: 0x00ff00 })
        );
        sprite.scale.set(2, 2, 1);
        scene.add(sprite);
        remotePlayers[senderId] = {
          mesh: sprite,
          targetPos: new THREE.Vector3(),
        };
      }
      remotePlayers[senderId].targetPos.set(data.x, data.y, data.z);
      break;

    case "shoot":
      spawnRemoteBullet(data.pos, data.vel);
      break;

    // --- CRITICAL FIX HERE ---
    case "enemySync":
      // If I am a client (not the host), run the full sync logic
      if (!isHost()) {
        updateClientEnemies(data.list);
      }
      break;
    // -------------------------

    case "spawnEnemy":
      // IGNORE THIS NOW.
      // We rely on enemySync to create enemies to avoid duplicates.
      break;

    case "hitEnemy":
      if (isHost()) {
        const target = enemies.find((e) => e.id === data.enemyId);
        if (target) {
          target.health -= 25;
          if (target.health <= 0) {
            const idx = enemies.indexOf(target);
            destroyEnemy(idx);
          }
        }
      }
      break;
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

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key in keys) keys[key] = 1;
});

// HOST ONLY SPAWN TIMER
setInterval(() => {
  if (controls.isLocked && isHost()) {
    const data = spawnEnemy();
    broadcast({ type: "spawnEnemy", ...data });
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

// --- INJECT UI INTO PAUSE MENU ---
const pauseMenu = document.getElementById("pause-menu");
const resumeBtn = document.getElementById("resume-btn");
const quitBtn = document.getElementById("quit-btn");

peer.on("open", (id) => {
  document.getElementById("my-peer-id").innerText = id;
});

document.getElementById("join-btn").addEventListener("click", () => {
  const id = document.getElementById("join-id").value;
  if (id) {
    connectToPeer(id);
    document.getElementById("status-msg").innerText = "Connecting...";
  }
});
// ---------------------------------

controls.addEventListener("lock", () => {
  pauseMenu.style.display = "none";
});

controls.addEventListener("unlock", () => {
  pauseMenu.style.display = "flex";
});

resumeBtn.addEventListener("click", () => {
  controls.lock();
});

document.addEventListener("click", () => {
  if (pauseMenu.style.display === "none") {
    controls.lock();
  }
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

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  // Calculate spawn pos slightly in front of camera
  const spawnPos = camera.position
    .clone()
    .add(direction.clone().multiplyScalar(1));

  // --- LOCAL PHYSICS BULLET ---
  const newProjectile = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );

  const projectileCollision = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(
      spawnPos.x,
      spawnPos.y,
      spawnPos.z
    )
  );
  projectileCollision.mass(0.1);
  projectileCollision.applyImpulse(
    new RAPIER.Vector3(direction.x * 50, direction.y * 50, direction.z * 50), // Changed 15 to 50
    true
  );
  const projectileShape = RAPIER.ColliderDesc.ball(0.2).setActiveEvents(
    RAPIER.ActiveEvents.COLLISION_EVENTS
  );
  world.createCollider(projectileShape, projectileCollision);

  newProjectile.receiveShadow = true;
  newProjectile.position.copy(spawnPos);
  scene.add(newProjectile);

  sceneObjects.push([newProjectile, projectileCollision]);
  projectiles.push({
    mesh: newProjectile,
    body: projectileCollision,
    direction: direction.clone(),
  });

  // 4. Hide it after a tiny delay
  setTimeout(() => {
    flashSprite.visible = false;
    sprite.position.z -= 0.05; // Return gun from recoil
  }, 50);

  // --- NETWORK SYNC ---
  broadcast({
    type: "shoot",
    pos: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
    vel: { x: direction.x * 15, y: direction.y * 15, z: direction.z * 15 },
  });
}

function spawnRemoteBullet(pos, vel) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  mesh.position.set(pos.x, pos.y, pos.z);
  scene.add(mesh);

  // Store simple physics data for the loop to animate it
  remoteProjectiles.push({
    mesh: mesh,
    vel: new THREE.Vector3(vel.x, vel.y, vel.z),
    spawnTime: Date.now(),
  });
}

function spawnEnemy(forcedX, forcedZ, forcedY, forcedId) {
  const x = forcedX ?? (Math.random() - 0.5) * 40;
  const z = forcedZ ?? (Math.random() - 0.5) * 40;
  const y = forcedY ?? 2;

  // GENERATE UNIQUE ID (Critical for syncing)
  const uniqueId = forcedId ?? Math.random().toString(36).substr(2, 9);

  const enemyTexture = new THREE.TextureLoader().load(enemyTex);
  const spriteMaterial = new THREE.SpriteMaterial({ map: enemyTexture });
  const enemySprite = new THREE.Sprite(spriteMaterial);

  enemySprite.scale.set(2, 2, 1);
  scene.add(enemySprite);

  // Dynamic body so it can fall/move
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z);
  // Important: Lock rotation so they don't tip over
  rigidBodyDesc.setRotation({ x: 0, y: 0, z: 0, w: 1 });
  const body = world.createRigidBody(rigidBodyDesc);
  body.mass = 0.1;

  // Lock rotation axis just to be safe
  body.lockRotations(true, true);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1).setActiveEvents(
    RAPIER.ActiveEvents.COLLISION_EVENTS
  );
  world.createCollider(colliderDesc, body);

  const enemyData = {
    mesh: enemySprite,
    body: body,
    id: uniqueId, // USE THE STRING ID
    health: 100, // Add HP tracking
    speed: 4 + Math.random() * 4,
    targetPos: new THREE.Vector3(x, y, z),
  };
  enemies.push(enemyData);
  sceneObjects.push([enemySprite, body]);

  // Return data so Host can broadcast it
  return { x, y, z, id: uniqueId };
}

function animate() {
  const rotation = new THREE.Euler(0, 0, 0, "YXZ");

  requestAnimationFrame(animate);

  delta = clock.getDelta();
  world.timestep = Math.min(delta, 0.1);

  // Update LOCAL projectiles
  projectiles.forEach((obj) => {
    const bulletBody = obj.body;

    // Use a small multiplier (e.g., 0.5) so it doesn't accelerate to infinity instantly
    const force = obj.direction.clone().multiplyScalar(0.5);

    // Apply the impulse using the stored direction
    bulletBody.applyImpulse({ x: force.x, y: force.y, z: force.z }, true);
  });

  // Update REMOTE projectiles (Simple visual movement)
  for (let i = remoteProjectiles.length - 1; i >= 0; i--) {
    const p = remoteProjectiles[i];
    p.mesh.position.addScaledVector(p.vel, delta);
    // Remove after 2 seconds
    if (Date.now() - p.spawnTime > 2000) {
      scene.remove(p.mesh);
      remoteProjectiles.splice(i, 1);
    }
  }

  world.step(eventQueue);

  eventQueue.drainCollisionEvents((handle1, handle2, started) => {
    if (!started) return;

    let bulletIndex = -1;
    let hitHandle = null;

    const p1Index = projectiles.findIndex(
      (p) => p.body.collider(0).handle === handle1
    );
    if (p1Index !== -1) {
      bulletIndex = p1Index;
      hitHandle = handle2;
    }

    if (bulletIndex === -1) {
      const p2Index = projectiles.findIndex(
        (p) => p.body.collider(0).handle === handle2
      );
      if (p2Index !== -1) {
        bulletIndex = p2Index;
        hitHandle = handle1;
      }
    }

    if (bulletIndex === -1) return;
    if (playerCollision.collider(0).handle === hitHandle) return;

    const enemyIndex = enemies.findIndex(
      (e) => e.body.collider(0).handle === hitHandle
    );

    if (enemyIndex !== -1) {
      const hitEnemy = enemies[enemyIndex];

      if (isHost()) {
        // Host applies damage immediately
        hitEnemy.health -= 25;
        if (hitEnemy.health <= 0) {
          destroyEnemy(enemyIndex);
        }
      } else {
        // Client tells Host "I hit this guy"
        // We do NOT destroy it here. We wait for the Host to delete it via sync.
        if (connections.length > 0) {
          // Send to Host (first connection is usually host in this setup, or broadcast)
          // Ideally send specifically to host, but broadcast works for now:
          broadcast({ type: "hitEnemy", enemyId: hitEnemy.id });
        }
      }
    }
    destroyProjectile(bulletIndex);
  });

  // --- PLAYER MOVEMENT ---
  const moveDir = new THREE.Vector3(keys.d - keys.a, 0, keys.s - keys.w);
  rotation.setFromQuaternion(camera.quaternion);
  rotation.x = 0;
  moveDir.applyEuler(rotation);
  moveDir.normalize().multiplyScalar(delta * speed);

  if (characterController.computedGrounded()) {
    if (keys[" "] === 1) yVel = 15;
    else yVel = -0.5;
  } else {
    yVel -= 25 * delta;
  }

  const finalMove = new THREE.Vector3(moveDir.x, yVel * delta, moveDir.z);
  characterController.computeColliderMovement(
    playerCollision.collider(0),
    finalMove
  );
  const movement = characterController.computedMovement();
  const currentPos = playerCollision.translation();

  playerCollision.setNextKinematicTranslation({
    x: currentPos.x + movement.x,
    y: currentPos.y + movement.y,
    z: currentPos.z + movement.z,
  });

  // Broadcast my movement
  if (connections.length > 0) {
    broadcast({
      type: "move",
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z,
    });
  }

  // --- SYNC OBJECTS TO PHYSICS ---
  sceneObjects.forEach(([objMesh, objCollision]) => {
    const t = objCollision.translation();
    objMesh.position.set(t.x, t.y, t.z);

    // Rotation
    const r = objCollision.rotation();
    objMesh.quaternion.set(r.x, r.y, r.z, r.w);
  });

  // --- SYNC REMOTE PLAYERS ---
  for (const id in remotePlayers) {
    const rp = remotePlayers[id];
    rp.mesh.position.lerp(rp.targetPos, 0.2); // Smooth movement
  }

  bobTimer += delta * BOB_SPEED;
  const bobOffset = Math.sin(bobTimer) * BOB_AMOUNT;
  const baseHeight = 0.8;
  camera.position.set(
    playerCollision.translation().x,
    playerCollision.translation().y + baseHeight + bobOffset,
    playerCollision.translation().z
  );

  const weaponBobX = Math.cos(bobTimer * 0.5) * 0.02;
  const weaponBobY = Math.sin(bobTimer) * 0.02;
  sprite.position.x = 0.75 + weaponBobX;
  sprite.position.y = -0.35 + weaponBobY;

  // --- HOST AI LOGIC ---
  if (isHost()) {
    const playerPos = playerCollision.translation();
    enemies.forEach((enemy) => {
      const enemyPos = enemy.body.translation();
      const direction = new THREE.Vector3(
        playerPos.x - enemyPos.x,
        0,
        playerPos.z - enemyPos.z
      );
      direction.normalize();
      const currentLinVel = enemy.body.linvel();

      enemy.body.setLinvel(
        {
          x: direction.x * enemy.speed,
          y: currentLinVel.y,
          z: direction.z * enemy.speed,
        },
        true
      );
      // LookAt is handled by Sprite always facing camera, so simpler here
    });

    // Broadcast Enemy Positions
    const enemySyncList = enemies.map((e) => ({
      id: e.id,
      x: e.body.translation().x,
      y: e.body.translation().y,
      z: e.body.translation().z,
      hp: e.health,
    }));
    if (enemies.length > 0)
      broadcast({ type: "enemySync", list: enemySyncList });
  }

  renderer.render(scene, camera);
  stats.update();
}

animate();

function destroyProjectile(index) {
  const p = projectiles[index];
  scene.remove(p.mesh);
  p.mesh.geometry.dispose();
  p.mesh.material.dispose();
  world.removeRigidBody(p.body);

  const sceneObjIndex = sceneObjects.findIndex((item) => item[1] === p.body);
  if (sceneObjIndex !== -1) sceneObjects.splice(sceneObjIndex, 1);
  projectiles.splice(index, 1);
}

function destroyEnemy(index) {
  const e = enemies[index];
  scene.remove(e.mesh);
  e.mesh.geometry.dispose();
  e.mesh.material.dispose();
  world.removeRigidBody(e.body);

  const sceneObjIndex = sceneObjects.findIndex((item) => item[1] === e.body);
  if (sceneObjIndex !== -1) sceneObjects.splice(sceneObjIndex, 1);
  enemies.splice(index, 1);
}

function updateClientEnemies(serverList) {
  // 1. UPDATE or CREATE enemies
  serverList.forEach((serverEnemy) => {
    const localEnemy = enemies.find((e) => e.id === serverEnemy.id);

    if (localEnemy) {
      // Sync Position
      localEnemy.body.setNextKinematicTranslation({
        x: serverEnemy.x,
        y: serverEnemy.y,
        z: serverEnemy.z,
      });

      // Sync Health
      localEnemy.health = serverEnemy.hp; // <--- ADD THIS

      // Optional: Visual Damage Feedback
      // Make them redder as they die
      if (localEnemy.health < 100) {
        localEnemy.mesh.material.color.setHex(0xff0000);
      }
    } else {
      spawnEnemy(serverEnemy.x, serverEnemy.z, serverEnemy.y, serverEnemy.id);
    }
  });

  // 2. DELETE enemies that are gone from the server
  // Iterate backwards so we can splice safely
  for (let i = enemies.length - 1; i >= 0; i--) {
    const localEnemy = enemies[i];
    const stillAlive = serverList.find((s) => s.id === localEnemy.id);

    if (!stillAlive) {
      destroyEnemy(i);
    }
  }
}
