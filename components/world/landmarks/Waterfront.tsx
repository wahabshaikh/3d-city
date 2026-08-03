'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { materials } from '../materials';
import { Balustrade, Dome, Finial } from '../shapes';
import { ROADS, roadWorld } from '@/lib/mumbai/roads';
import { onLand } from '@/lib/mumbai/coastline';
import { mulberry32, rand, pick } from '@/lib/rng';
import { facade, facadeLights } from '@/lib/textures';

/** Samples a road into evenly spaced points with an inland-pointing normal. */
function frames(pts: [number, number][], spacing: number) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const len = curve.getLength();
  const n = Math.max(2, Math.round(len / spacing));
  const out: { p: THREE.Vector3; t: THREE.Vector3; inland: THREE.Vector3; u: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const nrm = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const probe = p.clone().addScaledVector(nrm, 45);
    const inland = onLand(probe.x, probe.z) ? nrm : nrm.clone().negate();
    out.push({ p, t, inland, u });
  }
  return out;
}

/**
 * Marine Drive — the Art Deco crescent of 1940, the Queen's Necklace.
 *
 * Cream apartment blocks with rounded corners, horizontal banding, vertical
 * fins and ziggurat crowns, facing a seawall of tetrapods across a promenade.
 */
export function MarineDrive() {
  const m = materials();

  const { blocks, wall, tetra, promenade } = useMemo(() => {
    const rd = ROADS.find((r) => r.id === 'marine-drive')!;
    const fr = frames(roadWorld(rd), 26);
    const rng = mulberry32(5150);

    const decoColours = [0xe6dbc0, 0xdfd3b6, 0xe9dcc2, 0xd8cfb8, 0xe2cdb0, 0xdad6c4, 0xe6d3ae];

    const blocks = fr.slice(1, -1).map((f, i) => {
      const depth = rand(rng, 20, 27);
      const w = rand(rng, 20, 27);
      const floors = Math.round(rand(rng, 6, 9));
      const pos = f.p.clone().addScaledVector(f.inland, 20 + depth / 2);
      return {
        id: i,
        x: pos.x,
        z: pos.z,
        rot: Math.atan2(-f.inland.x, -f.inland.z),
        w,
        depth,
        floors,
        colour: pick(rng, decoColours),
        fin: rng() < 0.62,
        round: rng() < 0.7,
      };
    });

    // seawall + promenade ribbons
    const wall: number[] = [];
    const promenade: number[] = [];
    for (const f of fr) {
      const a = f.p.clone().addScaledVector(f.inland, -13);
      const b = f.p.clone().addScaledVector(f.inland, 8);
      wall.push(a.x, a.z);
      promenade.push(b.x, b.z);
    }

    // tetrapods heaped on the rocks below the wall
    const tetra: { x: number; z: number; s: number; r: number }[] = [];
    for (const f of fr) {
      for (let k = 0; k < 7; k++) {
        const off = -14 - rng() * 13;
        const along = (rng() - 0.5) * 24;
        const p = f.p
          .clone()
          .addScaledVector(f.inland, off)
          .addScaledVector(f.t, along);
        tetra.push({ x: p.x, z: p.z, s: rand(rng, 1.1, 1.9), r: rng() * 6.3 });
      }
    }
    return { blocks, wall, tetra, promenade };
  }, []);

  const tetraGeo = useMemo(() => {
    const g: THREE.BufferGeometry[] = [];
    const dirs = [
      [0, 1, 0],
      [0.94, -0.33, 0],
      [-0.47, -0.33, 0.82],
      [-0.47, -0.33, -0.82],
    ];
    const merged = new THREE.BufferGeometry();
    const parts: THREE.BufferGeometry[] = [];
    for (const d of dirs) {
      const c = new THREE.ConeGeometry(0.62, 2.2, 7);
      c.translate(0, 1.1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(d[0], d[1], d[2]).normalize()
      );
      c.applyQuaternion(q);
      parts.push(c);
    }
    // manual merge to avoid pulling in BufferGeometryUtils
    let vCount = 0;
    let iCount = 0;
    for (const p of parts) {
      vCount += p.attributes.position.count;
      iCount += p.index!.count;
    }
    const pos = new Float32Array(vCount * 3);
    const nor = new Float32Array(vCount * 3);
    const idx = new Uint16Array(iCount);
    let vo = 0;
    let io = 0;
    for (const p of parts) {
      pos.set(p.attributes.position.array as Float32Array, vo * 3);
      nor.set(p.attributes.normal.array as Float32Array, vo * 3);
      const pi = p.index!.array;
      for (let i = 0; i < pi.length; i++) idx[io + i] = pi[i] + vo;
      vo += p.attributes.position.count;
      io += pi.length;
    }
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    merged.setIndex(new THREE.BufferAttribute(idx, 1));
    return merged;
  }, []);

  const ribbons = useMemo(() => {
    const build = (pairs: number[], width: number, y: number) => {
      const g = new THREE.BufferGeometry();
      const n = pairs.length / 2;
      const pos = new Float32Array(n * 2 * 3);
      for (let i = 0; i < n; i++) {
        const x = pairs[i * 2];
        const z = pairs[i * 2 + 1];
        const px = pairs[Math.max(0, i - 1) * 2];
        const pz = pairs[Math.max(0, i - 1) * 2 + 1];
        const nx2 = pairs[Math.min(n - 1, i + 1) * 2];
        const nz2 = pairs[Math.min(n - 1, i + 1) * 2 + 1];
        const tx = nx2 - px;
        const tz = nz2 - pz;
        const l = Math.hypot(tx, tz) || 1;
        const nx = -tz / l;
        const nz = tx / l;
        pos.set([x + nx * width, y, z + nz * width], i * 6);
        pos.set([x - nx * width, y, z - nz * width], i * 6 + 3);
      }
      const idx: number[] = [];
      for (let i = 0; i < n - 1; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    return { walk: build(promenade, 10, 0.3), parapet: build(wall, 2.2, 0.9) };
  }, [promenade, wall]);

  const walkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xa8a196,
        roughness: 0.93,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -8,
      }),
    []
  );

  return (
    <group>
      {/* promenade slab and seawall parapet */}
      <mesh geometry={ribbons.walk} material={walkMat} receiveShadow />
      <mesh geometry={ribbons.parapet} material={m.concrete} receiveShadow castShadow />
      {tetra.map((t, i) => (
        <mesh
          key={i}
          geometry={tetraGeo}
          material={m.concreteDark}
          position={[t.x, -2.6, t.z]}
          rotation={[0.3, t.r, 0.2]}
          scale={t.s}
          castShadow
        />
      ))}

      {blocks.map((b) => (
        <DecoBlock key={b.id} {...b} />
      ))}
    </group>
  );
}

