/** Deterministic PRNG so the city is identical on every load and on the server. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export const rand = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);
export const randInt = (r: Rng, lo: number, hi: number) => Math.floor(rand(r, lo, hi + 1));
export const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
export const chance = (r: Rng, p: number) => r() < p;
