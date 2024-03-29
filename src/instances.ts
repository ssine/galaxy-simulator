import * as THREE from "three";
import { bg_uri } from "./common";

function makeCude(config: {
  width: number;
  height: number;
  depth: number;
  material_config: THREE.MeshPhongMaterialParameters;
}): THREE.Mesh {
  let { width, height, depth, material_config } = config;
  let geometry = new THREE.BoxGeometry(width, height, depth);
  let material = new THREE.MeshPhongMaterial(material_config);
  return new THREE.Mesh(geometry, material);
}

function makeSphere(config: {
  radius: number;
  num_segments: number;
  material_config: THREE.MeshPhongMaterialParameters;
}): THREE.Mesh {
  let { radius, num_segments, material_config } = config;
  let geometry = new THREE.SphereGeometry(radius, num_segments, num_segments);
  let material = new THREE.MeshPhongMaterial(material_config);
  return new THREE.Mesh(geometry, material);
}

function makeGlassBall(radius: number): THREE.Mesh {
  let sph_texture = new THREE.TextureLoader().load(bg_uri);
  sph_texture.mapping = THREE.EquirectangularRefractionMapping;
  let sphere = makeSphere({
    radius: radius,
    num_segments: 32,
    material_config: {
      color: 0xffffff,
      envMap: sph_texture,
      refractionRatio: 0.98,
      reflectivity: 0.7,
    },
  });
  return sphere;
}

async function makeBackground(config: {
  image_uri: string;
}): Promise<THREE.Mesh> {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(config.image_uri);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;

  const shader = THREE.ShaderLib.equirect;
  const material = new THREE.ShaderMaterial({
    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: shader.uniforms,
    depthWrite: false,
    side: THREE.BackSide,
  });
  material.uniforms.tEquirect.value = texture;
  const plane = new THREE.BoxBufferGeometry(1000, 1000, 1000);
  return new THREE.Mesh(plane, material);
}

function make2DText(config: {
  text: string;
  font: string;
  fill_style: string;
  width: number;
}): THREE.Mesh {
  let { text, font, fill_style, width } = config;
  let canvas = document.createElement("canvas");
  let context = canvas.getContext("2d");
  context.font = font;
  canvas.width = context.measureText(text).width;
  canvas.height = parseInt(font);
  context.font = font;
  context.fillStyle = fill_style;
  context.fillText(text, 0, canvas.height);

  let texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  let plane = new THREE.PlaneGeometry(
    width,
    (width * canvas.height) / canvas.width
  );
  let material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
  material.transparent = true;

  return new THREE.Mesh(plane, material);
}

export { makeCude, makeSphere, makeGlassBall, makeBackground, make2DText };
