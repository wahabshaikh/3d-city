'use client';

import { useMemo } from 'react';
import { materials } from '../materials';
import { wallGeometry, Dome, Finial, Balustrade, Turret } from '../shapes';

/**
 * The Taj Mahal Palace, Apollo Bunder — opened 1903.
 *
 * Six storeys of Indo-Saracenic arcading in pale stone, corner cupolas, and the
 * ribbed red Florentine dome that fixes the skyline behind the Gateway. The
 * plain 20-storey Tower wing of 1972 stands alongside it to the north.
 */
export function TajMahalPalace() {
  const m = materials();

  const W = 80; // frontage, north-south
  const D = 38; // depth, east-west
  const FLOOR = 4.3;
  const FLOORS = 6;

  // One arcade band, reused for every floor on every visible elevation.
  const arcadeFront = useMemo(() => {
    const bays = 19;
    const holes = Array.from({ length: bays }, (_, i) => ({
      cx: -W / 2 + (W / bays) * (i + 0.5),
      w: (W / bays) * 0.62,
      spring: 2.1,
      h: 3.55,
      kind: 'round' as const,
    }));
    return wallGeometry(W, FLOOR, 1.1, holes);
  }, [W]);

  const arcadeSide = useMemo(() => {
    const bays = 9;
    const holes = Array.from({ length: bays }, (_, i) => ({
      cx: -D / 2 + (D / bays) * (i + 0.5),
      w: (D / bays) * 0.62,
      spring: 2.1,
      h: 3.55,
      kind: 'round' as const,
    }));
    return wallGeometry(D, FLOOR, 1.1, holes);
  }, [D]);

  return (
    <group>
      {/* --- Core block --- */}
      <mesh material={m.tajCream} position={[0, (FLOOR * FLOORS) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W - 3, FLOOR * FLOORS, D - 3]} />
      </mesh>

      {/* Arcaded galleries, floor by floor */}
      {Array.from({ length: FLOORS }, (_, f) => (
        <group key={f} position={[0, f * FLOOR, 0]}>
          <mesh
            geometry={arcadeFront}
            material={m.tajCream}
            position={[0, 0, D / 2 - 0.55]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={arcadeFront}
            material={m.tajCream}
            position={[0, 0, -D / 2 + 0.55]}
            rotation={[0, Math.PI, 0]}
            castShadow
          />
          <mesh
            geometry={arcadeSide}
            material={m.tajCream}
            position={[W / 2 - 0.55, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
          />
          <mesh
            geometry={arcadeSide}
            material={m.tajCream}
            position={[-W / 2 + 0.55, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
          />
          {/* Balcony slab between floors */}
          <mesh material={m.tajCream} position={[0, FLOOR - 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[W + 1.4, 0.4, D + 1.4]} />
          </mesh>
        </group>
      ))}

      {/* Main cornice */}
      <mesh material={m.tajCream} position={[0, FLOOR * FLOORS + 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 2.6, 1.2, D + 2.6]} />
      </mesh>
      <Balustrade w={W + 1} d={D + 1} h={1.5} material={m.tajCream} position={[0, FLOOR * FLOORS + 1.2, 0]} />

      {/* Red-tiled pitched roofs over the wings */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          material={m.tileRed}
          position={[s * (W / 4 + 3), FLOOR * FLOORS + 3.6, 0]}
          rotation={[0, 0, 0]}
          castShadow
        >
          <boxGeometry args={[W / 2 - 12, 4.4, D - 8]} />
        </mesh>
      ))}

      {/* --- Corner turrets with small ribbed domes --- */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <group key={`${sx}${sz}`} position={[sx * (W / 2 - 3), 0, sz * (D / 2 - 3)]}>
          <mesh material={m.tajCream} position={[0, (FLOOR * FLOORS + 7) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[11, FLOOR * FLOORS + 7, 11]} />
          </mesh>
          <mesh material={m.tajCream} position={[0, FLOOR * FLOORS + 7.6, 0]} castShadow>
            <cylinderGeometry args={[5.6, 6, 1.2, 8]} />
          </mesh>
          <Dome
            r={5.2}
            h={7.4}
            bulge={0.2}
            ribs={8}
            ribTube={0.34}
            material={m.tileRed}
            position={[0, FLOOR * FLOORS + 8.2, 0]}
          />
          <Finial h={3} r={0.5} material={m.brass} position={[0, FLOOR * FLOORS + 15.6, 0]} />
        </group>
      ))}

      {/* --- The great dome, over the centre of the front --- */}
      <group position={[0, FLOOR * FLOORS + 1.2, 0]}>
        {/* octagonal drum with arched lights */}
        <mesh material={m.tajCream} position={[0, 4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[13.5, 14.5, 8, 8]} />
        </mesh>
        <mesh material={m.tajCream} position={[0, 8.4, 0]} castShadow>
          <cylinderGeometry args={[14.4, 14.4, 0.9, 8]} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          return (
            <mesh
              key={i}
              material={m.teak}
              position={[Math.cos(a) * 13.3, 4.4, Math.sin(a) * 13.3]}
              rotation={[0, -a, 0]}
              castShadow
            >
              <boxGeometry args={[0.4, 4.6, 4.4]} />
            </mesh>
          );
        })}
        <Dome r={13.6} h={13} bulge={0.16} ribs={16} ribTube={0.5} material={m.tileRed} position={[0, 8.8, 0]} />
        {/* lantern */}
        <mesh material={m.tajCream} position={[0, 21.6, 0]} castShadow>
          <cylinderGeometry args={[2.4, 2.8, 3, 8]} />
        </mesh>
        <Dome r={2.5} h={2.4} bulge={0.2} material={m.tileRed} position={[0, 24.6, 0]} />
        <Finial h={4} r={0.55} material={m.brass} position={[0, 27, 0]} />
      </group>

      {/* Porte-cochère on the harbour front */}
      <group position={[0, 0, D / 2 + 4]}>
        <mesh material={m.tajCream} position={[0, 4.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[24, 8.8, 9]} />
        </mesh>
        <Balustrade w={23} d={8} h={1.2} material={m.tajCream} position={[0, 8.8, 0]} />
      </group>

      {/* --- The Tower wing, 1972 --- */}
      <group position={[W / 2 + 26, 0, -4]}>
        <mesh material={m.tajCream} position={[0, 39, 0]} castShadow receiveShadow>
          <boxGeometry args={[34, 78, 24]} />
        </mesh>
        {/* recessed balcony bands so the slab reads as floors, not a monolith */}
        {Array.from({ length: 20 }, (_, i) => (
          <mesh key={i} material={m.concreteDark} position={[0, 3.4 + i * 3.9, 12.2]} castShadow>
            <boxGeometry args={[33, 0.7, 0.9]} />
          </mesh>
        ))}
        <mesh material={m.concrete} position={[0, 78.8, 0]} castShadow>
          <boxGeometry args={[35, 1.6, 25]} />
        </mesh>
        <Turret r={2} h={5} sides={4} cap="none" material={m.concrete} position={[10, 79.6, 0]} />
      </group>
    </group>
  );
}
