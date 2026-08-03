'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { materials } from '../materials';
import { wallGeometry, Dome, Turret, Gable, Finial, Chhatri, Balustrade, HipRoof } from '../shapes';

const arcadeRow = (width: number, bays: number, h: number, kind: 'pointed' | 'round' | 'ogee') =>
  wallGeometry(
    width,
    h,
    1.2,
    Array.from({ length: bays }, (_, i) => ({
      cx: -width / 2 + (width / bays) * (i + 0.5),
      w: (width / bays) * 0.58,
      spring: h * 0.34,
      h: h * 0.84,
      kind,
    }))
  );

/**
 * Rajabai Clock Tower — Sir George Gilbert Scott, 1878. 85 m of buff Kurla
 * stone modelled on Big Ben: square to the gallery at 21 m, then octagonal,
 * then spire. The University Library hall runs off its north side.
 */
export function RajabaiTower() {
  const m = materials();
  const geos = useMemo(
    () => ({
      porch: wallGeometry(15, 9, 15, [
        { cx: 0, w: 6.5, spring: 4, h: 8.4, kind: 'pointed' as const },
      ]),
      shaft: arcadeRow(11.5, 2, 12, 'pointed'),
      libFront: arcadeRow(46, 11, 8, 'pointed'),
      libUpper: arcadeRow(46, 11, 7.5, 'pointed'),
    }),
    []
  );
  const slateLib = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x474b50, roughness: 0.85 }),
    []
  );

  return (
    <group>
      {/* carriage porch */}
      <mesh geometry={geos.porch} material={m.kurla} castShadow receiveShadow />
      <mesh geometry={geos.porch} material={m.kurla} rotation={[0, Math.PI / 2, 0]} castShadow />
      <mesh material={m.kurla} position={[0, 9.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[16.5, 1.4, 16.5]} />
      </mesh>

      {/* square stage to the first gallery at 21 m */}
      <mesh material={m.kurla} position={[0, 15.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.5, 10.4, 11.5]} />
      </mesh>
      {[0, Math.PI / 2].map((r, i) => (
        <mesh
          key={i}
          geometry={geos.shaft}
          material={m.kurla}
          position={[0, 10.4, 0]}
          rotation={[0, r, 0]}
          castShadow
        />
      ))}
      {/* corner buttresses */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} material={m.kurla} position={[sx * 5.9, 12, sz * 5.9]} castShadow>
          <boxGeometry args={[2.2, 22, 2.2]} />
        </mesh>
      ))}

      {/* gallery + pinnacles */}
      <mesh material={m.kurla} position={[0, 21.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[14.4, 1.6, 14.4]} />
      </mesh>
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <group key={`p${sx}${sz}`} position={[sx * 6.4, 22.2, sz * 6.4]}>
          <mesh material={m.kurla} position={[0, 2.4, 0]} castShadow>
            <cylinderGeometry args={[0.85, 1.05, 4.8, 8]} />
          </mesh>
          <mesh material={m.kurla} position={[0, 7.2, 0]} castShadow>
            <coneGeometry args={[1.0, 5.2, 8]} />
          </mesh>
        </group>
      ))}

      {/* octagonal clock stage */}
      <mesh material={m.kurla} position={[0, 33.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[5.2, 5.8, 22.6, 8]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2;
        return (
          <group key={i} position={[Math.sin(a) * 5.2, 38, Math.cos(a) * 5.2]} rotation={[0, a, 0]}>
            <mesh material={m.limestone} castShadow>
              <cylinderGeometry args={[3.1, 3.1, 0.6, 26]} />
            </mesh>
            <mesh material={m.limestone} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.3]}>
              <cylinderGeometry args={[2.8, 2.8, 0.2, 26]} />
            </mesh>
            <mesh material={m.darkGrey} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.42]}>
              <cylinderGeometry args={[2.5, 2.5, 0.06, 26]} />
            </mesh>
            <mesh material={m.limestone} rotation={[Math.PI / 2, 0.9, 0]} position={[0, 0, 0.5]}>
              <boxGeometry args={[0.22, 0.1, 1.9]} />
            </mesh>
            <mesh material={m.limestone} rotation={[Math.PI / 2, 2.6, 0]} position={[0, 0, 0.5]}>
              <boxGeometry args={[0.2, 0.1, 1.3]} />
            </mesh>
          </group>
        );
      })}

      {/* upper octagon and spire to 85 m */}
      <mesh material={m.kurla} position={[0, 45.6, 0]} castShadow>
        <cylinderGeometry args={[6.2, 6.2, 1.4, 8]} />
      </mesh>
      <mesh material={m.kurla} position={[0, 51.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.3, 4.9, 11, 8]} />
      </mesh>
      <mesh material={m.kurla} position={[0, 57.4, 0]} castShadow>
        <cylinderGeometry args={[5.4, 5.4, 1.2, 8]} />
      </mesh>
      <mesh material={m.kurla} position={[0, 69.5, 0]} castShadow>
        <coneGeometry args={[4.4, 23.5, 8]} />
      </mesh>
      <Finial h={4} r={0.6} material={m.kurla} position={[0, 81.2, 0]} />

      {/* --- University Library & Convocation Hall, to the north --- */}
      <group position={[31, 0, 2]}>
        <mesh material={m.kurla} position={[0, 11, 0]} castShadow receiveShadow>
          <boxGeometry args={[46, 22, 20]} />
        </mesh>
        <mesh geometry={geos.libFront} material={m.kurla} position={[0, 0, 10.4]} castShadow />
        <mesh geometry={geos.libUpper} material={m.kurla} position={[0, 9, 10.4]} castShadow />
        <mesh material={m.redStone} position={[0, 22.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[48, 1.6, 22]} />
        </mesh>
        {/* steep roof and dormers */}
        <HipRoof w={46} d={20} h={8} inset={7} material={slateLib} position={[0, 23.4, 0]} />
        {[-15, 0, 15].map((x) => (
          <group key={x} position={[x, 23.4, 8]}>
            <Gable w={9} h={8} d={5} material={m.kurla} />
          </group>
        ))}
        <Turret r={2.6} h={30} sides={8} cap="spire" material={m.kurla} position={[22, 0, 9]} />
      </group>
    </group>
  );
}

