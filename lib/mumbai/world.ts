import { COMPRESS, geo } from '../geo';
import { mulberry32, rand, randInt, pick, chance, type Rng } from '../rng';
import { MAINLAND, GORAI, distanceToShore, pointInPolygon } from './coastline';
import { ROADS, RAIL_LINES, roadWorld, railWorld } from './roads';
import { LANDMARKS } from './landmarks';

export type StyleId =
  | 'colonial'
  | 'deco'
  | 'tower'
  | 'chawl'
  | 'slum'
  | 'midrise'
  | 'lowrise'
  | 'bungalow'
  | 'mill';

type Style = {
  h: [number, number];
  fp: [number, number];
  spacing: number;
  density: number;
  colours: number[];
  roof: 'terrace' | 'tin' | 'tarp' | 'flat';
  /** Chance a plot instead gets a modern high-rise. */
  spike?: number;
  spikeH?: [number, number];
};

/**
 * Palettes are the weathered end of Mumbai: monsoon-stained cream, mildew grey,
 * ochre, faded pink, and the corrugated tin and blue tarpaulin of the bastis.
 */
export const STYLES: Record<StyleId, Style> = {
  colonial: {
    h: [13, 25],
    fp: [17, 33],
    spacing: 30,
    density: 0.84,
    colours: [0x877e6f, 0x968770, 0x746e62, 0x8a7458, 0x9c8b68, 0x6b665b],
    roof: 'terrace',
  },
  deco: {
    h: [22, 34],
    fp: [19, 30],
    spacing: 27,
    density: 0.9,
    colours: [0xc9bb9c, 0xd2c3a2, 0xbcb296, 0xc5ac89, 0xb4bcaa, 0xd0c2a4, 0xa8b0a6],
    roof: 'flat',
  },
  tower: {
    h: [55, 120],
    fp: [24, 40],
    spacing: 62,
    density: 0.62,
    colours: [0x7d8b98, 0x6e7d8b, 0x8e99a1, 0x8a867e, 0x5f6d76],
    roof: 'flat',
    spike: 0.16,
    spikeH: [140, 250],
  },
  chawl: {
    h: [9, 16],
    fp: [14, 27],
    spacing: 20,
    density: 0.94,
    colours: [0x9a7355, 0x8f6857, 0xa8825c, 0x8b7e6c, 0x91674f, 0xa08a64, 0x74806a, 0xa85f4a],
    roof: 'tin',
  },
  slum: {
    h: [2.8, 5.6],
    fp: [6, 11],
    spacing: 9.5,
    density: 0.97,
    colours: [0x7a6750, 0x8a6d4e, 0x685b48, 0x7f6e57, 0x8f7a5c, 0x6a7060],
    roof: 'tarp',
  },
  midrise: {
    h: [18, 44],
    fp: [16, 27],
    spacing: 26,
    density: 0.88,
    colours: [0xa89b80, 0x958a72, 0xb29c7e, 0x8f9a88, 0xa47f6a, 0x99a08e, 0x7e8a84, 0xb5a894],
    roof: 'flat',
    spike: 0.06,
    spikeH: [70, 120],
  },
  lowrise: {
    h: [9, 19],
    fp: [14, 25],
    spacing: 22,
    density: 0.9,
    colours: [0xa3947a, 0x968569, 0xac9a7c, 0x867d6c, 0xa4826a, 0x82927e, 0xb08a66],
    roof: 'terrace',
  },
  bungalow: {
    h: [6, 13],
    fp: [13, 22],
    spacing: 36,
    density: 0.52,
    colours: [0xb4a98e, 0xa39a80, 0x9a8a72, 0xb2a288, 0x8e9a86],
    roof: 'terrace',
    spike: 0.08,
    spikeH: [40, 75],
  },
  mill: {
    h: [11, 24],
    fp: [22, 40],
    spacing: 34,
    density: 0.74,
    colours: [0x746759, 0x80715b, 0x665f54, 0x84725c, 0x8a5f4c],
    roof: 'tin',
    spike: 0.1,
    spikeH: [90, 180],
  },
};

/** Mumbai paints a fair number of buildings outright, not just weathers them. */
const ACCENTS = [0x9c5240, 0x4a6b78, 0x5c7052, 0xa8894a, 0x7c5a68, 0x53637f];

export type District = {
  id: string;
  name: string;
  at: [number, number];
  /** Radius in real metres. */
  r: number;
  style: StyleId;
};

