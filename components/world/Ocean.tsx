'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SEA_LEVEL } from '@/lib/mumbai/physics';
import { waterNormals } from '@/lib/textures';
import { useStore } from '@/lib/store';

/** The Arabian Sea and the harbour: one big plane with two scrolling normal maps. */
export function Ocean() {
  const tod = useStore((s) => s.timeOfDay);

  const { mat, n1, n2 } = useMemo(() => {
    const n1 = waterNormals().clone();
    const n2 = waterNormals().clone();
    n1.needsUpdate = true;
    n2.needsUpdate = true;
    n1.wrapS = n1.wrapT = n2.wrapS = n2.wrapT = THREE.RepeatWrapping;
    n1.repeat.set(900, 900);
    n2.repeat.set(260, 260);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1b3642,
      roughness: 0.26,
      metalness: 0.12,
      normalMap: n1,
      normalScale: new THREE.Vector2(0.22, 0.22),
      envMapIntensity: 0.85,
    });
    return { mat, n1, n2 };
  }, []);

  // Night water goes darker and glassier; midday is brighter and choppier.
  useEffect(() => {
    const night = tod < 0.22 || tod > 0.85;
    mat.color.set(night ? 0x0b1720 : tod > 0.74 ? 0x24404c : 0x1b3642);
    mat.roughness = night ? 0.16 : 0.26;
  }, [tod, mat]);

  useFrame((_, dt) => {
    n1.offset.x += dt * 0.006;
    n1.offset.y += dt * 0.004;
    n2.offset.x -= dt * 0.009;
    n2.offset.y += dt * 0.005;
  });

  return (
    <group>
      <mesh
        material={mat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, SEA_LEVEL, -3000]}
        receiveShadow={false}
      >
        <planeGeometry args={[36000, 36000, 1, 1]} />
      </mesh>
      {/* a faint darker layer under the surface so deep water doesn't read as flat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_LEVEL - 6, -3000]}>
        <planeGeometry args={[36000, 36000]} />
        <meshBasicMaterial color={0x0a1a22} />
      </mesh>
    </group>
  );
}
