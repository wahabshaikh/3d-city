import { COMPRESS, geo } from '../geo';
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

export type Style = {
  h: [number, number];
  fp: [number, number];
  spacing: number;
  density: number;
  colours: number[];
  roof: 'terrace' | 'tin' | 'tarp' | 'flat';
  /** Chance a plot instead gets a modern high-rise. */
  spike?: number;
  spikeH?: [number, number];
  /** Centre-to-centre spacing of the local lane grid, in world metres. */
  block: number;
  /** Half-width of a local lane, kerb to kerb, in metres. */
  lane: number;
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
    block: 58,
    lane: 5.2,
  },
  deco: {
    h: [22, 34],
    fp: [19, 30],
    spacing: 27,
    density: 0.9,
    colours: [0xc9bb9c, 0xd2c3a2, 0xbcb296, 0xc5ac89, 0xb4bcaa, 0xd0c2a4, 0xa8b0a6],
    roof: 'flat',
    block: 56,
    lane: 5.6,
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
    block: 92,
    lane: 6.6,
  },
  chawl: {
    h: [9, 16],
    fp: [14, 27],
    spacing: 20,
    density: 0.94,
    colours: [0x9a7355, 0x8f6857, 0xa8825c, 0x8b7e6c, 0x91674f, 0xa08a64, 0x74806a, 0xa85f4a],
    roof: 'tin',
    block: 42,
    lane: 3.8,
  },
  slum: {
    h: [2.8, 5.6],
    fp: [6, 11],
    spacing: 9.5,
    density: 0.97,
    colours: [0x7a6750, 0x8a6d4e, 0x685b48, 0x7f6e57, 0x8f7a5c, 0x6a7060],
    roof: 'tarp',
    // Dharavi's gullies: two shoulders wide, and you can touch both walls.
    block: 25,
    lane: 1.4,
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
    block: 60,
    lane: 5.0,
  },
  lowrise: {
    h: [9, 19],
    fp: [14, 25],
    spacing: 22,
    density: 0.9,
    colours: [0xa3947a, 0x968569, 0xac9a7c, 0x867d6c, 0xa4826a, 0x82927e, 0xb08a66],
    roof: 'terrace',
    block: 48,
    lane: 4.4,
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
    block: 70,
    lane: 4.0,
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
    block: 74,
    lane: 5.4,
  },
};

/** Mumbai paints a fair number of buildings outright, not just weathers them. */
export const ACCENTS = [0x9c5240, 0x4a6b78, 0x5c7052, 0xa8894a, 0x7c5a68, 0x53637f];

export type District = {
  id: string;
  name: string;
  at: [number, number];
  /** Radius in real metres. */
  r: number;
  style: StyleId;
  /** Compass bearing the local street grid runs on, in degrees. */
  grain: number;
};

/**
 * Grain is the bearing of each district's street grid. Mumbai has no single
 * one: the Fort is laid out on the old shoreline, the reclamations run with the
 * sea wall, and Dharavi has no grid at all — just the direction its gullies
 * happen to run.
 */
