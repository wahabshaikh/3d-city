'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { materials } from '../materials';
import { wallGeometry, Dome, Finial, Chhatri, Turret } from '../shapes';
import { ROADS, roadWorld } from '@/lib/mumbai/roads';
import { SEA_LINK, SEA_LEVEL } from '@/lib/mumbai/physics';
import { ribbonGeometry, resample, frameAt } from '@/lib/ribbon';
import { mulberry32, rand, pick } from '@/lib/rng';

/**
 * Haji Ali Dargah, 1431 — the tomb of Sayyed Pir Haji Ali Shah Bukhari on its
 * islet off Worli. Whitewashed Indo-Islamic marble: one dome, one minaret, a
 * scalloped arcade around a marble courtyard, and the causeway to the shore.
 */
export function HajiAli() {
  const m = materials();
  const geos = useMemo(
    () => ({
      screen: wallGeometry(52, 7, 1.1, [
        { cx: -19, w: 6, spring: 3, h: 6.2, kind: 'ogee' as const },
        { cx: -6.4, w: 6, spring: 3, h: 6.2, kind: 'ogee' as const },
        { cx: 6.4, w: 6, spring: 3, h: 6.2, kind: 'ogee' as const },
        { cx: 19, w: 6, spring: 3, h: 6.2, kind: 'ogee' as const },
      ]),
      shrine: wallGeometry(22, 11, 22, [{ cx: 0, w: 7, spring: 4.4, h: 9.2, kind: 'ogee' as const }]),
    }),
    []
  );

  return (
    <group>
      {/* the islet and its marble platform */}
      <mesh material={m.concreteDark} position={[0, -1.6, 0]} receiveShadow>
        <cylinderGeometry args={[34, 40, 4, 16]} />
      </mesh>
      <mesh material={m.marble} position={[0, 0.6, 0]} receiveShadow>
        <boxGeometry args={[56, 1.2, 50]} />
      </mesh>

      {/* arcaded perimeter */}
      {[0, Math.PI].map((r, i) => (
        <mesh
          key={i}
          geometry={geos.screen}
          material={m.marble}
          position={[0, 1.2, i === 0 ? 24 : -24]}
          rotation={[0, r, 0]}
          castShadow
          receiveShadow
        />
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={geos.screen}
          material={m.marble}
          position={[s * 27, 1.2, 0]}
          rotation={[0, s * (Math.PI / 2), 0]}
          scale={[0.94, 1, 1]}
          castShadow
        />
      ))}

      {/* central shrine chamber */}
      <group position={[0, 1.2, 0]}>
        <mesh geometry={geos.shrine} material={m.marble} castShadow receiveShadow />
        <mesh geometry={geos.shrine} material={m.marble} rotation={[0, Math.PI / 2, 0]} castShadow />
        <mesh material={m.marble} position={[0, 11.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[24, 1.4, 24]} />
        </mesh>
        {/* octagonal drum and dome */}
        <mesh material={m.marble} position={[0, 14.2, 0]} castShadow>
          <cylinderGeometry args={[8, 8.6, 3.6, 8]} />
        </mesh>
        <Dome r={8.2} h={8} bulge={0.24} ribs={12} ribTube={0.3} material={m.marble} position={[0, 16, 0]} />
        <mesh material={m.marbleGreen} position={[0, 24.2, 0]} castShadow>
          <cylinderGeometry args={[1.2, 1.8, 1.4, 10]} />
        </mesh>
        <Finial h={4.4} r={0.6} material={m.marbleGreen} position={[0, 24.9, 0]} />

        {/* corner chhatris */}
        {[
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ].map(([sx, sz]) => (
          <Chhatri
            key={`${sx}${sz}`}
            r={2.4}
            colH={3}
            domeH={2.2}
            material={m.marble}
            position={[sx * 9.4, 12.4, sz * 9.4]}
          />
        ))}
      </group>

      {/* the minaret */}
      <group position={[-21, 1.2, 17]}>
        <mesh material={m.marble} position={[0, 9, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 2.1, 18, 12]} />
        </mesh>
        <mesh material={m.marble} position={[0, 18.4, 0]} castShadow>
          <cylinderGeometry args={[2.6, 2.6, 0.8, 12]} />
        </mesh>
        <mesh material={m.marble} position={[0, 21.4, 0]} castShadow>
          <cylinderGeometry args={[1.3, 1.5, 5.2, 12]} />
        </mesh>
        <Dome r={1.9} h={2.6} bulge={0.3} material={m.marbleGreen} position={[0, 24, 0]} />
        <Finial h={3} r={0.34} material={m.marbleGreen} position={[0, 26.6, 0]} />
      </group>

      {/* green flags on the courtyard corners */}
      {[
        [-24, 20],
        [24, 20],
        [24, -20],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 1.2, z]}>
          <mesh material={m.steel} position={[0, 4, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 8, 6]} />
          </mesh>
          <mesh material={m.marbleGreen} position={[1.4, 7.2, 0]}>
            <planeGeometry args={[2.6, 1.6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Mahalaxmi Dhobi Ghat, 1890 — several hundred open-air concrete flogging pens
 * under lines of drying washing.
 */
export function DhobiGhat() {
  const m = materials();
  const { pens, lines, clothMats } = useMemo(() => {
    const rng = mulberry32(1890);
    const pens: { x: number; z: number }[] = [];
    for (let i = 0; i < 22; i++)
      for (let j = 0; j < 15; j++) {
        if (rng() < 0.06) continue;
        pens.push({ x: -66 + i * 6.2, z: -44 + j * 6.2 });
      }
    const palette = [0xd8342a, 0xf2c14e, 0x2f7ac8, 0x3fa06a, 0xffffff, 0xb8449a, 0xe4801f];
    const clothMats = palette.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })
    );
    const lines: { x: number; z: number; rot: number; c: number; w: number; h: number }[] = [];
    for (let i = 0; i < 420; i++) {
      lines.push({
        x: rand(rng, -74, 74),
        z: rand(rng, -52, 52),
        rot: rng() < 0.5 ? 0 : Math.PI / 2,
        c: Math.floor(rng() * palette.length),
        w: rand(rng, 1.2, 2.6),
        h: rand(rng, 1.4, 2.6),
      });
    }
    return { pens, lines, clothMats };
  }, []);

  return (
    <group>
      <mesh material={m.concreteDark} position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[158, 0.3, 112]} />
      </mesh>
      {pens.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh material={m.concrete} position={[0, 0.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.2, 1.1, 5.2]} />
          </mesh>
          <mesh material={m.marbleGreen} position={[0, 0.85, 0]}>
            <boxGeometry args={[4.2, 0.5, 4.2]} />
          </mesh>
          <mesh material={m.concreteDark} position={[0, 1.4, -2.1]} castShadow>
            <boxGeometry args={[3.4, 0.6, 0.7]} />
          </mesh>
        </group>
      ))}
      {/* posts and washing lines */}
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={`p${i}`} material={m.teak} position={[-72 + (i % 15) * 10, 2.4, i < 15 ? -50 : 50]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 4.8, 6]} />
        </mesh>
      ))}
      {lines.map((l, i) => (
        <mesh
          key={`c${i}`}
          material={clothMats[l.c]}
          position={[l.x, 3.4 - l.h / 2, l.z]}
          rotation={[0, l.rot, 0]}
        >
          <planeGeometry args={[l.w, l.h]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Antilia, Altamount Road — 173 m and 27 storeys of staggered floor plates,
 * hanging gardens and a rooftop helipad.
 */
export function Antilia() {
  const m = materials();
  const plates = useMemo(() => {
    const rng = mulberry32(2010);
    const out: { y: number; h: number; w: number; d: number; dx: number; dz: number; garden: boolean }[] =
      [];
    let y = 0;
    for (let i = 0; i < 27; i++) {
      // the lower third is the car park; upper floors are double and triple height
      const h = i < 8 ? 4.2 : i < 20 ? rand(rng, 5.4, 7.4) : rand(rng, 7, 9.5);
      const w = i < 8 ? 34 : 30 + rng() * 14;
      const d = i < 8 ? 30 : 26 + rng() * 12;
      out.push({
        y,
        h,
        w,
        d,
        dx: i < 8 ? 0 : rand(rng, -4, 4),
        dz: i < 8 ? 0 : rand(rng, -3, 3),
        garden: i > 9 && rng() < 0.34,
      });
      y += h;
    }
    return out;
  }, []);

  const total = plates.reduce((s, p) => s + p.h, 0);

  return (
    <group>
      {plates.map((p, i) => (
        <group key={i} position={[p.dx, p.y + p.h / 2, p.dz]}>
          <mesh material={i < 8 ? m.concreteDark : m.glassDark} castShadow receiveShadow>
            <boxGeometry args={[p.w, p.h * 0.86, p.d]} />
          </mesh>
          {/* the cantilevered slab edge */}
          <mesh material={m.concrete} position={[0, p.h / 2 - 0.4, 0]} castShadow>
            <boxGeometry args={[p.w + 3.4, 0.8, p.d + 3.4]} />
          </mesh>
          {p.garden && (
            <mesh material={m.foliage} position={[0, p.h / 2 + 0.9, p.d / 2 + 1]} castShadow>
              <boxGeometry args={[p.w * 0.8, 2.2, 2.6]} />
            </mesh>
          )}
          {i < 8 &&
            Array.from({ length: 7 }, (_, k) => (
              <mesh key={k} material={m.steel} position={[-15 + k * 5, 0, p.d / 2 + 0.4]} castShadow>
                <boxGeometry args={[1.2, p.h * 0.8, 0.5]} />
              </mesh>
            ))}
        </group>
      ))}
      {/* service core running the full height */}
      <mesh material={m.concrete} position={[-16, total / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, total, 12]} />
      </mesh>
      {/* helipad */}
      <mesh material={m.concreteDark} position={[0, total + 1, 0]} castShadow>
        <cylinderGeometry args={[13, 13, 1, 24]} />
      </mesh>
      <mesh material={m.whitewash} position={[0, total + 1.6, 0]}>
        <torusGeometry args={[7.5, 0.5, 6, 24]} />
      </mesh>
    </group>
  );
}

/**
 * Shree Siddhivinayak Temple, Prabhadevi — the gold-plated shikhara over
 * Mumbai's most-visited sanctum.
 */
export function Siddhivinayak() {
  const m = materials();
  const pink = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xe8d7c6, roughness: 0.7 }), []);
  return (
    <group>
      <mesh material={m.marble} position={[0, 0.8, 0]} receiveShadow castShadow>
        <boxGeometry args={[46, 1.6, 46]} />
      </mesh>
      <mesh material={pink} position={[0, 8.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[34, 14, 34]} />
      </mesh>
      {/* pilasters and arched openings so the base is not a blank block */}
      {[0, 1, 2, 3].map((side) => {
        const a = (side * Math.PI) / 2;
        return (
          <group key={side} rotation={[0, a, 0]}>
            {[-13, -6.5, 0, 6.5, 13].map((x) => (
              <mesh key={x} material={pink} position={[x, 8.6, 17.4]} castShadow>
                <boxGeometry args={[2.4, 14, 1.4]} />
              </mesh>
            ))}
            {[-9.8, -3.2, 3.2, 9.8].map((x) => (
              <group key={x}>
                <mesh material={m.teak} position={[x, 6, 17.3]} castShadow>
                  <boxGeometry args={[3.6, 6.6, 0.5]} />
                </mesh>
                <mesh
                  material={m.teak}
                  position={[x, 9.3, 17.3]}
                  rotation={[Math.PI / 2, 0, 0]}
                  castShadow
                >
                  <cylinderGeometry args={[1.8, 1.8, 0.5, 14, 1, false, 0, Math.PI]} />
                </mesh>
              </group>
            ))}
            <mesh material={m.saffron} position={[0, 15.4, 17.6]} castShadow>
              <boxGeometry args={[36, 1, 1.4]} />
            </mesh>
          </group>
        );
      })}
      <mesh material={pink} position={[0, 18.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[26, 5.6, 26]} />
      </mesh>
      <mesh material={m.saffron} position={[0, 15.8, 0]} castShadow>
        <boxGeometry args={[36, 0.8, 36]} />
      </mesh>

      {/* corner shikharas */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <group key={`${sx}${sz}`} position={[sx * 11, 21.2, sz * 11]}>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} material={m.gold} position={[0, i * 1.5, 0]} castShadow>
              <boxGeometry args={[5 - i * 0.8, 1.5, 5 - i * 0.8]} />
            </mesh>
          ))}
          <Finial h={2.4} r={0.4} material={m.gold} position={[0, 7.6, 0]} />
        </group>
      ))}

      {/* the main gold shikhara over the sanctum */}
      <group position={[0, 21.2, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} material={m.gold} position={[0, i * 1.7, 0]} castShadow>
            <cylinderGeometry args={[9.4 - i * 1.05, 10 - i * 1.05, 1.7, 8]} />
          </mesh>
        ))}
        <mesh material={m.gold} position={[0, 14.6, 0]} castShadow>
          <sphereGeometry args={[2.4, 16, 12]} />
        </mesh>
        <Finial h={5} r={0.8} material={m.gold} position={[0, 16.4, 0]} />
      </group>

      {/* entrance mandapa with the temple flag */}
      <group position={[0, 1.6, 22]}>
        <mesh material={pink} position={[0, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[20, 10, 8]} />
        </mesh>
        <mesh material={m.saffron} position={[0, 10.4, 0]} castShadow>
          <boxGeometry args={[22, 0.9, 9]} />
        </mesh>
        {[-8, -2.6, 2.6, 8].map((x) => (
          <mesh key={x} material={m.gold} position={[x, 5, 4.3]} castShadow>
            <cylinderGeometry args={[0.8, 0.9, 10, 12]} />
          </mesh>
        ))}
        <mesh material={m.steel} position={[0, 15, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, 9, 8]} />
        </mesh>
        <mesh material={m.saffron} position={[2, 18.4, 0]}>
          <planeGeometry args={[4, 2.4]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Bandra–Worli Sea Link, 2010 — twin cable-stayed spans across Mahim Bay,
 * eight lanes on a deck hung from concrete pylons.
 */
export function SeaLink() {
  const m = materials();

  const { deck, median, pts } = useMemo(() => {
    const raw = roadWorld(ROADS.find((r) => r.id === 'sea-link')!);
    const pts = resample(raw, 8);
    const h = (t: number) => SEA_LINK.profile(t);
    return {
      pts,
      deck: ribbonGeometry(pts, 21, h, 1 / 14),
      median: ribbonGeometry(pts, 1.2, (t) => h(t) + 1.2, 1 / 14),
    };
  }, []);

  const piers = useMemo(() => {
    const out: { x: number; z: number; y: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const t = (i + 0.5) / 26;
      const f = frameAt(pts, t);
      out.push({ x: f.x, z: f.z, y: SEA_LINK.profile(t) });
    }
    return out;
  }, [pts]);

  const pylons = useMemo(
    () =>
      [0.32, 0.68].map((t) => {
        const f = frameAt(pts, t);
        return { ...f, deckY: SEA_LINK.profile(t), t };
      }),
    [pts]
  );

  const cables = useMemo(() => {
    const out: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
    for (const py of pylons) {
      const top = new THREE.Vector3(py.x, py.deckY + 72, py.z);
      for (let s = -1; s <= 1; s += 2) {
        for (let k = 1; k <= 11; k++) {
          const dt = (k / 11) * 0.17 * s;
          const t = Math.min(0.99, Math.max(0.01, py.t + dt));
          const f = frameAt(pts, t);
          for (const side of [-1, 1]) {
            out.push({
              a: top.clone(),
              b: new THREE.Vector3(
                f.x + f.nx * side * 9,
                SEA_LINK.profile(t) + 1.6,
                f.z + f.nz * side * 9
              ),
            });
          }
        }
      }
    }
    return out;
  }, [pts, pylons]);

  const cableGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.22, 1, 5), []);

  const edges = useMemo(
    () =>
      [-1, 1].map((side) => {
        const shifted = pts.map(([x, z], i) => {
          const [px, pz] = pts[Math.max(0, i - 1)];
          const [nx2, nz2] = pts[Math.min(pts.length - 1, i + 1)];
          const l = Math.hypot(nx2 - px, nz2 - pz) || 1;
          return [x + (-(nz2 - pz) / l) * side * 20.4, z + ((nx2 - px) / l) * side * 20.4] as [
            number,
            number,
          ];
        });
        return ribbonGeometry(shifted, 0.5, (t) => SEA_LINK.profile(t) + 1.4, 1 / 14);
      }),
    [pts]
  );

  return (
    <group>
      <mesh geometry={deck} material={m.asphalt} receiveShadow castShadow />
      <mesh geometry={median} material={m.concrete} receiveShadow />

      {/* deck edge barriers */}
      {edges.map((g, i) => (
        <mesh key={i} geometry={g} material={m.concrete} receiveShadow castShadow />
      ))}

      {piers.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh material={m.concrete} position={[0, (p.y + SEA_LEVEL) / 2, 0]} castShadow>
            <boxGeometry args={[7, p.y - SEA_LEVEL + 3, 5]} />
          </mesh>
          <mesh material={m.concreteDark} position={[0, SEA_LEVEL + 1, 0]} castShadow>
            <cylinderGeometry args={[6, 7, 4, 12]} />
          </mesh>
        </group>
      ))}

      {pylons.map((py, i) => (
        <group key={i} position={[py.x, 0, py.z]} rotation={[0, Math.atan2(py.tx, py.tz), 0]}>
          {/* two legs below deck, converging into one mast above it */}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              material={m.concrete}
              position={[s * 11, (py.deckY + SEA_LEVEL) / 2, 0]}
              rotation={[0, 0, -s * 0.14]}
              castShadow
            >
              <boxGeometry args={[6, py.deckY - SEA_LEVEL + 8, 7]} />
            </mesh>
          ))}
          <mesh material={m.concreteDark} position={[0, SEA_LEVEL + 1.5, 0]} castShadow>
            <boxGeometry args={[34, 5, 16]} />
          </mesh>
          <mesh material={m.concrete} position={[0, py.deckY + 36, 0]} castShadow receiveShadow>
            <boxGeometry args={[7.5, 72, 9]} />
          </mesh>
          <mesh material={m.concrete} position={[0, py.deckY + 5, 0]} castShadow>
            <boxGeometry args={[30, 4.5, 10]} />
          </mesh>
          <mesh material={m.concrete} position={[0, py.deckY + 73.5, 0]} castShadow>
            <boxGeometry args={[5, 4, 6]} />
          </mesh>
          <mesh material={m.lampGlow} position={[0, py.deckY + 76, 0]}>
            <sphereGeometry args={[0.7, 8, 6]} />
          </mesh>
        </group>
      ))}

      {cables.map((c, i) => {
        const mid = c.a.clone().add(c.b).multiplyScalar(0.5);
        const dir = c.b.clone().sub(c.a);
        const len = dir.length();
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.normalize()
        );
        return (
          <mesh
            key={i}
            geometry={cableGeo}
            material={m.cable}
            position={mid}
            quaternion={q}
            scale={[1, len, 1]}
          />
        );
      })}
    </group>
  );
}

