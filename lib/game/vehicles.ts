import * as THREE from 'three';
import { groundAt, resolve, SEA_LEVEL } from '../mumbai/physics';
import { clampToPhase, inPhase } from '../mumbai/bounds';

/**
 * Handling.
 *
 * Not a simulation — an arcade model in the shape of the ones that made GTA
 * drive the way it does. Velocity is kept as a vector and split into a forward
 * and a sideways component each frame; the tyres bleed off the sideways part
 * at a rate set by `grip`, and the handbrake simply lowers that rate until the
 * back end lets go. Steering authority falls away at a standstill and again at
 * the top end, so a bus understeers and a bike does not.
 */

export type Spec = {
  id: string;
  name: string;
  /** Index into `vehicleGeometry()`. */
  geo: number;
  /** m/s. 22 m/s ≈ 80 km/h. */
  top: number;
  /** m/s² at full throttle. */
  power: number;
  brake: number;
  /** Lateral grip; lower slides. */
  grip: number;
  /** rad/s of yaw at full lock. */
  steer: number;
  /** Body half-extents for collision and for the camera. */
  halfWidth: number;
  halfLength: number;
  /** Eye height of the driver above the vehicle origin — where the camera looks. */
  seatY: number;
  seatZ: number;
  /** Where the driver's feet go: [across, up, along]. Right-hand drive. */
  driver: [number, number, number];
  /** Some bodies you simply cannot see into. */
  hideDriver?: boolean;
  /** Roughly how much punishment the shell takes. */
  armour: number;
  mass: number;
  paint?: number[];
};

const PAINT = [
  0xdedbd2, 0xc9c6bd, 0xb8bcc0, 0x8d99a3, 0x9c5a4a, 0x5f6b6f, 0xe2ddcd, 0x6f7a72, 0x3f4a55,
  0x7d4a3a,
];

export const SPECS: Spec[] = [
  {
    id: 'padmini',
    name: 'Premier Padmini',
    geo: 0,
    top: 24,
    power: 8.5,
    brake: 15,
    grip: 7.4,
    steer: 1.5,
    halfWidth: 0.85,
    halfLength: 2.05,
    seatY: 1.02,
    seatZ: 0.1,
    driver: [0.26, -0.3, 0.1],
    armour: 100,
    mass: 900,
  },
  {
    id: 'best',
    name: 'BEST Double-Decker',
    geo: 1,
    top: 17,
    power: 3.6,
    brake: 8,
    grip: 5.4,
    steer: 0.72,
    halfWidth: 1.3,
    halfLength: 5.2,
    seatY: 2.0,
    seatZ: 3.9,
    driver: [0.7, 0.62, 3.9],
    hideDriver: true,
    armour: 320,
    mass: 12000,
  },
  {
    id: 'auto',
    name: 'Auto-Rickshaw',
    geo: 2,
    top: 16,
    power: 6.4,
    brake: 12,
    grip: 5.6,
    steer: 2.1,
    halfWidth: 0.68,
    halfLength: 1.3,
    seatY: 0.94,
    seatZ: -0.1,
    driver: [0, -0.08, -0.15],
    armour: 55,
    mass: 400,
  },
  {
    id: 'sedan',
    name: 'Sedan',
    geo: 3,
    top: 30,
    power: 10.5,
    brake: 17,
    grip: 8.2,
    steer: 1.45,
    halfWidth: 0.9,
    halfLength: 2.2,
    seatY: 1.0,
    seatZ: 0.15,
    driver: [0.28, -0.32, 0.15],
    armour: 120,
    mass: 1250,
    paint: PAINT,
  },
  {
    id: 'gypsy',
    name: 'Police Gypsy',
    geo: 4,
    top: 28,
    power: 11.5,
    brake: 18,
    grip: 7.8,
    steer: 1.7,
    halfWidth: 0.85,
    halfLength: 1.98,
    seatY: 1.24,
    seatZ: 0.3,
    driver: [0.28, -0.12, 0.3],
    armour: 180,
    mass: 1400,
  },
  {
    id: 'bike',
    name: 'Commuter 150',
    geo: 5,
    top: 32,
    power: 13,
    brake: 16,
    grip: 9.5,
    steer: 2.4,
    halfWidth: 0.35,
    halfLength: 0.95,
    seatY: 0.92,
    seatZ: -0.16,
    driver: [0, -0.16, -0.18],
    armour: 30,
    mass: 150,
  },
];

export const SPEC_BY_ID = Object.fromEntries(SPECS.map((s) => [s.id, s]));

export type Car = {
  spec: Spec;
  x: number;
  z: number;
  y: number;
  /** Yaw, matching Object3D.rotation.y: 0 faces +z. */
  yaw: number;
  /** Body roll and pitch, cosmetic. */
  roll: number;
  pitch: number;
  /** World velocity on the ground plane. */
  vx: number;
  vz: number;
  /** Front wheel angle, for the wheel meshes and the driver's hands. */
  wheel: number;
  health: number;
  colour: number;
  /** Distance travelled, for wheel spin. */
  odo: number;
  /** Set when the car has gone into the sea. */
  drowned: boolean;
  /** Rings after a heavy hit, so the HUD can shake. */
  impact: number;
};

export type DriveInput = {
  throttle: number;
  steer: number;
  handbrake: boolean;
};

