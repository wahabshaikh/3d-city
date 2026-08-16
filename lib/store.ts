'use client';

import { useSyncExternalStore } from 'react';

export type Mode = 'walk' | 'fly';

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

export const live = {
  x: 0,
  y: 1.7,
  z: 0,
  heading: 0,
  speed: 0,
  fps: 0,
  inWater: false,
  altitude: 0,
  /** Tour: 0 = clear, 1 = black. The cut between one shot and the next. */
  fade: 0,
  /** Tour: 0..1 through the current shot, for the progress bar. */
  stopProgress: 0,
};
