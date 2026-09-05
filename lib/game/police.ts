import * as THREE from 'three';
import { collidersNear, groundAt } from '../mumbai/physics';
import { clampToPhase, inPhase } from '../mumbai/bounds';
import { getState, notify, setState } from '../store';
import { driveStep, forwardSpeed, makeCar, SPECS, type Car } from './vehicles';
import { samplePath, trafficPaths } from './traffic';

/**
 * The police.
 *
 * A wanted level is only worth having if something arrives because of it. Each
 * star puts another Gypsy on the road: they spawn out of sight down one of the
 * arterial roads, drive on the same model the player does, and steer at
 * whatever the player currently is. On foot with a star showing, letting one
 * get alongside you and stop is how you get busted.
 *
 * They are not clever. They probe two points ahead for a wall and turn away
 * from whichever one is blocked, which on a street grid is enough to keep a
 * chase going, and which is roughly the amount of cleverness the games this is
 * imitating gave them.
 */

const GYPSY = SPECS.find((s) => s.id === 'gypsy')!;

export type Cop = {
  car: Car;
  /** Seconds this unit has existed, so we can retire the ones left behind. */
  age: number;
  /** How long it has been stationary — a unit wedged in an alley gets recycled. */
  stuck: number;
};

export const cops: Cop[] = [];

/** Cars on the road for a given number of stars. */
export function unitsFor(wanted: number) {
  if (wanted <= 0) return 0;
  return Math.min(7, wanted + Math.max(0, wanted - 2));
}

let sinceSeen = 0;
let bustTimer = 0;
let spawnTimer = 0;

/** Somewhere on an artery, far enough away that you do not watch it appear. */
function spawnPoint(px: number, pz: number): [number, number, number] | null {
  const paths = trafficPaths();
  for (let attempt = 0; attempt < 24; attempt++) {
    const p = paths[Math.floor(Math.random() * paths.length)];
    const s = samplePath(p, Math.random() * p.total);
    const d = Math.hypot(s.x - px, s.z - pz);
    if (d < 85 || d > 240) continue;
    if (!inPhase(s.x, s.z, -8)) continue;
    if (groundAt(s.x, s.z).water) continue;
    // Point it at the player rather than along the road: it is coming for you.
    return [s.x, s.z, Math.atan2(px - s.x, pz - s.z)];
  }
  return null;
}

/** Is the way ahead clear? Returns a steer correction in -1..1. */
function avoid(car: Car) {
  const look = 6 + Math.abs(forwardSpeed(car)) * 0.8;
  let correction = 0;
  for (const side of [-1, 1]) {
    const a = car.yaw + side * 0.42;
    const x = car.x + Math.sin(a) * look;
    const z = car.z + Math.cos(a) * look;
    if (!inPhase(x, z, 4) || groundAt(x, z).water) {
      correction -= side;
      continue;
    }
    for (const c of collidersNear(x, z)) {
      if (Math.abs(x - c.x) < c.hw + 1.4 && Math.abs(z - c.z) < c.hd + 1.4) {
        correction -= side;
        break;
      }
    }
  }
  return THREE.MathUtils.clamp(correction, -1, 1);
}

export function clearPolice() {
  cops.length = 0;
  bustTimer = 0;
  sinceSeen = 0;
}

export function stepPolice(
  dt: number,
  px: number,
  pz: number,
  onFoot: boolean
): { busted: boolean } {
  const st = getState();
  const wanted = st.wanted;
  const want = unitsFor(wanted);

  // Retire anyone who has been left a long way behind, or wedged.
  for (let i = cops.length - 1; i >= 0; i--) {
    const c = cops[i];
    c.age += dt;
    const d = Math.hypot(c.car.x - px, c.car.z - pz);
    if (Math.abs(forwardSpeed(c.car)) < 0.6) c.stuck += dt;
    else c.stuck = 0;
    if (d > 340 || c.stuck > 7 || c.car.health <= 0 || cops.length > want) cops.splice(i, 1);
  }

  spawnTimer -= dt;
  if (cops.length < want && spawnTimer <= 0) {
    spawnTimer = 1.6;
    const at = spawnPoint(px, pz);
    if (at) {
      const car = makeCar(GYPSY, at[0], at[1], at[2]);
      cops.push({ car, age: 0, stuck: 0 });
    }
  }

  let nearest = Infinity;
  let busted = false;

  for (const c of cops) {
    const car = c.car;
    const dx = px - car.x;
    const dz = pz - car.z;
    const dist = Math.hypot(dx, dz);
    nearest = Math.min(nearest, dist);

    // Steer at the player. Positive steer raises yaw, and yaw is measured the
    // same way as the bearing, so the correction goes in with its own sign.
    let want = Math.atan2(dx, dz) - car.yaw;
    want = Math.atan2(Math.sin(want), Math.cos(want));
    const pursue = THREE.MathUtils.clamp(want * 1.9, -1, 1);
    // A wall ahead overrides, but never completely: they are still coming.
    const dodge = avoid(car);
    const steer = dodge === 0 ? pursue : THREE.MathUtils.clamp(pursue * 0.4 + dodge * 0.85, -1, 1);

    // Close right up to someone on foot; hang off a moving car and shunt it.
    const hold = onFoot ? 3.2 : 6.5;
    const speed = Math.abs(forwardSpeed(car));
    let throttle = dist > hold + 14 ? 1 : dist > hold ? 0.55 : -0.5;
    if (c.stuck > 1.2) throttle = -0.8;

    driveStep(
      car,
      {
        throttle,
        steer: THREE.MathUtils.clamp(steer, -1, 1),
        handbrake: dist < 14 && speed > 13,
      },
      dt
    );

    if (onFoot && dist < 5.4 && speed < 4.5) {
      bustTimer += dt;
      if (bustTimer > 1.1) busted = true;
    }
  }

  if (!onFoot || nearest > 7) bustTimer = Math.max(0, bustTimer - dt * 0.6);

  // Lose them and the heat comes off, a star at a time.
  if (wanted > 0) {
    if (nearest > 170 || cops.length === 0) sinceSeen += dt;
    else sinceSeen = 0;
    if (sinceSeen > 11) {
      sinceSeen = 0;
      setState({ wanted: wanted - 1 });
      if (wanted - 1 === 0) notify('alert', 'You lost them');
    }
  } else {
    sinceSeen = 0;
  }

  return { busted };
}

/* ------------------------------- the crimes ------------------------------- */

let heat = 0;

/**
 * Crimes bank up before they cost you a star, so clipping one person on the
 * pavement is a warning and ploughing through four is a chase.
 */
export function commitCrime(weight: number, reason?: string) {
  const st = getState();
  if (st.down) return;
  heat += weight;
  const stars = Math.min(6, st.wanted + Math.floor(heat));
  heat -= Math.floor(heat);
  if (stars > st.wanted) {
    setState({ wanted: stars });
    if (reason) notify('alert', reason);
    sinceSeen = 0;
  }
}

/** Where the units are, for the radar. */
export function copBlips() {
  return cops.map((c) => ({ x: c.car.x, z: c.car.z, colour: '#4f9bff' }));
}

export { clampToPhase };
