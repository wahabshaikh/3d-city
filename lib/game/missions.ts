import { geo } from '../geo';
import { openGroundNear } from '../mumbai/physics';

/**
 * The jobs.
 *
 * A mission is a giver you walk into and a list of places you then have to
 * be, in order, sometimes against a clock. That is the whole shape of it —
 * everything else is where the places are and what the man says.
 */

export type Stage = {
  /** The line under the radar while this stage is live. */
  text: string;
  /** [lat, lon] of where to get to. */
  at: [number, number];
  /** How close counts, in world metres. */
  radius?: number;
  /** Must arrive in something with wheels. */
  driving?: boolean;
  /** Must arrive on foot. */
  walking?: boolean;
};

export type Mission = {
  id: string;
  name: string;
  /** Who gives it out and where they stand. */
  giver: string;
  at: [number, number];
  /** What they say when you take it. */
  brief: string;
  reward: number;
  /** Whole-mission clock, in seconds. Omit for untimed. */
  seconds?: number;
  stages: Stage[];
};

export const MISSIONS: Mission[] = [
  {
    id: 'tiffin',
    name: 'The Tiffin Run',
    giver: 'Ganesh, dabbawala',
    at: [18.9352, 72.8272], // Churchgate station forecourt
    brief:
      'Two hundred thousand lunches a day and not one of them late. The 12:30 crates are still on the platform and my man has broken his cycle. Take them: Flora Fountain, the High Court, then the Fort. Before the offices break.',
    reward: 2500,
    seconds: 210,
    stages: [
      { text: 'Drop the first crate at Flora Fountain', at: [18.9322, 72.8317], radius: 14 },
      { text: 'Second crate to the Bombay High Court', at: [18.9303, 72.8309], radius: 18 },
      { text: 'Last crate to the Stock Exchange', at: [18.9293, 72.8322], radius: 16 },
      { text: 'Back to Ganesh at Churchgate', at: [18.9352, 72.8272], radius: 14 },
    ],
  },
  {
    id: 'kaali-peeli',
    name: 'Kaali-Peeli',
    giver: 'Iqbal, taxi union',
    at: [18.9223, 72.8332], // Apollo Bunder, by the Taj
    brief:
      "My cousin's taxi is on the kerb and my cousin is not. There's a fare waiting outside the Regal and another after that. Take the Padmini, keep the meter running, and bring the day's takings back to me.",
    reward: 3200,
    seconds: 240,
    stages: [
      { text: 'Pick the fare up outside the Regal, Colaba', at: [18.9215, 72.8318], radius: 13 },
      { text: 'Marine Drive, and do not take the long way', at: [18.937, 72.8189], radius: 18 },
      { text: 'Second fare at Churchgate', at: [18.9352, 72.8272], radius: 14 },
      { text: 'Back to Iqbal at Apollo Bunder', at: [18.9223, 72.8332], radius: 15 },
    ],
  },
  {
    id: 'ballard',
    name: 'The Collection',
    giver: 'Farid, Ballard Estate',
    at: [18.945, 72.842],
    brief:
      'Three shopfronts owe on the month and none of them will come to me. Go round them, then bring it here. Nobody needs hurting — the sight of a car outside is generally enough.',
    reward: 4000,
    seconds: 260,
    stages: [
      { text: 'First stop, the Fort', at: [18.9318, 72.8327], radius: 17 },
      { text: 'Second stop, by CSMT', at: [18.9389, 72.8369], radius: 18 },
      { text: 'Third stop, Masjid Bunder', at: [18.949, 72.8368], radius: 18 },
      { text: 'Take it back to Farid in Ballard Estate', at: [18.945, 72.842], radius: 15 },
    ],
  },
  {
    id: 'chowpatty',
    name: 'Last Ferry',
    giver: 'Sunita, Gateway jetty',
    at: [18.921, 72.8345],
    brief:
      'The last boat off Elephanta got in an hour late and half my crew are stranded the length of the island city. Sweep them up — Nariman Point, the Oval, Marine Drive — and get them back here before the tide.',
    reward: 3600,
    seconds: 230,
    stages: [
      { text: 'Nariman Point', at: [18.9262, 72.8232], radius: 18 },
      { text: 'The Oval Maidan', at: [18.9295, 72.8288], radius: 20 },
      { text: 'Girgaum Chowpatty', at: [18.9548, 72.8129], radius: 22 },
      { text: 'Back to the Gateway jetty', at: [18.921, 72.8345], radius: 16 },
    ],
  },
];

export type MissionW = Mission & {
  world: [number, number];
  stagesW: (Stage & { world: [number, number] })[];
};

/**
 * Snapped to open ground, and worked out on first use rather than at import —
 * it needs the collider grid, which needs the whole city built.
 *
 * A coordinate taken off a map lands inside a building often enough that
 * placing a marker on the raw latitude and longitude would leave half of them
 * unreachable. The snap moves each one to the nearest spot you could stand in.
 */
let cached: MissionW[] | null = null;

export function missionsW(): MissionW[] {
  if (cached) return cached;
  cached = MISSIONS.map((m) => ({
    ...m,
    world: openGroundNear(...(geo(m.at[0], m.at[1]) as [number, number]), 1.4),
    stagesW: m.stages.map((s) => ({
      ...s,
      world: openGroundNear(...(geo(s.at[0], s.at[1]) as [number, number]), 1.4),
    })),
  }));
  return cached;
}

/** Missions already passed, for the session. */
export const passed = new Set<string>();
