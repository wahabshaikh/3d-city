import { mulberry32, rand, randInt, pick, chance, type Rng } from '../rng';
import { MAINLAND, GORAI, distanceToShore, pointInPolygon } from './coastline';
import { ROADS, roadWorld } from './roads';
import {
  STYLES,
  ACCENTS,
  DISTRICTS,
  nearestDistrict,
  inLandmarkPlot,
  inOpenSpace,
  type StyleId,
  type Style,
} from './districts';
import { streetNet, onStreet, onArterial, frontage, type Span } from './streets';
import { BOUNDS, inPhase } from './bounds';

export { STYLES, DISTRICTS, type StyleId };
export type { District } from './districts';

export type Building = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot: number;
  colour: number;
  style: StyleId;
  roof: Style['roof'];
  /** Tint for a tin or tarpaulin roof — no two sheets in Dharavi match. */
  roofTint: number;
  tank: boolean;
  slab: boolean;
  /**
   * Yaw pointing from the plot at the lane it fronts, or null for the back
   * buildings that face nothing. Ground-floor shops hang off this.
   */
  front: number | null;
};

export type Tree = { x: number; z: number; s: number; palm: boolean };
export type StreetLight = { x: number; z: number; rot: number; twin: boolean };
export type Hoarding = { x: number; z: number; rot: number; w: number; h: number; art: number };
export type Stall = { x: number; z: number; rot: number; art: number };
export type Person = { x: number; z: number; rot: number; colour: number; skin: number };
/** Kerbside parking. `type` indexes the vehicle set in Traffic. */
export type Parked = { x: number; z: number; rot: number; type: number };

export type Collider = { x: number; z: number; hw: number; hd: number; top: number };

export type World = {
  buildings: Building[];
  trees: Tree[];
  lights: StreetLight[];
  hoardings: Hoarding[];
  stalls: Stall[];
  people: Person[];
  parked: Parked[];
  colliders: Collider[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};

/* ---------------------------- plot bookkeeping ---------------------------- */

/**
 * Buildings are packed tightly enough that two plots will fight over the same
 * ground — a corner gets a frontage from both lanes that meet there. Plots are
 * kept apart by a radius rather than a footprint, because a Mumbai street wall
 * is meant to be continuous: neighbours share party walls, they do not stand
 * apart politely.
 */
const O_CELL = 40;

class Occupancy {
  private cells = new Map<string, number[]>();
  private xs: number[] = [];
  private zs: number[] = [];
  private rs: number[] = [];

  private around(x: number, z: number, fn: (k: string) => void) {
    const i = Math.floor(x / O_CELL);
    const j = Math.floor(z / O_CELL);
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) fn(`${a}:${b}`);
  }

  free(x: number, z: number, r: number) {
    let ok = true;
    this.around(x, z, (k) => {
      if (!ok) return;
      const list = this.cells.get(k);
      if (!list) return;
      for (const n of list) {
        const gap = r + this.rs[n];
        if ((x - this.xs[n]) ** 2 + (z - this.zs[n]) ** 2 < gap * gap) {
          ok = false;
          return;
        }
      }
    });
    return ok;
  }

  claim(x: number, z: number, r: number) {
    const n = this.xs.length;
    this.xs.push(x);
    this.zs.push(z);
    this.rs.push(r);
    const k = `${Math.floor(x / O_CELL)}:${Math.floor(z / O_CELL)}`;
    let list = this.cells.get(k);
    if (!list) this.cells.set(k, (list = []));
    list.push(n);
  }
}

/** How close two plots may stand, centre to centre. */
const keepOut = (w: number, d: number) => Math.min(w, d) * 0.44;

/** Corrugated iron: galvanised, weathered, and mostly rusted through. */
const TIN_TINTS = [0x9a8f7d, 0x8b7f6a, 0xa5723f, 0x8e6339, 0x7d7367, 0xb0a692, 0x6f675c, 0x948a76];
/** Tarpaulin: the blue is real, but so is the green, the grey and the orange. */
const TARP_TINTS = [0x3f6f96, 0x4c82ab, 0x2f5f84, 0x5b6f5a, 0x7a7365, 0x9a6b3c, 0x44738f];

