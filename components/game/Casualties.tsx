'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { buildCharacter, disposeCharacter, poseFloored, LOOKS, type Rig } from './character';
import { casualties, LIFETIME, stepCasualties } from '@/lib/game/casualties';
import { groundAt } from '@/lib/mumbai/physics';
import { contactGeometry, contactMaterial } from './contact';

/**
 * Whoever the bumper found.
 *
 * Eight rigs, re-dressed and re-used. A hit rolls the body over its long axis
 * in about a third of a second, carries it along the way it was thrown, and
 * then leaves it in the road until the pool needs the slot back.
 */

const POOL = 8;

export function Casualties() {
  const rigs = useMemo<Rig[]>(
    () => Array.from({ length: POOL }, (_, i) => buildCharacter(LOOKS[i % LOOKS.length])),
    []
  );
  const blobs = useMemo(
    () =>
      Array.from({ length: POOL }, () => {
        const m = new THREE.Mesh(contactGeometry(), contactMaterial().clone());
        m.scale.set(1.7, 1, 1.7);
        m.renderOrder = 2;
        return m;
      }),
    []
  );

  useEffect(
    () => () => {
      rigs.forEach(disposeCharacter);
      blobs.forEach((b) => (b.material as THREE.Material).dispose());
    },
    [rigs, blobs]
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    stepCasualties(dt);

    for (let i = 0; i < POOL; i++) {
      const rig = rigs[i];
      const blob = blobs[i];
      const c = casualties[i];
      if (!c) {
        rig.root.visible = false;
        blob.visible = false;
        continue;
      }
      rig.root.visible = true;
      blob.visible = true;
      rig.paint.shirt.color.setHex(c.colour);
      rig.paint.trousers.color.setHex(c.lower);
      rig.paint.skin.color.setHex(c.skin);

      const g = groundAt(c.x, c.z).y;
      // Over in a third of a second: up onto the bonnet, over, and down.
      const fall = Math.min(1, c.t / 0.34);
      const roll = Math.sin(fall * Math.PI * 0.5) * (Math.PI / 2);
      const hop = Math.sin(fall * Math.PI) * 0.5;
      rig.root.position.set(c.x, g + hop, c.z);
      rig.root.rotation.set(0, c.yaw, 0);
      // Roll about the axis they were thrown along, not about their own.
      rig.hips.rotation.z = roll;
      poseFloored(rig, c.t, dt);

      blob.position.set(c.x, g + 0.03, c.z);
      const fade = 1 - Math.max(0, (c.t - (LIFETIME - 1.4)) / 1.4);
      (blob.material as THREE.MeshBasicMaterial).opacity = 0.8 * fade * (1 - hop);
      rig.root.scale.setScalar(0.92 + 0.08 * fade);
    }
  });

  return (
    <group>
      {rigs.map((r, i) => (
        <primitive key={i} object={r.root} />
      ))}
      {blobs.map((b, i) => (
        <primitive key={`b${i}`} object={b} />
      ))}
    </group>
  );
}
