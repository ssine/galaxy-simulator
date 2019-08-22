import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'
import { resizeRendererToDisplaySize } from './utils'
import { makeCude, makeSphere, makeBackground, make2DText } from './instances'


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

  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(0, 0, 7);
  scene.add(light);

  let sph_texture = new THREE.TextureLoader().load('assets/img/ESA_Gaia_DR2_AllSky_Brightness_Colour_Cartesian_2000x1000.png');
  sph_texture.mapping = THREE.EquirectangularRefractionMapping;
  // scene.background = cube_texture;
  let sphere = makeSphere({
    radius: 1,
    num_segments: 32,
    material_config: { color: 0xffffff, envMap: sph_texture, refractionRatio: 0.98, reflectivity: 0.7 }
  });
  sphere.position.set(0, 0, -1);
  scene.add(sphere);

  let text = make2DText({
    text: 'Hello~',
    font: '100px Regular Arial', 
    fill_style: 'rgba(255,0,0,0.95)',
    width: 3
  });
  text.position.set(0, 0, -1 + 0.06);
  scene.add(text);

  var gridHelper = new THREE.GridHelper(10, 10);
  scene.add( gridHelper );

  const bg_scene = new THREE.Scene();
  const background = await makeBackground({
    image_uri: 'assets/img/ESA_Gaia_DR2_AllSky_Brightness_Colour_Cartesian_2000x1000.png'
  });
  bg_scene.add(background);


  function render(time: any) {
    time *= 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    background.position.copy(camera.position);
    renderer.render(bg_scene, camera);
    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
