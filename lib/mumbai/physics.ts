import { geo } from '../geo';
import { onLand, distanceToShore, MAINLAND } from './coastline';
import { ROADS, roadWorld } from './roads';
import { buildWorld, type Collider } from './world';

export const SEA_LEVEL = -3.0;
export const EYE = 1.68;

/* --------------------------- bridges & causeways -------------------------- */

type Deck = {
  pts: [number, number][];
  halfWidth: number;
  /** Deck height above land datum, as a function of 0..1 along the deck. */
  profile: (t: number) => number;
  lengths: number[];
  total: number;
};

function makeDeck(pts: [number, number][], halfWidth: number, profile: (t: number) => number): Deck {
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lengths.push(total);
  }
  return { pts, halfWidth, profile, lengths, total };
}

const seaLinkPts = roadWorld(ROADS.find((r) => r.id === 'sea-link')!);
const causewayPts = roadWorld(ROADS.find((r) => r.id === 'haji-ali-causeway')!);

export const SEA_LINK = makeDeck(seaLinkPts, 21, (t) => {
  const ramp = 0.07;
  if (t < ramp) return 0.5 + (9 - 0.5) * (t / ramp);
  if (t > 1 - ramp) return 0.5 + (9 - 0.5) * ((1 - t) / ramp);
  const u = (t - ramp) / (1 - 2 * ramp);
  return 9 + 13.5 * Math.sin(Math.PI * u) ** 0.7;
});

export const HAJI_ALI_CAUSEWAY = makeDeck(causewayPts, 4.5, () => 1.1);

const DECKS = [SEA_LINK, HAJI_ALI_CAUSEWAY];

/** Closest point on a deck: returns {dist, t, height} or null when far off. */
function deckSample(deck: Deck, x: number, z: number) {
  let best = Infinity;
  let bestT = 0;
  for (let i = 1; i < deck.pts.length; i++) {
    const [x0, z0] = deck.pts[i - 1];
    const [x1, z1] = deck.pts[i];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - x0) * dx + (z - z0) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = x0 + t * dx;
    const pz = z0 + t * dz;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best) {
      best = dist;
      bestT = (deck.lengths[i - 1] + t * (deck.lengths[i] - deck.lengths[i - 1])) / deck.total;
    }
  }
  return { dist: best, t: bestT, height: deck.profile(bestT) };
}

export function deckHeightAt(x: number, z: number): number | null {
  let out: number | null = null;
  for (const deck of DECKS) {
    const s = deckSample(deck, x, z);
    if (s.dist < deck.halfWidth) out = Math.max(out ?? -Infinity, s.height);
  }
  return out;
}

/* ------------------------------ ground query ------------------------------ */

export type Ground = { y: number; water: boolean; deck: boolean };

export function groundAt(x: number, z: number): Ground {
  const deck = deckHeightAt(x, z);
  if (deck !== null) return { y: deck, water: false, deck: true };
  if (onLand(x, z)) {
    // The shore skirt slopes down into the sea over ~24 m.
    const d = distanceToShore(x, z, MAINLAND);
    if (d < 6) return { y: -Math.max(0, (6 - d) * 0.28), water: false, deck: false };
    return { y: 0, water: false, deck: false };
  }
  return { y: SEA_LEVEL, water: true, deck: false };
}

/* ------------------------------- colliders -------------------------------- */

/** Hand-placed footprints for the modelled landmarks. */
function lm(lat: number, lon: number, hw: number, hd: number, top: number, ox = 0, oz = 0): Collider {
  const [x, z] = geo(lat, lon);
  return { x: x + ox, z: z + oz, hw, hd, top };
}

