import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const rotationSpeed = 0.005;

let scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0634);

let camera = new THREE.PerspectiveCamera(
  80,
  window.innerWidth / window.innerHeight,
  0.01,
  5000
);
camera.position.set(0, 1.5, 10);
camera.lookAt(new THREE.Vector3(0, 5, 0));

// Renderer
let renderer = new THREE.WebGLRenderer();
// let renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(0.55);

document.body.appendChild(renderer.domElement);

// Lighting — essential for non-emissive materials
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
hemiLight.position.set(0, 500, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 10);
dirLight.position.set(5, 10, 7.5);
dirLight.castShadow = true;
scene.add(dirLight);

let model;
const BaseUrl = import.meta.env.BASE_URL;
const loader = new GLTFLoader();
loader.load(`${BaseUrl}a.glb`, (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      const mat = child.material;
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
      }

      mat.transparent = false;
      mat.opacity = 1.0;

      mat.side = THREE.DoubleSide;

      mat.depthWrite = true;
      mat.depthTest = true;

      // Shadows
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(gltf.scene);
  model = gltf.scene.getObjectByName("Scene");
});

// Handle resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create snow particles
var flakeCount = 9000;
var flakeGeometry = new THREE.TetrahedronGeometry(0.015, 2);
var flakeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
var snow = new THREE.Group();

for (let i = 0; i < flakeCount; i++) {
  var flakeMesh = new THREE.Mesh(flakeGeometry, flakeMaterial);
  flakeMesh.position.set(
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 40
  );
  snow.add(flakeMesh);
}
scene.add(snow);

var flakeArray = snow.children;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  // controls.update();
  renderer.render(scene, camera);
  try {
    model.rotation.y += rotationSpeed;
  } catch {}

  for (var i = 0; i < flakeArray.length / 2; i++) {
    flakeArray[i].rotation.y += 0.01;
    flakeArray[i].rotation.x += 0.02;
    flakeArray[i].rotation.z += 0.03;
    flakeArray[i].position.y -= 0.018;
    if (flakeArray[i].position.y < -4) {
      flakeArray[i].position.y += 10;
    }
  }
  for (var i = flakeArray.length / 2; i < flakeArray.length; i++) {
    flakeArray[i].rotation.y -= 0.03;
    flakeArray[i].rotation.x -= 0.03;
    flakeArray[i].rotation.z -= 0.02;
    flakeArray[i].position.y -= 0.016;
    if (flakeArray[i].position.y < -4) {
      flakeArray[i].position.y += 9.5;
    }

    snow.rotation.y -= 0.0000002;
  }
}
animate();

document.querySelector("#playTheGame").addEventListener("click", () => {
  window.location.href =
    BaseUrl + "features/character-selection/character-selection.html";
});
