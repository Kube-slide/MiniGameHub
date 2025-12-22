//* Resources used:
//* Rapier official js documentation:   https://rapier.rs/docs/user_guides/javascript/character_controller
//* Threejs official documentation:     https://threejs.org/manual/
//* SimonDev's fps camera tutorial:     https://www.youtube.com/watch?v=oqKzxPMLWxo
//* Basic syncing physics + mesh:       https://sbcode.net/threejs/physics-rapier/

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import RAPIER from "@dimforge/rapier3d-compat";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

const sphereRadius = 3;
const sphereWidthDivisions = 32;
const sphereHeightDivisions = 16;
const sphereGeo = new THREE.SphereGeometry(
  sphereRadius,
  sphereWidthDivisions,
  sphereHeightDivisions
);
const sphereMat = new THREE.MeshStandardMaterial({ color: "#CA8" });
const mesh = new THREE.Mesh(sphereGeo, sphereMat);
mesh.castShadow = true;
mesh.receiveShadow = true;
mesh.position.set(0, 4, -10);
scene.add(mesh);

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

const clock = new THREE.Clock();
let delta;

function animate() {
  requestAnimationFrame(animate);

  delta = clock.getDelta();
  world.timestep = Math.min(delta, 0.1);
  world.step();

  renderer.render(scene, camera);

  stats.update();
  controls.update();
}

animate();