/** One Art Deco block: banded, finned, with a rounded corner and a stepped crown. */
export function DecoBlock({
  x,
  z,
  rot,
  w,
  depth,
  floors,
  colour,
  fin,
  round,
}: {
  x: number;
  z: number;
  rot: number;
  w: number;
  depth: number;
  floors: number;
  colour: number;
  fin: boolean;
  round: boolean;
}) {
  const m = materials();
  const FL = 3.4;
  const h = floors * FL;
  const mat = useMemo(() => {
    const map = facade('deco').clone();
    map.needsUpdate = true;
    map.repeat.set(Math.max(1, Math.round(w / 11)), Math.max(1, Math.round(h / 13.6)));
    const em = facadeLights('deco').clone();
    em.needsUpdate = true;
    em.repeat.copy(map.repeat);
    return new THREE.MeshStandardMaterial({
      map,
      color: colour,
      roughness: 0.82,
      emissiveMap: em,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0,
    });
  }, [w, h, colour]);

  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh material={mat} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, depth]} />
      </mesh>
      {/* rounded seaward corner, the deco signature */}
      {round && (
        <mesh material={mat} position={[w / 2, h / 2, depth / 2]} castShadow>
          <cylinderGeometry args={[3.4, 3.4, h, 18, 1, false, 0, Math.PI / 2]} />
        </mesh>
      )}
      {/* horizontal banding at every floor */}
      {Array.from({ length: floors }, (_, i) => (
        <mesh key={i} material={m.whitewash} position={[0, (i + 1) * FL - 0.35, 0]} castShadow>
          <boxGeometry args={[w + 0.7, 0.34, depth + 0.7]} />
        </mesh>
      ))}
      {fin && (
        <mesh material={m.whitewash} position={[0, h / 2 + 2, depth / 2 + 0.4]} castShadow>
          <boxGeometry args={[2.2, h + 4, 1]} />
        </mesh>
      )}
      {/* ziggurat crown */}
      <mesh material={mat} position={[0, h + 1.2, 0]} castShadow>
        <boxGeometry args={[w * 0.72, 2.4, depth * 0.72]} />
      </mesh>
      <mesh material={mat} position={[0, h + 3, 0]} castShadow>
        <boxGeometry args={[w * 0.42, 1.8, depth * 0.42]} />
      </mesh>
      {/* water tanks, because this is still Mumbai */}
      <mesh material={m.black} position={[w * 0.28, h + 1.4, -depth * 0.26]} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 1.8, 10]} />
      </mesh>
    </group>
  );
}

