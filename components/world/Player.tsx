'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { groundAt, resolve, EYE, SEA_LEVEL } from '@/lib/mumbai/physics';
import { LANDMARKS, landmarkWorld } from '@/lib/mumbai/landmarks';
import { getState, setState, live, useStore } from '@/lib/store';
import { bearing } from '@/lib/geo';

const KEYS: Record<string, string> = {
  KeyW: 'f',
  ArrowUp: 'f',
  KeyS: 'b',
  ArrowDown: 'b',
  KeyA: 'l',
  ArrowLeft: 'l',
  KeyD: 'r',
  ArrowRight: 'r',
  Space: 'up',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  KeyC: 'down',
  ControlLeft: 'down',
};

export function Player() {
  const { camera } = useThree();
  const mode = useStore((s) => s.mode);
  const travel = useStore((s) => s.travel);

  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const onGround = useRef(true);
  const nearestTimer = useRef(0);
  const fpsAcc = useRef({ t: 0, n: 0 });

  const fwd = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);

  // Start at the Gateway, looking west at the arch with the Taj behind it.
  useEffect(() => {
    const [gx, gz] = landmarkWorld(LANDMARKS[0]);
    camera.position.set(gx + 86, EYE, gz + 6);
    camera.lookAt(gx, 14, gz);
    live.x = camera.position.x;
    live.z = camera.position.z;
  }, [camera]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = KEYS[e.code];
      if (k) {
        keys.current[k] = true;
        if (e.code === 'Space') e.preventDefault();
      }
      if (e.code === 'KeyF') setState({ mode: getState().mode === 'fly' ? 'walk' : 'fly' });
      if (e.code === 'KeyM') setState({ showMap: !getState().showMap });
      if (e.code === 'Slash' || e.code === 'KeyH')
        setState({ showHelp: !getState().showHelp });
      if (e.code === 'BracketLeft') setState({ timeOfDay: (getState().timeOfDay + 0.95) % 1 });
      if (e.code === 'BracketRight') setState({ timeOfDay: (getState().timeOfDay + 0.05) % 1 });
    };
    const up = (e: KeyboardEvent) => {
      const k = KEYS[e.code];
      if (k) keys.current[k] = false;
    };
    const blur = () => (keys.current = {});
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // Fast travel: drop in at the landmark's viewpoint, already looking at it.
  useEffect(() => {
    if (!travel) return;
    const lm = LANDMARKS.find((l) => l.id === travel.id);
    if (!lm) return;
    const [x, z] = landmarkWorld(lm);
    const [ox, oy, oz] = lm.view;
    const g = groundAt(x + ox, z + oz);
    camera.position.set(x + ox, Math.max(g.y + EYE, oy + EYE), z + oz);
    camera.lookAt(x, Math.max(6, oy), z);
    vel.current.set(0, 0, 0);
    setState({ nearest: lm.id });
  }, [travel, camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = getState();
    const fly = st.mode === 'fly';
    const sprint = keys.current.sprint;

    camera.getWorldDirection(fwd);
    const flat = fly ? fwd.clone() : new THREE.Vector3(fwd.x, 0, fwd.z);
    if (flat.lengthSq() < 1e-6) flat.set(0, 0, -1);
    flat.normalize();
    right.set(flat.z, 0, -flat.x).normalize();

    const wish = new THREE.Vector3();
    if (keys.current.f) wish.add(flat);
    if (keys.current.b) wish.sub(flat);
    if (keys.current.r) wish.sub(right);
    if (keys.current.l) wish.add(right);
    if (fly) {
      if (keys.current.up) wish.y += 1;
      if (keys.current.down) wish.y -= 1;
    }
    if (wish.lengthSq() > 0) wish.normalize();

    const ground = groundAt(camera.position.x, camera.position.z);
    const inWater = ground.water && !fly;

    if (fly) {
      const speed = sprint ? 260 : 70;
      vel.current.lerp(wish.multiplyScalar(speed), 1 - Math.pow(0.0005, dt));
      camera.position.addScaledVector(vel.current, dt);
    } else {
      const speed = inWater ? 4.2 : sprint ? 17 : 6.2;
      const target = wish.clone().multiplyScalar(speed);
      const accel = onGround.current || inWater ? 12 : 3;
      vel.current.x = THREE.MathUtils.damp(vel.current.x, target.x, accel, dt);
      vel.current.z = THREE.MathUtils.damp(vel.current.z, target.z, accel, dt);

      if (inWater) {
        // Tread water: bob at the surface, and let Space push you along.
        const surface = SEA_LEVEL + 1.15;
        camera.position.y = THREE.MathUtils.damp(camera.position.y, surface, 4, dt);
        vel.current.y = 0;
        onGround.current = false;
      } else {
        vel.current.y -= 24 * dt;
        if (keys.current.up && onGround.current) {
          vel.current.y = 8.2;
          onGround.current = false;
        }
        camera.position.y += vel.current.y * dt;
        const floor = ground.y + EYE;
        if (camera.position.y <= floor) {
          camera.position.y = floor;
          vel.current.y = 0;
          onGround.current = true;
        }
      }

      const nx = camera.position.x + vel.current.x * dt;
      const nz = camera.position.z + vel.current.z * dt;
      const [rx, rz] = resolve(nx, nz, camera.position.y - EYE, 0.75);
      camera.position.x = rx;
      camera.position.z = rz;
    }

    if (camera.position.y < SEA_LEVEL - 40) camera.position.y = SEA_LEVEL - 40;

    live.x = camera.position.x;
    live.y = camera.position.y;
    live.z = camera.position.z;
    live.speed = Math.hypot(vel.current.x, vel.current.z);
    live.inWater = inWater;
    live.altitude = camera.position.y - ground.y;
    camera.getWorldDirection(fwd);
    live.heading = bearing(fwd.x, fwd.z);

    fpsAcc.current.t += rawDt;
    fpsAcc.current.n++;
    if (fpsAcc.current.t > 0.5) {
      live.fps = Math.round(fpsAcc.current.n / fpsAcc.current.t);
      fpsAcc.current = { t: 0, n: 0 };
    }

    // Which landmark are we standing in front of?
    nearestTimer.current += dt;
    if (nearestTimer.current > 0.2) {
      nearestTimer.current = 0;
      let best: string | null = null;
      let bestScore = Infinity;
      for (const lm of LANDMARKS) {
        const [lx, lz] = landmarkWorld(lm);
        const d = Math.hypot(camera.position.x - lx, camera.position.z - lz);
        if (d < lm.radius && d / lm.radius < bestScore) {
          bestScore = d / lm.radius;
          best = lm.id;
        }
      }
      if (best !== st.nearest) setState({ nearest: best });
    }
  });

  return (
    <PointerLockControls
      selector="#lock-target"
      onLock={() => setState({ locked: true, started: true })}
      onUnlock={() => setState({ locked: false })}
    />
  );
}
