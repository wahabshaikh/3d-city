'use client';

import { useSyncExternalStore } from 'react';

export type Mode = 'walk' | 'drive' | 'fly';

/** A banner that slides in over the HUD — an area name, a mission line, a kill. */
export type Notice = { kind: 'area' | 'vehicle' | 'mission' | 'alert'; text: string; sub?: string; seq: number };

export type State = {
  locked: boolean;
  started: boolean;
  /** User pressed Esc — show the pause menu. Distinct from map/help UI. */
  paused: boolean;
  mode: Mode;
  /** 0 = midnight, 0.5 = noon. */
  timeOfDay: number;
  nearest: string | null;
  showMap: boolean;
  showHelp: boolean;
  /** Bumped to request a teleport. */
  travel: { id: string; seq: number } | null;
  /** Bumped to re-request pointer lock after map travel or closing the map. */
  resume: number;
  loaded: boolean;
  /** Index of the guided-tour stop, or null when free roaming. */
  tour: number | null;
  tourPlaying: boolean;

  /* ------------------------------- the game ------------------------------- */
  /** 0..100. Zero is WASTED. */
  health: number;
  armour: number;
  /** Rupees. */
  money: number;
  /** 0..6 stars. */
  wanted: number;
  /** Name of the vehicle being driven, or null on foot. */
  vehicle: string | null;
  /** District you are standing in, for the corner caption. */
  area: string;
  notice: Notice | null;
  /** Set while the WASTED / BUSTED wipe is running. */
  down: 'wasted' | 'busted' | null;
  /** Current mission objective line, or null. */
  objective: string | null;
};

let state: State = {
  locked: false,
  started: false,
  paused: false,
  mode: 'walk',
  timeOfDay: 0.72, // late afternoon: long shadows off the Gateway
  nearest: null,
  showMap: false,
  showHelp: false,
  travel: null,
  resume: 0,
  loaded: false,
  tour: null,
  tourPlaying: false,
  health: 100,
  armour: 0,
  money: 0,
  wanted: 0,
  vehicle: null,
  area: '',
  notice: null,
  down: null,
  objective: null,
};

const subs = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(patch: Partial<State>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof State)[]) {
    if (state[k] !== patch[k]) changed = true;
  }
  if (!changed) return;
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => void subs.delete(cb);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );
}

let travelSeq = 0;
let resumeSeq = 0;

export function resumeExploring() {
  setState({ paused: false, resume: ++resumeSeq });
}

export function closeMap() {
  const st = getState();
  setState({ showMap: false });
  if (st.started && !st.paused) resumeExploring();
}

export function travelTo(id: string) {
  setState({
    travel: { id, seq: ++travelSeq },
    showMap: false,
    paused: false,
    tour: null,
    tourPlaying: false,
  });
  resumeExploring();
}

/* ---------------------------------- tour ---------------------------------- */

/**
 * The tour drives the camera itself, so it runs with the pointer *unlocked* —
 * that is what keeps the player controller's hands off the camera, and it lets
 * the viewer use the panel without having to press Esc first.
 */
export function startTour(at = 0) {
  if (document.pointerLockElement) document.exitPointerLock();
  setState({
    tour: at,
    tourPlaying: true,
    started: true,
    paused: false,
    showMap: false,
    showHelp: false,
    nearest: null,
  });
}

/**
 * Hands the camera back where the tour left it. Several stops are shot from a
 * few hundred metres up, so drop the player into flight rather than into a
 * fall.
 */
export function leaveTour() {
  const st = getState();
  setState({
    tour: null,
    tourPlaying: false,
    paused: true,
    mode: live.altitude > 14 ? 'fly' : st.mode,
  });
}

/** Callers clamp to the itinerary; the store does not know how long it is. */
export function tourGo(i: number) {
  if (getState().tour === null) return;
  setState({ tour: i, tourPlaying: true });
}

export function tourPlay(playing: boolean) {
  setState({ tourPlaying: playing });
}

/**
 * Per-frame values the HUD polls directly — keeping them out of React state
 * avoids re-rendering the tree sixty times a second.
 */
/** Handy from the browser console, and how the screenshot harness drives the camera. */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__city = { getState, setState, travelTo };
}

let noticeSeq = 0;

/** Slide a caption in over the HUD. Repeats of the same text are ignored. */
export function notify(kind: Notice['kind'], text: string, sub?: string) {
  const cur = getState().notice;
  if (cur && cur.kind === kind && cur.text === text && cur.sub === sub) return;
  setState({ notice: { kind, text, sub, seq: ++noticeSeq } });
}

export function addMoney(n: number) {
  setState({ money: Math.max(0, getState().money + n) });
}

/** Damage lands on the armour first, the way it always has. */
export function damage(n: number) {
  const st = getState();
  if (st.down) return;
  const soaked = Math.min(st.armour, n * 0.75);
  const health = Math.max(0, st.health - (n - soaked));
  setState({ armour: st.armour - soaked, health });
  if (health <= 0) setState({ down: 'wasted' });
}

export function setWanted(n: number) {
  const w = Math.max(0, Math.min(6, Math.round(n)));
  if (w !== getState().wanted) setState({ wanted: w });
}

export const live = {
  x: 0,
  y: 1.7,
  z: 0,
  heading: 0,
  speed: 0,
  fps: 0,
  inWater: false,
  altitude: 0,
  /** Ground speed in km/h, for the speedometer. */
  kmh: 0,
  /** 0..1, rings after a crash so the HUD can shake. */
  impact: 0,
  /** True when there is something at the kerb worth pressing F for. */
  nearVehicle: false,
  /** Tour: 0 = clear, 1 = black. The cut between one shot and the next. */
  fade: 0,
  /** Tour: 0..1 through the current shot, for the progress bar. */
  stopProgress: 0,
};
