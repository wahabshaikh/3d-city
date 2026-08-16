'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildWorld, chunk } from '@/lib/mumbai/world';
import { hoardingTexture } from '@/lib/textures';
import { materials } from './materials';
import { useStore } from '@/lib/store';

/* --------------------------------- trees ---------------------------------- */

function palmGeometries() {
  const trunkParts: THREE.BufferGeometry[] = [];
  const t = new THREE.CylinderGeometry(0.2, 0.42, 9, 6);
  t.translate(0, 4.5, 0);
  t.rotateZ(0.07);
  trunkParts.push(t);

  const crownParts: THREE.BufferGeometry[] = [];
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2;
    const droop = 0.35 + (i % 3) * 0.16;
    const inner = new THREE.BoxGeometry(0.75, 0.09, 2.6);
    inner.translate(0, 0, 1.3);
    inner.rotateX(droop * 0.4);
    inner.rotateY(a);
    inner.translate(0, 9.1, 0);
    crownParts.push(inner);

    const outer = new THREE.BoxGeometry(0.5, 0.07, 2.6);
    outer.translate(0, 0, 1.3);
    outer.rotateX(droop * 1.5);
    outer.translate(0, 0, 2.5);
    outer.rotateX(droop * 0.4);
    outer.rotateY(a);
    outer.translate(0, 9.1, 0);
    crownParts.push(outer);
  }
  const coconuts = new THREE.SphereGeometry(0.32, 6, 5);
  coconuts.translate(0.5, 8.7, 0.3);
  crownParts.push(coconuts);

  return {
    trunk: mergeGeometries(trunkParts)!,
    crown: mergeGeometries(crownParts)!,
  };
}

function leafyGeometries() {
  const t = new THREE.CylinderGeometry(0.28, 0.5, 4.6, 6);
  t.translate(0, 2.3, 0);
  const blobs: THREE.BufferGeometry[] = [];
  for (const [x, y, z, r] of [
    [0, 5.6, 0, 3.1],
    [1.9, 4.8, 0.6, 2.2],
    [-1.7, 5.0, -0.9, 2.0],
    [0.4, 7.0, -1.4, 1.8],
  ]) {
    const s = new THREE.IcosahedronGeometry(r, 1);
    s.translate(x, y, z);
    blobs.push(s);
  }
  return { trunk: t, crown: mergeGeometries(blobs)! };
}

/* ------------------------------- streetlight ------------------------------ */

function lampGeometries(twin: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  const pole = new THREE.CylinderGeometry(0.12, 0.2, 9, 7);
  pole.translate(0, 4.5, 0);
  parts.push(pole);
  const base = new THREE.CylinderGeometry(0.34, 0.42, 0.7, 8);
  base.translate(0, 0.35, 0);
  parts.push(base);
  const sides = twin ? [-1, 1] : [1];
  for (const s of sides) {
    const arm = new THREE.CylinderGeometry(0.08, 0.09, 2.6, 6);
    arm.rotateZ(Math.PI / 2 - 0.5);
    arm.translate(s * 1.0, 9.2, 0);
    if (s < 0) arm.scale(-1, 1, 1);
    parts.push(arm);
  }
  const lampParts: THREE.BufferGeometry[] = [];
  const haloParts: THREE.BufferGeometry[] = [];
  for (const s of sides) {
    const globe = new THREE.SphereGeometry(0.44, 10, 8);
    globe.translate(s * 2.1, 9.9, 0);
    lampParts.push(globe);
    const halo = new THREE.SphereGeometry(1.5, 10, 8);
    halo.translate(s * 2.1, 9.9, 0);
    haloParts.push(halo);
  }
  return {
    pole: mergeGeometries(parts)!,
    lamp: mergeGeometries(lampParts)!,
    halo: mergeGeometries(haloParts)!,
  };
}

/* ---------------------------------- props --------------------------------- */

