'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { materials } from '../world/materials';
import { vehicleGeometry, type VehicleGeo } from '../world/vehicles';
import { aiVehicles, hideQueue, parkedSlots, stepTraffic } from '@/lib/game/traffic';
import { chunk } from '@/lib/mumbai/world';
import { getState } from '@/lib/store';

/**
 * Every vehicle on the map that the player is not sitting in.
 *
 * Kerbside cars are written into their instance buffers once and then left
 * alone — there are a couple of thousand of them and none of them is going
 * anywhere. Traffic gets rewritten every frame. Both draw from the same six
 * geometries per vehicle, so the whole road network costs a few dozen calls.
 */

export type PartMats = {
  body: THREE.Material;
  trim: THREE.Material;
  glass: THREE.Material;
  wheels: THREE.Material;
  head: THREE.Material;
  tail: THREE.Material;
  /** Body takes a per-instance colour. */
  tinted: boolean;
};

export function vehicleMaterials(): PartMats[] {
  const m = materials();
  return [
    // taxi: black below the waist, yellow above
    { body: m.black, trim: m.taxiYellow, glass: m.glassDark, wheels: m.tyre, head: m.headLamp, tail: m.tailLamp, tinted: false },
    // BEST bus
    { body: m.bestRed, trim: m.whitewash, glass: m.glassDark, wheels: m.tyre, head: m.headLamp, tail: m.tailLamp, tinted: false },
    // auto-rickshaw
    { body: m.black, trim: m.taxiYellow, glass: m.glassDark, wheels: m.tyre, head: m.headLamp, tail: m.tailLamp, tinted: false },
    // private car
    { body: m.paint, trim: m.paint, glass: m.glassDark, wheels: m.tyre, head: m.headLamp, tail: m.tailLamp, tinted: true },
    // police Gypsy
    { body: m.whitewash, trim: m.policeBlue, glass: m.glassDark, wheels: m.tyre, head: m.headLamp, tail: m.tailLamp, tinted: false },
    // motorcycle
    { body: m.paint, trim: m.black, glass: m.chrome, wheels: m.tyre, head: m.headLamp, tail: m.tailLamp, tinted: true },
  ];
}

const PARTS = ['lower', 'upper', 'glass', 'wheels', 'head', 'tail'] as const;

function partGeos(g: VehicleGeo) {
  return [g.lower, g.upper, g.glass, g.wheels, g.head, g.tail];
}

function partMats(p: PartMats) {
  return [p.body, p.trim, p.glass, p.wheels, p.head, p.tail];
}

export function Vehicles() {
  const geos = useMemo(() => vehicleGeometry(), []);
  const mats = useMemo(() => vehicleMaterials(), []);

  return (
    <group>
      <Kerbside geos={geos} mats={mats} />
      <Moving geos={geos} mats={mats} />
      <Headlights />
    </group>
  );
}

/* -------------------------------------------------------------------------- */

