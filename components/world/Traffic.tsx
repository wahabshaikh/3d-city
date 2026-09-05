'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { RAIL_LINES, railWorld } from '@/lib/mumbai/roads';
import { resample } from '@/lib/ribbon';
import { SEA_LEVEL } from '@/lib/mumbai/physics';
import { clipToPhase, inPhase } from '@/lib/mumbai/bounds';
import { materials } from './materials';
import { mulberry32, rand } from '@/lib/rng';
import { geo } from '@/lib/geo';

/**
 * Everything that moves and is not on the road. Road traffic lives in
 * `components/game/Vehicles` now, because the player can steal it.
 */

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
};

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

export function Traffic() {
  return (
    <group>
      <LocalTrains />
      <HarbourBoats />
    </group>
  );
}

/** Nine-coach rakes on the Western and Central lines. */
function LocalTrains() {
  const m = materials();
  const COACHES = 9;

  const { paths, rakes, coach, roof, glass } = useMemo(() => {
    const rng = mulberry32(1853);
    const paths: Path[] = [];
    for (const l of RAIL_LINES)
      for (const run of clipToPhase(resample(railWorld(l), 12), -10))
        if (run.length > 12) paths.push(makePath(run, l.id));

    const rakes: { path: number; dist: number; speed: number; side: number }[] = [];
    paths.forEach((p, pi) => {
      for (let i = 0; i < 3; i++)
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
  const total = Math.max(1, rakes.length * COACHES);

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
      geo(18.9775, 72.8025), // Haji Ali bay
      geo(18.9095, 72.8065), // off Navy Nagar
      geo(18.9525, 72.7905), // off Malabar Point
    ].filter(([x, z]) => inPhase(x, z, 250));
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
    <instancedMesh
      ref={ref}
      args={[hull, m.teak, Math.max(1, boats.length)]}
      castShadow
      frustumCulled={false}
    />
  );
}
