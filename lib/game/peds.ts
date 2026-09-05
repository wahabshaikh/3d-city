import { buildWorld, type Person } from '../mumbai/world';

/**
 * The crowd, as far as the game is concerned.
 *
 * `StreetLife` draws sixty thousand people out of an instance buffer and never
 * touches them again, which is the only way to draw that many. But a game
 * needs to be able to reach into the crowd and take one out of it — so this
 * keeps a grid over the same array, hands back whoever a bumper has just
 * arrived at, and leaves the index on a queue for the renderer to blank on the
 * next frame.
 */

const CELL = 12;

let grid: Map<string, number[]> | null = null;
let down: Uint8Array | null = null;

const key = (x: number, z: number) => `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;

export const people = (): Person[] => buildWorld().people;

function index() {
  if (grid) return grid;
  grid = new Map();
  const list = people();
  down = new Uint8Array(list.length);
  list.forEach((p, i) => {
    const k = key(p.x, p.z);
    let cell = grid!.get(k);
    if (!cell) grid!.set(k, (cell = []));
    cell.push(i);
  });
  return grid;
}

/** Indices the renderer still has to blank. */
export const hiddenPeople: number[] = [];

export type Knocked = { i: number; x: number; z: number; person: Person };

/**
 * Everyone inside `r` of a point who is still standing. They are marked down
 * and queued for hiding, so the same person is never run over twice.
 */
export function knockDown(x: number, z: number, r: number, max = 3): Knocked[] {
  const g = index();
  const out: Knocked[] = [];
  const list = people();
  const i0 = Math.floor((x - r) / CELL);
  const i1 = Math.floor((x + r) / CELL);
  const j0 = Math.floor((z - r) / CELL);
  const j1 = Math.floor((z + r) / CELL);
  for (let i = i0; i <= i1 && out.length < max; i++)
    for (let j = j0; j <= j1 && out.length < max; j++) {
      const cell = g.get(`${i}:${j}`);
      if (!cell) continue;
      for (const n of cell) {
        if (down![n]) continue;
        const p = list[n];
        if ((p.x - x) ** 2 + (p.z - z) ** 2 > r * r) continue;
        down![n] = 1;
        hiddenPeople.push(n);
        out.push({ i: n, x: p.x, z: p.z, person: p });
        if (out.length >= max) break;
      }
    }
  return out;
}

/** Is anyone still standing within `r`? Used for the "someone saw that" test. */
export function witnessNear(x: number, z: number, r: number) {
  const g = index();
  const list = people();
  const i0 = Math.floor((x - r) / CELL);
  const i1 = Math.floor((x + r) / CELL);
  const j0 = Math.floor((z - r) / CELL);
  const j1 = Math.floor((z + r) / CELL);
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const cell = g.get(`${i}:${j}`);
      if (!cell) continue;
      for (const n of cell) {
        if (down![n]) continue;
        const p = list[n];
        if ((p.x - x) ** 2 + (p.z - z) ** 2 <= r * r) return true;
      }
    }
  return false;
}
