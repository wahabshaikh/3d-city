'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildWorld, chunk, type Building } from '@/lib/mumbai/world';
import { crowdGeometry, walking } from './crowd';
import { hiddenPeople } from '@/lib/game/peds';
import { signboardTexture } from '@/lib/textures';
import { useStore } from '@/lib/store';
import { materials } from './materials';

/**
 * The things that make a Mumbai street a Mumbai street: shopfronts and painted
 * signboards along every ground floor, handcarts on the kerb, and people —
 * enough of them that the city is never empty.
 */

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
  const tod = useStore((s) => s.timeOfDay);
  const swayRef = useRef<{ value: number }[]>([]);
  const boards = useRef<THREE.MeshStandardMaterial[]>([]);

  const rows = useRef(new Map<number, { meshes: THREE.InstancedMesh[]; i: number }>());

  const meshes = useMemo(() => {
    const world = buildWorld();
    rows.current.clear();
    const out: THREE.Object3D[] = [];
    const dummy = new THREE.Object3D();
    const colour = new THREE.Color();
    swayRef.current = [];

    /* ------------------------------- people ------------------------------ */

    const fig = crowdGeometry();
    const shirt = walking(new THREE.MeshStandardMaterial({ roughness: 0.86 }));
    const lower = walking(new THREE.MeshStandardMaterial({ roughness: 0.88 }));
    const skin = walking(new THREE.MeshStandardMaterial({ roughness: 0.72 }));
    swayRef.current.push(shirt.uniforms.uTime, lower.uniforms.uTime, skin.uniforms.uTime);

    // Indexed, so the game can point at one of them and take them out.
    const indexed = world.people.map((p, i) => ({ ...p, i }));
    for (const cell of chunk(indexed, 420)) {
      const parts: [THREE.InstancedMesh, (p: (typeof cell)[0]) => number][] = [
        [new THREE.InstancedMesh(fig.lower, lower.mat, cell.length), (p) => p.lower],
        [new THREE.InstancedMesh(fig.shirt, shirt.mat, cell.length), (p) => p.colour],
        [new THREE.InstancedMesh(fig.skin, skin.mat, cell.length), (p) => p.skin],
      ];
      cell.forEach((p, i) => {
        dummy.position.set(p.x, 0, p.z);
        dummy.rotation.set(0, p.rot, 0);
        // Nobody is exactly 1.72 m tall.
        dummy.scale.setScalar(0.9 + ((p.x * 3.1 + p.z * 7.7) % 1) * 0.2);
        dummy.updateMatrix();
        for (const [mesh, tint] of parts) {
          mesh.setMatrixAt(i, dummy.matrix);
          mesh.setColorAt(i, colour.setHex(tint(p)));
        }
        rows.current.set(p.i, { meshes: parts.map(([mesh]) => mesh), i });
      });
      for (const [mesh] of parts) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = true;
        // The walk happens in the shader, so three's bounds are a few metres
        // short. Widen them rather than turning culling off — there are a
        // hundred of these chunks and they are not all on screen.
        mesh.computeBoundingSphere();
        if (mesh.boundingSphere) mesh.boundingSphere.radius += 6;
        out.push(mesh);
      }
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
    boards.current = boardMats;

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

  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);

  useFrame(({ clock }) => {
    for (const u of swayRef.current) u.value = clock.elapsedTime;
    // Anyone the game has taken out of the crowd leaves the instance buffer.
    while (hiddenPeople.length) {
      const row = rows.current.get(hiddenPeople.pop()!);
      if (!row) continue;
      for (const mesh of row.meshes) {
        mesh.setMatrixAt(row.i, zero);
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  // Shop boards are backlit, and a Mumbai street after dark is lit as much by
  // its signage as by its lamps.
  useEffect(() => {
    const dusk = tod < 0.29 ? 1 - tod / 0.29 : tod > 0.73 ? (tod - 0.73) / 0.13 : 0;
    const k = Math.max(0, Math.min(1, dusk));
    for (const mat of boards.current) mat.emissiveIntensity = k * 0.85;
  }, [tod, meshes]);

  return (
    <group>
      {meshes.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </group>
  );
}