export function Props() {
  const m = materials();
  const tod = useStore((s) => s.timeOfDay);

  const lampMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xfff0d0,
        emissive: new THREE.Color(0xffc46a),
        emissiveIntensity: 0,
        roughness: 0.4,
      }),
    []
  );

  /** The halo that turns the promenade lamps into the Queen's Necklace. */
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffd28a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  );

  const meshes = useMemo(() => {
    const world = buildWorld();
    const out: THREE.Object3D[] = [];
    const dummy = new THREE.Object3D();

    const palm = palmGeometries();
    const leafy = leafyGeometries();

    for (const cell of chunk(world.trees, 700)) {
      for (const kind of ['palm', 'leafy'] as const) {
        const list = cell.filter((t) => (kind === 'palm') === t.palm);
        if (!list.length) continue;
        const g = kind === 'palm' ? palm : leafy;
        const trunk = new THREE.InstancedMesh(g.trunk, m.trunk, list.length);
        const crown = new THREE.InstancedMesh(
          g.crown,
          kind === 'palm' ? m.foliageDry : m.foliage,
          list.length
        );
        list.forEach((t, i) => {
          dummy.position.set(t.x, 0, t.z);
          dummy.rotation.set(0, (t.x * 0.7 + t.z * 1.3) % 6.28, 0);
          dummy.scale.setScalar(t.s);
          dummy.updateMatrix();
          trunk.setMatrixAt(i, dummy.matrix);
          crown.setMatrixAt(i, dummy.matrix);
        });
        trunk.instanceMatrix.needsUpdate = true;
        crown.instanceMatrix.needsUpdate = true;
        trunk.castShadow = crown.castShadow = true;
        out.push(trunk, crown);
      }
    }

    const twinG = lampGeometries(true);
    const singleG = lampGeometries(false);
    for (const cell of chunk(world.lights, 900)) {
      for (const twin of [true, false]) {
        const list = cell.filter((l) => l.twin === twin);
        if (!list.length) continue;
        const g = twin ? twinG : singleG;
        const pole = new THREE.InstancedMesh(g.pole, m.darkGrey, list.length);
        const lamp = new THREE.InstancedMesh(g.lamp, lampMat, list.length);
        const halo = new THREE.InstancedMesh(g.halo, haloMat, list.length);
        list.forEach((l, i) => {
          dummy.position.set(l.x, 0, l.z);
          dummy.rotation.set(0, l.rot, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          pole.setMatrixAt(i, dummy.matrix);
          lamp.setMatrixAt(i, dummy.matrix);
          halo.setMatrixAt(i, dummy.matrix);
        });
        pole.instanceMatrix.needsUpdate = true;
        lamp.instanceMatrix.needsUpdate = true;
        halo.instanceMatrix.needsUpdate = true;
        halo.renderOrder = 20;
        pole.castShadow = true;
        out.push(pole, lamp, halo);
      }
    }

    return out;
  }, [m, lampMat, haloMat]);

  useEffect(() => {
    const dusk = tod < 0.3 ? 1 - tod / 0.3 : tod > 0.72 ? (tod - 0.72) / 0.2 : 0;
    const k = THREE.MathUtils.clamp(dusk, 0, 1);
    lampMat.emissiveIntensity = k * 3.2;
    haloMat.opacity = k * 0.5;
    haloMat.visible = k > 0.06;
  }, [tod, lampMat, haloMat]);

  return (
    <group>
      {meshes.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
      <LampGlow />
      <Hoardings />
    </group>
  );
}

/* -------------------------------- lamp glow ------------------------------- */

const glowVert = /* glsl */ `
  uniform float uScale;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = -mv.z;
    // Sodium lamps stay visible right across Back Bay, so the sprite is not
    // allowed to shrink away with distance — that is the whole point of the
    // Queen's Necklace, a curve of light read from three kilometres off.
    gl_PointSize = clamp(uScale / max(dist, 1.0), 2.5, 46.0);
    vFade = smoothstep(4200.0, 2400.0, dist);
    gl_Position = projectionMatrix * mv;
  }
`;

const glowFrag = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColour;
  varying float vFade;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float core = pow(1.0 - r, 2.4);
    float halo = pow(1.0 - r, 0.7) * 0.35;
    gl_FragColor = vec4(uColour * (core + halo), (core + halo) * uOpacity * vFade);
  }
