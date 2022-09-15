import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";
import * as CANNON from "cannon-es";
import { Quaternion, Vector3 } from "three";
import pxTexture from "./textures/environmentMaps/0/px.png";
import nxTexture from "./textures/environmentMaps/0/nx.png";
import pyTexture from "./textures/environmentMaps/0/py.png";
import { Vec3 } from "cannon-es";

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas#webgl") as HTMLCanvasElement;

// Scene
const scene = new THREE.Scene();

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMapTexture = cubeTextureLoader.load([
  "/textures/environmentMaps/0/px.png",
  "/textures/environmentMaps/0/nx.png",
  "/textures/environmentMaps/0/py.png",
  "/textures/environmentMaps/0/ny.png",
  "/textures/environmentMaps/0/pz.png",
  "/textures/environmentMaps/0/nz.png",
]);

/*
 * Physics
 */
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const defaultMaterial = new CANNON.Material("default");
const defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.1,
    restitution: 0.7,
  }
);
world.defaultContactMaterial = defaultContactMaterial;

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0,
  shape: floorShape,
});
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI * 0.5);
world.addBody(floorBody);

/**
 * Floor
 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({
    color: "#777777",
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5,
  })
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(-3, 3, 3);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/*
 * Utils
 */
const objectsToUpdate: { mesh: THREE.Mesh; body: CANNON.Body }[] = [];
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const meshStandardMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.1,
  roughness: 0.7,
  envMap: environmentMapTexture,
});
const createSphere = (
  radius: number,
  position: Vector3 | Vec3 | { x: number; y: number; z: number }
) => {
  const mesh = new THREE.Mesh(sphereGeometry, meshStandardMaterial);
  mesh.scale.set(radius, radius, radius);
  mesh.castShadow = true;
  mesh.position.copy(position as Vector3);
  scene.add(mesh);

  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({
    mass: 1,
    position: position as Vec3,
    shape,
  });

  world.addBody(body);
  objectsToUpdate.push({ mesh, body });
};

const createCube = (
  size: {
    width: number;
    height: number;
    depth: number;
  },
  position: Vector3 | Vec3 | { x: number; y: number; z: number }
) => {
  const mesh = new THREE.Mesh(cubeGeometry, meshStandardMaterial);
  mesh.scale.set(size.width, size.height, size.depth);
  mesh.castShadow = true;
  mesh.position.copy(position as Vector3);
  scene.add(mesh);

  const shape = new CANNON.Box(
    new Vec3(size.width / 2, size.height / 2, size.depth / 2)
  );
  const body = new CANNON.Body({
    mass: 1,
    position: position as Vec3,
    shape,
  });

  world.addBody(body);
  objectsToUpdate.push({ mesh, body });
};

createCube({ width: 0.5, height: 0.7, depth: 0.3 }, { x: 0, y: 3, z: 1 });

createSphere(0.5, { x: 0, y: 3, z: 0 });
createSphere(0.8, { x: 1, y: 4, z: 2 });

/**
 * Animate
 */
const clock = new THREE.Clock();
let lastElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - lastElapsedTime;
  lastElapsedTime = elapsedTime;

  world.step(1 / 60, deltaTime, 3);
  objectsToUpdate.forEach((object) => {
    object.mesh.position.copy(object.body.position as unknown as Vector3);
    object.mesh.quaternion.copy(
      object.body.quaternion as unknown as Quaternion
    );
  });

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();

/**
 * Debug
 */
const gui = new GUI();
const parameters = {
  createSphere() {
    createSphere(Math.random() / 2, {
      x: (Math.random() - 0.5) * 3,
      y: 3,
      z: (Math.random() - 0.5) * 3,
    });
  },
  createCube() {
    createCube(
      {
        width: Math.random(),
        height: Math.random(),
        depth: Math.random(),
      },
      {
        x: (Math.random() - 0.5) * 3,
        y: 3,
        z: (Math.random() - 0.5) * 3,
      }
    );
  },
};
gui.add(parameters, "createSphere");
gui.add(parameters, "createCube");