/**
 * Bombay High Court — James Augustus Fuller, 1878. Early English Gothic in
 * blue basalt: 171 m long, a central tower carrying Justice and Mercy, and an
 * octagonal turret at each end.
 */
export function BombayHighCourt() {
  const m = materials();
  const geos = useMemo(
    () => ({
      front: arcadeRow(104, 22, 8.5, 'pointed'),
      side: arcadeRow(38, 8, 8.5, 'pointed'),
    }),
    []
  );
  const slate = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x474b50, roughness: 0.85 }),
    []
  );
  return (
    <group>
      <mesh material={m.blueStone} position={[0, 13, 0]} castShadow receiveShadow>
        <boxGeometry args={[104, 26, 38]} />
      </mesh>
      {[0, 8.7, 17.4].map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          <mesh geometry={geos.front} material={m.blueStone} position={[0, 0, 19.4]} castShadow />
          <mesh
            geometry={geos.front}
            material={m.blueStone}
            position={[0, 0, -19.4]}
            rotation={[0, Math.PI, 0]}
            castShadow
          />
          <mesh
            geometry={geos.side}
            material={m.blueStone}
            position={[52.4, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
          />
          <mesh
            geometry={geos.side}
            material={m.blueStone}
            position={[-52.4, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
          />
        </group>
      ))}
      <mesh material={m.limestone} position={[0, 26.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[106, 1.6, 40]} />
      </mesh>
      <HipRoof w={104} d={38} h={9} inset={13} material={slate} position={[0, 27.6, 0]} />

      {/* central tower with Justice and Mercy */}
      <group position={[0, 0, 6]}>
        <mesh material={m.blueStone} position={[0, 23, 0]} castShadow receiveShadow>
          <boxGeometry args={[22, 46, 26]} />
        </mesh>
        <mesh material={m.limestone} position={[0, 46.6, 0]} castShadow>
          <boxGeometry args={[24, 1.6, 28]} />
        </mesh>
        <mesh material={m.darkGrey} position={[0, 51, 0]} castShadow>
          <coneGeometry args={[14, 8, 4]} />
        </mesh>
        <Finial h={4} r={0.6} material={m.limestone} position={[0, 54.6, 0]} />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 7.5, 47.4, 12]}>
            <mesh material={m.limestone} position={[0, 1.4, 0]} castShadow>
              <cylinderGeometry args={[0.5, 0.9, 2.8, 10]} />
            </mesh>
            <mesh material={m.limestone} position={[0, 3.1, 0]} castShadow>
              <sphereGeometry args={[0.4, 10, 8]} />
            </mesh>
          </group>
        ))}
      </group>

      {[-1, 1].map((s) => (
        <Turret
          key={s}
          r={5}
          h={34}
          sides={8}
          cap="spire"
          material={m.blueStone}
          position={[s * 50, 0, 14]}
        />
      ))}
    </group>
  );
}

/**
 * Chhatrapati Shivaji Maharaj Vastu Sangrahalaya — George Wittet, 1922.
 * Indo-Saracenic: a tiled dome on a high drum with a ring of chhatris, over
 * symmetrical arcaded wings, in a garden of palms.
 */