export function makeCar(spec: Spec, x: number, z: number, yaw: number, colour?: number): Car {
  const paint = spec.paint;
  return {
    spec,
    x,
    z,
    y: groundAt(x, z).y,
    yaw,
    roll: 0,
    pitch: 0,
    vx: 0,
    vz: 0,
    wheel: 0,
    health: spec.armour,
    colour: colour ?? (paint ? paint[Math.abs(Math.round(x + z * 3)) % paint.length] : 0xffffff),
    odo: 0,
    drowned: false,
    impact: 0,
  };
}

export const speedOf = (c: Car) => Math.hypot(c.vx, c.vz);

/** Signed forward speed — negative in reverse. */
export function forwardSpeed(c: Car) {
  return c.vx * Math.sin(c.yaw) + c.vz * Math.cos(c.yaw);
}

const damp = THREE.MathUtils.damp;

export function driveStep(c: Car, input: DriveInput, dt: number) {
  const s = c.spec;
  const fx = Math.sin(c.yaw);
  const fz = Math.cos(c.yaw);
  const rx = fz;
  const rz = -fx;

  let vf = c.vx * fx + c.vz * fz;
  let vs = c.vx * rx + c.vz * rz;

  const drowning = c.drowned;
  const power = drowning ? 0 : s.power;

  // Throttle, brake and the engine's own falling-off at the top end.
  if (input.throttle > 0) {
    const head = Math.max(0, 1 - Math.max(0, vf) / s.top);
    vf += input.throttle * power * (0.35 + 0.65 * head) * dt;
  } else if (input.throttle < 0) {
    if (vf > 0.4) vf -= Math.min(vf, s.brake * dt) * -input.throttle;
    else vf += input.throttle * power * 0.5 * dt; // reverse gear
  }
  if (input.handbrake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), s.brake * 0.7 * dt);

  // Rolling resistance and drag.
  vf -= vf * (0.55 + Math.abs(vf) * 0.018) * dt;
  if (Math.abs(vf) < 0.05 && input.throttle === 0) vf = 0;
  vf = THREE.MathUtils.clamp(vf, -s.top * 0.4, s.top);

  // Steering: no authority parked, and progressively less of it at speed.
  const bite = THREE.MathUtils.clamp(Math.abs(vf) / 5, 0, 1);
  const fade = 1 / (1 + Math.abs(vf) * 0.045);
  c.wheel = damp(c.wheel, input.steer, 12, dt);
  const yawRate = c.wheel * s.steer * bite * fade * Math.sign(vf || 1);
  c.yaw += yawRate * dt;

  // Tyres scrub off the sideways component. The handbrake is just less grip.
  vs += yawRate * vf * dt * 0.9;
  const grip = input.handbrake ? s.grip * 0.16 : s.grip;
  vs = damp(vs, 0, grip, dt);
  vs = THREE.MathUtils.clamp(vs, -14, 14);

  c.vx = fx * vf + rx * vs;
  c.vz = fz * vf + rz * vs;

  // Body attitude, entirely cosmetic but it is most of what sells the weight.
  c.roll = damp(c.roll, THREE.MathUtils.clamp(-vs * 0.035 - yawRate * vf * 0.02, -0.28, 0.28), 8, dt);
  const accel = input.throttle > 0 ? -input.throttle * 0.03 : input.throttle * 0.05;
  c.pitch = damp(c.pitch, THREE.MathUtils.clamp(accel, -0.1, 0.14), 7, dt);

  // Move, then push out of anything solid and lose the speed to the impact.
  const nx = c.x + c.vx * dt;
  const nz = c.z + c.vz * dt;
  const r = Math.max(s.halfWidth, s.halfLength * 0.62);
  const [cx, cz] = resolve(nx, nz, c.y + 0.3, r);
  const [px, pz] = clampToPhase(cx, cz, 3);
  const hit = Math.hypot(px - nx, pz - nz);
  if (hit > 0.004) {
    const bleed = Math.min(1, hit * 9);
    const wasted = speedOf(c) * bleed;
    c.vx *= 1 - bleed * 0.92;
    c.vz *= 1 - bleed * 0.92;
    if (wasted > 5) {
      c.health -= (wasted - 5) * 1.6;
      c.impact = Math.min(1, (wasted - 5) / 14);
    }
  }
  c.x = px;
  c.z = pz;
  c.odo += Math.abs(vf) * dt;

  // Ground. Drive off the sea wall and you are swimming.
  const g = groundAt(c.x, c.z);
  if (g.water) {
    c.drowned = true;
    c.y = damp(c.y, SEA_LEVEL - 1.4, 1.1, dt);
    c.vx *= 1 - 1.6 * dt;
    c.vz *= 1 - 1.6 * dt;
  } else {
    c.y = damp(c.y, g.y, 14, dt);
  }
  c.impact = Math.max(0, c.impact - dt * 2.4);
  return c;
}

/** Where the driver's head sits, in world space. */
export function seatWorld(c: Car, out = new THREE.Vector3()) {
  const fx = Math.sin(c.yaw);
  const fz = Math.cos(c.yaw);
  return out.set(c.x + fx * c.spec.seatZ, c.y + c.spec.seatY, c.z + fz * c.spec.seatZ);
}

/** A spot beside the car to step out onto, kept on land and inside the map. */
export function exitWorld(c: Car): [number, number] {
  const rx = Math.cos(c.yaw);
  const rz = -Math.sin(c.yaw);
  const reach = c.spec.halfWidth + 0.85;
  for (const side of [-1, 1]) {
    const x = c.x + rx * reach * side;
    const z = c.z + rz * reach * side;
    if (!groundAt(x, z).water && inPhase(x, z, -2)) return [x, z];
  }
  return [c.x, c.z];
}
