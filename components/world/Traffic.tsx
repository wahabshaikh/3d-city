'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { ROADS, RAIL_LINES, roadWorld, railWorld } from '@/lib/mumbai/roads';
import { resample } from '@/lib/ribbon';
import { SEA_LINK, SEA_LEVEL } from '@/lib/mumbai/physics';
import { materials } from './materials';
import { mulberry32, rand, pick } from '@/lib/rng';
import { geo } from '@/lib/geo';

/* ------------------------------ vehicle bodies ---------------------------- */

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
};

/** Premier Padmini kaali-peeli: black below the waist, yellow roof. */
function taxi() {
  const lower = mergeGeometries([
    box(1.72, 0.72, 4.0, 0, 0.62, 0),
    box(1.6, 0.34, 1.5, 0, 1.14, -1.15),
    box(1.6, 0.34, 1.2, 0, 1.14, 1.35),
  ])!;
  const upper = mergeGeometries([box(1.58, 0.62, 2.0, 0, 1.32, 0.1)])!;
  const glass = mergeGeometries([
    box(1.5, 0.5, 0.1, 0, 1.32, 1.12),
    box(1.5, 0.5, 0.1, 0, 1.32, -0.92),
    box(0.08, 0.46, 1.9, 0.76, 1.32, 0.1),
    box(0.08, 0.46, 1.9, -0.76, 1.32, 0.1),
  ])!;
  return { lower, upper, glass, len: 4.2 };
}

/** BEST double-decker: red, white waistband, open rear staircase. */
function bestBus() {
  const body = mergeGeometries([
    box(2.5, 4.0, 10.4, 0, 2.4, 0),
    box(2.6, 0.3, 10.5, 0, 1.5, 0),
  ])!;
  const band = mergeGeometries([
    box(2.56, 0.4, 10.45, 0, 2.55, 0),
    box(2.56, 0.3, 10.45, 0, 0.55, 0),
  ])!;
  const glass = mergeGeometries([
    box(2.45, 0.95, 9.6, 0, 1.85, 0),
    box(2.45, 0.95, 9.6, 0, 3.5, 0),
    box(2.3, 1.1, 0.1, 0, 2.0, 5.2),
    box(2.3, 1.1, 0.1, 0, 3.7, 5.2),
  ])!;
  return { lower: body, upper: band, glass, len: 10.6 };
}

/** Auto-rickshaw: black tub, yellow hood — suburbs only, never south of Bandra. */
function auto() {
  const lower = mergeGeometries([box(1.35, 0.85, 2.5, 0, 0.62, 0)])!;
  const upper = mergeGeometries([
    box(1.4, 0.75, 2.1, 0, 1.4, -0.1),
    box(1.42, 0.12, 2.3, 0, 1.8, -0.1),
  ])!;
  const glass = mergeGeometries([box(1.2, 0.5, 0.08, 0, 1.45, 1.0)])!;
  return { lower, upper, glass, len: 2.7 };
}

function car() {
  const lower = mergeGeometries([
    box(1.75, 0.7, 4.3, 0, 0.6, 0),
    box(1.62, 0.55, 2.2, 0, 1.2, -0.1),
  ])!;
  const upper = mergeGeometries([box(1.5, 0.06, 2.0, 0, 1.5, -0.1)])!;
  const glass = mergeGeometries([
    box(1.5, 0.45, 0.1, 0, 1.22, 1.0),
    box(1.5, 0.45, 0.1, 0, 1.22, -1.2),
  ])!;
  return { lower, upper, glass, len: 4.5 };
}

function wheelGeo(r: number, positions: [number, number, number][]) {
  const parts = positions.map(([x, y, z]) => {
    const g = new THREE.CylinderGeometry(r, r, r * 0.55, 10);
    g.rotateZ(Math.PI / 2);
    g.translate(x, y, z);
    return g;
  });
  return mergeGeometries(parts)!;
}

type Path = { pts: [number, number][]; lens: number[]; total: number; id: string };

function makePath(pts: [number, number][], id: string): Path {
  const lens = [0];
  for (let i = 1; i < pts.length; i++)
    lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lens, total: lens[lens.length - 1] || 1, id };
}

function sample(path: Path, dist: number) {
  const d = ((dist % path.total) + path.total) % path.total;
  let i = 1;
  while (i < path.lens.length - 1 && path.lens[i] < d) i++;
  const t = (d - path.lens[i - 1]) / (path.lens[i] - path.lens[i - 1] || 1);
  const [x0, z0] = path.pts[i - 1];
  const [x1, z1] = path.pts[i];
  const x = x0 + (x1 - x0) * t;
  const z = z0 + (z1 - z0) * t;
  const l = Math.hypot(x1 - x0, z1 - z0) || 1;
  return { x, z, tx: (x1 - x0) / l, tz: (z1 - z0) / l, u: d / path.total };
}

type Vehicle = {
  path: number;
  dist: number;
  speed: number;
  side: number;
  lane: number;
  type: number;
};