export function CSMVS() {
  const m = materials();
  const geos = useMemo(
    () => ({
      front: arcadeRow(86, 15, 8, 'ogee'),
      side: arcadeRow(48, 8, 8, 'ogee'),
    }),
    []
  );
  return (
    <group>
      <mesh material={m.kurla} position={[0, 1, 0]} receiveShadow castShadow>
        <boxGeometry args={[96, 2, 58]} />
      </mesh>
      <mesh material={m.kurla} position={[0, 10, 0]} castShadow receiveShadow>
        <boxGeometry args={[86, 16, 48]} />
      </mesh>
      {[2, 10].map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          <mesh geometry={geos.front} material={m.kurla} position={[0, 0, 24.4]} castShadow />
          <mesh
            geometry={geos.front}
            material={m.kurla}
            position={[0, 0, -24.4]}
            rotation={[0, Math.PI, 0]}
            castShadow
          />
          <mesh
            geometry={geos.side}
            material={m.kurla}
            position={[43.4, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
          />
          <mesh
            geometry={geos.side}
            material={m.kurla}
            position={[-43.4, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
          />
        </group>
      ))}
      <mesh material={m.blueStone} position={[0, 18.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[88, 1.4, 50]} />
      </mesh>
      <Balustrade w={86} d={48} h={1.4} material={m.kurla} position={[0, 19.3, 0]} />

      {/* corner chhatris */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <Chhatri
          key={`${sx}${sz}`}
          r={3.2}
          colH={4}
          domeH={2.6}
          material={m.kurla}
          position={[sx * 39, 19.3, sz * 20]}
        />
      ))}

      {/* central drum and dome */}
      <group position={[0, 19.3, 0]}>
        <mesh material={m.kurla} position={[0, 5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[13, 14, 10, 24]} />
        </mesh>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <mesh
              key={i}
              material={m.kurla}
              position={[Math.cos(a) * 13.2, 5, Math.sin(a) * 13.2]}
              rotation={[0, -a, 0]}
              castShadow
            >
              <boxGeometry args={[0.5, 9, 1.4]} />
            </mesh>
          );
        })}
        <mesh material={m.blueStone} position={[0, 10.4, 0]} castShadow>
          <cylinderGeometry args={[14.4, 14.4, 1, 24]} />
        </mesh>
        <Dome r={13.4} h={12.5} bulge={0.22} ribs={20} ribTube={0.36} material={m.marble} position={[0, 10.8, 0]} />
        <Finial h={5} r={0.8} material={m.brass} position={[0, 23.3, 0]} />
        {/* petal collar at the dome's base, as at Bijapur */}
        {Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * Math.PI * 2;
          return (
            <mesh
              key={`pt${i}`}
              material={m.marble}
              position={[Math.cos(a) * 13.6, 11.4, Math.sin(a) * 13.6]}
              rotation={[0.5, -a, 0]}
              castShadow
            >
              <coneGeometry args={[1.5, 3.4, 6]} />
            </mesh>
          );
        })}
      </group>

      {/* entrance portico */}
      <group position={[0, 2, 26]}>
        <mesh material={m.kurla} position={[0, 7, 0]} castShadow receiveShadow>
          <boxGeometry args={[24, 14, 8]} />
        </mesh>
        <Chhatri r={2.6} colH={3.2} domeH={2.2} material={m.kurla} position={[0, 14, 0]} />
      </group>
    </group>
  );
}

/**
 * Flora Fountain / Hutatma Chowk — 1864. Portland stone: an octagonal basin,
 * four figures at the corners of the pedestal, and Flora on top.
 */
