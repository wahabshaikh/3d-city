'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { vehicleGeometry } from '../world/vehicles';
import { vehicleMaterials } from './Vehicles';
import { getState } from '@/lib/store';
import { contactGeometry, contactMaterial } from './contact';
import type { Car } from '@/lib/game/vehicles';

/**
 * One vehicle drawn on its own rather than out of an instance buffer: the one
 * you are driving, and any you have left standing in the road. It gets its own
 * paint so the colour can be per-car, wheels that steer and spin, and — after
 * dark — headlamps that actually throw light down the street.
 */
export function CarView({ car, driven = false }: { car: Car; driven?: boolean }) {
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
  const blob = useRef<THREE.Mesh>(null);
  const front = useRef<THREE.Group>(null);
  const rear = useRef<THREE.Group>(null);
  const beams = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const o = ref.current;
    if (!o) return;
    o.position.set(car.x, car.y, car.z);
    o.rotation.set(car.pitch, car.yaw, car.roll);

    const spin = -car.odo / g.wheelRadius;
    if (front.current) {
      front.current.rotation.y = car.wheel * 0.55;
      front.current.rotation.x = spin;
    }
    if (rear.current) rear.current.rotation.x = spin;

    // The blob stays flat on the road whatever the body is doing.
    if (blob.current) {
      blob.current.position.set(car.x, car.y + 0.03, car.z);
      blob.current.rotation.set(0, car.yaw, 0);
    }

    if (beams.current) {
      const t = getState().timeOfDay;
      const on = t < 0.27 || t > 0.74;
      beams.current.visible = on;
      for (const child of beams.current.children) {
        const l = child as THREE.SpotLight;
        if (l.isSpotLight) l.intensity = THREE.MathUtils.damp(l.intensity, on ? 420 : 0, 5, dt);
      }
    }
  });

  const [fz, rz] = g.axle;
  const r = g.wheelRadius;
  const s = car.spec;

  // A spotlight aims at its target's world position, so both have to hang off
  // the car — otherwise the beams stay pointing wherever the car was built.
  const beamLights = useMemo(() => {
    if (!driven) return [];
    return [-1, 1].map((side) => {
      const l = new THREE.SpotLight(0xfff0cf, 0, 48, 0.55, 0.7, 1.2);
      l.position.set(side * s.halfWidth * 0.66, 0.78, s.halfLength * 0.9);
      l.target.position.set(side * s.halfWidth * 0.9, -1.0, s.halfLength + 24);
      return l;
    });
  }, [driven, s]);
  useEffect(
    () => () => beamLights.forEach((l) => l.dispose()),
    [beamLights]
  );

  return (
    <>
      <mesh
        ref={blob}
        geometry={contactGeometry()}
        material={contactMaterial()}
        scale={[s.halfWidth * 2.6, 1, s.halfLength * 2.35]}
        renderOrder={2}
      />
      <group ref={ref}>
      <mesh geometry={g.lower} material={body} castShadow receiveShadow />
      <mesh geometry={g.upper} material={trim} castShadow />
      <mesh geometry={g.glass} material={mats.glass} />
      <group ref={front} position={[0, r, fz]} rotation={[0, 0, 0, 'YXZ']}>
        <mesh geometry={g.wheelsFront} material={mats.wheels} castShadow />
      </group>
      <group ref={rear} position={[0, r, rz]}>
        <mesh geometry={g.wheelsRear} material={mats.wheels} castShadow />
      </group>
      <mesh geometry={g.head} material={mats.head} />
      <mesh geometry={g.tail} material={mats.tail} />
      {driven && (
        <group ref={beams} visible={false}>
          {beamLights.map((l, i) => (
            <group key={i}>
              <primitive object={l} />
              <primitive object={l.target} />
            </group>
          ))}
        </group>
      )}
          </group>
    </>
  );
}