export const DISTRICTS: District[] = [
  { id: 'navy-nagar', name: 'Navy Nagar', at: [18.9045, 72.8155], r: 900, style: 'lowrise', grain: 28 },
  { id: 'colaba', name: 'Colaba', at: [18.9145, 72.8255], r: 1300, style: 'lowrise', grain: 34 },
  { id: 'fort', name: 'Fort', at: [18.9315, 72.8335], r: 950, style: 'colonial', grain: 12 },
  { id: 'ballard', name: 'Ballard Estate', at: [18.945, 72.842], r: 700, style: 'colonial', grain: 20 },
  { id: 'nariman', name: 'Nariman Point', at: [18.9262, 72.8232], r: 750, style: 'tower', grain: 350 },
  { id: 'churchgate', name: 'Churchgate', at: [18.9368, 72.8248], r: 800, style: 'deco', grain: 355 },
  { id: 'marine-lines', name: 'Marine Lines', at: [18.945, 72.8215], r: 900, style: 'deco', grain: 342 },
  { id: 'girgaum', name: 'Girgaum', at: [18.9565, 72.8185], r: 1000, style: 'chawl', grain: 24 },
  { id: 'malabar', name: 'Malabar Hill', at: [18.9485, 72.7995], r: 1200, style: 'bungalow', grain: 62 },
  { id: 'cumballa', name: 'Cumballa Hill', at: [18.9675, 72.8075], r: 950, style: 'midrise', grain: 40 },
  { id: 'tardeo', name: 'Tardeo', at: [18.9735, 72.8175], r: 900, style: 'midrise', grain: 8 },
  { id: 'mahalaxmi', name: 'Mahalaxmi', at: [18.9825, 72.8235], r: 900, style: 'mill', grain: 16 },
  { id: 'byculla', name: 'Byculla', at: [18.9755, 72.8345], r: 1100, style: 'chawl', grain: 4 },
  { id: 'mazgaon', name: 'Mazgaon Docks', at: [18.9705, 72.8435], r: 900, style: 'mill', grain: 350 },
  { id: 'parel', name: 'Parel Mill Land', at: [18.9955, 72.8345], r: 1300, style: 'mill', grain: 10 },
  { id: 'worli', name: 'Worli', at: [19.0085, 72.8195], r: 1300, style: 'tower', grain: 20 },
  { id: 'prabhadevi', name: 'Prabhadevi', at: [19.0155, 72.8305], r: 800, style: 'midrise', grain: 30 },
  { id: 'sewri', name: 'Sewri', at: [19.0025, 72.858], r: 1200, style: 'mill', grain: 42 },
  { id: 'dadar', name: 'Dadar', at: [19.0195, 72.8435], r: 1200, style: 'chawl', grain: 74 },
  { id: 'matunga', name: 'Matunga', at: [19.0275, 72.852], r: 900, style: 'midrise', grain: 68 },
  { id: 'dharavi', name: 'Dharavi', at: [19.0405, 72.8545], r: 950, style: 'slum', grain: 52 },
  { id: 'sion', name: 'Sion', at: [19.0405, 72.8665], r: 1000, style: 'midrise', grain: 84 },
  { id: 'mahim', name: 'Mahim', at: [19.0385, 72.8425], r: 800, style: 'chawl', grain: 58 },
  { id: 'bandra', name: 'Bandra West', at: [19.0555, 72.8305], r: 1400, style: 'midrise', grain: 22 },
  { id: 'bkc', name: 'Bandra Kurla Complex', at: [19.0655, 72.868], r: 1000, style: 'tower', grain: 46 },
  { id: 'khar', name: 'Khar & Santacruz', at: [19.0785, 72.8425], r: 1500, style: 'midrise', grain: 12 },
  { id: 'juhu', name: 'Juhu', at: [19.0975, 72.8315], r: 1200, style: 'bungalow', grain: 4 },
  { id: 'vile-parle', name: 'Vile Parle', at: [19.1005, 72.8465], r: 1200, style: 'midrise', grain: 16 },
  { id: 'andheri', name: 'Andheri', at: [19.1215, 72.8555], r: 1900, style: 'midrise', grain: 26 },
  { id: 'versova', name: 'Versova', at: [19.1295, 72.8195], r: 1000, style: 'midrise', grain: 350 },
  { id: 'kurla', name: 'Kurla', at: [19.0715, 72.8825], r: 1400, style: 'chawl', grain: 64 },
  { id: 'powai', name: 'Powai', at: [19.115, 72.888], r: 1200, style: 'midrise', grain: 38 },
  { id: 'gorai', name: 'Gorai', at: [19.2255, 72.8095], r: 900, style: 'bungalow', grain: 20 },
];

export type DistrictW = District & { x: number; z: number; rw: number };

export const DISTRICTS_W: DistrictW[] = DISTRICTS.map((d) => {
  const [x, z] = geo(d.at[0], d.at[1]);
  return { ...d, x, z, rw: d.r / COMPRESS };
});

/** The district a point belongs to, or null out in the gaps between them. */
export function nearestDistrict(x: number, z: number): DistrictW | null {
  let best: DistrictW | null = null;
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

/**
 * Landmark plots stay clear of procedural filler — but only just. These are
 * forecourts, not parkland: the Fort's whole character is that the High Court
 * and the Rajabai Tower have ordinary buildings and traffic pressed up against
 * them, so the radii are kept close to the real setting of each building.
 */
const CLEARANCE: Record<string, number> = {
  'gateway-of-india': 62,
  'taj-mahal-palace': 62,
  csmt: 104,
  bmc: 52,
  'rajabai-tower': 76,
  'bombay-high-court': 62,
  csmvs: 66,
  'flora-fountain': 30,
  bse: 30,
  'marine-drive': 0,
  'girgaum-chowpatty': 110,
  wankhede: 118,
  'nariman-point': 0,
  'haji-ali': 110,
  'dhobi-ghat': 105,
  antilia: 60,
  siddhivinayak: 56,
  'sea-link': 0,
  'worli-skyline': 0,
  'bandra-fort': 80,
  dharavi: 0,
  'juhu-beach': 0,
  'global-vipassana-pagoda': 200,
  elephanta: 400,
};

export const LANDMARK_PLOTS = LANDMARKS.map((l) => {
  const [x, z] = geo(l.at[0], l.at[1]);
  return { x, z, r: CLEARANCE[l.id] ?? 60 };
});

/**
 * `scale` shrinks the plot. Buildings keep well clear of a landmark, but the
 * lanes are allowed much closer — in the Fort they run right past the High
 * Court and the Rajabai Tower, which is the whole character of the place.
 */
export function inLandmarkPlot(x: number, z: number, scale = 1) {
  for (const p of LANDMARK_PLOTS) {
    const r = p.r * scale;
    if (r <= 0) continue;
    if ((x - p.x) ** 2 + (z - p.z) ** 2 < r * r) return true;
  }
  return false;
}

/** Open ground the city is planned around — kept clear of buildings. */
export const OPEN_SPACES: { at: [number, number]; rx: number; rz: number }[] = [
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

export function inOpenSpace(x: number, z: number, grow = 0) {
  for (const o of OPEN_W) {
    const dx = (x - o.x) / (o.rx + grow);
    const dz = (z - o.z) / (o.rz + grow);
    if (dx * dx + dz * dz < 1) return true;
  }
  return false;
}
