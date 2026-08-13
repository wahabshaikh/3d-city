'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { TOUR, CUT, markWorld } from '@/lib/mumbai/tour';
import { live, setState, useStore, leaveTour } from '@/lib/store';
import { bearing } from '@/lib/geo';

/**
 * Drives the camera during the guided tour.
 *
 * Each stop is one continuous move: the camera dollies from `from` to `to`
 * while the look-at target pans, eased at both ends so nothing starts or stops
 * abruptly. Between stops the tour cuts through black — Mumbai is seven
 * kilometres end to end here, and flying that in real time between, say, Juhu
 * and Malabar Hill would be a long look at nothing.
 *
 * The player controller only touches the camera while the pointer is locked,
 * and the tour runs unlocked, so the two never fight over it.
 */

/** Smooth in and out, but spend most of the shot at a near-constant rate. */
function ease(u: number) {
  const s = u * u * (3 - 2 * u);
  return u * 0.35 + s * 0.65;
}

export function TourDirector() {
  const index = useStore((s) => s.tour);
  const playing = useStore((s) => s.tourPlaying);
  const { camera } = useThree();

  const clock = useRef({ t: 0, at: -1 });
  const pos = useRef(new THREE.Vector3());
  const aim = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const fwd = useRef(new THREE.Vector3());

  useFrame((_, rawDt) => {
    if (index === null) {
      if (live.fade !== 0) live.fade = 0;
      live.stopProgress = 0;
      clock.current.at = -1;
      return;
    }

    const i = Math.max(0, Math.min(index, TOUR.length - 1));
    const stop = TOUR[i];

    // New stop: rewind the clock and set the hour while the screen is black.
    if (clock.current.at !== i) {
      clock.current = { t: 0, at: i };
      setState({ timeOfDay: stop.tod });
    }

    // The tour is interpolation, not physics, so it can take a much coarser
    // step than the player controller — a machine rendering this at four frames
    // a second should still get the tour at something close to real time, not
    // in slow motion. The cap only guards against a backgrounded tab.
    if (playing) clock.current.t += Math.min(rawDt, 0.35);
    const t = clock.current.t;
    const total = CUT * 2 + stop.seconds;

    live.fade =
      t < CUT
        ? 1 - t / CUT
        : t > total - CUT
          ? Math.min(1, (t - (total - CUT)) / CUT)
          : 0;

    const u = ease(THREE.MathUtils.clamp((t - CUT) / stop.seconds, 0, 1));
    live.stopProgress = THREE.MathUtils.clamp((t - CUT) / stop.seconds, 0, 1);

    pos.current.fromArray(markWorld(stop.from)).lerp(tmp.current.fromArray(markWorld(stop.to)), u);
    aim.current
      .fromArray(markWorld(stop.look))
      .lerp(tmp.current.fromArray(markWorld(stop.lookTo ?? stop.look)), u);

    camera.position.copy(pos.current);
    camera.lookAt(aim.current);

    live.x = camera.position.x;
    live.y = camera.position.y;
    live.z = camera.position.z;
    live.altitude = camera.position.y;
    camera.getWorldDirection(fwd.current);
    live.heading = bearing(fwd.current.x, fwd.current.z);

    if (t >= total) {
      if (i < TOUR.length - 1) setState({ tour: i + 1 });
      else leaveTour();
    }
  });

  return null;
}