const TYPES = ['taxi', 'bus', 'auto', 'car'] as const;

export function Traffic() {
  const m = materials();

  const { paths, vehicles, geos, wheels } = useMemo(() => {
    const rng = mulberry32(7788);
    const drivable = ROADS.filter((r) => r.kind !== 'causeway');
    const paths = drivable.map((r) => makePath(resample(roadWorld(r), 12), r.id));

    const geos = [taxi(), bestBus(), auto(), car()];
    const wheels = [
      wheelGeo(0.34, [
        [0.86, 0.34, 1.3],
        [-0.86, 0.34, 1.3],
        [0.86, 0.34, -1.3],
        [-0.86, 0.34, -1.3],
      ]),
      wheelGeo(0.62, [
        [1.28, 0.62, 3.4],
        [-1.28, 0.62, 3.4],
        [1.28, 0.62, -3.0],
        [-1.28, 0.62, -3.0],
        [1.28, 0.62, -4.0],
        [-1.28, 0.62, -4.0],
      ]),
      wheelGeo(0.3, [
        [0, 0.3, 1.05],
        [0.62, 0.3, -0.9],
        [-0.62, 0.3, -0.9],
      ]),
      wheelGeo(0.34, [
        [0.86, 0.34, 1.4],
        [-0.86, 0.34, 1.4],
        [0.86, 0.34, -1.4],
        [-0.86, 0.34, -1.4],
      ]),
    ];

    const vehicles: Vehicle[] = [];
    paths.forEach((p, pi) => {
      const road = drivable[pi];
      const count = Math.max(2, Math.round(p.total / (road.kind === 'artery' ? 90 : 150)));
      // Auto-rickshaws are barred from the island city, so they only run north.
      const northern = ['linking-road', 'wes', 'juhu-tara', 'bandra-bandstand', 'sion-mahim'].includes(
        road.id
      );
      for (let i = 0; i < count; i++) {
        const roll = rng();
        const type = northern
          ? roll < 0.3
            ? 2
            : roll < 0.5
              ? 0
              : roll < 0.62
                ? 1
                : 3
          : roll < 0.34
            ? 0
            : roll < 0.46
              ? 1
              : 3;
        vehicles.push({
          path: pi,
          dist: rand(rng, 0, p.total),
          speed: rand(rng, 7, 15) * (type === 1 ? 0.75 : 1) * (road.kind === 'bridge' ? 1.9 : 1),
          side: rng() < 0.5 ? 1 : -1,
          lane: rand(rng, 2.2, road.width - 2),
          type,
        });
      }
    });

    return { paths, vehicles, geos, wheels };
  }, []);

  const refs = useRef<(THREE.InstancedMesh | null)[][]>(
    TYPES.map(() => [null, null, null, null])
  );

  const counts = useMemo(
    () => TYPES.map((_, t) => vehicles.filter((v) => v.type === t).length),
    [vehicles]
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    const idx = [0, 0, 0, 0];
    for (const v of vehicles) {
      v.dist += v.speed * v.side * Math.min(dt, 0.05);
      const p = paths[v.path];
      const s = sample(p, v.dist);
      let y = 0;
      if (p.id === 'sea-link') y = SEA_LINK.profile(s.u) + 0.02;
      const nx = -s.tz;
      const nz = s.tx;
      dummy.position.set(x0(s.x, nx, v), y, z0(s.z, nz, v));
      dummy.rotation.set(0, Math.atan2(s.tx * v.side, s.tz * v.side), 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      const t = v.type;
      const i = idx[t]++;
      for (let k = 0; k < 4; k++) refs.current[t][k]?.setMatrixAt(i, dummy.matrix);
    }
    for (let t = 0; t < TYPES.length; t++)
      for (let k = 0; k < 4; k++) {
        const mesh = refs.current[t][k];
        if (mesh) mesh.instanceMatrix.needsUpdate = true;
      }
  });

  const bodyMats = [m.black, m.bestRed, m.black, m.whitewash];
  const trimMats = [m.taxiYellow, m.whitewash, m.taxiYellow, m.glassDark];

  return (
    <group>
      {TYPES.map((_, t) => (
        <group key={t}>
          <instancedMesh
            ref={(r) => {
              refs.current[t][0] = r;
            }}
            args={[geos[t].lower, bodyMats[t], Math.max(1, counts[t])]}
            castShadow
            frustumCulled={false}
          />
          <instancedMesh
            ref={(r) => {
              refs.current[t][1] = r;
            }}
            args={[geos[t].upper, trimMats[t], Math.max(1, counts[t])]}
            castShadow
            frustumCulled={false}
          />
          <instancedMesh
            ref={(r) => {
              refs.current[t][2] = r;
            }}
            args={[geos[t].glass, m.glassDark, Math.max(1, counts[t])]}
            frustumCulled={false}
          />
          <instancedMesh
            ref={(r) => {
              refs.current[t][3] = r;
            }}
            args={[wheels[t], m.black, Math.max(1, counts[t])]}
            frustumCulled={false}
          />
        </group>
      ))}
      <LocalTrains />
      <HarbourBoats />
    </group>
  );
}

