import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'
import { resizeRendererToDisplaySize } from './utils'
import { makeSphere, makeBackground } from './instances'
import { Body, World } from './world'

const bg_uri = 'assets/img/ESA_Gaia_DR2_AllSky_Brightness_Colour_Cartesian_2000x1000.png';

const data = {
  earth: {
    mass: 5.965e24,
    orbit_radius: 149597870700,
    velocity: 29805.655
  },
  sun: {
    mass: 1.986e30
  }
}

function makeGlassBallMesh(radius: number): THREE.Mesh {
  let sph_texture = new THREE.TextureLoader().load(bg_uri);
  sph_texture.mapping = THREE.EquirectangularRefractionMapping;
  let sphere = makeSphere({
    radius: radius,
    num_segments: 32,
    material_config: { color: 0xffffff, envMap: sph_texture, refractionRatio: 0.98, reflectivity: 0.7 }
  });
  return sphere;
}

function makeNormalBallMesh(radius: number): THREE.Mesh {
  let sphere = makeSphere({
    radius: radius,
    num_segments: 8,
    material_config: { color: 0xffffff }
  });
  return sphere;
}

function random_sphere_ponit(inner_r: number, outer_r: number): THREE.Vector3 {
  let r = Math.random() * (outer_r - inner_r) + inner_r;
  let theta = Math.random() * Math.PI * 2;
  let phi = (Math.random() - 0.5) * Math.PI;
  let r_sin_phi = r * Math.sin(phi), r_cos_phi = r * Math.cos(phi);
  return new THREE.Vector3(
    r_cos_phi * Math.cos(theta),
    r_sin_phi,
    r_cos_phi * Math.sin(theta)
  );
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
  const world = new World(scene, 24 * 3600, 2 / data.earth.orbit_radius);

  const light = new THREE.AmbientLight(0xFFFFFF, 1);
  light.position.set(0, 0, 0);
  scene.add(light);

  let sun = new Body(data.sun.mass, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), true);
  sun.set_mesh(makeGlassBallMesh(0.5));
  let earth = new Body(data.earth.mass, new THREE.Vector3(0, 0, -data.earth.orbit_radius), new THREE.Vector3(data.earth.velocity, 0, 0));
  earth.set_mesh(makeGlassBallMesh(0.2));
  world.add_body(sun);
  world.add_body(earth);

  for (let i = 0; i < 1000; i++) {
    let p = new Body(
      Math.random() * data.earth.mass * 10,
      random_sphere_ponit(data.earth.orbit_radius * 0.3, data.earth.orbit_radius * 7),
      random_sphere_ponit(data.earth.velocity * 0.3, data.earth.velocity * 7)
    );
    p.set_mesh(makeNormalBallMesh(0.2));
    world.add_body(p);
  }

  var gridHelper = new THREE.GridHelper(10, 10);
  scene.add( gridHelper );

  const bg_scene = new THREE.Scene();
  const background = await makeBackground({
    image_uri: bg_uri
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
