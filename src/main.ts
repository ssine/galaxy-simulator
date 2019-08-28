import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'
import { resizeRendererToDisplaySize } from './utils'
import { makeSphere, makeBackground, makeGlassBall } from './instances'
import { Body, World } from './world'
import { Stats } from 'stats-js'
import { solar_sys_data as data, default_config, bg_uri } from './common'

const config = {
  num_planets: 500,
  total_mass: data.sun.mass * 1.2,
  max_radius: data.earth.orbit_radius * 30 // 30 AU
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

function add_sun_and_earth(world: World) {
  let sun = new Body({
    ...default_config,
    mass: data.sun.mass,
    position: new THREE.Vector3(0, 0, 0),
    fixed: true
  });
  sun.set_mesh(makeGlassBall(0.5));
  let earth = new Body({
    ...default_config,
    mass: data.earth.mass,
    position: new THREE.Vector3(0, 0, -data.earth.orbit_radius),
    velocity: new THREE.Vector3(data.earth.velocity, 0, 0)
  });
  earth.set_mesh(makeGlassBall(0.2));
  world.add_body(sun);
  world.add_body(earth);
}

function add_random_body_sphere(world: World) {
  for (let i = 0; i < 3000; i++) {
    let p = new Body({
      ...default_config,
      mass: Math.random() * data.earth.mass * 1000,
      position: random_sphere_ponit(data.earth.orbit_radius * 0.3, data.earth.orbit_radius * 3),
      velocity: random_sphere_ponit(data.earth.velocity * 0.1, data.earth.velocity * 1) 
    });
    world.add_body(p);
  }
}

function add_random_body_flat(world: World) {
  for (let i = 0; i < 3000; i++) {
    let p = new Body({
      ...default_config,
      mass: Math.random() * data.earth.mass * 1000,
      position: random_sphere_ponit(data.earth.orbit_radius * 0.3, data.earth.orbit_radius * 3),
      velocity: random_sphere_ponit(data.earth.velocity * 0.1, data.earth.velocity * 1) 
    });
    world.add_body(p);
  }
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
  const world = new World(scene, 24 * 3600);

  const light = new THREE.AmbientLight(0xFFFFFF, 1);
  light.position.set(0, 0, 0);
  scene.add(light);

  add_random_body_sphere(world);

  const bg_scene = new THREE.Scene();
  const background = await makeBackground({
    image_uri: bg_uri
  });
  bg_scene.add(background);

  let stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild( stats.dom );

  function render(time_ms: number) {
    stats.begin();

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    world.step();

    background.position.copy(camera.position);
    renderer.render(bg_scene, camera);
    renderer.render(scene, camera);

    stats.end();
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
