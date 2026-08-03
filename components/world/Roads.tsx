'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { ROADS, RAIL_LINES, roadWorld, railWorld } from '@/lib/mumbai/roads';
import { ribbonGeometry, resample } from '@/lib/ribbon';
import { roadTexture } from '@/lib/textures';
import { materials } from './materials';
import { geo } from '@/lib/geo';

export function Roads() {
  const m = materials();

  /**
   * Roads are decals laid on the land slab. Depth offsets alone lose to
   * z-fighting once you are a few hundred metres out, so bias the polygons.
   */
  const roadMat = useMemo(() => {
    const t = roadTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(1, 1);
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -8,
    });
  }, []);

  const kerbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x9a948a,
        roughness: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -6,
      }),
    []
  );

  const geos = useMemo(
    () =>
      ROADS.filter((r) => r.kind !== 'bridge').map((r) => {
        const pts = resample(roadWorld(r), 10);
        const y = r.kind === 'causeway' ? 1.1 : 0.25;
        return {
          id: r.id,
          road: ribbonGeometry(pts, r.width, y, 1 / (r.width * 2.2)),
          kerb:
            r.kind === 'causeway'
              ? null
              : ribbonGeometry(pts, r.width + 2.8, y - 0.06, 1 / 30),
        };
      }),
    []
  );

  const rails = useMemo(
    () =>
      RAIL_LINES.map((line) => {
        const pts = resample(railWorld(line), 10);
        return {
          id: line.id,
          bed: ribbonGeometry(pts, 7.5, 0.4, 1 / 8),
          left: ribbonGeometry(
            pts.map(([x, z], i) => offsetPt(pts, i, -2.4)),
            0.14,
            0.72
          ),
          right: ribbonGeometry(
            pts.map(([x, z], i) => offsetPt(pts, i, 2.4)),
            0.14,
            0.72
          ),
          leftB: ribbonGeometry(
            pts.map(([x, z], i) => offsetPt(pts, i, -6.4)),
            0.14,
            0.72
          ),
          rightB: ribbonGeometry(
            pts.map(([x, z], i) => offsetPt(pts, i, 6.4)),
            0.14,
            0.72
          ),
        };
      }),
    []
  );

  const ballast = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x4b453c,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -8,
      }),
    []
  );

  return (
    <group>
      {geos.map((g) => (
        <group key={g.id}>
          {g.kerb && <mesh geometry={g.kerb} material={kerbMat} receiveShadow />}
          <mesh geometry={g.road} material={roadMat} receiveShadow />
        </group>
      ))}

      {rails.map((r) => (
        <group key={r.id}>
          <mesh geometry={r.bed} material={ballast} receiveShadow />
          {[r.left, r.right, r.leftB, r.rightB].map((g, i) => (
            <mesh key={i} geometry={g} material={m.steel} />
          ))}
        </group>
      ))}

      <Stations />
    </group>
  );
}

function offsetPt(pts: [number, number][], i: number, d: number): [number, number] {
  const [x, z] = pts[i];
  const [px, pz] = pts[Math.max(0, i - 1)];
  const [nx, nz] = pts[Math.min(pts.length - 1, i + 1)];
  const l = Math.hypot(nx - px, nz - pz) || 1;
  return [x + (-(nz - pz) / l) * d, z + ((nx - px) / l) * d];
}

/** Platform canopies at every suburban station — the corrugated sheds of the locals. */
function Stations() {
  const m = materials();
  const stations = useMemo(
    () =>
      RAIL_LINES.flatMap((l) =>
        l.stations.map((s) => {
          const [x, z] = geo(s.at[0], s.at[1]);
          return { key: `${l.id}-${s.name}`, x, z, colour: l.colour };
        })
      ),
    []
  );
  return (
    <group>
      {stations.map((s) => (
        <group key={s.key} position={[s.x, 0, s.z]}>
          {[-6.4, 0, 6.4].map((off) => (
            <group key={off} position={[off, 0, 0]}>
              <mesh material={m.concrete} position={[0, 0.55, 0]} receiveShadow castShadow>
                <boxGeometry args={[5, 1.1, 68]} />
              </mesh>
              <mesh material={m.tin} position={[0, 5.2, 0]} castShadow>
                <boxGeometry args={[7.4, 0.25, 56]} />
              </mesh>
              {[-24, -8, 8, 24].map((z) => (
                <mesh key={z} material={m.steel} position={[0, 3.1, z]} castShadow>
                  <cylinderGeometry args={[0.14, 0.16, 4, 6]} />
                </mesh>
              ))}
            </group>
          ))}
          {/* footbridge over the tracks */}
          <mesh material={m.steel} position={[0, 8.4, 30]} castShadow>
            <boxGeometry args={[26, 0.4, 3.4]} />
          </mesh>
          <mesh material={m.tin} position={[0, 10.2, 30]} castShadow>
            <boxGeometry args={[26, 0.2, 4.2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
