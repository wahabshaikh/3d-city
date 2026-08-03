'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { materials } from '../materials';
import { wallGeometry, Dome, Turret, Gable, Finial, HipRoof } from '../shapes';

/**
 * Chhatrapati Shivaji Maharaj Terminus — F. W. Stevens, 1878–1888.
 *
 * Victorian Gothic Revival with Mughal detail. The octagonal ribbed dome tops
 * out at 48.8 m and carries the 4.3 m allegorical figure of Progress, torch in
 * her right hand and spoked wheel in her left. Corner turrets anchor each wing,
 * steep gables run the front, and the whole thing is banded buff and red stone.
 */

function LadyOfProgress({ material }: { material: THREE.Material }) {
  return (
    <group>
      {/* robed figure */}
      <mesh material={material} position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.86, 2.7, 12]} />
      </mesh>
      <mesh material={material} position={[0, 2.95, 0]} castShadow>
        <sphereGeometry args={[0.36, 12, 10]} />
      </mesh>
      {/* right arm raised with the torch */}
      <mesh material={material} position={[0.5, 3.0, 0]} rotation={[0, 0, -0.75]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 1.9, 8]} />
      </mesh>
      <mesh material={material} position={[1.06, 3.95, 0]} castShadow>
        <coneGeometry args={[0.3, 0.8, 8]} />
      </mesh>
      {/* left arm with the spoked wheel */}
      <mesh material={material} position={[-0.6, 1.9, 0]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.5, 8]} />
      </mesh>
      <mesh material={material} position={[-1.1, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.62, 0.09, 6, 20]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          material={material}
          position={[-1.1, 1.35, 0]}
          rotation={[0, 0, (i * Math.PI) / 6]}
          castShadow
        >
          <boxGeometry args={[1.24, 0.08, 0.08]} />
        </mesh>
      ))}
    </group>
  );
}

/** The lion and tiger on the entrance gate piers. */
function GateBeast({ material, tiger }: { material: THREE.Material; tiger?: boolean }) {
  return (
    <group scale={tiger ? 1.05 : 1}>
      <mesh material={material} position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.9, 0.8, 2.3]} />
      </mesh>
      <mesh material={material} position={[0, 1.35, 1.25]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.8]} />
      </mesh>
      {!tiger && (
        <mesh material={material} position={[0, 1.4, 1.05]} castShadow>
          <sphereGeometry args={[0.62, 12, 10]} />
        </mesh>
      )}
      {[
        [-0.32, 0.9],
        [0.32, 0.9],
        [-0.32, -0.85],
        [0.32, -0.85],
      ].map(([x, z], i) => (
        <mesh key={i} material={material} position={[x, 0.32, z]} castShadow>
          <boxGeometry args={[0.24, 0.68, 0.26]} />
        </mesh>
      ))}
      <mesh material={material} position={[0, 1.15, -1.3]} rotation={[0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 1.2, 6]} />
      </mesh>
    </group>
  );
}

