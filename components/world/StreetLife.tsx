'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildWorld, chunk, type Building } from '@/lib/mumbai/world';
import { signboardTexture } from '@/lib/textures';
import { materials } from './materials';

/**
 * The things that make a Mumbai street a Mumbai street: shopfronts and painted
 * signboards along every ground floor, handcarts on the kerb, and people —
 * enough of them that the city is never empty.
 */

/* --------------------------------- people --------------------------------- */

/**
 * A figure at about a hundred triangles. Built once and instanced; a sway in
 * the vertex shader keeps a crowd from reading as a field of bollards, at no
 * per-frame cost on the CPU.
 */
function figureGeometry() {
  const legs = new THREE.CylinderGeometry(0.16, 0.13, 0.86, 6);
  legs.translate(0, 0.43, 0);
  const torso = new THREE.CylinderGeometry(0.2, 0.18, 0.72, 7);
  torso.translate(0, 1.2, 0);
  return { body: mergeGeometries([legs, torso])!, head: headGeometry() };
}

function headGeometry() {
  const head = new THREE.SphereGeometry(0.13, 7, 6);
  head.translate(0, 1.68, 0);
  const arms = new THREE.CylinderGeometry(0.055, 0.05, 0.62, 5);
  arms.translate(0, 1.22, 0);
  const l = arms.clone();
  l.translate(-0.22, 0, 0);
  const r = arms.clone();
  r.translate(0.22, 0, 0);
  return mergeGeometries([head, l, r])!;
}

/** Adds a slow, per-instance sway driven by a single uniform. */
function swaying(mat: THREE.MeshStandardMaterial) {
  const uniforms = { uTime: { value: 0 } };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader =
      'uniform float uTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 1.3;
           float sway = sin(uTime * 1.6 + ph) * 0.03 * transformed.y;
           transformed.x += sway;
           transformed.z += cos(uTime * 1.1 + ph) * 0.02 * transformed.y;
         #endif`
      );
  };
  mat.customProgramCacheKey = () => 'sway';
  return { mat, uniforms };
}

/* --------------------------------- stalls --------------------------------- */

/** A hawker's handcart: four wheels, a board, and a sheet over the top. */
function stallGeometry() {
  const frame: THREE.BufferGeometry[] = [];
  const top = new THREE.BoxGeometry(2.4, 0.12, 1.3);
  top.translate(0, 0.92, 0);
  frame.push(top);
  const skirt = new THREE.BoxGeometry(2.3, 0.5, 1.2);
  skirt.translate(0, 0.62, 0);
  frame.push(skirt);
  for (const x of [-1.0, 1.0])
    for (const z of [-0.5, 0.5]) {
      const w = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
      w.rotateZ(Math.PI / 2);
      w.translate(x, 0.2, z);
      frame.push(w);
    }
  for (const x of [-1.1, 1.1])
    for (const z of [-0.6, 0.6]) {
      const p = new THREE.CylinderGeometry(0.035, 0.035, 1.3, 5);
      p.translate(x, 1.55, z);
      frame.push(p);
    }

  const canopy = new THREE.BoxGeometry(2.8, 0.06, 1.7);
  canopy.translate(0, 2.2, 0);

  // Whatever is being sold: fruit, snacks, bolts of cloth.
  const goods: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.SphereGeometry(0.11 + (i % 3) * 0.03, 5, 4);
    s.translate(-0.9 + i * 0.3, 1.06, (i % 2) * 0.34 - 0.17);
    goods.push(s);
  }

  return {
    frame: mergeGeometries(frame)!,
    canopy,
    goods: mergeGeometries(goods)!,
  };
}

const CANOPY = [0xd8562f, 0x2f7ac0, 0x3f9a5a, 0xe0a828, 0xc0356a, 0x1f8f92];
const GOODS = [0xd84b2a, 0xe8a22a, 0x4f9a34, 0xc8324a, 0xe8d24a];

/* --------------------------------------------------------------------------- */

