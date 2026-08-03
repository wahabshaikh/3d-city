'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { buildWorld, chunk, type Building, type StyleId } from '@/lib/mumbai/world';
import { facade, facadeLights, type FacadeKind } from '@/lib/textures';
import { materials } from './materials';
import { useStore } from '@/lib/store';

const KIND: Record<StyleId, FacadeKind> = {
  colonial: 'colonial',
  deco: 'deco',
  tower: 'tower',
  chawl: 'chawl',
  slum: 'slum',
  midrise: 'modern',
  lowrise: 'modern',
  bungalow: 'modern',
  mill: 'mill',
};

/** One material per facade kind, patched to take a per-instance UV scale. */
function facadeMaterial(kind: FacadeKind) {
  const map = facade(kind);
  const emissiveMap = facadeLights(kind);
  const mat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0,
    roughness: kind === 'tower' ? 0.35 : 0.88,
    metalness: kind === 'tower' ? 0.25 : 0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      'attribute vec2 aUvScale;\n' +
      shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         #ifdef USE_MAP
           vMapUv *= aUvScale;
         #endif
         #ifdef USE_EMISSIVEMAP
           vEmissiveMapUv *= aUvScale;
         #endif`
      );
  };
  mat.customProgramCacheKey = () => `facade-${kind}`;
  return mat;
}

const CHUNK = 600;

export function Cityscape() {
  const m = materials();
  const tod = useStore((s) => s.timeOfDay);

  const { meshes, facadeMats } = useMemo(() => {
    const world = buildWorld();
    const facadeMats = new Map<FacadeKind, THREE.MeshStandardMaterial>();
    const kindOf = (b: Building) => KIND[b.style];
    for (const b of world.buildings)
      if (!facadeMats.has(kindOf(b))) facadeMats.set(kindOf(b), facadeMaterial(kindOf(b)));

    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const tank = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 8);
    tank.translate(0, 0.55, 0);
    const pyramid = new THREE.ConeGeometry(0.72, 1, 4);

    const meshes: THREE.Object3D[] = [];
    const dummy = new THREE.Object3D();
    const colour = new THREE.Color();

    for (const cells of chunk(world.buildings, CHUNK)) {
      // bodies, grouped by facade kind
      const byKind = new Map<FacadeKind, Building[]>();
      for (const b of cells) {
        const k = kindOf(b);
        let arr = byKind.get(k);
        if (!arr) byKind.set(k, (arr = []));
        arr.push(b);
      }

      for (const [kind, list] of byKind) {
        const mesh = new THREE.InstancedMesh(box, facadeMats.get(kind)!, list.length);
        const uvScale = new Float32Array(list.length * 2);
        list.forEach((b, i) => {
          dummy.position.set(b.x, 0, b.z);
          dummy.rotation.set(0, b.rot, 0);
          dummy.scale.set(b.w, b.h, b.d);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          mesh.setColorAt(i, colour.setHex(b.colour));
          // one texture tile per ~4 m of frontage and ~3.4 m of storey height
          uvScale[i * 2] = Math.max(0.5, Math.round(Math.max(b.w, b.d) / (kind === 'slum' ? 5 : 15)));
          uvScale[i * 2 + 1] = Math.max(0.5, Math.round(b.h / (kind === 'slum' ? 4.5 : 13.6)));
        });
        const g = mesh.geometry.clone();
        g.setAttribute('aUvScale', new THREE.InstancedBufferAttribute(uvScale, 2));
        mesh.geometry = g;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes.push(mesh);
      }

      // corrugated and tarpaulin roofs
      for (const roof of ['tin', 'tarp'] as const) {
        const list = cells.filter((b) => b.roof === roof);
        if (!list.length) continue;
        const mesh = new THREE.InstancedMesh(
          pyramid,
          roof === 'tin' ? m.tin : m.tarp,
          list.length
        );
        list.forEach((b, i) => {
          dummy.position.set(b.x, b.h + (Math.max(b.w, b.d) * 0.16) / 2, b.z);
          dummy.rotation.set(0, b.rot + Math.PI / 4, 0);
          dummy.scale.set(Math.max(b.w, b.d) * 1.02, Math.max(b.w, b.d) * 0.16, Math.max(b.w, b.d) * 1.02);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = true;
        meshes.push(mesh);
      }

      // flat-roof parapets
      const flat = cells.filter((b) => b.slab && b.roof !== 'tin' && b.roof !== 'tarp');
      if (flat.length) {
        const mesh = new THREE.InstancedMesh(box, m.concrete, flat.length);
        flat.forEach((b, i) => {
          dummy.position.set(b.x, b.h, b.z);
          dummy.rotation.set(0, b.rot, 0);
          dummy.scale.set(b.w + 0.8, 0.9, b.d + 0.8);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = true;
        meshes.push(mesh);
      }

      // the black Sintex water tanks on every other roof in the city
      const tanks = cells.filter((b) => b.tank);
      if (tanks.length) {
        const mesh = new THREE.InstancedMesh(tank, m.black, tanks.length);
        tanks.forEach((b, i) => {
          dummy.position.set(b.x + b.w * 0.22, b.h + 0.6, b.z - b.d * 0.2);
          dummy.rotation.set(0, 0, 0);
          const s = 1 + (b.w > 24 ? 0.8 : 0);
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = true;
        meshes.push(mesh);
      }
    }

    return { meshes, facadeMats };
  }, [m]);

  // Windows come on after dark.
  useEffect(() => {
    const night = tod < 0.27 || tod > 0.76;
    const k = night ? (tod < 0.27 ? 1 - tod / 0.27 : (tod - 0.76) / 0.24) : 0;
    for (const mat of facadeMats.values()) {
      mat.emissiveIntensity = THREE.MathUtils.clamp(k, 0, 1) * 0.62;
      mat.needsUpdate = false;
    }
  }, [tod, facadeMats]);

  return (
    <group>
      {meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  );
}
