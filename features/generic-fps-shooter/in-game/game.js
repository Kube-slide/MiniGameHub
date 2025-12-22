//* Resources used:
//* Rapier official js documentation:   https://rapier.rs/docs/user_guides/javascript/character_controller
//* Threejs official documentation:     https://threejs.org/manual/
//* SimonDev's fps camera tutorial:     https://www.youtube.com/watch?v=oqKzxPMLWxo
//* Basic syncing physics + mesh:       https://sbcode.net/threejs/physics-rapier/

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import RAPIER from "@dimforge/rapier3d-compat";

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
  100
);

camera.position.set(0, 2, 5);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

//! Allows dynamic resizing of window
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const light = new THREE.DirectionalLight(0xf3ebbe, 2.4);
light.position.set(-20, 100, 20);
light.target.position.set(0, 0, 0);

//? Enable stats for debugging
const stats = new Stats();
document.body.appendChild(stats.dom);

//? Create the floor
const floorMesh = new THREE.Mesh(
  new THREE.BoxGeometry(100, 1, 100),
  new THREE.MeshPhongMaterial()
);
floorMesh.position.y = -1;
scene.add(floorMesh);
const floorBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0)
);
const floorShape = RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
world.createCollider(floorShape, floorBody);

const clock = new THREE.Clock();
let delta;

function animate() {
  requestAnimationFrame(animate);

  delta = clock.getDelta();
  world.timestep = Math.min(delta, 0.1);
  world.step();

  renderer.render(scene, camera);

  stats.update();
}

animate();
