import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { OrbitControls } from "three-orbitcontrols-ts";
import { resizeRendererToDisplaySize } from "./utils";
import { makeBackground, makeGlassBall } from "./instances";
import { Body, World } from "./world";
import { Stats } from "stats-js";
import {
  solar_sys_data as data,
  default_config,
  bg_uri,
  trace_config,
} from "./common";

let config = {
  num_planets: 3000,
  spawn_radius: 1.5,
  planet_mass: 500,
  planet_velocity: 0.5,
  spawn_shape: "flat",
  spawn_sun: false,
};

function random_in_sphere_shell(
  inner_r: number,
  outer_r: number
): THREE.Vector3 {
  let r = Math.random() * (outer_r - inner_r) + inner_r;
  let theta = Math.random() * Math.PI * 2;
  let phi = (Math.random() - 0.5) * Math.PI;
  let r_sin_phi = r * Math.sin(phi),
    r_cos_phi = r * Math.cos(phi);
  return new THREE.Vector3(
    r_cos_phi * Math.cos(theta),
    r_sin_phi,
    r_cos_phi * Math.sin(theta)
  );
}

function random_in_ellipsoid(a: number, b: number, c: number): THREE.Vector3 {
  while (true) {
    let x = (Math.random() - 0.5) * a * 2;
    let y = (Math.random() - 0.5) * b * 2;
    let z = (Math.random() - 0.5) * c * 2;
    if ((x * x) / a / a + (y * y) / b / b + (z * z) / c / c < 1)
      return new THREE.Vector3(x, y, z);
  }
}

function add_sun(world: World) {
  let sun = new Body({
    ...default_config,
    density: default_config.density * 10,
    mass: data.sun.mass,
    position: new THREE.Vector3(0, 0, 0),
    fixed: true,
  });
  sun.set_mesh(makeGlassBall(0.5));
  world.add_body(sun);
}

function add_earth(world: World) {
  let earth = new Body({
    ...default_config,
    mass: data.earth.mass,
    position: new THREE.Vector3(0, 0, -data.earth.orbit_radius),
    velocity: new THREE.Vector3(data.earth.velocity, 0, 0),
  });
  earth.set_mesh(makeGlassBall(0.2));
  world.add_body(earth);
}

function add_random_body_sphere(world: World, num: number) {
  for (let i = 0; i < num; i++) {
    let p = new Body({
      ...default_config,
      mass: Math.random() * data.earth.mass * 1000,
      position: random_in_sphere_shell(
        data.earth.orbit_radius * 0.3,
        data.earth.orbit_radius * config.spawn_radius * 2
      ),
      velocity: random_in_sphere_shell(
        data.earth.velocity * 0.1,
        data.earth.velocity * config.planet_velocity * 2
      ),
    });
    world.add_body(p);
  }
}

function add_random_body_flat(world: World, num: number) {
  let p_a = data.earth.orbit_radius * config.spawn_radius * 2;
  let p_b = p_a;
  let p_c = p_a / 6;
  let v_a = data.earth.velocity * config.planet_velocity * 2;
  let v_b = v_a;
  let v_c = v_a / 6;
  for (let i = 0; i < num; i++) {
    let p = new Body({
      ...default_config,
      mass: Math.random() * data.earth.mass * config.planet_mass * 2,
      position: random_in_ellipsoid(p_a, p_c, p_b),
      velocity: random_in_ellipsoid(v_a, v_c, v_b),
    });
    world.add_body(p);
  }
}

async function main() {
  const canvas: HTMLCanvasElement | null = document.querySelector("#stage");
  if (canvas === null) return;
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.autoClearColor = false;

  const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
  camera.position.z = 2 * config.spawn_radius + 5;
  camera.position.y = 3;
  camera.rotateY(-Math.atan(camera.position.y / camera.position.z));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  const scene = new THREE.Scene();
  const world = new World(scene, 24 * 3600);

  const light = new THREE.AmbientLight(0xffffff, 1);
  light.position.set(0, 0, 0);
  scene.add(light);

  if (config.spawn_sun) add_sun(world);
  if (config.spawn_shape === "flat")
    add_random_body_flat(world, config.num_planets);
  else add_random_body_sphere(world, config.num_planets);

  const bg_scene = new THREE.Scene();
  const background = await makeBackground({
    image_uri: bg_uri,
  });
  bg_scene.add(background);

  let stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
  document.body.appendChild(VRButton.createButton(renderer));
  renderer.xr.enabled = true;

  function render() {
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
    // requestAnimationFrame(render);
  }

  renderer.setAnimationLoop(function () {
    render();
  });

  // requestAnimationFrame(render);
}

// ui stuff
document.getElementById("start").onclick = () => {
  let num_planets = parseInt(
    (<HTMLInputElement>document.getElementById("num-planets")).value
  );
  let spawn_radius = parseFloat(
    (<HTMLInputElement>document.getElementById("spawn-radius")).value
  );
  let planet_mass = parseFloat(
    (<HTMLInputElement>document.getElementById("planet-mass")).value
  );
  let planet_velocity = parseFloat(
    (<HTMLInputElement>document.getElementById("planet-velocity")).value
  );
  let spawn_shape = "sphere";
  if (
    (<HTMLOptionElement>document.getElementById("flat-shape")).selected === true
  ) {
    spawn_shape = "flat";
  }
  let spawn_sun = (<HTMLInputElement>document.getElementById("spawn-sun"))
    .checked;
  let tail_length = parseFloat(
    (<HTMLInputElement>document.getElementById("tail-length")).value
  );
  config.num_planets = num_planets;
  config.spawn_radius = spawn_radius;
  config.planet_mass = planet_mass;
  config.planet_velocity = planet_velocity;
  config.spawn_shape = spawn_shape;
  config.spawn_sun = spawn_sun;
  trace_config.trace_num = tail_length;
  document.getElementById("config").hidden = true;
  main();
};
