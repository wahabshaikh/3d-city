import * as THREE from 'three';

export type Pt = [number, number];

/** Resample a polyline through a Catmull-Rom curve at a fixed spacing. */
export function resample(pts: Pt[], spacing: number): Pt[] {
  if (pts.length < 2) return pts;
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const n = Math.max(2, Math.round(curve.getLength() / spacing));
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n);
    out.push([p.x, p.z]);
  }
  return out;
}

/**
 * A flat strip following a polyline — used for roads, promenades, bridge decks
 * and rail beds. `height` may be a constant or a function of 0..1 along it.
 */
export function ribbonGeometry(
  pts: Pt[],
  halfWidth: number,
  height: number | ((t: number) => number) = 0,
  uvRepeatPerUnit = 1 / 12
) {
  const n = pts.length;
  const pos = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  const lengths: number[] = [0];
  for (let i = 1; i < n; i++)
    lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lengths[n - 1] || 1;

  for (let i = 0; i < n; i++) {
    const [x, z] = pts[i];
    const [px, pz] = pts[Math.max(0, i - 1)];
    const [nx2, nz2] = pts[Math.min(n - 1, i + 1)];
    const tx = nx2 - px;
    const tz = nz2 - pz;
    const l = Math.hypot(tx, tz) || 1;
    const nx = -tz / l;
    const nz = tx / l;
    const t = lengths[i] / total;
    const y = typeof height === 'function' ? height(t) : height;
    pos.set([x + nx * halfWidth, y, z + nz * halfWidth], i * 6);
    pos.set([x - nx * halfWidth, y, z - nz * halfWidth], i * 6 + 3);
    const v = lengths[i] * uvRepeatPerUnit;
    uv.set([0, v], i * 4);
    uv.set([1, v], i * 4 + 2);
  }

  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Point and inland-facing normal at parameter t along a polyline. */
export function frameAt(pts: Pt[], t: number) {
  const n = pts.length;
  const f = Math.min(n - 2, Math.floor(t * (n - 1)));
  const local = t * (n - 1) - f;
  const [x0, z0] = pts[f];
  const [x1, z1] = pts[f + 1];
  const x = x0 + (x1 - x0) * local;
  const z = z0 + (z1 - z0) * local;
  const l = Math.hypot(x1 - x0, z1 - z0) || 1;
  return { x, z, tx: (x1 - x0) / l, tz: (z1 - z0) / l, nx: -(z1 - z0) / l, nz: (x1 - x0) / l };
}
