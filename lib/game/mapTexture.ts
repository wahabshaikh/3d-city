import { MAINLAND } from '../mumbai/coastline';
import { ROADS, RAIL_LINES, roadWorld, railWorld } from '../mumbai/roads';
import { streetNet } from '../mumbai/streets';
import { OPEN_SPACES } from '../mumbai/districts';
import { geo } from '../geo';
import { BOUNDS } from '../mumbai/bounds';

/**
 * The radar map, baked once.
 *
 * The street network is ten thousand spans; redrawing it sixty times a second
 * for a 170-pixel circle would be absurd. So the whole of Phase 1 is painted
 * into one offscreen canvas at load, and the radar and the map screen are both
 * just crops of it — which is exactly how the games this is imitating did it,
 * for the same reason.
 */

const PX_PER_M = 0.95;
const PAD = 90;

export const MAP = {
  minX: BOUNDS.minX - PAD,
  minZ: BOUNDS.minZ - PAD,
  width: BOUNDS.width + PAD * 2,
  depth: BOUNDS.depth + PAD * 2,
  scale: PX_PER_M,
};

export const COLOURS = {
  sea: '#0d2c3e',
  land: '#232420',
  lane: '#4c4a43',
  road: '#7d7666',
  artery: '#a99c7e',
  rail: '#3d4a52',
  park: '#2c3f2a',
  sand: '#6d6144',
};

let cached: HTMLCanvasElement | null = null;

export function mapCanvas(): HTMLCanvasElement {
  if (cached) return cached;
  const w = Math.round(MAP.width * PX_PER_M);
  const h = Math.round(MAP.depth * PX_PER_M);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;

  const px = (x: number) => (x - MAP.minX) * PX_PER_M;
  const py = (z: number) => (z - MAP.minZ) * PX_PER_M;

  ctx.fillStyle = COLOURS.sea;
  ctx.fillRect(0, 0, w, h);

  // Land.
  ctx.beginPath();
  MAINLAND.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), py(z)) : ctx.moveTo(px(x), py(z))));
  ctx.closePath();
  ctx.fillStyle = COLOURS.land;
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,168,132,.35)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // The maidans and the racecourse, so the map has some shape to it.
  ctx.fillStyle = COLOURS.park;
  for (const o of OPEN_SPACES) {
    const [x, z] = geo(o.at[0], o.at[1]);
    ctx.beginPath();
    ctx.ellipse(px(x), py(z), o.rx * PX_PER_M, o.rz * PX_PER_M, 0, 0, 7);
    ctx.fill();
  }

  // Lanes, drawn as one flat layer.
  ctx.strokeStyle = COLOURS.lane;
  ctx.lineCap = 'butt';
  for (const s of streetNet().spans) {
    const dx = Math.sin(s.rot) * s.len * 0.5;
    const dz = Math.cos(s.rot) * s.len * 0.5;
    ctx.lineWidth = Math.max(1, s.hw * 1.5 * PX_PER_M);
    ctx.beginPath();
    ctx.moveTo(px(s.x - dx), py(s.z - dz));
    ctx.lineTo(px(s.x + dx), py(s.z + dz));
    ctx.stroke();
  }

  // Rail.
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = COLOURS.rail;
  ctx.lineWidth = 3;
  for (const line of RAIL_LINES) {
    ctx.beginPath();
    railWorld(line).forEach(([x, z], i) => (i ? ctx.lineTo(px(x), py(z)) : ctx.moveTo(px(x), py(z))));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Named roads on top, the arteries brightest.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const r of ROADS) {
    const pts = roadWorld(r);
    ctx.beginPath();
    pts.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), py(z)) : ctx.moveTo(px(x), py(z))));
    ctx.strokeStyle =
      r.kind === 'artery' || r.kind === 'bridge' || r.kind === 'promenade'
        ? COLOURS.artery
        : COLOURS.road;
    ctx.lineWidth = Math.max(2, r.width * 1.7 * PX_PER_M);
    ctx.stroke();
  }

  cached = cv;
  return cv;
}

/** World metres -> pixels in the baked map. */
export const mapX = (x: number) => (x - MAP.minX) * PX_PER_M;
export const mapZ = (z: number) => (z - MAP.minZ) * PX_PER_M;