function landOK(x: number, z: number) {
  const onMain = pointInPolygon(x, z, MAINLAND);
  const onGorai = !onMain && pointInPolygon(x, z, GORAI);
  if (!onMain && !onGorai) return 0;
  return distanceToShore(x, z, onGorai ? GORAI : MAINLAND);
}

let cached: World | null = null;

export function buildWorld(): World {
  if (cached) return cached;

  const rng = mulberry32(0x0f0be8);
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  const colliders: Collider[] = [];
  const occ = new Occupancy();

  const place = (b: Building) => {
    buildings.push(b);
    occ.claim(b.x, b.z, keepOut(b.w, b.d));
    colliders.push({ x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, top: b.h });
  };

  const dress = (styleId: StyleId, st: Style, h: number, front: number | null, roof: Style['roof']) => {
    // Dharavi is not a blue city. Most of what is over your head there is
    // corrugated iron gone to rust, with asbestos sheet and tarpaulin between.
    const r: Style['roof'] = roof === 'tarp' && chance(rng, 0.62) ? 'tin' : roof;
    return {
      colour: chance(rng, styleId === 'tower' ? 0.012 : 0.045)
        ? pick(rng, ACCENTS)
        : pick(rng, st.colours),
      style: styleId,
      roof: r,
      roofTint: r === 'tin' ? pick(rng, TIN_TINTS) : pick(rng, TARP_TINTS),
      tank: h > 8 && chance(rng, styleId === 'slum' ? 0.06 : 0.55),
      slab: h > 8 && chance(rng, 0.5),
      front,
    };
  };

  /* ------------------------------------------------------------------ */
  /* Pass 1: street walls. Every lane gets built up along both kerbs —   */
  /* this is what makes a block a block rather than a scatter of boxes.  */
  /* ------------------------------------------------------------------ */

  const { spans, lamps } = streetNet();

  // Walk the lanes end to end. Each side of the kerb carries its own cursor, so
  // plots butt up against their neighbours the way a street wall should. Spans
  // of one lane are contiguous, so a run carries across span boundaries.
  const cursor = [0, 0];
  const nextAt = [0, 0];
  for (const s of spans) {
    const dist = nearestDistrict(s.x, s.z);
    const styleId: StyleId = dist ? dist.style : 'midrise';
    const st = STYLES[styleId];

    const dx = Math.sin(s.rot);
    const dz = Math.cos(s.rot);
    const nx = Math.cos(s.rot);
    const nz = -Math.sin(s.rot);

    for (let t = -s.len / 2; t < s.len / 2; t += 1) {
      for (let k = 0; k < 2; k++) {
        cursor[k] += 1;
        if (cursor[k] < nextAt[k]) continue;

        const side = k === 0 ? 1 : -1;
        const w = rand(rng, st.fp[0], st.fp[1]);
        const d = rand(rng, st.fp[0], st.fp[1]);
        // A blocked plot is a junction, a maidan edge or a neighbour's yard —
        // shuffle a few metres along and try again rather than losing the run.
        const blocked = () => {
          nextAt[k] = cursor[k] + 4;
          return true;
        };

        const setback = s.hw + 0.8 + d / 2;
        const cx = s.x + dx * t + nx * setback * side;
        const cz = s.z + dz * t + nz * setback * side;

        if (onArterial(cx, cz) || inLandmarkPlot(cx, cz) || inOpenSpace(cx, cz)) {
          blocked();
          continue;
        }
        const shore = landOK(cx, cz);
        if (shore < 6) {
          blocked();
          continue;
        }
        // The ends of the frontage, so a wide plot never straddles a crossing.
        if (
          onStreet(cx + dx * w * 0.45, cz + dz * w * 0.45, 0.6) ||
          onStreet(cx - dx * w * 0.45, cz - dz * w * 0.45, 0.6) ||
          !occ.free(cx, cz, keepOut(w, d))
        ) {
          blocked();
          continue;
        }

        // A gap now and then: a compound wall, a gully, a plot never built on.
        cursor[k] = 0;
        nextAt[k] = w * rand(rng, 1.0, 1.16) + (chance(rng, 1 - st.density) ? w * 1.4 : 0);

        let h = rand(rng, st.h[0], st.h[1]);
        if (shore < 30 && styleId !== 'tower') h *= 0.85;
        let roof = st.roof;
        if (st.spike && chance(rng, st.spike)) {
          h = rand(rng, st.spikeH![0], st.spikeH![1]);
          roof = 'flat';
        }

        place({
          x: cx,
          z: cz,
          w,
          d,
          h,
          rot: s.rot + Math.PI / 2,
          ...dress(styleId, st, h, s.rot - (side * Math.PI) / 2, roof),
        });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Pass 2: block interiors — the sheds, back buildings and yards that  */
  /* fill in behind the street wall.                                     */
  /* ------------------------------------------------------------------ */

  const { minX, maxX, minZ, maxZ } = BOUNDS;

  const step = 12;
  for (let x = minX; x <= maxX; x += step) {
    for (let z = minZ; z <= maxZ; z += step) {
      const jx = x + rand(rng, -step * 0.42, step * 0.42);
      const jz = z + rand(rng, -step * 0.42, step * 0.42);

      const dist = nearestDistrict(jx, jz);
      const styleId: StyleId = dist ? dist.style : 'midrise';
      const st = STYLES[styleId];

      if (rng() > step / st.spacing) continue;
      if (rng() > st.density * 0.8) continue;

      const shore = landOK(jx, jz);
      if (shore === 0) continue;
      if (!inPhase(jx, jz, -2)) continue;

      // Palms and beach instead of buildings right on the sand.
      if (shore < 6) {
        if (chance(rng, 0.09)) trees.push({ x: jx, z: jz, s: rand(rng, 0.85, 1.5), palm: true });
        continue;
      }
      if (onArterial(jx, jz) || inLandmarkPlot(jx, jz)) continue;
      if (inOpenSpace(jx, jz)) {
        if (chance(rng, 0.02))
          trees.push({ x: jx, z: jz, s: rand(rng, 1, 1.7), palm: chance(rng, 0.4) });
        continue;
      }

      const w = rand(rng, st.fp[0], st.fp[1]) * 0.86;
      const d = rand(rng, st.fp[0], st.fp[1]) * 0.86;
      if (onStreet(jx, jz, Math.min(w, d) / 2 + 0.6)) continue;
      if (!occ.free(jx, jz, keepOut(w, d))) {
        if (chance(rng, 0.1))
          trees.push({ x: jx, z: jz, s: rand(rng, 0.8, 1.5), palm: chance(rng, 0.5) });
        continue;
      }

      let h = rand(rng, st.h[0], st.h[1]) * 0.92;
      if (shore < 30 && styleId !== 'tower') h *= 0.85;
      let roof = st.roof;
      if (st.spike && chance(rng, st.spike * 0.6)) {
        h = rand(rng, st.spikeH![0], st.spikeH![1]);
        roof = 'flat';
      }

      // Back buildings still line up with the block, not with true north.
      const f = frontage(jx, jz, 40);
      const rot = f
        ? f.rot + Math.PI / 2 + rand(rng, -0.05, 0.05)
        : chance(rng, 0.72)
          ? Math.round(rand(rng, 0, 4)) * (Math.PI / 2)
          : rand(rng, 0, Math.PI * 2);

      place({ x: jx, z: jz, w, d, h, rot, ...dress(styleId, st, h, null, roof) });

      if (chance(rng, styleId === 'bungalow' ? 0.4 : 0.1))
        trees.push({
          x: jx + rand(rng, -st.spacing * 0.5, st.spacing * 0.5),
          z: jz + rand(rng, -st.spacing * 0.5, st.spacing * 0.5),
          s: rand(rng, 0.8, 1.6),
          palm: chance(rng, 0.55),
        });
    }
  }

  /* ----------------------------- street furniture ---------------------- */

  const lights: StreetLight[] = [];

  // Lamps on the named roads: the promenades get the twin-globe standards that
  // become the Queen's Necklace after dark.
  for (const road of ROADS) {
    const pts = roadWorld(road);
    const spacing = road.kind === 'promenade' ? 22 : 44;
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / spacing);
      const dx = (x1 - x0) / len;
      const dz = (z1 - z0) / len;
      const nx = -dz;
      const nz = dx;
      for (let s = 0; s < n; s++) {
        const t = (s + 0.5) * spacing;
        const off = road.width + 2.5;
        const side = road.kind === 'promenade' ? 1 : s % 2 === 0 ? 1 : -1;
        const lx = x0 + dx * t + nx * off * side;
        const lz = z0 + dz * t + nz * off * side;
        if (!inPhase(lx, lz)) continue;
        lights.push({
          x: lx,
          z: lz,
          rot: Math.atan2(nx * side, nz * side),
          twin: road.kind === 'promenade' || road.kind === 'artery',
        });
        if (road.kind === 'promenade' && s % 3 === 0)
          trees.push({
            x: x0 + dx * (t + 10) + nx * (off + 3.5) * side,
            z: z0 + dz * (t + 10) + nz * (off + 3.5) * side,
            s: rand(rng, 1.0, 1.5),
            palm: true,
          });
      }
    }
  }

  // Single-globe standards on the lanes.
  for (const l of lamps) {
    if (!chance(rng, 0.5)) continue;
    lights.push({ x: l.x, z: l.z, rot: l.rot, twin: false });
  }

  // Bollywood hoardings — never far from a Mumbai flyover.
  const hoardings: Hoarding[] = [];
  for (const road of ROADS) {
    if (road.kind === 'causeway' || road.kind === 'bridge') continue;
    const pts = roadWorld(road);
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 170);
      const dx = (x1 - x0) / len;
      const dz = (z1 - z0) / len;
      for (let s = 0; s < n; s++) {
        const t = (s + 0.5) * 170;
        const side = chance(rng, 0.5) ? 1 : -1;
        const off = (road.width + 9) * side;
        const hx = x0 + dx * t - dz * off;
        const hz = z0 + dz * t + dx * off;
        if (!inPhase(hx, hz)) continue;
        hoardings.push({
          x: hx,
          z: hz,
          rot: Math.atan2(dx, dz) + (side > 0 ? Math.PI / 2 : -Math.PI / 2),
          w: rand(rng, 12, 20),
          h: rand(rng, 6, 9),
          art: randInt(rng, 0, 5),
        });
      }
    }
  }

  const { stalls, people, parked } = streetLife(rng, spans);

  cached = {
    buildings,
    trees,
    lights,
    hoardings,
    stalls,
    people,
    parked,
    colliders,
    bounds: { minX, maxX, minZ, maxZ },
  };
  return cached;
}