/** The Worli mill-land cluster: Imperial I & II, World One and their neighbours. */
export function WorliTowers() {
  const m = materials();
  const towers = useMemo(() => {
    const rng = mulberry32(254);
    const list = [
      { x: -30, z: 0, r: 17, h: 254, round: true }, // Imperial I
      { x: 30, z: 14, r: 17, h: 254, round: true }, // Imperial II
      { x: 6, z: -110, r: 22, h: 268, round: true }, // World One
      { x: -70, z: -140, r: 15, h: 180, round: false },
      { x: 84, z: -70, r: 14, h: 160, round: false },
      { x: -110, z: 60, r: 13, h: 140, round: false },
    ];
    for (let i = 0; i < 7; i++)
      list.push({
        x: rand(rng, -180, 180),
        z: rand(rng, -200, 160),
        r: rand(rng, 10, 16),
        h: rand(rng, 90, 170),
        round: rng() < 0.4,
      });
    return list;
  }, []);
  return (
    <group>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          {t.round ? (
            <>
              <mesh material={m.glass} position={[0, t.h / 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[t.r, t.r * 1.06, t.h, 20]} />
              </mesh>
              {Array.from({ length: Math.floor(t.h / 3.4) }, (_, k) => (
                <mesh key={k} material={m.concrete} position={[0, k * 3.4 + 2, 0]}>
                  <cylinderGeometry args={[t.r + 0.5, t.r + 0.5, 0.5, 20]} />
                </mesh>
              ))}
            </>
          ) : (
            <mesh material={m.glass} position={[0, t.h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[t.r * 2, t.h, t.r * 1.7]} />
            </mesh>
          )}
          <mesh material={m.concreteDark} position={[0, t.h + 2, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.7, t.r * 0.8, 4, 12]} />
          </mesh>
          <mesh material={m.steel} position={[0, t.h + 10, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.5, 12, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
