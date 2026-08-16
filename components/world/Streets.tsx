'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { streetNet, type Span } from '@/lib/mumbai/streets';
import { laneTexture, gullyTexture } from '@/lib/textures';

/**
 * The local lane network, drawn as one quad per span. The lane cross-section —
 * footpath, kerb, carriageway — lives in the texture, so a single material
 * covers everything from a Dharavi gully to a Bandra approach road.
 */

/** Metres of lane covered by one repeat of the texture along its length. */
const TILE = 26;

/** Lanes running with the district grain sit fractionally proud at junctions. */
const Y_ALONG = 0.16;
const Y_CROSS = 0.13;

function laneGeometry(spans: Span[]) {
  const n = spans.length;
  const pos = new Float32Array(n * 4 * 3);
  const uv = new Float32Array(n * 4 * 2);
  const idx = new Uint32Array(n * 6);

  spans.forEach((s, i) => {
    const dx = Math.sin(s.rot);
    const dz = Math.cos(s.rot);
    const nx = Math.cos(s.rot);
    const nz = -Math.sin(s.rot);
    const hl = s.len / 2;
    const y = s.cross ? Y_CROSS : Y_ALONG;
    const half = hl / TILE;
    // Tie v to distance along the lane so the dashes and kerb bars run on
    // unbroken from one span to the next.
    const vc = ((s.x * dx + s.z * dz) / TILE) % 1;

    const p = i * 12;
    const q = i * 8;
    for (let k = 0; k < 4; k++) {
      const side = k === 0 || k === 3 ? 1 : -1;
      const end = k < 2 ? -1 : 1;
      pos[p + k * 3] = s.x + dx * hl * end + nx * s.hw * side;
      pos[p + k * 3 + 1] = y;
      pos[p + k * 3 + 2] = s.z + dz * hl * end + nz * s.hw * side;
      uv[q + k * 2] = side > 0 ? 0 : 1;
      uv[q + k * 2 + 1] = vc + end * half;
    }
    const a = i * 4;
    idx.set([a, a + 1, a + 2, a, a + 2, a + 3], i * 6);
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Group spans spatially so the GPU can throw most of the city away. */
function chunkSpans(spans: Span[], size: number) {
  const map = new Map<string, Span[]>();
  for (const s of spans) {
    const k = `${Math.floor(s.x / size)}:${Math.floor(s.z / size)}`;
    let arr = map.get(k);
    if (!arr) map.set(k, (arr = []));
    arr.push(s);
  }
  return [...map.values()];
}

export function Streets() {
  const { meshes } = useMemo(() => {
    const surface = (map: THREE.Texture) =>
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.96,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -6,
      });

    const mats = { lane: surface(laneTexture()), gully: surface(gullyTexture()) };
    const { spans } = streetNet();
    const meshes: THREE.Mesh[] = [];

    for (const kind of ['lane', 'gully'] as const) {
      const list = spans.filter((s) => (kind === 'gully') === s.gully);
      if (!list.length) continue;
      for (const cell of chunkSpans(list, 500)) {
        const mesh = new THREE.Mesh(laneGeometry(cell), mats[kind]);
        mesh.receiveShadow = true;
        meshes.push(mesh);
      }
    }
    return { meshes };
  }, []);

  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}
