import * as THREE from 'three'

type Vec3 = THREE.Vector3;

class Body {
  mass: number;
  position: Vec3;
  velocity: Vec3;
  force: Vec3;
  time: number;
  mesh: THREE.Mesh | null;
  scale: number;
  fixed: boolean;

  constructor(mass: number, position: Vec3, velocity = new THREE.Vector3(0, 0, 0), fixed = false) {
    this.mass = mass;
    this.position = position;
    this.velocity = velocity;
    this.force = new THREE.Vector3(0, 0, 0);
    this.mesh = null;
    this.time = -1;
    this.fixed = fixed;
  };

  set_scale(scale: number) {
    this.scale = scale;
  }
  set_mesh(mesh: THREE.Mesh) {
    this.mesh = mesh;
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
    this.sync();
  };
  sync() {
    if (this.mesh === null) throw 'no corresponding mesh in scene.';
    this.mesh.position.copy(this.position);
    this.mesh.position.multiplyScalar(this.scale);
  };
}

class World {
  scene: THREE.Scene;
  bodies: Body[];
  G: number;
  time: number;
  step_time: number;
  scale: number;
  constructor(scene: THREE.Scene, step_time: number, scale = 1, G = 6.67259e-11) {
    this.scene = scene;
    this.bodies = [];
    this.G = G;
    this.time = 0;
    this.step_time = step_time;
    this.scale = scale;
  };

  add_body(b: Body) {
    if (b.mesh === null) throw 'body without mesh cannot be added to a world.';
    b.set_scale(this.scale);
    this.scene.add(b.mesh);
    this.bodies.push(b);
  }

  compute_gravity(a: Body, b: Body): Vec3 {
    // compute the gravity applied by a to b
    let d = a.position.distanceTo(b.position);
    let r_hat = new THREE.Vector3().subVectors(a.position, b.position).normalize();
    let m_a = a.mass, m_b = b.mass;
    return r_hat.multiplyScalar(this.G * m_a * m_b / (d * d));
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
  };
}

export { Body, World }