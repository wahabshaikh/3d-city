import { MAINLAND, GORAI, distanceToShore, pointInPolygon } from './coastline';
import { ROADS, RAIL_LINES, roadWorld, railWorld } from './roads';
import {
  DISTRICTS_W,
  STYLES,
  nearestDistrict,
  inLandmarkPlot,
  inOpenSpace,
  type DistrictW,
} from './districts';

/**
 * The gullies.
 *
 * `roads.ts` carries the named arteries — Marine Drive, D.N. Road, the Western
 * Express Highway. Between them Mumbai is a fine mesh of lanes that has no name
 * worth tracing, so it is generated: every district gets a grid on its own
 * grain, clipped to the land, to the arteries and to the maidans.
 *
 * Two things depend on this. The buildings are laid out along it, which is what
 * turns a field of boxes into blocks with frontages; and it is drawn, which is
 * what puts a street under your feet instead of bare ground.
 */

export type Span = {
  /** Centre of the span. */
  x: number;
  z: number;
  /** Bearing of the span in radians, measured the same way as Object3D.rotation.y. */
  rot: number;
  /** Length along the lane. */
  len: number;
  /** Half-width, kerb to kerb. */
  hw: number;
  /** Slum gullies are unmade: dirt, no kerb, no markings. */
  gully: boolean;
  /** Family A runs along the district's grain, B across it. */
  cross: boolean;
};

export type StreetNet = {
  spans: Span[];
  /** Lamp posts along the wider lanes. */
  lamps: { x: number; z: number; rot: number }[];
};

const STEP = 11;
/** Lanes stop this far short of the water. */
const SHORE_MARGIN = 7;

/* ------------------------------ arterial mask ----------------------------- */

const A_CELL = 16;
const akey = (x: number, z: number) => `${Math.floor(x / A_CELL)}:${Math.floor(z / A_CELL)}`;

let arterialMask: Set<string> | null = null;

/** Cells covered by a named road or a railway, where a local lane would collide. */
function getArterialMask() {
  if (arterialMask) return arterialMask;
  const set = new Set<string>();
  const stamp = (pts: [number, number][], halfWidth: number) => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.max(1, Math.ceil(len / (A_CELL * 0.5)));
      const rad = Math.ceil(halfWidth / A_CELL);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = x0 + (x1 - x0) * t;
        const cz = z0 + (z1 - z0) * t;
        for (let a = -rad; a <= rad; a++)
          for (let b = -rad; b <= rad; b++) set.add(akey(cx + a * A_CELL, cz + b * A_CELL));
      }
    }
  };
  for (const r of ROADS) stamp(roadWorld(r), r.width + 4);
  for (const r of RAIL_LINES) stamp(railWorld(r), 13);
  arterialMask = set;
  return set;
}

export function onArterial(x: number, z: number) {
  return getArterialMask().has(akey(x, z));
}

/* ------------------------------- generation ------------------------------- */

let net: StreetNet | null = null;

function landAt(x: number, z: number) {
  if (pointInPolygon(x, z, MAINLAND))
    return distanceToShore(x, z, MAINLAND) > SHORE_MARGIN ? 1 : 0;
  if (pointInPolygon(x, z, GORAI)) return distanceToShore(x, z, GORAI) > SHORE_MARGIN ? 1 : 0;
  return 0;
}

/** Is this the district that owns the ground under (x, z)? */
function owns(d: DistrictW | null, x: number, z: number) {
  return nearestDistrict(x, z) === d;
}

type Grid = {
  d: DistrictW | null;
  /** Origin of the local frame. */
  ox: number;
  oz: number;
  /** Bearing of the grain, radians. */
  a: number;
  block: number;
  hw: number;
  gully: boolean;
  /** Half-extent to sweep in the local frame. */
  reach: number;
};