function Kerbside({ geos, mats }: { geos: VehicleGeo[]; mats: PartMats[] }) {
  /** slot index -> the meshes and row it was written into. */
  const rows = useRef(new Map<number, { meshes: THREE.InstancedMesh[]; i: number }>());

  const meshes = useMemo(() => {
    const slots = parkedSlots();
    const out: THREE.Object3D[] = [];
    const dummy = new THREE.Object3D();
    const colour = new THREE.Color();
    rows.current.clear();

    // Chunked so the GPU can frustum-cull whole streets at a time.
    const indexed = slots.map((s, i) => ({ ...s, i }));
    for (const cell of chunk(indexed, 500)) {
      for (let t = 0; t < geos.length; t++) {
        const list = cell.filter((s) => s.type === t);
        if (!list.length) continue;
        const g = partGeos(geos[t]);
        const mm = partMats(mats[t]);
        const parts = g.map((geo, k) => {
          const mesh = new THREE.InstancedMesh(geo, mm[k], list.length);
          mesh.castShadow = k < 2;
          return mesh;
        });
        list.forEach((s, i) => {
          dummy.position.set(s.x, 0, s.z);
          dummy.rotation.set(0, s.rot, 0);
          dummy.scale.setScalar(s.taken ? 0 : 1);
          dummy.updateMatrix();
          for (const mesh of parts) mesh.setMatrixAt(i, dummy.matrix);
          if (mats[t].tinted) {
            parts[0].setColorAt(i, colour.setHex(s.colour));
            parts[1].setColorAt(i, colour.setHex(s.colour));
          }
          rows.current.set(s.i, { meshes: parts, i });
        });
        for (const mesh of parts) {
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
        out.push(...parts);
      }
    }
    return out;
  }, [geos, mats]);

  // A stolen car has to leave the kerb it was written into.
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  useFrame(() => {
    while (hideQueue.length) {
      const slot = hideQueue.pop()!;
      const row = rows.current.get(slot);
      if (!row) continue;
      for (const mesh of row.meshes) {
        mesh.setMatrixAt(row.i, zero);
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {meshes.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */

function Moving({ geos, mats }: { geos: VehicleGeo[]; mats: PartMats[] }) {
  const vehicles = useMemo(() => aiVehicles(), []);
  const counts = useMemo(
    () => geos.map((_, t) => vehicles.filter((v) => v.type === t).length),
    [geos, vehicles]
  );
  const refs = useRef<(THREE.InstancedMesh | null)[][]>(geos.map(() => PARTS.map(() => null)));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colour = useMemo(() => new THREE.Color(), []);
  const painted = useRef(false);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    stepTraffic(dt);

    const idx = geos.map(() => 0);
    for (const v of vehicles) {
      const t = v.type;
      const i = idx[t]++;
      if (v.taken) {
        dummy.scale.setScalar(0);
        dummy.position.set(0, -500, 0);
        dummy.rotation.set(0, 0, 0);
      } else {
        dummy.position.set(v.x, v.y, v.z);
        dummy.rotation.set(0, v.yaw, 0);
        dummy.scale.setScalar(1);
      }
      dummy.updateMatrix();
      for (let k = 0; k < PARTS.length; k++) refs.current[t][k]?.setMatrixAt(i, dummy.matrix);
      if (!painted.current && mats[t].tinted) {
        refs.current[t][0]?.setColorAt(i, colour.setHex(v.colour));
        refs.current[t][1]?.setColorAt(i, colour.setHex(v.colour));
      }
    }

    for (let t = 0; t < geos.length; t++)
      for (let k = 0; k < PARTS.length; k++) {
        const mesh = refs.current[t][k];
        if (!mesh) continue;
        mesh.instanceMatrix.needsUpdate = true;
        if (!painted.current && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    painted.current = true;
  });

  return (
    <group>
      {geos.map((g, t) => {
        const gp = partGeos(g);
        const mp = partMats(mats[t]);
        return (
          <group key={t}>
            {PARTS.map((_, k) => (
              <instancedMesh
                key={k}
                ref={(r) => {
                  refs.current[t][k] = r;
                }}
                args={[gp[k], mp[k], Math.max(1, counts[t])]}
                castShadow={k < 2}
                frustumCulled={false}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* -------------------------------------------------------------------------- */

/** Lamps come on at dusk and go off at dawn, for every vehicle at once. */
function Headlights() {
  const m = materials();
  useFrame((_, dt) => {
    const tod = getState().timeOfDay;
    const night = tod < 0.27 || tod > 0.74 ? 1 : 0;
    const head = m.headLamp as THREE.MeshStandardMaterial;
    const tail = m.tailLamp as THREE.MeshStandardMaterial;
    head.emissiveIntensity = THREE.MathUtils.damp(head.emissiveIntensity, night * 1.5, 3, dt);
    tail.emissiveIntensity = THREE.MathUtils.damp(tail.emissiveIntensity, 0.3 + night * 0.9, 3, dt);
  });
  return null;
}