export function FloraFountain() {
  const m = materials();
  return (
    <group>
      <mesh material={m.limestone} position={[0, 0.5, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[9, 9.6, 1, 8]} />
      </mesh>
      <mesh material={m.marbleGreen} position={[0, 1.05, 0]}>
        <cylinderGeometry args={[8.2, 8.2, 0.3, 8]} />
      </mesh>
      <mesh material={m.limestone} position={[0, 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.4, 5.2, 2, 8]} />
      </mesh>
      {/* four seated figures */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <group key={i} position={[Math.cos(a) * 4, 3, Math.sin(a) * 4]}>
            <mesh material={m.limestone} position={[0, 0.9, 0]} castShadow>
              <cylinderGeometry args={[0.45, 0.75, 1.8, 10]} />
            </mesh>
            <mesh material={m.limestone} position={[0, 2, 0]} castShadow>
              <sphereGeometry args={[0.32, 10, 8]} />
            </mesh>
          </group>
        );
      })}
      <mesh material={m.limestone} position={[0, 4.6, 0]} castShadow>
        <cylinderGeometry args={[2.4, 3.2, 3.2, 8]} />
      </mesh>
      <mesh material={m.limestone} position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[1.6, 2.2, 1.6, 8]} />
      </mesh>
      <mesh material={m.limestone} position={[0, 9.4, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.5, 3.2, 10]} />
      </mesh>
      {/* Flora */}
      <group position={[0, 11, 0]}>
        <mesh material={m.limestone} position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.95, 2.8, 12]} />
        </mesh>
        <mesh material={m.limestone} position={[0, 3.05, 0]} castShadow>
          <sphereGeometry args={[0.38, 12, 10]} />
        </mesh>
        <mesh material={m.limestone} position={[0.55, 2.5, 0]} rotation={[0, 0, -0.9]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 1.6, 8]} />
        </mesh>
      </group>
      {/* martyrs' memorial flame beside it */}
      <group position={[14, 0, 0]}>
        <mesh material={m.darkGrey} position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[1.6, 2, 2.4, 8]} />
        </mesh>
        <mesh material={m.brass} position={[0, 3, 0]} castShadow>
          <coneGeometry args={[0.7, 1.8, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * BMC Headquarters — F. W. Stevens, 1893. Stevens' second Gothic pile, on the
 * wedge site across the road from his railway terminus, with a 78 m tower.
 */
export function BMCHeadquarters() {
  const m = materials();
  const geos = useMemo(
    () => ({
      front: arcadeRow(44, 10, 7.5, 'pointed'),
    }),
    []
  );
  const slate = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x4a4a4e, roughness: 0.85 }),
    []
  );
  return (
    <group>
      {/* two wings meeting at a point, as the wedge site demands */}
      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, s * 0.32, 0]} position={[0, 0, -14]}>
          <mesh material={m.kurla} position={[s * 21, 11, -17]} castShadow receiveShadow>
            <boxGeometry args={[44, 22, 22]} />
          </mesh>
          <mesh
            geometry={geos.front}
            material={m.kurla}
            position={[s * 21, 0, -5.6]}
            castShadow
          />
          <mesh
            geometry={geos.front}
            material={m.kurla}
            position={[s * 21, 8, -5.6]}
            castShadow
          />
          <mesh material={m.redStone} position={[s * 21, 22.6, -17]} castShadow>
            <boxGeometry args={[46, 1.4, 24]} />
          </mesh>
          <HipRoof
            w={45}
            d={22}
            h={7.5}
            inset={8}
            material={slate}
            position={[s * 21, 23.3, -17]}
          />
          <Turret r={3.2} h={30} sides={8} cap="spire" material={m.kurla} position={[s * 42, 0, -6]} />
        </group>
      ))}

      {/* the tower on the prow */}
      <mesh material={m.kurla} position={[0, 24, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 48, 24]} />
      </mesh>
      <mesh material={m.redStone} position={[0, 48.8, 0]} castShadow>
        <boxGeometry args={[26, 1.6, 26]} />
      </mesh>
      <mesh material={m.kurla} position={[0, 55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[9.5, 10.5, 11, 8]} />
      </mesh>
      <Dome r={10} h={9} bulge={0.14} ribs={12} ribTube={0.36} material={m.kurla} position={[0, 60.5, 0]} />
      <mesh material={m.kurla} position={[0, 70.5, 0]} castShadow>
        <coneGeometry args={[2.6, 6, 8]} />
      </mesh>
      <Finial h={3} r={0.5} material={m.brass} position={[0, 74, 0]} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 9, 30, 12.5]}>
          <Gable w={11} h={9} d={2} material={m.kurla} />
        </group>
      ))}
    </group>
  );
}

/** Phiroze Jeejeebhoy Towers, Dalal Street — the Bombay Stock Exchange, 1980. */
export function BombayStockExchange() {
  const m = materials();
  return (
    <group>
      <mesh material={m.concrete} position={[0, 6, 0]} castShadow receiveShadow>
        <boxGeometry args={[38, 12, 34]} />
      </mesh>
      <mesh material={m.concrete} position={[0, 52, 0]} castShadow receiveShadow>
        <boxGeometry args={[28, 92, 26]} />
      </mesh>
      {/* vertical fins */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} material={m.concreteDark} position={[-12.6 + i * 3.15, 52, 13.3]} castShadow>
          <boxGeometry args={[1.1, 90, 1.2]} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`s${i}`} material={m.concreteDark} position={[14.3, 52, -11.4 + i * 3.25]} castShadow>
          <boxGeometry args={[1.2, 90, 1.1]} />
        </mesh>
      ))}
      <mesh material={m.glassDark} position={[0, 52, 12.6]}>
        <boxGeometry args={[26, 88, 0.4]} />
      </mesh>
      <mesh material={m.concrete} position={[0, 99, 0]} castShadow>
        <boxGeometry args={[30, 4, 28]} />
      </mesh>
      <mesh material={m.steel} position={[8, 106, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 12, 8]} />
      </mesh>
    </group>
  );
}