const x0 = (x: number, nx: number, v: Vehicle) => x + nx * v.lane * v.side;
const z0 = (z: number, nz: number, v: Vehicle) => z + nz * v.lane * v.side;

/** Nine-coach rakes on the Western and Central lines. */
function LocalTrains() {
  const m = materials();
  const COACHES = 9;

  const { paths, rakes, coach, roof, glass } = useMemo(() => {
    const rng = mulberry32(1853);
    const paths = RAIL_LINES.map((l) => makePath(resample(railWorld(l), 12), l.id));
    const rakes: { path: number; dist: number; speed: number; side: number }[] = [];
    paths.forEach((p, pi) => {
      for (let i = 0; i < 4; i++)
        rakes.push({
          path: pi,
          dist: rand(rng, 0, p.total),
          speed: rand(rng, 16, 24),
          side: i % 2 === 0 ? 1 : -1,
        });
    });
    const coach = mergeGeometries([box(3.2, 3.0, 19.4, 0, 2.3, 0), box(3.3, 0.5, 19.6, 0, 0.9, 0)])!;
    const roof = mergeGeometries([box(3.24, 0.42, 19.5, 0, 3.9, 0)])!;
    const glass = mergeGeometries([
      box(3.26, 1.1, 17.6, 0, 2.9, 0),
      box(2.9, 1.5, 0.12, 0, 2.6, 9.75),
    ])!;
    return { paths, rakes, coach, roof, glass };
  }, []);

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const glassRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const total = rakes.length * COACHES;

  useFrame((_, dt) => {
    let i = 0;
    for (const r of rakes) {
      r.dist += r.speed * r.side * Math.min(dt, 0.05);
      const p = paths[r.path];
      for (let c = 0; c < COACHES; c++) {
        const s = sample(p, r.dist - c * 20.4 * r.side);
        const nx = -s.tz;
        const nz = s.tx;
        const off = r.side * 4.4;
        dummy.position.set(s.x + nx * off, 1.1, s.z + nz * off);
        dummy.rotation.set(0, Math.atan2(s.tx * r.side, s.tz * r.side), 0);
        dummy.updateMatrix();
        bodyRef.current?.setMatrixAt(i, dummy.matrix);
        roofRef.current?.setMatrixAt(i, dummy.matrix);
        glassRef.current?.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    for (const r of [bodyRef, roofRef, glassRef])
      if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[coach, m.trainBlue, total]} castShadow frustumCulled={false} />
      <instancedMesh ref={roofRef} args={[roof, m.concreteDark, total]} frustumCulled={false} />
      <instancedMesh ref={glassRef} args={[glass, m.darkGrey, total]} frustumCulled={false} />
    </group>
  );
}

/** Ferries off the Gateway and Koli fishing boats in the bays. */
function HarbourBoats() {
  const m = materials();
  const boats = useMemo(() => {
    const rng = mulberry32(419);
    const anchors: [number, number][] = [
      geo(18.9205, 72.8385),
      geo(18.919, 72.842),
      geo(18.9245, 72.8395),
      geo(18.936, 72.8135), // Back Bay
      geo(18.9295, 72.8125),
      geo(19.0195, 72.8065), // off Worli
      geo(19.0455, 72.8095), // off Bandra
      geo(19.0955, 72.8175), // off Juhu
      geo(18.9775, 72.8025), // Haji Ali bay
    ];
    return anchors.flatMap(([x, z], k) =>
      Array.from({ length: 3 }, (_, i) => ({
        cx: x + rand(rng, -70, 70),
        cz: z + rand(rng, -70, 70),
        r: rand(rng, 18, 60),
        phase: rng() * 6.28,
        speed: rand(rng, 0.03, 0.09) * (rng() < 0.5 ? -1 : 1),
        big: k < 3 && i === 0,
      }))
    );
  }, []);

  const hull = useMemo(
    () =>
      mergeGeometries([
        box(3.4, 1.5, 12, 0, 0.4, 0),
        box(2.6, 1.4, 4.2, 0, 1.8, -1.5),
        box(0.2, 5, 0.2, 0, 3.4, 2.5),
      ])!,
    []
  );
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    boats.forEach((b, i) => {
      const a = b.phase + t.current * b.speed;
      dummy.position.set(
        b.cx + Math.cos(a) * b.r,
        SEA_LEVEL + 0.6 + Math.sin(t.current * 1.4 + i) * 0.22,
        b.cz + Math.sin(a) * b.r
      );
      dummy.rotation.set(
        Math.sin(t.current * 1.1 + i) * 0.03,
        -a + Math.PI / 2,
        Math.sin(t.current * 0.9 + i) * 0.04
      );
      dummy.scale.setScalar(b.big ? 1.9 : 1);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[hull, m.teak, boats.length]} castShadow frustumCulled={false} />
  );
}