export const LANDMARK_COLLIDERS: Collider[] = [
  // Gateway of India faces east, so the arch runs east–west and you can walk
  // straight through it; only the piers and the flanking halls are solid.
  lm(18.922, 72.8347, 10, 4.3, 26, 0, -10.8),
  lm(18.922, 72.8347, 10, 4.3, 26, 0, 10.8),
  lm(18.922, 72.8347, 8, 6.5, 12, 0, -21.5),
  lm(18.922, 72.8347, 8, 6.5, 12, 0, 21.5),
  lm(18.9223, 72.832, 20, 41, 46), // Taj Mahal Palace (frontage runs north–south)
  lm(18.9223, 72.832, 13, 18, 78, 0, -70), // Taj Tower, to the north
  lm(18.9398, 72.8354, 52, 34, 49), // CSMT front block
  lm(18.9405, 72.8356, 60, 60, 22), // CSMT train shed
  lm(18.9378, 72.8324, 30, 24, 78), // BMC
  lm(18.92964, 72.82999, 9, 9, 85), // Rajabai
  lm(18.9299, 72.8305, 34, 18, 26), // University library
  lm(18.9302, 72.8298, 52, 20, 40), // High Court
  lm(18.926667, 72.832222, 40, 30, 44), // CSMVS
  lm(18.9296, 72.8331, 17, 17, 95), // BSE
  lm(18.9822, 72.8092, 28, 25, 30), // Haji Ali
  lm(18.9681, 72.8095, 22, 22, 173), // Antilia
  lm(19.01692, 72.830409, 17, 17, 34), // Siddhivinayak
  lm(19.0425, 72.8155, 26, 22, 12), // Bandra Fort
  lm(19.22806, 72.80605, 50, 50, 99), // Vipassana Pagoda
];

const GRID = 48;
type Cell = Collider[];
let grid: Map<string, Cell> | null = null;

function gkey(x: number, z: number) {
  return `${Math.floor(x / GRID)}:${Math.floor(z / GRID)}`;
}

function getGrid() {
  if (grid) return grid;
  grid = new Map();
  const all = [...buildWorld().colliders, ...LANDMARK_COLLIDERS];
  for (const c of all) {
    const x0 = Math.floor((c.x - c.hw) / GRID);
    const x1 = Math.floor((c.x + c.hw) / GRID);
    const z0 = Math.floor((c.z - c.hd) / GRID);
    const z1 = Math.floor((c.z + c.hd) / GRID);
    for (let i = x0; i <= x1; i++)
      for (let j = z0; j <= z1; j++) {
        const k = `${i}:${j}`;
        let cell = grid.get(k);
        if (!cell) grid.set(k, (cell = []));
        cell.push(c);
      }
  }
  return grid;
}

export function collidersNear(x: number, z: number): Collider[] {
  const g = getGrid();
  const out: Collider[] = [];
  const i0 = Math.floor(x / GRID);
  const j0 = Math.floor(z / GRID);
  for (let i = i0 - 1; i <= i0 + 1; i++)
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      const cell = g.get(`${i}:${j}`);
      if (cell) out.push(...cell);
    }
  return out;
}

/**
 * Push a capsule of radius `r` out of any building it has entered. Axis-aligned
 * boxes only — the rotation of a plot is cosmetic, its collider is its bounds.
 */
export function resolve(x: number, z: number, feetY: number, r: number): [number, number] {
  let nx = x;
  let nz = z;
  for (const c of collidersNear(x, z)) {
    if (feetY > c.top - 0.4) continue;
    const dx = nx - c.x;
    const dz = nz - c.z;
    const ox = c.hw + r - Math.abs(dx);
    const oz = c.hd + r - Math.abs(dz);
    if (ox <= 0 || oz <= 0) continue;
    if (ox < oz) nx = c.x + Math.sign(dx || 1) * (c.hw + r);
    else nz = c.z + Math.sign(dz || 1) * (c.hd + r);
  }
  return [nx, nz];
}

/**
 * Somewhere to stand.
 *
 * A latitude and longitude taken off a map lands inside a building about as
 * often as not — landmark footprints are tens of metres across, and a mission
 * marker or a fast-travel arrival inside one is no use to anybody. One pass of
 * `resolve` only pushes out of the nearest wall, which deep inside a block is
 * not enough, so spiral outward until the push-out stops moving the point.
 */
export function openGroundNear(x: number, z: number, r = 1.05): [number, number] {
  const clear = (px: number, pz: number): [number, number] | null => {
    const g = groundAt(px, pz);
    if (g.water) return null;
    const [rx, rz] = resolve(px, pz, g.y, r);
    return Math.hypot(rx - px, rz - pz) < 0.02 ? [rx, rz] : null;
  };
  const here = clear(x, z);
  if (here) return here;
  for (let ring = 1; ring <= 12; ring++) {
    const reach = ring * 5;
    const n = ring * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const spot = clear(x + Math.cos(a) * reach, z + Math.sin(a) * reach);
      if (spot) return spot;
    }
  }
  return resolve(x, z, groundAt(x, z).y, r);
}