export function CSMT() {
  const m = materials();

  const W = 94; // frontage
  const D = 30; // depth of the office block
  const BAND = 7.2;

  const slate = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x4a4a4e, roughness: 0.85 }),
    []
  );
  const shed = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x6b6f72,
        roughness: 0.6,
        metalness: 0.3,
        side: THREE.DoubleSide,
      }),
    []
  );

  const { frontRow, sideRow, centreRow, centreSide, porte } = useMemo(() => {
    const pointedRow = (width: number, bays: number) =>
      wallGeometry(
        width,
        BAND,
        1.3,
        Array.from({ length: bays }, (_, i) => ({
          cx: -width / 2 + (width / bays) * (i + 0.5),
          w: (width / bays) * 0.56,
          spring: BAND * 0.34,
          h: BAND * 0.82,
          kind: 'pointed' as const,
        }))
      );
    return {
      frontRow: pointedRow(W, 24),
      sideRow: pointedRow(D, 7),
      centreRow: pointedRow(38, 7),
      centreSide: pointedRow(D + 6, 8),
      porte: wallGeometry(26, 12, 10, [{ cx: 0, w: 12, spring: 5.5, h: 11, kind: 'pointed' }]),
    };
  }, [W, D, BAND]);

  return (
    <group>
      {/* --- Main range --- */}
      <mesh material={m.kurla} position={[0, (BAND * 3) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W - 2, BAND * 3, D - 2]} />
      </mesh>

      {Array.from({ length: 3 }, (_, f) => (
        <group key={f} position={[0, f * BAND, 0]}>
          <mesh geometry={frontRow} material={m.kurla} position={[0, 0, D / 2 - 0.65]} castShadow receiveShadow />
          <mesh
            geometry={frontRow}
            material={m.kurla}
            position={[0, 0, -D / 2 + 0.65]}
            rotation={[0, Math.PI, 0]}
            castShadow
          />
          <mesh
            geometry={sideRow}
            material={m.kurla}
            position={[W / 2 - 0.65, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
          />
          <mesh
            geometry={sideRow}
            material={m.kurla}
            position={[-W / 2 + 0.65, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
          />
          {/* red sandstone string course between storeys */}
          <mesh material={m.redStone} position={[0, BAND - 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[W + 1.6, 0.9, D + 1.6]} />
          </mesh>
        </group>
      ))}

      {/* Steep slate roof and dormer gables along the front */}
      <mesh material={m.redStone} position={[0, BAND * 3 + 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 2.4, 2, D + 2.4]} />
      </mesh>
      <HipRoof
        w={W - 1}
        d={D - 4}
        h={9}
        inset={14}
        material={slate}
        position={[0, BAND * 3 + 2, 0]}
      />
      {[-39, -30, -21, 21, 30, 39].map((x) => (
        <group key={x} position={[x, BAND * 3 + 2, D / 2 - 3]}>
          <Gable w={9.5} h={9} d={9} material={m.kurla} />
          <Finial h={2.4} r={0.36} material={m.kurla} position={[0, 9, 0]} />
        </group>
      ))}

      {/* --- Corner and intermediate turrets --- */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Turret
            r={4.4}
            h={BAND * 3 + 4}
            sides={8}
            cap="spire"
            material={m.kurla}
            position={[s * (W / 2 - 1), 0, D / 2 - 2]}
          />
          <Turret
            r={4.4}
            h={BAND * 3 + 2}
            sides={8}
            cap="spire"
            material={m.kurla}
            position={[s * (W / 2 - 1), 0, -D / 2 + 2]}
          />
          <Turret
            r={3.2}
            h={BAND * 3 + 6}
            sides={8}
            cap="spire"
            material={m.kurla}
            position={[s * 24, 0, D / 2 + 1]}
          />
        </group>
      ))}

      {/* --- Central pavilion, gable, clock and dome --- */}
      <group position={[0, 0, 3]}>
        <mesh material={m.kurla} position={[0, 15, 0]} castShadow receiveShadow>
          <boxGeometry args={[38, 30, D + 6]} />
        </mesh>
        {Array.from({ length: 4 }, (_, f) => (
          <group key={f} position={[0, f * BAND, 0]}>
            <mesh
              geometry={centreRow}
              material={m.kurla}
              position={[0, 0, (D + 6) / 2 - 0.65]}
              castShadow
            />
            <mesh
              geometry={centreSide}
              material={m.kurla}
              position={[19 - 0.65, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              castShadow
            />
            <mesh
              geometry={centreSide}
              material={m.kurla}
              position={[-19 + 0.65, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              castShadow
            />
            <mesh material={m.redStone} position={[0, BAND - 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[39.4, 1, D + 7.4]} />
            </mesh>
          </group>
        ))}
        <mesh material={m.redStone} position={[0, 30.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[41, 1.8, D + 9]} />
        </mesh>

        {/* front gable with the clock */}
        <group position={[0, 22, (D + 6) / 2]}>
          <Gable w={26} h={15} d={2.4} material={m.kurla} roundel={false} />
          <mesh material={m.limestone} position={[0, 6.2, 1.5]} castShadow>
            <cylinderGeometry args={[3.5, 3.5, 0.7, 28]} />
          </mesh>
          <mesh material={m.darkGrey} position={[0, 6.2, 1.92]}>
            <cylinderGeometry args={[3.0, 3.0, 0.1, 28]} />
          </mesh>
          <mesh material={m.limestone} position={[0, 7.3, 2.0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.3, 2.2, 0.12]} />
          </mesh>
          <mesh material={m.limestone} position={[0.8, 6.2, 2.0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.24, 1.6, 0.12]} />
          </mesh>
        </group>

        {/* porte-cochère */}
        <group position={[0, 0, (D + 6) / 2 + 5]}>
          <mesh geometry={porte} material={m.kurla} castShadow receiveShadow />
          <mesh material={m.redStone} position={[0, 12.6, 0]} castShadow>
            <boxGeometry args={[28, 1.4, 11]} />
          </mesh>
        </group>

        {/* --- The dome: octagonal drum, ribbed cap, apex at 48.8 m --- */}
        <mesh material={m.redStone} position={[0, 32.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[13.6, 14.4, 1.4, 8]} />
        </mesh>
        {/* pinnacles at the corners of the dome's square base */}
        {[
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ].map(([sx, sz]) => (
          <group key={`${sx}${sz}`} position={[sx * 12.4, 32.9, sz * 12.4]}>
            <mesh material={m.kurla} position={[0, 2.2, 0]} castShadow>
              <cylinderGeometry args={[0.85, 1.1, 4.4, 8]} />
            </mesh>
            <mesh material={m.kurla} position={[0, 6.6, 0]} castShadow>
              <coneGeometry args={[1.05, 5, 8]} />
            </mesh>
          </group>
        ))}
        <mesh material={m.kurla} position={[0, 35.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[11.2, 12.2, 5.2, 8]} />
        </mesh>
        {/* tall lancets round the drum */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          return (
            <mesh
              key={i}
              material={m.darkGrey}
              position={[Math.cos(a) * 11.2, 35.4, Math.sin(a) * 11.2]}
              rotation={[0, -a, 0]}
              castShadow
            >
              <boxGeometry args={[0.4, 3.6, 3.8]} />
            </mesh>
          );
        })}
        <mesh material={m.redStone} position={[0, 38.2, 0]} castShadow>
          <cylinderGeometry args={[12.2, 12.2, 1, 8]} />
        </mesh>
        <Dome r={11.4} h={9.4} bulge={0.14} ribs={16} ribTube={0.5} material={m.kurla} position={[0, 38.6, 0]} />
        {/* lantern the figure stands on */}
        <mesh material={m.kurla} position={[0, 48.4, 0]} castShadow>
          <cylinderGeometry args={[2.0, 2.8, 2, 8]} />
        </mesh>
        <mesh material={m.redStone} position={[0, 49.5, 0]} castShadow>
          <cylinderGeometry args={[2.6, 2.6, 0.5, 8]} />
        </mesh>
        <group position={[0, 49.7, 0]} scale={1.15}>
          <LadyOfProgress material={m.limestone} />
        </group>
      </group>

      {/* --- Entrance gates with the lion and the tiger --- */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 17, 0, D / 2 + 26]}>
          <mesh material={m.kurla} position={[0, 3, 0]} castShadow receiveShadow>
            <boxGeometry args={[3, 6, 3]} />
          </mesh>
          <mesh material={m.redStone} position={[0, 6.3, 0]} castShadow>
            <boxGeometry args={[3.6, 0.6, 3.6]} />
          </mesh>
          <group position={[0, 6.6, 0]} rotation={[0, s > 0 ? 0.2 : -0.2, 0]}>
            <GateBeast material={m.limestone} tiger={s > 0} />
          </group>
        </group>
      ))}
      <mesh material={m.darkGrey} position={[0, 1.6, D / 2 + 26]} castShadow>
        <boxGeometry args={[31, 3.2, 0.4]} />
      </mesh>

      {/* --- Train shed: 18 platforms under an arched roof --- */}
      <group position={[0, 0, -D / 2 - 62]}>
        <mesh material={m.concrete} position={[0, 0.6, 0]} receiveShadow>
          <boxGeometry args={[128, 1.2, 124]} />
        </mesh>
        {/* four arched train sheds, ribbed like the originals */}
        {Array.from({ length: 4 }, (_, i) => (
          <group key={i} position={[-42 + i * 28, 0, 0]}>
            <mesh material={shed} position={[0, 11, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[13.5, 13.5, 118, 18, 1, true, 0, Math.PI]} />
            </mesh>
            {Array.from({ length: 13 }, (_, k) => (
              <mesh
                key={k}
                material={m.darkGrey}
                position={[0, 11, -56 + k * 9.4]}
                rotation={[0, 0, 0]}
                castShadow
              >
                <torusGeometry args={[13.8, 0.32, 5, 18, Math.PI]} />
              </mesh>
            ))}
            <mesh material={m.darkGrey} position={[0, 5.5, 0]} castShadow>
              <boxGeometry args={[27.4, 11, 0.6]} />
            </mesh>
          </group>
        ))}
        {/* platform edges */}
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={`p${i}`} material={m.concreteDark} position={[-56 + i * 14, 1.6, 0]} receiveShadow>
            <boxGeometry args={[7, 0.8, 120]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