/**
 * Nariman Point — the 1970s reclamation at the foot of the necklace:
 * Air India Building, Express Towers and the Oberoi.
 */
export function NarimanPoint() {
  const m = materials();
  const towers = useMemo(() => {
    const rng = mulberry32(771);
    const list: {
      x: number;
      z: number;
      w: number;
      d: number;
      h: number;
      kind: 'slab' | 'fin' | 'curve';
    }[] = [
      { x: 0, z: 0, w: 46, d: 26, h: 96, kind: 'fin' }, // Air India Building
      { x: -62, z: -34, w: 38, d: 30, h: 88, kind: 'slab' }, // Express Towers
      { x: 54, z: -50, w: 34, d: 34, h: 118, kind: 'curve' }, // the Oberoi
    ];
    for (let i = 0; i < 16; i++)
      list.push({
        x: rand(rng, -150, 150),
        z: rand(rng, -170, 90),
        w: rand(rng, 22, 34),
        d: rand(rng, 20, 30),
        h: rand(rng, 46, 92),
        kind: rng() < 0.5 ? 'slab' : 'fin',
      });
    return list;
  }, []);

  return (
    <group>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          {t.kind === 'curve' ? (
            <mesh material={m.glassDark} position={[0, t.h / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[t.w / 2, t.w / 2, t.h, 22]} />
            </mesh>
          ) : (
            <mesh material={m.concrete} position={[0, t.h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[t.w, t.h, t.d]} />
            </mesh>
          )}
          {t.kind === 'fin' &&
            Array.from({ length: Math.round(t.w / 3.2) }, (_, k) => (
              <mesh
                key={k}
                material={m.concreteDark}
                position={[-t.w / 2 + 1.6 + k * 3.2, t.h / 2, t.d / 2 + 0.3]}
                castShadow
              >
                <boxGeometry args={[1, t.h - 4, 0.8]} />
              </mesh>
            ))}
          {t.kind === 'slab' && (
            <mesh material={m.glass} position={[0, t.h / 2, t.d / 2 + 0.2]}>
              <boxGeometry args={[t.w - 3, t.h - 6, 0.3]} />
            </mesh>
          )}
          <mesh material={m.concreteDark} position={[0, t.h + 1.4, 0]} castShadow>
            <boxGeometry args={[t.w * 0.6, 2.8, t.d * 0.6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Wankhede Stadium — 33,000 seats under a Teflon-fabric canopy, 1974. */
export function Wankhede() {
  const m = materials();
  const RX = 96;
  const RZ = 78;
  const seats = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x2f4f8a, roughness: 0.85 }), []);
  return (
    <group>
      {/* pitch */}
      <mesh material={m.grass} position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[RZ - 22, RZ - 22, 0.12, 48]} />
      </mesh>
      <mesh material={m.concrete} position={[0, 0.13, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.06, 22]} />
      </mesh>

      {/* raked stands all the way round */}
      {Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        return (
          <group key={i} position={[ca * (RX - 20), 0, sa * (RZ - 20)]} rotation={[0, -a, 0]}>
            {Array.from({ length: 5 }, (_, r) => (
              <mesh
                key={r}
                material={seats}
                position={[r * 3.6 + 2, 2.2 + r * 2.6, 0]}
                rotation={[0, 0, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[3.7, 2.6, ((RZ - 20) * Math.PI * 2) / 48 + 2.4]} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* the fabric canopy */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <mesh material={m.steel} position={[RX + 4, 17, 0]} castShadow>
              <cylinderGeometry args={[0.6, 0.7, 34, 8]} />
            </mesh>
            <mesh
              material={m.whitewash}
              position={[RX - 12, 32, 0]}
              rotation={[Math.PI / 2, 0, 0.16]}
              castShadow
            >
              <planeGeometry args={[30, 26]} />
            </mesh>
          </group>
        );
      })}

      {/* floodlights */}
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sz]) => (
        <group key={`${sx}${sz}`} position={[sx * (RX + 12), 0, sz * (RZ + 10)]}>
          <mesh material={m.steel} position={[0, 24, 0]} castShadow>
            <cylinderGeometry args={[0.9, 1.4, 48, 8]} />
          </mesh>
          <mesh material={m.lampGlow} position={[0, 50, 0]} castShadow>
            <boxGeometry args={[9, 5, 2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Girgaum Chowpatty: sand, stalls and a ferris wheel at the top of the necklace. */
export function Chowpatty() {
  const m = materials();
  const { stalls, canopyMats } = useMemo(() => {
    const rng = mulberry32(3131);
    const palette = [0xd8342a, 0xf2c14e, 0x1f7a8c, 0x3fa06a, 0xe4801f];
    const canopyMats = palette.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide })
    );
    const stalls = Array.from({ length: 22 }, () => ({
      x: rand(rng, -110, 110),
      z: rand(rng, -40, 30),
      r: rand(rng, 0, 6.3),
      c: Math.floor(rng() * palette.length),
    }));
    return { stalls, canopyMats };
  }, []);
  return (
    <group>
      {stalls.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.r, 0]}>
          <mesh material={m.teak} position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[3.4, 0.3, 2]} />
          </mesh>
          {[-1.5, 1.5].map((x) =>
            [-0.8, 0.8].map((z) => (
              <mesh key={`${x}${z}`} material={m.teak} position={[x, 0.55, z]} castShadow>
                <boxGeometry args={[0.14, 1.1, 0.14]} />
              </mesh>
            ))
          )}
          <mesh position={[0, 2.5, 0]} castShadow material={canopyMats[s.c]}>
            <boxGeometry args={[4.2, 0.12, 2.8]} />
          </mesh>
          {[-1.9, 1.9].map((x) =>
            [-1.2, 1.2].map((z) => (
              <mesh key={`p${x}${z}`} material={m.steel} position={[x, 1.7, z]} castShadow>
                <cylinderGeometry args={[0.05, 0.05, 2.4, 6]} />
              </mesh>
            ))
          )}
        </group>
      ))}

      {/* giant wheel */}
      <group position={[-70, 0, -18]}>
        <mesh material={m.steel} position={[0, 9, 0]} rotation={[0, 0, 0]} castShadow>
          <torusGeometry args={[9, 0.3, 6, 32]} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <group key={i}>
              <mesh material={m.steel} position={[0, 9, 0]} rotation={[0, 0, a]} castShadow>
                <boxGeometry args={[18, 0.2, 0.2]} />
              </mesh>
              <mesh
                material={m.vermilion}
                position={[Math.cos(a) * 9, 9 + Math.sin(a) * 9 - 0.9, 0]}
                castShadow
              >
                <boxGeometry args={[1.4, 1.2, 1.4]} />
              </mesh>
            </group>
          );
        })}
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.steel} position={[s * 5, 4.5, 0]} rotation={[0, 0, -s * 0.5]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 11, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