export const DISTRICTS: District[] = [
  { id: 'navy-nagar', name: 'Navy Nagar', at: [18.9045, 72.8155], r: 900, style: 'lowrise' },
  { id: 'colaba', name: 'Colaba', at: [18.9145, 72.8255], r: 1300, style: 'lowrise' },
  { id: 'fort', name: 'Fort', at: [18.9315, 72.8335], r: 950, style: 'colonial' },
  { id: 'ballard', name: 'Ballard Estate', at: [18.945, 72.842], r: 700, style: 'colonial' },
  { id: 'nariman', name: 'Nariman Point', at: [18.9262, 72.8232], r: 750, style: 'tower' },
  { id: 'churchgate', name: 'Churchgate', at: [18.9368, 72.8248], r: 800, style: 'deco' },
  { id: 'marine-lines', name: 'Marine Lines', at: [18.945, 72.8215], r: 900, style: 'deco' },
  { id: 'girgaum', name: 'Girgaum', at: [18.9565, 72.8185], r: 1000, style: 'chawl' },
  { id: 'malabar', name: 'Malabar Hill', at: [18.9485, 72.7995], r: 1200, style: 'bungalow' },
  { id: 'cumballa', name: 'Cumballa Hill', at: [18.9675, 72.8075], r: 950, style: 'midrise' },
  { id: 'tardeo', name: 'Tardeo', at: [18.9735, 72.8175], r: 900, style: 'midrise' },
  { id: 'mahalaxmi', name: 'Mahalaxmi', at: [18.9825, 72.8235], r: 900, style: 'mill' },
  { id: 'byculla', name: 'Byculla', at: [18.9755, 72.8345], r: 1100, style: 'chawl' },
  { id: 'mazgaon', name: 'Mazgaon Docks', at: [18.9705, 72.8435], r: 900, style: 'mill' },
  { id: 'parel', name: 'Parel Mill Land', at: [18.9955, 72.8345], r: 1300, style: 'mill' },
  { id: 'worli', name: 'Worli', at: [19.0085, 72.8195], r: 1300, style: 'tower' },
  { id: 'prabhadevi', name: 'Prabhadevi', at: [19.0155, 72.8305], r: 800, style: 'midrise' },
  { id: 'sewri', name: 'Sewri', at: [19.0025, 72.858], r: 1200, style: 'mill' },
  { id: 'dadar', name: 'Dadar', at: [19.0195, 72.8435], r: 1200, style: 'chawl' },
  { id: 'matunga', name: 'Matunga', at: [19.0275, 72.852], r: 900, style: 'midrise' },
  { id: 'dharavi', name: 'Dharavi', at: [19.0405, 72.8545], r: 950, style: 'slum' },
  { id: 'sion', name: 'Sion', at: [19.0405, 72.8665], r: 1000, style: 'midrise' },
  { id: 'mahim', name: 'Mahim', at: [19.0385, 72.8425], r: 800, style: 'chawl' },
  { id: 'bandra', name: 'Bandra West', at: [19.0555, 72.8305], r: 1400, style: 'midrise' },
  { id: 'bkc', name: 'Bandra Kurla Complex', at: [19.0655, 72.868], r: 1000, style: 'tower' },
  { id: 'khar', name: 'Khar & Santacruz', at: [19.0785, 72.8425], r: 1500, style: 'midrise' },
  { id: 'juhu', name: 'Juhu', at: [19.0975, 72.8315], r: 1200, style: 'bungalow' },
  { id: 'vile-parle', name: 'Vile Parle', at: [19.1005, 72.8465], r: 1200, style: 'midrise' },
  { id: 'andheri', name: 'Andheri', at: [19.1215, 72.8555], r: 1900, style: 'midrise' },
  { id: 'versova', name: 'Versova', at: [19.1295, 72.8195], r: 1000, style: 'midrise' },
  { id: 'kurla', name: 'Kurla', at: [19.0715, 72.8825], r: 1400, style: 'chawl' },
  { id: 'powai', name: 'Powai', at: [19.115, 72.888], r: 1200, style: 'midrise' },
  { id: 'gorai', name: 'Gorai', at: [19.2255, 72.8095], r: 900, style: 'bungalow' },
];

const DISTRICTS_W = DISTRICTS.map((d) => {
  const [x, z] = geo(d.at[0], d.at[1]);
  return { ...d, x, z, rw: d.r / COMPRESS };
});

