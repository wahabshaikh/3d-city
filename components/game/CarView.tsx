'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { vehicleGeometry } from '../world/vehicles';
import { vehicleMaterials } from './Vehicles';
import type { Car } from '@/lib/game/vehicles';

/**
 * One vehicle drawn on its own rather than out of an instance buffer: the one
 * you are driving, and any you have left standing in the road. Its own copy of
 * the paint material so the colour can be per-car, and its own headlamps so
 * they can be on while the traffic's are off.
 */
export function CarView({ car }: { car: Car }) {
  const geos = useMemo(() => vehicleGeometry(), []);
  const base = useMemo(() => vehicleMaterials(), []);
  const g = geos[car.spec.geo];
  const mats = base[car.spec.geo];

  // Painted panels are shared white materials; a driven car needs its own.
  const own = useMemo(() => {
    if (!mats.tinted) return null;
    const m = (mats.body as THREE.MeshStandardMaterial).clone();
    m.color.setHex(car.colour);
    return m;
  }, [mats, car.colour]);
  useEffect(() => () => own?.dispose(), [own]);

  const body = own ?? mats.body;
  const trim = mats.tinted ? (own ?? mats.trim) : mats.trim;

  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const o = ref.current;
    if (!o) return;
    o.position.set(car.x, car.y, car.z);
    o.rotation.set(car.pitch, car.yaw, car.roll);
  });

  return (
    <group ref={ref}>
      <mesh geometry={g.lower} material={body} castShadow receiveShadow />
      <mesh geometry={g.upper} material={trim} castShadow />
      <mesh geometry={g.glass} material={mats.glass} />
      <mesh geometry={g.wheels} material={mats.wheels} castShadow />
      <mesh geometry={g.head} material={mats.head} />
      <mesh geometry={g.tail} material={mats.tail} />
    </group>
  );
}
