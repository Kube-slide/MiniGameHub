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

const distance = 50.0;
const angle = Math.PI / 4.0;
const penumbra = 0.5;
const decay = 1.0;

let light = new THREE.SpotLight(
  0xffffff,
  100.0,
  distance,
  angle,
  penumbra,
  decay
);
light.castShadow = true;
light.shadow.bias = -0.00001;
light.shadow.mapSize.width = 4096;
light.shadow.mapSize.height = 4096;
light.shadow.camera.near = 1;
light.shadow.camera.far = 100;

light.position.set(25, 25, 0);
light.lookAt(0, 0, 0);
this.scene_.add(light);

const upColour = 0xffff80;
const downColour = 0x808080;
light = new THREE.HemisphereLight(upColour, downColour, 0.5);
light.color.setHSL(0.6, 1, 0.6);
light.groundColor.setHSL(0.095, 1, 0.75);
light.position.set(0, 4, 0);
this.scene_.add(light);

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
