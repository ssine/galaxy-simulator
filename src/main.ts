import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'
import { resizeRendererToDisplaySize } from './utils'
import { makeSphere, makeBackground } from './instances'
import { Body, World } from './world'
import { Stats } from 'stats-js'

const bg_uri = 'assets/img/ESA_Gaia_DR2_AllSky_Brightness_Colour_Cartesian_2000x1000.png';

const data = {
  earth: {
    mass: 5.965e24,
    radius: 6371000,
    orbit_radius: 149597870700,
    velocity: 29805.655
  },
  sun: {
    mass: 1.986e30
  }
}

const config = {
  num_planets: 500,
  total_mass: data.sun.mass * 1.2,
  max_radius: data.earth.orbit_radius * 30 // 30 AU
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

let phong_material = new THREE.MeshPhongMaterial({ color: 0xffffff });

function makeNormalBallMesh(radius: number): THREE.Mesh {
  let sphere = makeSphere({
    radius: radius,
    num_segments: 8,
    material_config: { color: 0xffffff }
  });
  return sphere;
}

function makeCircleMesh(radius: number): THREE.Mesh {
  let geometry = new THREE.CircleGeometry(radius, 4);
  return new THREE.Mesh(geometry, phong_material);;
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
  const world = new World(scene, 24 * 3600);

  const light = new THREE.AmbientLight(0xFFFFFF, 1);
  light.position.set(0, 0, 0);
  scene.add(light);

  let default_config = {
    density: data.earth.mass / (4 / 3 * Math.PI * Math.pow(data.earth.radius, 3)),
    position_scale: 2 / data.earth.orbit_radius,
    radius_scale: 0.01 / data.earth.radius
  }

  let sun = new Body({
    ...default_config,
    mass: data.sun.mass,
    position: new THREE.Vector3(0, 0, 0),
    fixed: true
  });
  // sun.set_mesh(makeGlassBallMesh(0.5));
  let earth = new Body({
    ...default_config,
    mass: data.earth.mass,
    position: new THREE.Vector3(0, 0, -data.earth.orbit_radius),
    velocity: new THREE.Vector3(data.earth.velocity, 0, 0)
  });
  // earth.set_mesh(makeGlassBallMesh(0.2));
  // world.add_body(sun);
  world.add_body(earth);

  for (let i = 0; i < 3000; i++) {
    let p = new Body({
      ...default_config,
      mass: Math.random() * data.earth.mass * 1000,
      position: random_sphere_ponit(data.earth.orbit_radius * 0.3, data.earth.orbit_radius * 3),
      velocity: random_sphere_ponit(data.earth.velocity * 0.1, data.earth.velocity * 1) 
    });
    world.add_body(p);
  }

  // var gridHelper = new THREE.GridHelper(10, 10);
  // scene.add( gridHelper );

  const bg_scene = new THREE.Scene();
  const background = await makeBackground({
    image_uri: bg_uri
  });
  bg_scene.add(background);

  let stats_1 = new Stats();
  let stats_2 = new Stats();
  let stats_3 = new Stats();
  stats_1.showPanel(0);
  stats_2.showPanel(1);
  stats_3.showPanel(2);
  stats_1.domElement.style.cssText = 'position:absolute;top:0px;left:0px;';
  stats_2.domElement.style.cssText = 'position:absolute;top:0px;left:80px;';
  stats_3.domElement.style.cssText = 'position:absolute;top:0px;left:160px;';
  document.body.appendChild( stats_1.dom );
  document.body.appendChild( stats_2.dom );
  document.body.appendChild( stats_3.dom );

  function render(time_ms: number) {
    stats_1.begin();
    stats_2.begin();
    stats_3.begin();
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

    stats_1.end();
    stats_2.end();
    stats_3.end();
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
