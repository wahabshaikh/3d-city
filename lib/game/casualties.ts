import type { Person } from '../mumbai/world';

/**
 * Anyone who has just been hit.
 *
 * The crowd is an instance buffer with no state, so someone who goes down has
 * to leave it and come back as a real, jointed body for a few seconds. There
 * are never many at once, so a pool of eight is plenty: past that, the oldest
 * gets up and walks off screen, which is to say it is quietly recycled.
 */

export type Casualty = {
  x: number;
  z: number;
  /** Which way they were facing, and which way they were thrown. */
  yaw: number;
  dir: number;
  colour: number;
  lower: number;
  skin: number;
  /** Seconds since the hit. */
  t: number;
  /** Slide left to run off, in metres per second. */
  slide: number;
};

export const casualties: Casualty[] = [];

export const LIFETIME = 11;

export function addCasualty(person: Person, dir: number, speed: number) {
  if (casualties.length >= 8) casualties.shift();
  casualties.push({
    x: person.x,
    z: person.z,
    yaw: person.rot,
    dir,
    colour: person.colour,
    lower: person.lower,
    skin: person.skin,
    t: 0,
    slide: Math.min(7, speed * 0.35),
  });
}

export function stepCasualties(dt: number) {
  for (let i = casualties.length - 1; i >= 0; i--) {
    const c = casualties[i];
    c.t += dt;
    // Carried along by the hit, then friction takes it out.
    c.x += Math.sin(c.dir) * c.slide * dt;
    c.z += Math.cos(c.dir) * c.slide * dt;
    c.slide *= Math.max(0, 1 - 4.5 * dt);
    if (c.t > LIFETIME) casualties.splice(i, 1);
  }
}
