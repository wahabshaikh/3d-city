'use client';

import * as THREE from 'three';
import { useMemo } from 'react';
import { materials } from '../materials';
import { Wall, Dome, Turret, Chhatri, Finial, jaliTexture } from '../shapes';

/**
 * Gateway of India, Apollo Bunder — George Wittet, 1924.
 *
 * 26 m of yellow Kharodi basalt in the Indo-Saracenic manner: one great arch on
 * the harbour axis, four corner turrets, jali-screened side halls, and a 15 m
 * dome. Authored facing local +Z; the group is turned to face east, out to sea.
 */
export function GatewayOfIndia() {
  const m = materials();

  const jali = useMemo(() => {
    const map = jaliTexture(256, 7);
    return new THREE.MeshStandardMaterial({
      color: 0xb59a68,
      alphaMap: map,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.85,
    });
  }, []);

  const W = 26; // width, north-south
  const D = 19; // depth, east-west (the passage)
  const H = 17.5; // height to the main cornice

  return (
    <group>
      {/* Plinth and the plaza it stands on */}
      <mesh material={m.basalt} position={[0, 0.55, 0]} receiveShadow castShadow>
        <boxGeometry args={[W + 26, 1.1, D + 8]} />
      </mesh>

      {/* --- Central mass, pierced by the great arch --- */}
      <group position={[0, 1.1, 0]}>
        <Wall
          w={W}
          h={H}
          d={D}
          holes={[{ cx: 0, w: 13.5, spring: 8.6, h: 17, kind: 'pointed' }]}
          material={m.basalt}
        />
      </group>

      {/* Recessed side niches on the flank walls */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 1.1, s * (D / 2 + 0.01)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          {[-9.5, 9.5].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh material={m.basalt} position={[0, 6, -0.35]} castShadow>
                <boxGeometry args={[5.4, 12, 0.7]} />
              </mesh>
              <mesh material={jali} position={[0, 6.4, 0.06]}>
                <planeGeometry args={[3.6, 8.4]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Cornice and parapet */}
      <mesh material={m.basalt} position={[0, H + 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 1.6, 0.9, D + 1.6]} />
      </mesh>
      {/* Crenellated parapet of small blind arches */}
      {Array.from({ length: 26 }, (_, i) => {
        const t = (i / 25) * (W + 1) - (W + 1) / 2;
        return [-1, 1].map((s) => (
          <mesh
            key={`${i}-${s}`}
            material={m.basalt}
            position={[t, H + 2.6, s * (D / 2 + 0.6)]}
            castShadow
          >
            <boxGeometry args={[0.8, 1.3, 0.5]} />
          </mesh>
        ));
      })}

      {/* --- Four corner turrets --- */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <Turret
          key={`${sx}${sz}`}
          r={2.5}
          h={20}
          sides={8}
          cap="dome"
          material={m.basalt}
          position={[sx * (W / 2 - 1.4), 1.1, sz * (D / 2 - 1.4)]}
        />
      ))}

      {/* --- Central dome: 15 m across, apex at 26 m above the ground --- */}
      <mesh material={m.basalt} position={[0, H + 2.5, 0]} castShadow>
        <cylinderGeometry args={[8.2, 8.8, 1.6, 32]} />
      </mesh>
      <mesh material={m.basalt} position={[0, H + 3.7, 0]} castShadow>
        <cylinderGeometry args={[7.7, 8.1, 1.2, 32]} />
      </mesh>
      <Dome r={7.5} h={6.6} bulge={0.1} material={m.basalt} position={[0, H + 4.2, 0]} />
      <Finial h={3.2} r={0.62} material={m.basalt} position={[0, H + 10.8, 0]} />

      {/* Small chhatris flanking the dome, over the arch haunches */}
      {[-1, 1].map((s) => (
        <Chhatri
          key={s}
          r={1.6}
          colH={2.4}
          domeH={1.4}
          cols={8}
          material={m.basalt}
          position={[s * 10, H + 2.1, 0]}
        />
      ))}

      {/* --- Flanking halls, jali screened --- */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2 + 5.5), 1.1, 0]}>
          <Wall
            w={11}
            h={10.5}
            d={15}
            holes={[
              { cx: -3.6, w: 4.4, spring: 4.4, h: 8.4, kind: 'ogee' },
              { cx: 3.6, w: 4.4, spring: 4.4, h: 8.4, kind: 'ogee' },
            ]}
            material={m.basalt}
          />
          <mesh material={m.basalt} position={[0, 11.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[12.4, 1.2, 16.4]} />
          </mesh>
          {[-1, 1].map((t) => (
            <Chhatri
              key={t}
              r={1.4}
              colH={2.1}
              domeH={1.25}
              cols={8}
              material={m.basalt}
              position={[0, 11.7, t * 5.2]}
            />
          ))}
          {/* jali panel on the seaward face */}
          <mesh material={jali} position={[0, 6.2, 7.6]}>
            <planeGeometry args={[7.6, 6.6]} />
          </mesh>
        </group>
      ))}

      {/* --- Steps down to the harbour --- */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          material={m.basalt}
          position={[0, 1.0 - i * 0.42, D / 2 + 5 + i * 1.9]}
          receiveShadow
        >
          <boxGeometry args={[W + 22, 0.42, 2]} />
        </mesh>
      ))}
      {/* Mooring wall at the water's edge */}
      <mesh material={m.basalt} position={[0, -1.2, D / 2 + 18]} receiveShadow castShadow>
        <boxGeometry args={[W + 26, 3.6, 3]} />
      </mesh>
    </group>
  );
}