/* ------------------------------------------------------------------------- */
/* Hawkers and crowds. Mumbai is not a city you can render empty.             */
/* ------------------------------------------------------------------------- */

const SHIRTS = [
  0xd8442f, 0x2f6fae, 0xe8c04a, 0x2f8a5c, 0xb8449a, 0xe2e0d6, 0xf07a2a, 0x5a4a8c, 0x1f6f78,
  0xc86a3a, 0xe8e2c8, 0x8c2f3a,
];
const SKINS = [0x8d5a3b, 0x7a4a2e, 0xa06f45, 0x6b3f26, 0x99693f];

function streetLife(rng: Rng, spans: Span[]) {
  const stalls: Stall[] = [];
  const people: Person[] = [];
  const parked: Parked[] = [];

  // Hawkers, kerbside parking and pavement crowds along the lanes.
  for (const s of spans) {
    const dx = Math.sin(s.rot);
    const dz = Math.cos(s.rot);
    const nx = Math.cos(s.rot);
    const nz = -Math.sin(s.rot);
    // Footpath centreline: the outer 18% of the lane is pavement.
    const pavement = s.hw * 0.91;

    if (!s.gully && chance(rng, 0.13)) {
      const side = chance(rng, 0.5) ? 1 : -1;
      const t = rand(rng, -s.len / 2, s.len / 2);
      stalls.push({
        x: s.x + dx * t + nx * (pavement + 0.5) * side,
        z: s.z + dz * t + nz * (pavement + 0.5) * side,
        rot: s.rot + (side > 0 ? -Math.PI / 2 : Math.PI / 2),
        art: randInt(rng, 0, 5),
      });
    }

    // Nothing in Mumbai parks in a bay. Everything parks on the kerb.
    if (!s.gully && s.hw > 3.4 && chance(rng, 0.34)) {
      const side = chance(rng, 0.5) ? 1 : -1;
      const t = rand(rng, -s.len / 2 + 2, s.len / 2 - 2);
      const roll = rng();
      const off = (s.hw * 0.72) * side;
      parked.push({
        x: s.x + dx * t + nx * off,
        z: s.z + dz * t + nz * off,
        rot: s.rot + (chance(rng, 0.5) ? 0 : Math.PI) + rand(rng, -0.06, 0.06),
        // Taxi, motorcycle, private car. No auto-rickshaws: they are barred
        // from the island city, and the island city is all Phase 1 is.
        type: roll < 0.3 ? 0 : roll < 0.42 ? 5 : 3,
      });
    }

    const n = s.gully ? randInt(rng, 0, 2) : randInt(rng, 1, 4);
    for (let i = 0; i < n; i++) {
      const side = chance(rng, 0.5) ? 1 : -1;
      const t = rand(rng, -s.len / 2, s.len / 2);
      const off = pavement * side + rand(rng, -0.8, 0.5);
      people.push({
        x: s.x + dx * t + nx * off,
        z: s.z + dz * t + nz * off,
        rot: s.rot + (chance(rng, 0.5) ? 0 : Math.PI) + rand(rng, -0.5, 0.5),
        colour: pick(rng, SHIRTS),
        skin: pick(rng, SKINS),
      });
    }
  }

  // Denser crowds where Mumbai actually gathers: the promenades and the beaches.
  for (const road of ROADS) {
    if (road.kind !== 'promenade') continue;
    const pts = roadWorld(road);
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const dx = (x1 - x0) / len;
      const dz = (z1 - z0) / len;
      const n = Math.floor(len / 2.6);
      for (let s = 0; s < n; s++) {
        const t = (s + rand(rng, 0.1, 0.9)) * 2.6;
        const off = road.width + rand(rng, 1.4, 7);
        const px = x0 + dx * t - dz * off;
        const pz = z0 + dz * t + dx * off;
        if (!inPhase(px, pz)) continue;
        people.push({
          x: px,
          z: pz,
          rot: rand(rng, 0, Math.PI * 2),
          colour: pick(rng, SHIRTS),
          skin: pick(rng, SKINS),
        });
      }
      // Kaali-peelis nose-in along the sea wall.
      for (let s = 0; s < Math.floor(len / 30); s++) {
        const t = (s + 0.5) * 30;
        const off = road.width + 1.8;
        const kx = x0 + dx * t - dz * off;
        const kz = z0 + dz * t + dx * off;
        if (!inPhase(kx, kz)) continue;
        parked.push({
          x: kx,
          z: kz,
          rot: Math.atan2(dx, dz) + (chance(rng, 0.5) ? 0 : Math.PI),
          type: chance(rng, 0.55) ? 0 : 3,
        });
      }
    }
  }

  return { stalls, people, parked };
}

/** Chunk anything positional into a grid so the GPU can frustum-cull it. */
export function chunk<T extends { x: number; z: number }>(items: T[], size: number) {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = `${Math.floor(it.x / size)}:${Math.floor(it.z / size)}`;
    let arr = map.get(k);
    if (!arr) map.set(k, (arr = []));
    arr.push(it);
  }
  return [...map.values()];
}

export type { Rng };