/** Landmark plots stay clear of procedural filler. */
const CLEARANCE: Record<string, number> = {
  'gateway-of-india': 95,
  'taj-mahal-palace': 90,
  csmt: 150,
  bmc: 75,
  'rajabai-tower': 120,
  'bombay-high-court': 85,
  csmvs: 95,
  'flora-fountain': 45,
  bse: 45,
  'marine-drive': 0,
  'girgaum-chowpatty': 150,
  wankhede: 160,
  'nariman-point': 0,
  'haji-ali': 120,
  'dhobi-ghat': 130,
  antilia: 90,
  siddhivinayak: 90,
  'sea-link': 0,
  'worli-skyline': 0,
  'bandra-fort': 110,
  dharavi: 0,
  'juhu-beach': 0,
  'global-vipassana-pagoda': 260,
  elephanta: 400,
};

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
  tank: boolean;
  slab: boolean;
};

export type Tree = { x: number; z: number; s: number; palm: boolean };
export type StreetLight = { x: number; z: number; rot: number; twin: boolean };
export type Hoarding = { x: number; z: number; rot: number; w: number; h: number; art: number };

export type Collider = { x: number; z: number; hw: number; hd: number; top: number };

export type World = {
  buildings: Building[];
  trees: Tree[];
  lights: StreetLight[];
  hoardings: Hoarding[];
  colliders: Collider[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};

/* ------------------------------------------------------------------ */
/* Spatial masks: keep buildings off the roads, the rails and the sea. */
/* ------------------------------------------------------------------ */

const CELL = 9;
const key = (x: number, z: number) => `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;

function stampPolyline(set: Set<string>, pts: [number, number][], halfWidth: number) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1];
    const [x1, z1] = pts[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(1, Math.ceil(len / (CELL * 0.5)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = x0 + (x1 - x0) * t;
      const cz = z0 + (z1 - z0) * t;
      const rad = Math.ceil(halfWidth / CELL);
      for (let a = -rad; a <= rad; a++)
        for (let b = -rad; b <= rad; b++) set.add(key(cx + a * CELL, cz + b * CELL));
    }
  }
}

let corridorMask: Set<string> | null = null;

function getCorridorMask() {
  if (corridorMask) return corridorMask;
  const set = new Set<string>();
  for (const r of ROADS) stampPolyline(set, roadWorld(r), r.width + 5);
  for (const r of RAIL_LINES) stampPolyline(set, railWorld(r), 14);
  corridorMask = set;
  return set;
}

export function onCorridor(x: number, z: number) {
  return getCorridorMask().has(key(x, z));
}

/* ------------------------------------------------------------------ */

function nearestDistrict(x: number, z: number) {
  let best: (typeof DISTRICTS_W)[number] | null = null;
  let bestD = Infinity;
  for (const d of DISTRICTS_W) {
    const dist = Math.hypot(x - d.x, z - d.z);
    if (dist < d.rw && dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

const LANDMARK_PLOTS = LANDMARKS.map((l) => {
  const [x, z] = geo(l.at[0], l.at[1]);
  return { x, z, r: CLEARANCE[l.id] ?? 60 };
});

/** Open ground the city is planned around — kept clear of buildings. */
const OPEN_SPACES: { at: [number, number]; rx: number; rz: number }[] = [
  { at: [18.9295, 72.8288], rx: 62, rz: 132 }, // Oval Maidan
  { at: [18.9345, 72.8295], rx: 47, rz: 72 }, // Cross Maidan
  { at: [18.9378, 72.8312], rx: 52, rz: 82 }, // Azad Maidan
  { at: [19.0285, 72.8395], rx: 92, rz: 92 }, // Shivaji Park
  { at: [18.9805, 72.8195], rx: 92, rz: 132 }, // Mahalaxmi Racecourse
  { at: [18.9268, 72.8218], rx: 42, rz: 62 }, // Cooperage
];

const OPEN_W = OPEN_SPACES.map((o) => {
  const [x, z] = geo(o.at[0], o.at[1]);
  return { x, z, rx: o.rx, rz: o.rz };
});

function inOpenSpace(x: number, z: number) {
  for (const o of OPEN_W) {
    const dx = (x - o.x) / o.rx;
    const dz = (z - o.z) / o.rz;
    if (dx * dx + dz * dz < 1) return true;
  }
  return false;
}

function inLandmarkPlot(x: number, z: number) {
  for (const p of LANDMARK_PLOTS) {
    if (p.r <= 0) continue;
    if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return true;
  }
  return false;
}

let cached: World | null = null;

export function buildWorld(): World {
  if (cached) return cached;

  const rng = mulberry32(0x0f0be8);
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  const colliders: Collider[] = [];

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
  for (const [x, z] of GORAI) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const step = 12;
  for (let x = minX; x <= maxX; x += step) {
    for (let z = minZ; z <= maxZ; z += step) {
      const jx = x + rand(rng, -step * 0.42, step * 0.42);
      const jz = z + rand(rng, -step * 0.42, step * 0.42);

      const onMain = pointInPolygon(jx, jz, MAINLAND);
      const onGorai = !onMain && pointInPolygon(jx, jz, GORAI);
      if (!onMain && !onGorai) continue;

      const shore = distanceToShore(jx, jz, onGorai ? GORAI : MAINLAND);

      const dist = nearestDistrict(jx, jz);
      const styleId: StyleId = dist ? dist.style : 'midrise';
      const st = STYLES[styleId];

      // Space plots out according to the district's grain.
      if (rng() > step / st.spacing) continue;
      if (rng() > st.density) continue;

      // Palms and beach instead of buildings right on the sand.
      if (shore < 5) {
        if (chance(rng, 0.09)) trees.push({ x: jx, z: jz, s: rand(rng, 0.85, 1.5), palm: true });
        continue;
      }
      if (onCorridor(jx, jz)) continue;
      if (inLandmarkPlot(jx, jz)) continue;
      if (inOpenSpace(jx, jz)) {
        if (chance(rng, 0.02)) trees.push({ x: jx, z: jz, s: rand(rng, 1, 1.7), palm: chance(rng, 0.4) });
        continue;
      }

      const w = rand(rng, st.fp[0], st.fp[1]);
      const d = rand(rng, st.fp[0], st.fp[1]);
      let h = rand(rng, st.h[0], st.h[1]);

      // Coastal blocks step down; the money is on the water in South Mumbai.
      if (shore < 30 && styleId !== 'tower') h *= 0.85;

      let roof = st.roof;
      if (st.spike && chance(rng, st.spike)) {
        h = rand(rng, st.spikeH![0], st.spikeH![1]);
        roof = 'flat';
      }

      const rot = chance(rng, 0.72) ? Math.round(rand(rng, 0, 4)) * (Math.PI / 2) : rand(rng, 0, Math.PI * 2);

      buildings.push({
        x: jx,
        z: jz,
        w,
        d,
        h,
        rot,
        colour: chance(rng, styleId === 'tower' ? 0.012 : 0.045)
          ? pick(rng, ACCENTS)
          : pick(rng, st.colours),
        style: styleId,
        roof,
        tank: h > 8 && chance(rng, styleId === 'slum' ? 0.06 : 0.55),
        slab: h > 8 && chance(rng, 0.5),
      });

      colliders.push({ x: jx, z: jz, hw: w / 2, hd: d / 2, top: h });

      if (chance(rng, styleId === 'bungalow' ? 0.4 : 0.1))
        trees.push({
          x: jx + rand(rng, -st.spacing * 0.5, st.spacing * 0.5),
          z: jz + rand(rng, -st.spacing * 0.5, st.spacing * 0.5),
          s: rand(rng, 0.8, 1.6),
          palm: chance(rng, 0.55),
        });
    }
  }

  // Street lights and roadside palms follow every artery.
  const lights: StreetLight[] = [];
  for (const road of ROADS) {
    const pts = roadWorld(road);
    const spacing = road.kind === 'promenade' ? 26 : 46;
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
        lights.push({
          x: x0 + dx * t + nx * off * side,
          z: z0 + dz * t + nz * off * side,
          rot: Math.atan2(nx * side, nz * side),
          twin: road.kind === 'promenade' || road.kind === 'artery',
        });
        if (road.kind === 'promenade' && s % 2 === 0)
          trees.push({
            x: x0 + dx * (t + 12) + nx * (off + 3) * side,
            z: z0 + dz * (t + 12) + nz * (off + 3) * side,
            s: rand(rng, 1.0, 1.5),
            palm: true,
          });
      }
    }
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
      const n = Math.floor(len / 190);
      const dx = (x1 - x0) / len;
      const dz = (z1 - z0) / len;
      for (let s = 0; s < n; s++) {
        const t = (s + 0.5) * 190;
        const side = chance(rng, 0.5) ? 1 : -1;
        const off = (road.width + 9) * side;
        hoardings.push({
          x: x0 + dx * t - dz * off,
          z: z0 + dz * t + dx * off,
          rot: Math.atan2(dx, dz) + (side > 0 ? Math.PI / 2 : -Math.PI / 2),
          w: rand(rng, 12, 20),
          h: rand(rng, 6, 9),
          art: randInt(rng, 0, 5),
        });
      }
    }
  }

  cached = {
    buildings,
    trees,
    lights,
    hoardings,
    colliders,
    bounds: { minX, maxX, minZ, maxZ },
  };
  return cached;
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
