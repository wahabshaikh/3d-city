'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { MAINLAND, GORAI, ELEPHANTA, HAJI_ALI_ISLET } from '@/lib/mumbai/coastline';
import { SEA_LEVEL } from '@/lib/mumbai/physics';
import { groundTexture, sandTexture } from '@/lib/textures';
import { geo } from '@/lib/geo';

type Poly = [number, number][];

function signedArea(poly: Poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return a / 2;
}

/** Flat land slab for one island. */
function landGeometry(poly: Poly) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * The shore: a skirt hanging off the coastline that drops from the land datum
 * to below sea level, so beaches shelve instead of ending in a cliff.
 */
function shoreGeometry(poly: Poly, width: number, drop: number) {
  const n = poly.length;
  const out = signedArea(poly) > 0 ? -1 : 1;
  const pos = new Float32Array(n * 2 * 3 + 6);
  const uv = new Float32Array(n * 2 * 2 + 4);
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const p = poly[k];
    const prev = poly[(k - 1 + n) % n];
    const next = poly[(k + 1) % n];
    const tx = next[0] - prev[0];
    const tz = next[1] - prev[1];
    const l = Math.hypot(tx, tz) || 1;
    const nx = (-tz / l) * out;
    const nz = (tx / l) * out;
    pos.set([p[0], 0, p[1]], i * 6);
    pos.set([p[0] + nx * width, -drop, p[1] + nz * width], i * 6 + 3);
    uv.set([p[0] * 0.06, p[1] * 0.06], i * 4);
    uv.set([(p[0] + nx * width) * 0.06, (p[1] + nz * width) * 0.06], i * 4 + 2);
  }
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Sand for the named beaches, laid over the shore skirt. */
const BEACHES: { at: [number, number]; rx: number; rz: number; rot: number }[] = [
  { at: [19.0965, 72.8256], rx: 22, rz: 300, rot: 0.06 }, // Juhu
  { at: [18.9545, 72.8136], rx: 20, rz: 62, rot: -0.72 }, // Girgaum Chowpatty
  { at: [19.0231, 72.8296], rx: 16, rz: 48, rot: 1.0 }, // Dadar Chowpatty
  { at: [19.0452, 72.818], rx: 13, rz: 38, rot: 0.25 }, // Bandra Bandstand
];

/**
 * The maidans: the open grounds the Fort is planned around, plus Shivaji Park
 * and the Mahalaxmi racecourse. Every one of them is a real gap in the city.
 */
const MAIDANS: { at: [number, number]; rx: number; rz: number; rot: number }[] = [
  { at: [18.9295, 72.8288], rx: 60, rz: 130, rot: 0.1 }, // Oval Maidan
  { at: [18.9345, 72.8295], rx: 45, rz: 70, rot: 0.1 }, // Cross Maidan
  { at: [18.9378, 72.8312], rx: 50, rz: 80, rot: 0.1 }, // Azad Maidan
  { at: [19.0285, 72.8395], rx: 90, rz: 90, rot: 0 }, // Shivaji Park
  { at: [18.9805, 72.8195], rx: 90, rz: 130, rot: 0.3 }, // Mahalaxmi Racecourse
  { at: [18.9268, 72.8218], rx: 40, rz: 60, rot: 0 }, // Cooperage
];

export function Terrain() {
  const ground = useMemo(() => {
    const t = groundTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(0.045, 0.045);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.97 });
  }, []);

  const shoreMat = useMemo(() => {
    const t = sandTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(1, 1);
    // Most of Mumbai's edge is rock and seawall, not sand.
    return new THREE.MeshStandardMaterial({
      map: t,
      color: 0x6a6357,
      roughness: 0.99,
      side: THREE.DoubleSide,
    });
  }, []);

  const sandMat = useMemo(() => {
    const t = sandTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(8, 40);
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.99,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -6,
    });
  }, []);

  const maidanMat = useMemo(() => {
    // Maidan turf is scuffed and dusty, not lawn — reuse the ground grain.
    const t = groundTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(2.5, 4);
    return new THREE.MeshStandardMaterial({
      map: t,
      color: 0x7f8f5c,
      roughness: 0.99,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -6,
    });
  }, []);

  const polys: Poly[] = [MAINLAND, GORAI, ELEPHANTA, HAJI_ALI_ISLET];

  const land = useMemo(() => polys.map(landGeometry), []);
  const shores = useMemo(
    () =>
      polys.map((p, i) =>
        shoreGeometry(p, i === 0 ? 15 : 10, Math.abs(SEA_LEVEL) + (i === 0 ? 3 : 2))
      ),
    []
  );

  return (
    <group>
      {land.map((g, i) => (
        <mesh key={i} geometry={g} material={ground} receiveShadow position={[0, 0, 0]} />
      ))}
      {shores.map((g, i) => (
        <mesh key={i} geometry={g} material={shoreMat} receiveShadow />
      ))}
      {MAIDANS.map((b, i) => {
        const [x, z] = geo(b.at[0], b.at[1]);
        return (
          <mesh
            key={`maidan${i}`}
            material={maidanMat}
            position={[x, 0.05, z]}
            rotation={[-Math.PI / 2, 0, b.rot]}
            receiveShadow
          >
            <planeGeometry args={[b.rx * 2, b.rz * 2]} />
          </mesh>
        );
      })}
      {BEACHES.map((b, i) => {
        const [x, z] = geo(b.at[0], b.at[1]);
        return (
          <mesh
            key={i}
            material={sandMat}
            position={[x, 0.04, z]}
            rotation={[-Math.PI / 2, 0, b.rot]}
            receiveShadow
          >
            <planeGeometry args={[b.rx * 2, b.rz * 2]} />
          </mesh>
        );
      })}
    </group>
  );
}
