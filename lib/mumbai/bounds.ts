import { geo } from '../geo';

/**
 * The playable island.
 *
 * The full Mumbai model runs 27 km from Colaba Point to Versova, which is more
 * city than a game can fill with anything worth doing. So the game ships in
 * phases, and Phase 1 is South Bombay: Colaba Point in the south to the
 * Mahalaxmi–Byculla line in the north, sea on three sides and the docks on the
 * fourth. That is roughly 2.5 km by 1.8 km in world metres — near enough the
 * size of Vice City, and the part of Mumbai with the most to look at.
 *
 * Everything north of the line still exists in the geography — the coastline
 * and the water are drawn — but nothing is generated there and the player is
 * turned back at the border, the way GTA III kept you south of the drawbridge.
 */

export type Phase = {
  id: number;
  name: string;
  /** Northern limit, in latitude. */
  north: number;
  /** Southern limit. */
  south: number;
  west: number;
  east: number;
  /** Areas unlocked, for the pause-menu blurb. */
  blurb: string;
};

export const PHASES: Phase[] = [
  {
    id: 1,
    name: 'South Bombay',
    north: 18.9885,
    south: 18.8935,
    west: 72.7885,
    east: 72.8605,
    blurb:
      'Colaba Point to Mahalaxmi. Apollo Bunder, the Fort, Nariman Point, Marine Drive, Malabar Hill, Byculla and the docks.',
  },
];

export const PHASE = PHASES[0];

const [wx, nz] = geo(PHASE.north, PHASE.west);
const [ex, sz] = geo(PHASE.south, PHASE.east);

/** The playable rectangle in world metres. */
export const BOUNDS = {
  minX: wx,
  maxX: ex,
  minZ: nz,
  maxZ: sz,
  get width() {
    return ex - wx;
  },
  get depth() {
    return sz - nz;
  },
  get cx() {
    return (wx + ex) / 2;
  },
  get cz() {
    return (nz + sz) / 2;
  },
};

/** Is this point inside the playable area? `grow` widens the test. */
export function inPhase(x: number, z: number, grow = 0) {
  return (
    x > BOUNDS.minX - grow &&
    x < BOUNDS.maxX + grow &&
    z > BOUNDS.minZ - grow &&
    z < BOUNDS.maxZ + grow
  );
}

/** Signed distance to the border: positive inside, negative once you are out. */
export function phaseDepth(x: number, z: number) {
  return Math.min(x - BOUNDS.minX, BOUNDS.maxX - x, z - BOUNDS.minZ, BOUNDS.maxZ - z);
}

/** Shove a point back inside the border. */
export function clampToPhase(x: number, z: number, margin = 0): [number, number] {
  return [
    Math.min(Math.max(x, BOUNDS.minX + margin), BOUNDS.maxX - margin),
    Math.min(Math.max(z, BOUNDS.minZ + margin), BOUNDS.maxZ - margin),
  ];
}

/** Clip a polyline to the playable rectangle, dropping the parts outside it. */
export function clipToPhase(pts: [number, number][], grow = 0): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  for (const p of pts) {
    if (inPhase(p[0], p[1], grow)) run.push(p);
    else {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}
