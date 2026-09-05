import { mulberry32, rand } from '../rng';
import { buildWorld } from '../mumbai/world';
import { ROADS, roadWorld } from '../mumbai/roads';
import { resample } from '../ribbon';
import { clipToPhase, inPhase } from '../mumbai/bounds';
import { SEA_LINK } from '../mumbai/physics';
import { SPECS, type Spec } from './vehicles';
import { V_BIKE, V_POLICE, V_SEDAN, V_TAXI } from '@/components/world/vehicles';

/**
 * Everything on the road that the player does not own — yet.
 *
 * Two populations. The kerbside cars never move and are written into their
 * instance buffers once; the traffic runs a lane offset along the arterial
 * roads. Both are jackable: `take` marks the slot gone and hands back a spec
 * and a heading, and the renderer drops that instance on the next frame.
 */

export type Slot = {
  x: number;
  z: number;
  rot: number;
  type: number;
  colour: number;
  taken: boolean;
};

export type Ai = {
  path: number;
  dist: number;
  speed: number;
  cruise: number;
  side: number;
  lane: number;
  type: number;
  colour: number;
  taken: boolean;
  /* filled in each frame */
  x: number;
  z: number;
  y: number;
  yaw: number;
};

export type Path = { pts: [number, number][]; lens: number[]; total: number; id: string };

const PAINT = [
  0xdedbd2, 0xc9c6bd, 0xb8bcc0, 0x8d99a3, 0x9c5a4a, 0x5f6b6f, 0xe2ddcd, 0x6f7a72, 0x3f4a55,
  0x7d4a3a,
];

function makePath(pts: [number, number][], id: string): Path {
  const lens = [0];
  for (let i = 1; i < pts.length; i++)
    lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lens, total: lens[lens.length - 1] || 1, id };
}

export function samplePath(path: Path, dist: number) {
  const d = ((dist % path.total) + path.total) % path.total;
  let i = 1;
  while (i < path.lens.length - 1 && path.lens[i] < d) i++;
  const t = (d - path.lens[i - 1]) / (path.lens[i] - path.lens[i - 1] || 1);
  const [x0, z0] = path.pts[i - 1];
  const [x1, z1] = path.pts[i];
  const l = Math.hypot(x1 - x0, z1 - z0) || 1;
  return {
    x: x0 + (x1 - x0) * t,
    z: z0 + (z1 - z0) * t,
    tx: (x1 - x0) / l,
    tz: (z1 - z0) / l,
    u: d / path.total,
  };
}

let built: { slots: Slot[]; ai: Ai[]; paths: Path[] } | null = null;

function build() {
  if (built) return built;
  const rng = mulberry32(7788);

  /* ------------------------------- kerbside ------------------------------- */

  const slots: Slot[] = buildWorld()
    .parked.filter((p) => inPhase(p.x, p.z))
    .map((p) => ({
      x: p.x,
      z: p.z,
      rot: p.rot,
      type: p.type,
      colour: PAINT[Math.abs(Math.round(p.x + p.z * 3)) % PAINT.length],
      taken: false,
    }));

  /* -------------------------------- traffic ------------------------------- */

  const paths: Path[] = [];
  const kinds: string[] = [];
  const widths: number[] = [];
  for (const road of ROADS) {
    if (road.kind === 'causeway') continue;
    for (const run of clipToPhase(resample(roadWorld(road), 12), -6)) {
      if (run.length < 3) continue;
      paths.push(makePath(run, road.id));
      kinds.push(road.kind);
      widths.push(road.width);
    }
  }

  const ai: Ai[] = [];
  paths.forEach((p, pi) => {
    const artery = kinds[pi] === 'artery' || kinds[pi] === 'bridge';
    const count = Math.max(1, Math.round(p.total / (artery ? 78 : 130)));
    for (let i = 0; i < count; i++) {
      // No auto-rickshaws in the island city — they are barred south of Bandra.
      const roll = rng();
      const type = roll < 0.3 ? V_TAXI : roll < 0.4 ? 1 : roll < 0.5 ? V_BIKE : V_SEDAN;
      const cruise =
        rand(rng, 8, 15) * (type === 1 ? 0.75 : 1) * (kinds[pi] === 'bridge' ? 1.8 : 1);
      ai.push({
        path: pi,
        dist: rand(rng, 0, p.total),
        speed: cruise,
        cruise,
        side: rng() < 0.5 ? 1 : -1,
        lane: rand(rng, 2.2, Math.max(2.6, widths[pi] - 2)),
        type,
        colour: PAINT[Math.floor(rng() * PAINT.length)],
        taken: false,
        x: 0,
        z: 0,
        y: 0,
        yaw: 0,
      });
    }
  });

  built = { slots, ai, paths };
  return built;
}