function pushSpans(out: Span[], lamps: StreetNet['lamps'], g: Grid) {
  const ca = Math.cos(g.a);
  const sa = Math.sin(g.a);
  // local (u along grain, v across) -> world
  const toWorld = (u: number, v: number): [number, number] => [
    g.ox + u * ca - v * sa,
    g.oz + u * sa + v * ca,
  ];

  const n = Math.ceil(g.reach / g.block);
  const clearance = g.hw + 0.7;

  // A hash on the line index, so blocks come out uneven the way real ones are:
  // some lanes shifted off the module, and every so often one never cut at all.
  const wobble = (k: number) => {
    const h = Math.sin(k * 12.9898 + g.a * 78.233 + g.ox * 0.017) * 43758.5453;
    return h - Math.floor(h);
  };

  // Lay out both families up front: the cross family has to know exactly where
  // the along family sits so it can give way at the junctions.
  const lines: number[][] = [[], []];
  for (let cross = 0; cross < 2; cross++)
    for (let k = -n; k <= n; k++) {
      const w = wobble(k + cross * 97);
      if (k !== 0 && w > 0.9) continue; // two blocks knocked into one
      lines[cross].push(k * g.block + (w - 0.5) * g.block * 0.16);
    }

  for (let cross = 0; cross < 2; cross++) {
    for (const line of lines[cross]) {
      let run: { u: number; v: number }[] = [];

      const flush = () => {
        if (run.length < 2) {
          run = [];
          return;
        }
        // Emit one quad per step so the lane can follow the coast and stop at
        // the maidans without a separate clipping pass.
        for (let i = 1; i < run.length; i++) {
          const a = run[i - 1];
          const b = run[i];
          const [x0, z0] = toWorld(a.u, a.v);
          const [x1, z1] = toWorld(b.u, b.v);
          const len = Math.hypot(x1 - x0, z1 - z0);
          if (len < 0.5) continue;
          out.push({
            x: (x0 + x1) / 2,
            z: (z0 + z1) / 2,
            rot: Math.atan2(x1 - x0, z1 - z0),
            // overlap slightly so the quads never show a seam on a corner
            len: len + 0.35,
            hw: g.hw,
            gully: g.gully,
            cross: cross === 1,
          });
        }
        // A lamp every few spans on anything wider than a gully.
        if (!g.gully) {
          for (let i = 2; i < run.length - 1; i += 4) {
            const [lx, lz] = toWorld(run[i].u, run[i].v);
            const nx = cross ? ca : -sa;
            const nz = cross ? sa : ca;
            lamps.push({
              x: lx + nx * (g.hw + 1.1),
              z: lz + nz * (g.hw + 1.1),
              rot: Math.atan2(-nx, -nz),
            });
          }
        }
        run = [];
      };

      for (let s = -g.reach; s <= g.reach; s += STEP) {
        const u = cross ? line : s;
        const v = cross ? s : line;

        // Give way at the crossings: the along-grain family runs through.
        // `lines[0]` is sorted and near-regular, so only the neighbours of the
        // estimated index can be within a lane width.
        if (cross) {
          const along = lines[0];
          const i0 = Math.round((v - along[0]) / g.block);
          let atJunction = false;
          for (let i = Math.max(0, i0 - 2); i <= Math.min(along.length - 1, i0 + 2); i++)
            if (Math.abs(v - along[i]) < clearance) {
              atJunction = true;
              break;
            }
          if (atJunction) {
            flush();
            continue;
          }
        }

        const [x, z] = toWorld(u, v);
        // Cheapest rejections first: this loop runs a few hundred thousand times.
        if (
          !owns(g.d, x, z) ||
          onArterial(x, z) ||
          inOpenSpace(x, z) ||
          inLandmarkPlot(x, z, 0.72) ||
          !landAt(x, z)
        ) {
          flush();
          continue;
        }
        run.push({ u, v });
      }
      flush();
    }
  }
}

export function streetNet(): StreetNet {
  if (net) return net;
  const spans: Span[] = [];
  const lamps: StreetNet['lamps'] = [];

  for (const d of DISTRICTS_W) {
    const st = STYLES[d.style];
    pushSpans(spans, lamps, {
      d,
      ox: d.x,
      oz: d.z,
      a: (d.grain * Math.PI) / 180,
      block: st.block,
      hw: st.lane,
      gully: d.style === 'slum',
      reach: d.rw + st.block,
    });
  }

  // The gaps between districts — mostly the eastern flats and the far north —
  // still need lanes, on one indifferent grain.
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of MAINLAND) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  pushSpans(spans, lamps, {
    d: null,
    ox: (minX + maxX) / 2,
    oz: (minZ + maxZ) / 2,
    a: (18 * Math.PI) / 180,
    block: 76,
    hw: 5.0,
    gully: false,
    reach: Math.max(maxX - minX, maxZ - minZ) / 2 + 80,
  });

  net = { spans, lamps };
  return net;
}

/* ------------------------------- lane queries ----------------------------- */

const S_CELL = 24;
let index: Map<string, number[]> | null = null;

function getIndex() {
  if (index) return index;
  index = new Map<string, number[]>();
  const { spans } = streetNet();
  spans.forEach((s, i) => {
    const r = s.len / 2 + s.hw + 4;
    const x0 = Math.floor((s.x - r) / S_CELL);
    const x1 = Math.floor((s.x + r) / S_CELL);
    const z0 = Math.floor((s.z - r) / S_CELL);
    const z1 = Math.floor((s.z + r) / S_CELL);
    for (let a = x0; a <= x1; a++)
      for (let b = z0; b <= z1; b++) {
        const k = `${a}:${b}`;
        let arr = index!.get(k);
        if (!arr) index!.set(k, (arr = []));
        arr.push(i);
      }
  });
  return index;
}

function spansNear(x: number, z: number): number[] {
  const g = getIndex();
  return g.get(`${Math.floor(x / S_CELL)}:${Math.floor(z / S_CELL)}`) ?? [];
}

/** Distance from a point to a span's centreline, in the span's own frame. */
function spanDist(s: Span, x: number, z: number) {
  const c = Math.cos(-s.rot);
  const sn = Math.sin(-s.rot);
  const dx = x - s.x;
  const dz = z - s.z;
  // rotate into the span frame: +v runs along the span
  const along = dx * sn + dz * c;
  const across = dx * c - dz * sn;
  const over = Math.max(0, Math.abs(along) - s.len / 2);
  return Math.hypot(across, over);
}

/** True if a plot at (x, z) would sit in the roadway. */
export function onStreet(x: number, z: number, clearance = 0) {
  const { spans } = streetNet();
  for (const i of spansNear(x, z)) {
    const s = spans[i];
    if (spanDist(s, x, z) < s.hw + clearance) return true;
  }
  return false;
}

/**
 * Bearing of the nearest lane, so a plot can be turned to face the street.
 * Returns null when nothing is close enough to face.
 */
export function frontage(x: number, z: number, reach = 34): { rot: number; dist: number } | null {
  const { spans } = streetNet();
  let best: Span | null = null;
  let bestD = reach;
  for (const i of spansNear(x, z)) {
    const s = spans[i];
    const d = spanDist(s, x, z);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best ? { rot: best.rot, dist: bestD } : null;
}
