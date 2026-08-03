'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { materials } from '../materials';
import { Dome, Finial, wallGeometry, Chhatri } from '../shapes';
import { mulberry32, rand, pick } from '@/lib/rng';

/**
 * Bandra Fort — Castella de Aguada, Portuguese, 1640. A basalt watchtower and
 * ramparts on the rock at Land's End, looking straight down the Sea Link.
 */
export function BandraFort() {
  const m = materials();
  const gate = useMemo(
    () => wallGeometry(16, 8, 4, [{ cx: 0, w: 4.4, spring: 3, h: 7, kind: 'round' as const }]),
    []
  );
  return (
    <group>
      {/* the rock it sits on */}
      <mesh material={m.blueStone} position={[0, -3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[38, 46, 10, 10]} />
      </mesh>
      {/* ramparts */}
      <mesh material={m.blueStone} position={[0, 4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[30, 32, 8, 6]} />
      </mesh>
      <mesh material={m.blueStone} position={[0, 8.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[31, 31, 1.2, 6]} />
      </mesh>
      {/* merlons around the parapet */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh
            key={i}
            material={m.blueStone}
            position={[Math.cos(a) * 29.5, 10.2, Math.sin(a) * 29.5]}
            rotation={[0, -a, 0]}
            castShadow
          >
            <boxGeometry args={[1.6, 2, 3]} />
          </mesh>
        );
      })}
      {/* upper keep */}
      <mesh material={m.blueStone} position={[-4, 13, -2]} castShadow receiveShadow>
        <cylinderGeometry args={[13, 14, 9, 6]} />
      </mesh>
      <mesh material={m.blueStone} position={[-4, 18, -2]} castShadow>
        <cylinderGeometry args={[14.4, 14.4, 1, 6]} />
      </mesh>
      {/* gate */}
      <mesh geometry={gate} material={m.blueStone} position={[0, 8, 30]} castShadow receiveShadow />
      {/* steps up from the shore */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} material={m.blueStone} position={[0, 7.5 - i * 0.8, 34 + i * 2.4]} receiveShadow>
          <boxGeometry args={[10, 0.8, 2.6]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Global Vipassana Pagoda, Gorai, 2009 — a Shwedagon-form golden stupa whose
 * 97 m stone dome is the largest pillarless one in the world.
 */
export function VipassanaPagoda() {
  const m = materials();

  const bell = useMemo(() => {
    // Burmese bell profile: wide skirt, shoulder, then the tapering turban.
    const pts: THREE.Vector2[] = [];
    const prof: [number, number][] = [
      [40, 0],
      [39, 4],
      [36.5, 10],
      [32, 17],
      [26, 24],
      [20, 30],
      [15, 35],
      [12.4, 39],
      [11.6, 41],
    ];
    for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, 48);
  }, []);

  const spire = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      pts.push(new THREE.Vector2(11.5 * (1 - t) ** 1.55 + 0.5, t * 34));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, []);

  return (
    <group>
      {/* stepped terraces */}
      {[
        [60, 5, 0],
        [54, 5, 5],
        [48, 5, 10],
        [43, 4, 15],
      ].map(([r, h, y], i) => (
        <mesh key={i} material={m.marble} position={[0, y + h / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r + 1.5, h, 8]} />
        </mesh>
      ))}
      {/* corner chhatri-stupas on the terrace */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return (
          <group key={i} position={[Math.cos(a) * 45, 19, Math.sin(a) * 45]}>
            <mesh material={m.gold} position={[0, 3, 0]} castShadow>
              <cylinderGeometry args={[2.2, 3, 6, 10]} />
            </mesh>
            <Dome r={2.4} h={3.4} bulge={0.4} material={m.gold} position={[0, 6, 0]} />
            <Finial h={4} r={0.4} material={m.gold} position={[0, 9.4, 0]} />
          </group>
        );
      })}

      {/* the great golden bell */}
      <mesh geometry={bell} material={m.gold} position={[0, 19, 0]} castShadow receiveShadow />
      {/* banded turban rings */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} material={m.gold} position={[0, 60 + i * 1.7, 0]} castShadow>
          <cylinderGeometry args={[10.6 - i * 0.9, 11.2 - i * 0.9, 1.5, 40]} />
        </mesh>
      ))}
      {/* lotus and the tapering hti */}
      <mesh material={m.gold} position={[0, 72.6, 0]} castShadow>
        <cylinderGeometry args={[6.4, 8, 2.4, 40]} />
      </mesh>
      <mesh geometry={spire} material={m.gold} position={[0, 73.8, 0]} castShadow />
      <mesh material={m.brass} position={[0, 107, 0]} castShadow>
        <sphereGeometry args={[1.8, 14, 12]} />
      </mesh>
      <Finial h={5} r={0.7} material={m.brass} position={[0, 108, 0]} />

      {/* the two smaller pagodas, north and south */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * 86]}>
          <mesh material={m.marble} position={[0, 3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[19, 21, 6, 8]} />
          </mesh>
          <Dome r={16} h={17} bulge={0.32} material={m.gold} position={[0, 6, 0]} />
          <mesh material={m.gold} position={[0, 24, 0]} castShadow>
            <coneGeometry args={[4, 15, 20]} />
          </mesh>
          <Finial h={4} r={0.5} material={m.brass} position={[0, 31, 0]} />
        </group>
      ))}
    </group>
  );
}

/**
 * Elephanta Caves, Gharapuri — rock-cut Shaiva temples of the 5th–8th century,
 * an hour by ferry from the Gateway. The six-metre Trimurti faces the entrance.
 */