export function StreetLife() {
  const m = materials();
  const swayRef = useRef<{ value: number }[]>([]);

  const meshes = useMemo(() => {
    const world = buildWorld();
    const out: THREE.Object3D[] = [];
    const dummy = new THREE.Object3D();
    const colour = new THREE.Color();
    swayRef.current = [];

    /* ------------------------------- people ------------------------------ */

    const fig = figureGeometry();
    const shirt = swaying(new THREE.MeshStandardMaterial({ roughness: 0.86 }));
    const skin = swaying(new THREE.MeshStandardMaterial({ roughness: 0.72 }));
    swayRef.current.push(shirt.uniforms.uTime, skin.uniforms.uTime);

    for (const cell of chunk(world.people, 420)) {
      const body = new THREE.InstancedMesh(fig.body, shirt.mat, cell.length);
      const head = new THREE.InstancedMesh(fig.head, skin.mat, cell.length);
      cell.forEach((p, i) => {
        dummy.position.set(p.x, 0, p.z);
        dummy.rotation.set(0, p.rot, 0);
        dummy.scale.setScalar(0.92 + ((p.x * 3.1 + p.z * 7.7) % 1) * 0.18);
        dummy.updateMatrix();
        body.setMatrixAt(i, dummy.matrix);
        head.setMatrixAt(i, dummy.matrix);
        body.setColorAt(i, colour.setHex(p.colour));
        head.setColorAt(i, colour.setHex(p.skin));
      });
      body.instanceMatrix.needsUpdate = true;
      head.instanceMatrix.needsUpdate = true;
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
      if (head.instanceColor) head.instanceColor.needsUpdate = true;
      body.castShadow = true;
      out.push(body, head);
    }

    /* ------------------------------- stalls ------------------------------ */

    const st = stallGeometry();
    const canopyMat = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide });
    const goodsMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });

    for (const cell of chunk(world.stalls, 700)) {
      const frame = new THREE.InstancedMesh(st.frame, m.teak, cell.length);
      const canopy = new THREE.InstancedMesh(st.canopy, canopyMat, cell.length);
      const goods = new THREE.InstancedMesh(st.goods, goodsMat, cell.length);
      cell.forEach((s, i) => {
        dummy.position.set(s.x, 0, s.z);
        dummy.rotation.set(0, s.rot, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        frame.setMatrixAt(i, dummy.matrix);
        canopy.setMatrixAt(i, dummy.matrix);
        goods.setMatrixAt(i, dummy.matrix);
        canopy.setColorAt(i, colour.setHex(CANOPY[s.art % CANOPY.length]));
        goods.setColorAt(i, colour.setHex(GOODS[(s.art * 3 + 1) % GOODS.length]));
      });
      for (const mesh of [frame, canopy, goods]) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      frame.castShadow = true;
      canopy.castShadow = true;
      out.push(frame, canopy, goods);
    }

    /* ----------------------------- shopfronts ---------------------------- */

    // Every ground floor on a lane is a shop, and every shop has a painted
    // board over it. Nothing dates a rendered Indian street faster than a
    // blank plinth where the signage should be.
    const fronts = world.buildings.filter(
      (b: Building) => b.front !== null && b.style !== 'tower' && b.style !== 'slum' && b.h > 7
    );
    const boardGeo = new THREE.PlaneGeometry(1, 1);
    const awningGeo = new THREE.BoxGeometry(1, 0.05, 1);
    awningGeo.translate(0, 0, 0.5);

    const boardMats = Array.from(
      { length: 5 },
      (_, i) =>
        new THREE.MeshStandardMaterial({
          map: signboardTexture(i),
          roughness: 0.82,
          emissiveMap: signboardTexture(i),
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0,
        })
    );

    for (const cell of chunk(fronts, 600)) {
      for (let art = 0; art < boardMats.length; art++) {
        const list = cell.filter((b) => Math.abs(Math.round(b.x + b.z)) % boardMats.length === art);
        if (!list.length) continue;
        const board = new THREE.InstancedMesh(boardGeo, boardMats[art], list.length);
        list.forEach((b, i) => {
          const yaw = b.front!;
          const proud = b.d / 2 + 0.09;
          dummy.position.set(b.x + Math.sin(yaw) * proud, 3.35, b.z + Math.cos(yaw) * proud);
          dummy.rotation.set(0, yaw, 0);
          dummy.scale.set(b.w * 0.9, 0.98, 1);
          dummy.updateMatrix();
          board.setMatrixAt(i, dummy.matrix);
        });
        board.instanceMatrix.needsUpdate = true;
        out.push(board);
      }

      // Awnings over about half the shops.
      const shaded = cell.filter((b) => Math.round(b.x * 2 + b.z) % 2 === 0);
      if (shaded.length) {
        const awn = new THREE.InstancedMesh(awningGeo, canopyMat, shaded.length);
        shaded.forEach((b, i) => {
          const yaw = b.front!;
          const off = b.d / 2 + 0.1;
          dummy.position.set(b.x + Math.sin(yaw) * off, 2.6, b.z + Math.cos(yaw) * off);
          dummy.rotation.set(-0.3, yaw, 0, 'YXZ');
          dummy.scale.set(b.w * 0.74, 1, 1.05);
          dummy.updateMatrix();
          awn.setMatrixAt(i, dummy.matrix);
          awn.setColorAt(i, colour.setHex(CANOPY[Math.abs(Math.round(b.x)) % CANOPY.length]));
        });
        awn.instanceMatrix.needsUpdate = true;
        if (awn.instanceColor) awn.instanceColor.needsUpdate = true;
        awn.castShadow = true;
        out.push(awn);
      }
    }

    return out;
  }, [m]);

  useFrame(({ clock }) => {
    for (const u of swayRef.current) u.value = clock.elapsedTime;
  });

  return (
    <group>
      {meshes.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </group>
  );
}