export const parkedSlots = () => build().slots;
export const aiVehicles = () => build().ai;
export const trafficPaths = () => build().paths;

/** Instances the renderer still has to hide, drained each frame. */
export const hideQueue: number[] = [];

export function stepTraffic(dt: number) {
  const { ai, paths } = build();
  for (const v of ai) {
    if (v.taken) continue;
    v.speed += (v.cruise - v.speed) * Math.min(1, dt * 1.5);
    v.dist += v.speed * v.side * dt;
    const p = paths[v.path];
    const s = samplePath(p, v.dist);
    const nx = -s.tz;
    const nz = s.tx;
    v.x = s.x + nx * v.lane * v.side;
    v.z = s.z + nz * v.lane * v.side;
    v.y = p.id === 'sea-link' ? SEA_LINK.profile(s.u) + 0.02 : 0;
    v.yaw = Math.atan2(s.tx * v.side, s.tz * v.side);
  }
}

export type Jacked = {
  spec: Spec;
  x: number;
  z: number;
  yaw: number;
  colour: number;
};

const SPEC_FOR_TYPE: Record<number, string> = {
  0: 'padmini',
  1: 'best',
  2: 'auto',
  3: 'sedan',
  4: 'gypsy',
  5: 'bike',
};

function specFor(type: number): Spec {
  const id = SPEC_FOR_TYPE[type] ?? 'sedan';
  return SPECS.find((s) => s.id === id)!;
}

/**
 * The nearest vehicle you could get into, kerbside or moving. Returns it
 * already removed from the world — the caller now owns it.
 */
export function jackNearest(x: number, z: number, reach = 5.5): Jacked | null {
  const { slots, ai } = build();
  let best: { d: number; take: () => Jacked } | null = null;

  slots.forEach((s, i) => {
    if (s.taken) return;
    const d = Math.hypot(s.x - x, s.z - z);
    if (d > reach || (best && d >= best.d)) return;
    best = {
      d,
      take: () => {
        s.taken = true;
        hideQueue.push(i);
        return { spec: specFor(s.type), x: s.x, z: s.z, yaw: s.rot, colour: s.colour };
      },
    };
  });

  for (const v of ai) {
    if (v.taken) continue;
    const d = Math.hypot(v.x - x, v.z - z);
    if (d > reach || (best && d >= best.d)) continue;
    best = {
      d,
      take: () => {
        v.taken = true;
        return { spec: specFor(v.type), x: v.x, z: v.z, yaw: v.yaw, colour: v.colour };
      },
    };
  }

  return best ? (best as { take: () => Jacked }).take() : null;
}

/** Distance to the nearest jackable vehicle, for the "press F" prompt. */
export function nearestVehicleDistance(x: number, z: number, reach = 6): number {
  const { slots, ai } = build();
  let best = Infinity;
  for (const s of slots) {
    if (s.taken) continue;
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < best) best = d;
    if (best < 0.5) return best;
  }
  for (const v of ai) {
    if (v.taken) continue;
    const d = Math.hypot(v.x - x, v.z - z);
    if (d < best) best = d;
  }
  return best <= reach ? best : Infinity;
}

export { V_POLICE };