export function Elephanta() {
  const m = materials();
  const rock = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x6f6455, roughness: 0.98 }),
    []
  );
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 1 }), []);

  return (
    <group>
      {/* the wooded hill */}
      <mesh material={m.foliage} position={[0, 22, -40]} castShadow receiveShadow>
        <coneGeometry args={[110, 56, 12]} />
      </mesh>
      <mesh material={rock} position={[0, 12, 26]} castShadow receiveShadow>
        <boxGeometry args={[86, 24, 46]} />
      </mesh>

      {/* the cave façade cut into the rock */}
      <group position={[0, 0, 49]}>
        <mesh material={dark} position={[0, 8, -3]}>
          <boxGeometry args={[44, 16, 6]} />
        </mesh>
        {[-18, -10.8, -3.6, 3.6, 10.8, 18].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh material={rock} position={[0, 4.4, 0]} castShadow>
              <cylinderGeometry args={[1.6, 1.9, 8.8, 14]} />
            </mesh>
            <mesh material={rock} position={[0, 9.4, 0]} castShadow>
              <cylinderGeometry args={[2.4, 1.6, 1.6, 16]} />
            </mesh>
            <mesh material={rock} position={[0, 10.6, 0]} castShadow>
              <boxGeometry args={[4.4, 1.2, 4.4]} />
            </mesh>
          </group>
        ))}
        <mesh material={rock} position={[0, 13.4, -1]} castShadow>
          <boxGeometry args={[46, 4.4, 8]} />
        </mesh>

        {/* the Trimurti, deep in the shadow */}
        <group position={[0, 1, -5]}>
          <mesh material={rock} position={[0, 3.4, 0]} castShadow>
            <boxGeometry args={[9, 6.8, 2.4]} />
          </mesh>
          {[-2.6, 0, 2.6].map((x, i) => (
            <group key={x} position={[x, 5.4, 0.6]} rotation={[0, i === 0 ? 0.7 : i === 2 ? -0.7 : 0, 0]}>
              <mesh material={rock} castShadow>
                <sphereGeometry args={[1.55, 16, 14]} />
              </mesh>
              <mesh material={rock} position={[0, 1.7, 0]} castShadow>
                <coneGeometry args={[1.35, 2.6, 14]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* steps from the jetty */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} material={rock} position={[0, 0.5 + i * 0.6, 76 + i * 3]} receiveShadow>
          <boxGeometry args={[14, 0.6, 3.2]} />
        </mesh>
      ))}
    </group>
  );
}

/** Juhu Beach: palms, pav bhaji carts and the evening crowd. */
export function JuhuBeach() {
  const m = materials();
  const { carts, cartMats } = useMemo(() => {
    const rng = mulberry32(1968);
    const palette = [0xd8342a, 0xf2c14e, 0x2f7ac8, 0x3fa06a, 0xe4801f];
    const cartMats = palette.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
    const carts = Array.from({ length: 30 }, () => ({
      x: rand(rng, -60, 60),
      z: rand(rng, -300, 300),
      r: rand(rng, 0, 6.3),
      c: Math.floor(rng() * palette.length),
    }));
    return { carts, cartMats };
  }, []);
  return (
    <group>
      {carts.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.r, 0]}>
          <mesh material={m.teak} position={[0, 1, 0]} castShadow>
            <boxGeometry args={[3, 0.9, 1.8]} />
          </mesh>
          <mesh material={cartMats[c.c]} position={[0, 2.4, 0]} castShadow>
            <boxGeometry args={[3.6, 0.14, 2.4]} />
          </mesh>
          {[-1.5, 1.5].map((x) => (
            <mesh key={x} material={m.steel} position={[x, 1.7, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 1.5, 6]} />
            </mesh>
          ))}
          {[-1.1, 1.1].map((x) => (
            <mesh key={`w${x}`} material={m.black} position={[x, 0.4, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.16, 12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * Dharavi: the recycling yards, the potters' kilns at Kumbharwada, and the blue
 * tarpaulin that roofs a square mile of it.
 */
export function DharaviDetail() {
  const m = materials();
  const { kilns, pots, tanks } = useMemo(() => {
    const rng = mulberry32(1030);
    const kilns = Array.from({ length: 16 }, () => ({
      x: rand(rng, -170, 170),
      z: rand(rng, -160, 160),
    }));
    const pots = Array.from({ length: 260 }, () => ({
      x: rand(rng, -190, 190),
      z: rand(rng, -180, 180),
      s: rand(rng, 0.5, 1),
    }));
    const tanks = Array.from({ length: 90 }, () => ({
      x: rand(rng, -200, 200),
      z: rand(rng, -190, 190),
      y: rand(rng, 3, 6),
    }));
    return { kilns, pots, tanks };
  }, []);
  const terracotta = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xa1553a, roughness: 0.95 }),
    []
  );
  return (
    <group>
      {kilns.map((k, i) => (
        <group key={i} position={[k.x, 0, k.z]}>
          <mesh material={m.tin} position={[0, 1.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.2, 2.8, 2.8, 10]} />
          </mesh>
          <mesh material={m.darkGrey} position={[0, 3.6, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.7, 2, 8]} />
          </mesh>
        </group>
      ))}
      {pots.map((p, i) => (
        <mesh key={i} material={terracotta} position={[p.x, p.s * 0.4, p.z]} scale={p.s} castShadow>
          <sphereGeometry args={[0.8, 8, 6]} />
        </mesh>
      ))}
      {tanks.map((t, i) => (
        <mesh key={i} material={m.black} position={[t.x, t.y, t.z]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 1.4, 8]} />
        </mesh>
      ))}
    </group>
  );
}
