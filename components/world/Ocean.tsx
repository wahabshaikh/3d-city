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
      roughness: 0.44,
      metalness: 0.12,
      normalMap: n1,
      normalScale: new THREE.Vector2(0.22, 0.22),
      envMapIntensity: 0.85,
    });

    /**
     * The normal map tiles every forty metres across a sea thirty kilometres
     * wide. Past a few hundred metres a single pixel covers thousands of tiles,
     * the mip chain gives up, and the surviving perturbed normals catch the
     * light as one flat sheen right along the horizon — which at night reads as
     * a bright band where the Arabian Sea should be. So the chop is faded out
     * with distance and the water left rougher far off, which is what a real
     * sea does to the eye anyway.
     */
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <normal_fragment_maps>',
          `#ifdef USE_NORMALMAP_TANGENTSPACE
             vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
             mapN.xy *= normalScale *
               ( 1.0 - smoothstep( 140.0, 1200.0, length( vViewPosition ) ) );
             normal = normalize( tbn * mapN );
           #endif`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           roughnessFactor = mix( roughnessFactor, 0.88,
             smoothstep( 260.0, 2600.0, length( vViewPosition ) ) );`
        );
    };
    mat.customProgramCacheKey = () => 'sea';

    return { mat, n1, n2 };
  }, []);

  /**
   * Night water goes darker and *rougher*, not glassier. A near-mirror surface
   * this large throws a grazing-angle specular lobe right along the horizon,
   * which lights the whole Arabian Sea brighter than the sky above it.
   */
  useEffect(() => {
    const night = tod < 0.22 || tod > 0.85;
    mat.color.set(night ? 0x0a141c : tod > 0.74 ? 0x24404c : 0x1b3642);
    mat.roughness = night ? 0.82 : 0.44;
    mat.envMapIntensity = night ? 0.45 : 0.85;
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
