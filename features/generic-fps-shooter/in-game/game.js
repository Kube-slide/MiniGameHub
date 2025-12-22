import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import RAPIER from "@dimforge/rapier3d-compat";

async function init() {
  // 1. Initialize Physics Engine
  await RAPIER.init();
  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  const world = new RAPIER.World(gravity);

  // 2. Three.js Scene Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.position.set(5, 10, 7.5);
  scene.add(sunLight);

  // 3. The Ground (Physics + Visual)
  const floorSize = 50;
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSize, floorSize),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  scene.add(floorMesh);

  let groundDesc = RAPIER.RigidBodyDesc.fixed();
  let groundBody = world.createRigidBody(groundDesc);
  let groundCollider = RAPIER.ColliderDesc.cuboid(
    floorSize / 2,
    0.1,
    floorSize / 2
  );
  world.createCollider(groundCollider, groundBody);

  // 4. A Test Obstacle (So you can test collisions)
  const cubeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  scene.add(cubeMesh);

  let cubeDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, -5);
  let cubeBody = world.createRigidBody(cubeDesc);
  let cubeCollider = RAPIER.ColliderDesc.cuboid(1, 1, 1);
  world.createCollider(cubeCollider, cubeBody);
  cubeMesh.position.set(0, 1, -5);

  // 5. Player Physics (The Capsule)
  let playerDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
    0,
    3,
    0
  );
  let playerBody = world.createRigidBody(playerDesc);
  let playerColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3);
  world.createCollider(playerColliderDesc, playerBody);
  let characterController = world.createCharacterController(0.1);

  // 6. Controls & Input
  const controls = new PointerLockControls(camera, document.body);
  document.addEventListener("click", () => controls.lock());

  let keys = { w: false, a: false, s: false, d: false };
  document.addEventListener("keydown", (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase()))
      keys[e.key.toLowerCase()] = true;
  });
  document.addEventListener("keyup", (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase()))
      keys[e.key.toLowerCase()] = false;
  });

  // 7. Game Loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (controls.isLocked) {
      // Movement Vector
      const movement = new THREE.Vector3();
      if (keys.w) movement.z -= 1;
      if (keys.s) movement.z += 1;
      if (keys.a) movement.x -= 1;
      if (keys.d) movement.x += 1;

      movement.normalize().multiplyScalar(0.15);
      movement.applyQuaternion(camera.quaternion);
      movement.y = 0; // Lock to ground

      // Physics Calculation
      characterController.computeColliderMovement(playerBody.getCollider(0), {
        x: movement.x,
        y: -9.81 * delta,
        z: movement.z,
      });

      const corrected = characterController.computedMovement();
      const currentPos = playerBody.translation();
      playerBody.setNextKinematicTranslation({
        x: currentPos.x + corrected.x,
        y: currentPos.y + corrected.y,
        z: currentPos.z + corrected.z,
      });
    }

    world.step();

    // Sync Camera to Physics
    const p = playerBody.translation();
    camera.position.set(p.x, p.y + 0.8, p.z);

    renderer.render(scene, camera);
  }

  animate();

  // Handle Window Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

init();