`;

/**
 * Every street lamp in the city as one additive point sprite. Cheap enough to
 * leave on, and it is what turns Marine Drive after dark into a string of
 * pearls rather than a row of unlit poles.
 */
function LampGlow() {
  const tod = useStore((s) => s.timeOfDay);

  const { geometry, material } = useMemo(() => {
    const world = buildWorld();
    const pos = new Float32Array(world.lights.length * 3);
    world.lights.forEach((l, i) => {
      pos[i * 3] = l.x;
      pos[i * 3 + 1] = 9.9;
      pos[i * 3 + 2] = l.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.computeBoundingSphere();

    const material = new THREE.ShaderMaterial({
      vertexShader: glowVert,
      fragmentShader: glowFrag,
      uniforms: {
        uScale: { value: 900 },
        uOpacity: { value: 0 },
        uColour: { value: new THREE.Color(0xffc784) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geometry, material };
  }, []);

  useEffect(() => {
    const dusk = tod < 0.3 ? 1 - tod / 0.3 : tod > 0.71 ? (tod - 0.71) / 0.14 : 0;
    material.uniforms.uOpacity.value = THREE.MathUtils.clamp(dusk, 0, 1) * 0.95;
  }, [tod, material]);

  const visible = tod < 0.3 || tod > 0.71;
  return <points visible={visible} geometry={geometry} material={material} renderOrder={30} />;
}

/** Film hoardings on every arterial road. */
function Hoardings() {
  const m = materials();
  const { groups, mats } = useMemo(() => {
    const world = buildWorld();
    const mats = Array.from(
      { length: 6 },
      (_, i) =>
        new THREE.MeshStandardMaterial({
          map: hoardingTexture(i),
          roughness: 0.9,
          side: THREE.DoubleSide,
        })
    );
    const groups = new Map<number, typeof world.hoardings>();
    for (const h of world.hoardings) {
      let arr = groups.get(h.art);
      if (!arr) groups.set(h.art, (arr = []));
      arr.push(h);
    }
    return { groups: [...groups.entries()], mats };
  }, []);

  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const frame = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-0.36, 0.36]) {
      const leg = new THREE.BoxGeometry(0.34, 1, 0.34);
      leg.translate(s, -0.5, -0.3);
      parts.push(leg);
    }
    const bar = new THREE.BoxGeometry(1.04, 0.16, 0.16);
    bar.translate(0, 0, -0.24);
    parts.push(bar);
    return mergeGeometries(parts)!;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const meshes = useMemo(() => {
    const out: THREE.Object3D[] = [];
    for (const [art, list] of groups) {
      const board = new THREE.InstancedMesh(plane, mats[art], list.length);
      const legs = new THREE.InstancedMesh(frame, m.steel, list.length);
      list.forEach((h, i) => {
        dummy.position.set(h.x, 7 + h.h / 2, h.z);
        dummy.rotation.set(0, h.rot, 0);
        dummy.scale.set(h.w, h.h, 1);
        dummy.updateMatrix();
        board.setMatrixAt(i, dummy.matrix);
        dummy.scale.set(h.w, 7 + h.h / 2, 1);
        dummy.updateMatrix();
        legs.setMatrixAt(i, dummy.matrix);
      });
      board.instanceMatrix.needsUpdate = true;
      legs.instanceMatrix.needsUpdate = true;
      board.castShadow = true;
      out.push(legs, board);
    }
    return out;
  }, [groups, mats, plane, frame, m, dummy]);

  return (
    <>
      {meshes.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </>
  );
}
