import * as THREE from 'three'
import { hsv_to_rgb } from './utils'
import { solar_sys_data as data, default_config, trace_num, trace_prelocate } from './common'

type Vec3 = THREE.Vector3;

class Body {
  mass: number;
  position: Vec3;
  velocity: Vec3;
  force: Vec3;
  time: number;
  mesh: THREE.Mesh;
  trace_mesh: THREE.Line;
  position_scale: number;
  radius_scale: number;
  fixed: boolean;
  radius: number;
  density: number;
  _trace_start_idx: number;
  _trace_end_idx: number;

  constructor(config: {
    mass: number,
    density: number,
    position: Vec3,
    velocity?: Vec3,
    fixed?: boolean,
    position_scale?: number,
    radius_scale?: number,
    color?: number
  }) {
    if (!config.velocity) config.velocity = new THREE.Vector3(0, 0, 0);
    if (!config.fixed) config.fixed = false;
    if (!config.position_scale) config.position_scale = 1;
    if (!config.radius_scale) config.radius_scale = 1;
    if (!config.color) config.color = hsv_to_rgb(Math.random() * 180, 0.7, 1);
    this.mass = config.mass;
    this.position = config.position;
    this.velocity = config.velocity;
    this.position_scale = config.position_scale;
    this.radius_scale = config.radius_scale;
    this.force = new THREE.Vector3(0, 0, 0);
    this.time = -1;
    this.fixed = config.fixed;
    this.density = config.density;
    this.radius = Math.pow((3 * this.mass) / (4 * Math.PI * config.density), 1/3);

    let geometry = new THREE.SphereGeometry(this.radius * this.radius_scale, 16, 16);
    let material = new THREE.MeshPhongMaterial({ color: config.color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.sync();

    let trace_geometry = new THREE.BufferGeometry();
    let positions = new Float32Array(trace_num * 3 * trace_prelocate);
    positions[0] = this.position.x * this.position_scale;
    positions[1] = this.position.y * this.position_scale;
    positions[2] = this.position.z * this.position_scale;
    for (let i = 0; i < trace_num; i++)
      trace_geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    trace_geometry.setDrawRange(0, 1);
    this._trace_start_idx = 0;
    this._trace_end_idx = 1;
    let trace_material = new THREE.LineBasicMaterial({ color: config.color, linewidth: 2 });
    this.trace_mesh = new THREE.Line(trace_geometry, trace_material);
  };

  set_mesh(mesh: THREE.Mesh) {
    this.mesh = mesh;
  };
  get_mesh(): THREE.Mesh {
    return this.mesh;
  };
  set_velocity(v: Vec3) {
    this.velocity = v;
  }
  clear_force() {
    this.force.set(0, 0, 0);
  }
  add_force(f: Vec3) {
    this.force.add(f);
  }
  set_force(force: Vec3) {
    this.force = force;
  };

  step(time: number) {
    if (this.time === -1) {
      this.time = time;
      return;
    }
    if (this.fixed) return;
    let delta = time - this.time;
    this.time = time;
    this.velocity.addScaledVector(this.force.divideScalar(this.mass), delta);
    this.position.addScaledVector(this.velocity, delta);

    let trace_geometry: THREE.BufferGeometry = <THREE.BufferGeometry>this.trace_mesh.geometry;
    let positions = <any[]>trace_geometry.attributes.position.array;
    if (this._trace_end_idx === trace_num * trace_prelocate - 1) {
      let last_start = this._trace_start_idx * 3;
      for (let i = 0; i < this._trace_end_idx - this._trace_start_idx; i++) {
        let idx = i * 3;
        positions[idx] = positions[last_start + idx];
        positions[idx + 1] = positions[last_start + idx + 1];
        positions[idx + 2] = positions[last_start + idx + 2];
      }
      this._trace_end_idx -= this._trace_start_idx;
      this._trace_start_idx = 0;
    }
    positions[this._trace_end_idx * 3] = this.position.x * this.position_scale;
    positions[this._trace_end_idx * 3 + 1] = this.position.y * this.position_scale;
    positions[this._trace_end_idx * 3 + 2] = this.position.z * this.position_scale;
    this._trace_end_idx++;
    if (this._trace_end_idx - this._trace_start_idx > trace_num)
      this._trace_start_idx = this._trace_end_idx - trace_num;
    trace_geometry.setDrawRange(this._trace_start_idx, this._trace_end_idx - this._trace_start_idx);
    //@ts-ignore
    trace_geometry.attributes.position.needsUpdate = true;
    trace_geometry.computeBoundingSphere();

    this.sync();
  };
  sync() {
    if (this.mesh === null) throw 'no corresponding mesh in scene.';
    this.mesh.position.copy(this.position);
    this.mesh.position.multiplyScalar(this.position_scale);
  };
}

class World {
  scene: THREE.Scene;
  bodies: Body[];
  G: number;
  time: number;
  step_time: number;
  constructor(scene: THREE.Scene, step_time: number, G = 6.67259e-11) {
    this.scene = scene;
    this.bodies = [];
    this.G = G;
    this.time = 0;
    this.step_time = step_time;
  };

  add_body(b: Body) {
    if (b.mesh === null) throw 'body without mesh cannot be added to a world.';
    this.add_to_scene(b);
    this.bodies.push(b);
  }

  add_to_scene(b: Body) {
    this.scene.add(b.mesh);
    this.scene.add(b.trace_mesh);
  }
  remove_from_scene(b: Body) {
    this.scene.remove(b.mesh);
    this.scene.remove(b.trace_mesh);
  }

  compute_gravity(a: Body, b: Body): Vec3 {
    // compute the gravity applied by a to b
    let d = a.position.distanceTo(b.position);
    let r_hat = new THREE.Vector3().subVectors(a.position, b.position).normalize();
    let m_a = a.mass, m_b = b.mass;
    return r_hat.multiplyScalar(this.G * m_a * m_b / (d * d));
  }
  is_collide(a: Body, b: Body): boolean {
    return a.position.distanceTo(b.position) * a.position_scale < (a.radius + b.radius) * a.radius_scale;
  }
  fuse_body(a: Body, b: Body): Body {
    let m_a = a.mass, m_b = b.mass;
    let m_ab = m_a + m_b;
    if (a.fixed || b.fixed) {
      let f = a.fixed ? a : b;
      return new Body({
        ...default_config,
        mass: m_ab,
        density: (a.density * m_a + b.density * m_b) / m_ab,
        position: f.position,
        fixed: true
      });
    }
    return new Body({
      ...default_config,
      mass: m_ab,
      density: (a.density * m_a + b.density * m_b) / m_ab,
      position: a.position.multiplyScalar(m_a).add(b.position.multiplyScalar(m_b)).divideScalar(m_ab),
      velocity: a.velocity.multiplyScalar(m_a).add(b.velocity.multiplyScalar(m_b)).divideScalar(m_ab)
    })
  }

  step() {
    this.time += this.step_time;
    for (let b of this.bodies)
      b.clear_force();
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        let a = this.bodies[i], b = this.bodies[j];
        let gravity = this.compute_gravity(a, b);
        b.add_force(gravity);
        a.add_force(gravity.multiplyScalar(-1));
      }
    }
    for (let b of this.bodies)
      b.step(this.time);

    let new_bodies: Body[] = [];
    let collide_mask = new Int8Array(this.bodies.length);
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        if (collide_mask[i] || collide_mask[j]) continue;
        let a = this.bodies[i], b = this.bodies[j];
        if (this.is_collide(a, b)) {
          let fused_body = this.fuse_body(a, b);
          new_bodies.push(fused_body);
          this.add_to_scene(fused_body);
          collide_mask[i] = collide_mask[j] = 1;
        }
      }
    }
    this.bodies.forEach((val, idx) => {
      if (!collide_mask[idx]) new_bodies.push(val);
      else this.remove_from_scene(val);
    });
    this.bodies = new_bodies;
  };
}

export { Body, World }