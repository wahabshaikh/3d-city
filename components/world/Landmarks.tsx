'use client';

import { geo } from '@/lib/geo';
import { GatewayOfIndia } from './landmarks/GatewayOfIndia';
import { TajMahalPalace } from './landmarks/TajMahalPalace';
import { CSMT } from './landmarks/CSMT';
import {
  RajabaiTower,
  BombayHighCourt,
  CSMVS,
  FloraFountain,
  BMCHeadquarters,
  BombayStockExchange,
} from './landmarks/Fort';
import { MarineDrive, NarimanPoint, Wankhede, Chowpatty } from './landmarks/Waterfront';
import { HajiAli, DhobiGhat, Antilia, Siddhivinayak, SeaLink, WorliTowers } from './landmarks/Worli';
import { BandraFort, VipassanaPagoda, Elephanta, JuhuBeach, DharaviDetail } from './landmarks/North';

/**
 * Every landmark sits at its true latitude and longitude. `face` is the compass
 * bearing the building's front looks towards, in radians clockwise from south —
 * models are authored facing local +Z, so π/2 turns a façade to the east.
 */
const AT: { at: [number, number]; face: number; C: React.ComponentType }[] = [
  { at: [18.922, 72.8347], face: Math.PI / 2, C: GatewayOfIndia },
  { at: [18.9223, 72.832], face: Math.PI / 2, C: TajMahalPalace },
  { at: [18.9398, 72.8354], face: -1.27, C: CSMT },
  { at: [18.9378, 72.8324], face: Math.PI / 4, C: BMCHeadquarters },
  { at: [18.92964, 72.82999], face: Math.PI / 2, C: RajabaiTower },
  { at: [18.9302, 72.8298], face: Math.PI / 2, C: BombayHighCourt },
  { at: [18.926667, 72.832222], face: 2.36, C: CSMVS },
  { at: [18.9322, 72.8317], face: 0, C: FloraFountain },
  { at: [18.9296, 72.8331], face: 0, C: BombayStockExchange },
  { at: [18.9258, 72.8225], face: 0, C: NarimanPoint },
  { at: [18.9389, 72.8258], face: 0, C: Wankhede },
  { at: [18.9548, 72.8129], face: -0.5, C: Chowpatty },
  { at: [18.9822, 72.8092], face: Math.PI / 2, C: HajiAli },
  { at: [18.98, 72.8305], face: 0.2, C: DhobiGhat },
  { at: [18.9681, 72.8095], face: 0.3, C: Antilia },
  { at: [19.01692, 72.830409], face: Math.PI / 2, C: Siddhivinayak },
  { at: [19.0035, 72.8215], face: 0, C: WorliTowers },
  { at: [19.0425, 72.8155], face: Math.PI / 2, C: BandraFort },
  { at: [19.04, 72.854], face: 0, C: DharaviDetail },
  { at: [19.0968, 72.825], face: 0.06, C: JuhuBeach },
  { at: [19.22806, 72.80605], face: 0, C: VipassanaPagoda },
  { at: [18.9633, 72.9315], face: -2.36, C: Elephanta },
];

export function Landmarks() {
  return (
    <group>
      {AT.map(({ at, face, C }, i) => {
        const [x, z] = geo(at[0], at[1]);
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, face, 0]}>
            <C />
          </group>
        );
      })}
      {/* Linear features already live in world coordinates. */}
      <MarineDrive />
      <SeaLink />
    </group>
  );
}
