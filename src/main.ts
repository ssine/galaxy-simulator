import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'
import { resizeRendererToDisplaySize } from './utils'
import { makeSphere, makeBackground } from './instances'
import { Body, World } from './world'

function makeGlassBallMesh(radius: number): THREE.Mesh {
  let sph_texture = new THREE.TextureLoader().load('assets/img/ESA_Gaia_DR2_AllSky_Brightness_Colour_Cartesian_2000x1000.png');
  sph_texture.mapping = THREE.EquirectangularRefractionMapping;
  let sphere = makeSphere({
    radius: radius,
    num_segments: 32,
    material_config: { color: 0xffffff, envMap: sph_texture, refractionRatio: 0.98, reflectivity: 0.7 }
  });
  return sphere;
}

async function main() {
  const canvas: HTMLCanvasElement | null = document.querySelector('#stage');
  if (canvas === null) return;
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.autoClearColor = false;

  const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
  camera.position.z = 2;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  const scene = new THREE.Scene();
  const world = new World(scene, 0.001, Math.sqrt(3));

  const light = new THREE.AmbientLight(0xFF00FF, 1);
  light.position.set(0, 0, 0);
  scene.add(light);

  let sun = new Body(1e3, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
  sun.set_mesh(makeGlassBallMesh(0.2));
  let body_1 = new Body(1, new THREE.Vector3(0, 0, -5), new THREE.Vector3(10, 0, 0));
  body_1.set_mesh(makeGlassBallMesh(0.2));
  // let body_2 = new Body(1, new THREE.Vector3(Math.sqrt(3)/2, 0, 0.5), new THREE.Vector3(-0.5, 0, Math.sqrt(3)/2));
  // body_2.set_mesh(makeGlassBallMesh(0.2));
  // let body_3 = new Body(1, new THREE.Vector3(-Math.sqrt(3)/2, 0, 0.5), new THREE.Vector3(-0.5, 0, -Math.sqrt(3)/2));
  // body_3.set_mesh(makeGlassBallMesh(0.2));
  world.add_body(sun);
  world.add_body(body_1);
  // world.add_body(body_2);
  // world.add_body(body_3);

  var gridHelper = new THREE.GridHelper(10, 10);
  scene.add( gridHelper );

  const bg_scene = new THREE.Scene();
  const background = await makeBackground({
    image_uri: 'assets/img/ESA_Gaia_DR2_AllSky_Brightness_Colour_Cartesian_2000x1000.png'
  });
  bg_scene.add(background);


  function render(time_ms: number) {
    let time = time_ms * 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    world.step();

    background.position.copy(camera.position);
    renderer.render(bg_scene, camera);
    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
