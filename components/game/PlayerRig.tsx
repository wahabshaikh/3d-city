'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { collidersNear, groundAt, resolve, SEA_LEVEL } from '@/lib/mumbai/physics';
import { LANDMARKS, landmarkWorld } from '@/lib/mumbai/landmarks';
import { nearestDistrict } from '@/lib/mumbai/districts';
import { clampToPhase, inPhase } from '@/lib/mumbai/bounds';
import { jackNearest, nearestVehicleDistance, parkedSlots } from '@/lib/game/traffic';
import {
  driveStep,
  exitWorld,
  forwardSpeed,
  makeCar,
  speedOf,
  type Car,
  type DriveInput,
} from '@/lib/game/vehicles';
import { buildCharacter, LOOKS, poseSeated, poseWalk, type Rig } from './character';
import { CarView } from './CarView';
import { bearing } from '@/lib/geo';
import { closeMap, getState, live, notify, setState, startTour, useStore } from '@/lib/store';

/**
 * The player.
 *
 * One controller covers both states, because in this kind of game they are the
 * same state with a different body: on foot you are a capsule with a walk
 * cycle, in a car you are a capsule sitting inside two tonnes of momentum, and
 * the camera treats them alike — an orbit behind whatever you are, pulled in
 * when a wall gets between it and you.
 */

const KEYS: Record<string, string> = {
  KeyW: 'f',
  ArrowUp: 'f',
  KeyS: 'b',
  ArrowDown: 'b',
  KeyA: 'l',
  ArrowLeft: 'l',
  KeyD: 'r',
  ArrowRight: 'r',
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
};

const HEAD = 1.62;
const RADIUS = 0.42;
const GRAVITY = 24;
const JOG = 4.6;
const SPRINT = 7.4;

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

/** How far the camera can get from the focus before something is in the way. */
function probe(
  fx: number,
  fy: number,
  fz: number,
  dx: number,
  dy: number,
  dz: number,
  want: number
) {
  const steps = 8;
  let ok = 1.35;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * want;
    const x = fx - dx * t;
    const y = fy - dy * t;
    const z = fz - dz * t;
    const g = groundAt(x, z);
    if (y < Math.max(g.y, SEA_LEVEL) + 0.5) break;
    let blocked = false;
    for (const c of collidersNear(x, z)) {
      if (y > c.top + 0.2) continue;
      if (Math.abs(x - c.x) < c.hw + 0.35 && Math.abs(z - c.z) < c.hd + 0.35) {
        blocked = true;
        break;
      }
    }
    if (blocked) break;
    ok = t;
  }
  return ok;
}

export function PlayerRig() {
  const { camera, gl } = useThree();
  const travel = useStore((s) => s.travel);
  const resume = useStore((s) => s.resume);
  const down = useStore((s) => s.down);

  const keys = useRef<Record<string, boolean>>({});
  const cam = useRef({ yaw: Math.PI * 0.5, pitch: -0.16, dist: 4.6, idle: 0 });
  const ped = useRef({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI * 0.5,
    onGround: true,
    phase: 0,
    gait: 0,
  });

  const [car, setCar] = useState<Car | null>(null);
  const carRef = useRef<Car | null>(null);
  const [loose, setLoose] = useState<Car[]>([]);
  const enterCooldown = useRef(0);

  const rig = useMemo<Rig>(() => buildCharacter(LOOKS[0]), []);
  const nearestTimer = useRef(0);
  const fpsAcc = useRef({ t: 0, n: 0 });
  const focus = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const wish = useMemo(() => new THREE.Vector3(), []);

  carRef.current = car;

  /* ------------------------------- spawn point ------------------------------ */

  const place = useRef((x: number, z: number, yaw?: number) => {
    const p = ped.current;
    const [bx, bz] = clampToPhase(x, z, 6);
    // Never drop the player inside a wall — the fast-travel viewpoints and the
    // landmark centres both land in one now and then.
    const [cx, cz] = resolve(bx, bz, groundAt(bx, bz).y, RADIUS + 0.3);
    p.x = cx;
    p.z = cz;
    p.y = groundAt(cx, cz).y;
    p.vx = p.vy = p.vz = 0;
    if (yaw !== undefined) {
      p.yaw = yaw;
      cam.current.yaw = yaw;
    }
    setCar(null);
    setState({ vehicle: null, mode: 'walk' });
  });

  useEffect(() => {
    // Apollo Bunder, on the paving in front of the arch and facing it.
    const [gx, gz] = landmarkWorld(LANDMARKS[0]);
    place.current(gx - 38, gz + 7, Math.PI * 0.5);
    camera.position.set(ped.current.x - 6, ped.current.y + 3, ped.current.z);
    live.x = ped.current.x;
    live.z = ped.current.z;
    // The screenshot harness and the browser console drive the player through this.
    (window as unknown as Record<string, unknown>).__player = {
      place: (x: number, z: number, yaw?: number) => place.current(x, z, yaw),
      get: () => ({ ...ped.current, driving: !!carRef.current }),
      steal: () => {
        keys.current.enter = true;
      },
      findCar: () => {
        const p = ped.current;
        let best: { x: number; z: number; d: number } | null = null;
        for (const s of parkedSlots()) {
          if (s.taken) continue;
          const d = Math.hypot(s.x - p.x, s.z - p.z);
          if (!best || d < best.d) best = { x: s.x, z: s.z, d };
        }
        return best;
      },
    };
  }, [camera]);

  /* ------------------------------ pointer lock ------------------------------ */

  useEffect(() => {
    const el = gl.domElement;
    const target = document.getElementById('lock-target');

    const request = () => el.requestPointerLock();
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      const c = cam.current;
      c.yaw -= e.movementX * 0.0023;
      c.pitch = clamp(c.pitch - e.movementY * 0.0021, -0.95, 0.72);
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) c.idle = 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (document.pointerLockElement !== el) return;
      cam.current.dist = clamp(cam.current.dist + Math.sign(e.deltaY) * 0.5, 2.2, 14);
    };
    const onLock = () => {
      const locked = document.pointerLockElement === el;
      if (locked) setState({ locked: true, started: true, paused: false });
      else {
        const st = getState();
        setState({ locked: false, paused: st.showMap || st.showHelp || !st.started ? st.paused : true });
      }
    };

    target?.addEventListener('click', request);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('pointerlockchange', onLock);
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      target?.removeEventListener('click', request);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('pointerlockchange', onLock);
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useEffect(() => {
    if (!resume) return;
    const id = requestAnimationFrame(() => gl.domElement.requestPointerLock());
    return () => cancelAnimationFrame(id);
  }, [resume, gl]);

  /* -------------------------------- keyboard -------------------------------- */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const st = getState();
      if (st.tour !== null) return;
      if (e.code === 'Escape') {
        if (st.showMap) closeMap();
        else if (st.showHelp) setState({ showHelp: false });
        return;
      }
      const k = KEYS[e.code];
      if (k) {
        if (!st.locked || st.showMap || st.showHelp) return;
        keys.current[k] = true;
        if (e.code === 'Space') e.preventDefault();
      }
      if (st.showMap || st.showHelp) return;

      if (e.code === 'KeyT') startTour();
      if (e.code === 'KeyF') keys.current.enter = true;
      if (e.code === 'KeyM') {
        setState({ showMap: true });
        if (document.pointerLockElement) document.exitPointerLock();
      }
      if (e.code === 'Slash' || e.code === 'KeyH') {
        setState({ showHelp: !st.showHelp });
        if (document.pointerLockElement) document.exitPointerLock();
      }
      if (e.code === 'BracketLeft') setState({ timeOfDay: (st.timeOfDay + 0.95) % 1 });
      if (e.code === 'BracketRight') setState({ timeOfDay: (st.timeOfDay + 0.05) % 1 });
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

  /* ------------------------------- fast travel ------------------------------ */

  useEffect(() => {
    if (!travel) return;
    const lm = LANDMARKS.find((l) => l.id === travel.id);
    if (!lm) return;
    const [x, z] = landmarkWorld(lm);
    const [ox, , oz] = lm.view;
    const [cx, cz] = clampToPhase(x + ox, z + oz, 8);
    const p = ped.current;
    p.x = cx;
    p.z = cz;
    p.y = groundAt(cx, cz).y;
    p.vx = p.vy = p.vz = 0;
    cam.current.yaw = Math.atan2(x - cx, z - cz);
    p.yaw = cam.current.yaw;
    setCar(null);
    setState({ nearest: lm.id, vehicle: null, mode: 'walk' });
  }, [travel]);

  /* -------------------------------- respawn --------------------------------- */

  useEffect(() => {
    if (!down) return;
    const id = setTimeout(() => {
      // Wake up on the steps of St George's Hospital, by the docks — which is
      // where the ambulance takes you in this part of town.
      const p = ped.current;
      const [sx, sz] = clampToPhase(-40, -300, 20);
      p.x = sx;
      p.z = sz;
      p.y = groundAt(sx, sz).y;
      p.vx = p.vy = p.vz = 0;
      setCar(null);
      const st = getState();
      setState({
        down: null,
        health: 100,
        armour: 0,
        wanted: 0,
        vehicle: null,
        mode: 'walk',
        money: Math.max(0, Math.round(st.money * (st.down === 'busted' ? 0.9 : 0.95))),
      });
    }, 2600);
    return () => clearTimeout(id);
  }, [down]);

  /* ---------------------------------- frame --------------------------------- */

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = getState();
    const active = st.locked && !st.showMap && !st.showHelp && !st.down;
    const c = cam.current;
    const p = ped.current;
    const K = active ? keys.current : {};
    c.idle += dt;
    enterCooldown.current = Math.max(0, enterCooldown.current - dt);

    /* -------------------------- get in, get out -------------------------- */

    if (K.enter && enterCooldown.current === 0) {
      keys.current.enter = false;
      enterCooldown.current = 0.45;
      if (carRef.current) {
        const cur = carRef.current;
        const [ex, ez] = exitWorld(cur);
        p.x = ex;
        p.z = ez;
        p.y = groundAt(ex, ez).y;
        p.vx = cur.vx * 0.25;
        p.vz = cur.vz * 0.25;
        p.vy = 0;
        p.yaw = cur.yaw + Math.PI / 2;
        cur.vx = cur.vz = 0;
        setLoose((l) => [...l.slice(-7), cur]);
        setCar(null);
        setState({ vehicle: null, mode: 'walk' });
      } else {
        // A car you already left, first — then anything at the kerb.
        const idx = loose.findIndex((l) => Math.hypot(l.x - p.x, l.z - p.z) < 4.5);
        if (idx >= 0) {
          const got = loose[idx];
          setLoose((l) => l.filter((_, i) => i !== idx));
          setCar(got);
          setState({ vehicle: got.spec.name, mode: 'drive' });
          notify('vehicle', got.spec.name);
        } else {
          const got = jackNearest(p.x, p.z, 5.5);
          if (got) {
            const made = makeCar(got.spec, got.x, got.z, got.yaw, got.colour);
            setCar(made);
            setState({ vehicle: got.spec.name, mode: 'drive' });
            notify('vehicle', got.spec.name);
          }
        }
      }
    }

    const driving = carRef.current;

    if (driving) {
      /* ------------------------------ driving ----------------------------- */
      const input: DriveInput = {
        throttle: (K.f ? 1 : 0) - (K.b ? 1 : 0),
        steer: (K.l ? 1 : 0) - (K.r ? 1 : 0),
        handbrake: !!K.jump,
      };
      driveStep(driving, input, dt);

      const vf = forwardSpeed(driving);
      // Once you are moving the camera falls in behind, unless you are steering
      // it yourself — the same rule GTA has used since the first one in 3D.
      if (c.idle > 0.9 && Math.abs(vf) > 2.5) {
        let d = driving.yaw - c.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        c.yaw += d * (1 - Math.exp(-2.6 * dt));
        c.pitch = damp(c.pitch, -0.13, 2, dt);
      }

      p.x = driving.x;
      p.z = driving.z;
      p.y = driving.y;
      p.gait = 0;
      poseSeated(rig, driving.wheel, dt);

      const s = driving.spec;
      const fx = Math.sin(driving.yaw);
      const fz = Math.cos(driving.yaw);
      // Right-hand drive, and low enough in the seat to clear the roof lining.
      const [dx, dy, dz] = s.driver;
      rig.root.position.set(
        driving.x + fx * dz + fz * dx,
        driving.y + dy,
        driving.z + fz * dz - fx * dx
      );
      rig.root.rotation.set(driving.pitch, driving.yaw, driving.roll);
      rig.root.visible = !s.hideDriver;

      live.kmh = Math.abs(vf) * 3.6;
      live.speed = speedOf(driving);
      live.impact = driving.impact;
      live.inWater = driving.drowned;

      if (driving.health <= 0 || (driving.drowned && driving.y < SEA_LEVEL - 0.9)) {
        // Bail out — you keep the damage, the car does not survive it.
        const [ex, ez] = exitWorld(driving);
        p.x = ex;
        p.z = ez;
        p.y = groundAt(ex, ez).y;
        setCar(null);
        setState({ vehicle: null, mode: 'walk' });
        notify('alert', driving.drowned ? 'You got out in time' : 'Wrecked');
      }

      focus.set(driving.x, driving.y + s.seatY + 0.5, driving.z);
      c.dist = damp(c.dist, clamp(s.halfLength * 2.1 + 2.4, 5, 11), 4, dt);
    } else {
      /* ------------------------------ on foot ----------------------------- */
      const sprint = !!K.sprint;
      wish.set(0, 0, 0);
      const cf = new THREE.Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw));
      const cr = new THREE.Vector3(cf.z, 0, -cf.x);
      if (K.f) wish.add(cf);
      if (K.b) wish.sub(cf);
      if (K.l) wish.add(cr);
      if (K.r) wish.sub(cr);
      const moving = wish.lengthSq() > 0;
      if (moving) wish.normalize();

      const g = groundAt(p.x, p.z);
      const swimming = g.water;
      const top = swimming ? 3.2 : sprint ? SPRINT : JOG;
      const accel = p.onGround || swimming ? 13 : 3.5;
      p.vx = damp(p.vx, wish.x * top, accel, dt);
      p.vz = damp(p.vz, wish.z * top, accel, dt);

      if (swimming) {
        p.y = damp(p.y, SEA_LEVEL + 0.35, 4, dt);
        p.vy = 0;
        p.onGround = false;
      } else {
        p.vy -= GRAVITY * dt;
        if (K.jump && p.onGround) {
          p.vy = 7.6;
          p.onGround = false;
        }
        p.y += p.vy * dt;
        if (p.y <= g.y) {
          p.y = g.y;
          p.vy = 0;
          p.onGround = true;
        }
      }

      const [rx, rz] = resolve(p.x + p.vx * dt, p.z + p.vz * dt, p.y, RADIUS);
      const [px, pz] = clampToPhase(rx, rz, 2);
      p.x = px;
      p.z = pz;

      const speed = Math.hypot(p.vx, p.vz);
      if (moving && speed > 0.4) {
        const want = Math.atan2(p.vx, p.vz);
        let d = want - p.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        p.yaw += d * (1 - Math.exp(-14 * dt));
      }
      p.gait = damp(
        p.gait,
        clamp(speed / JOG, 0, 1) + clamp((speed - JOG) / (SPRINT - JOG), 0, 1),
        10,
        dt
      );
      p.phase += speed * dt * (swimming ? 1.4 : 2.35);
      poseWalk(rig, p.phase, p.gait, dt);

      rig.root.position.set(p.x, p.y, p.z);
      rig.root.rotation.set(0, p.yaw, 0);

      live.kmh = speed * 3.6;
      live.speed = speed;
      live.inWater = swimming;
      live.impact = Math.max(0, live.impact - dt * 2);

      focus.set(p.x, p.y + HEAD, p.z);
      c.dist = damp(c.dist, clamp(c.dist, 2.6, 6.5), 5, dt);
    }

    /* -------------------------------- camera -------------------------------- */

    const cp = Math.cos(c.pitch);
    dir.set(Math.sin(c.yaw) * cp, Math.sin(c.pitch), Math.cos(c.yaw) * cp).normalize();
    const reach = probe(focus.x, focus.y, focus.z, dir.x, dir.y, dir.z, c.dist);
    // Backed into a wall, the camera ends up inside the player's shoulders.
    if (!driving) rig.root.visible = reach > 1.75;
    camera.position.set(
      focus.x - dir.x * reach,
      focus.y - dir.y * reach,
      focus.z - dir.z * reach
    );
    camera.lookAt(focus.x + dir.x * 2, focus.y + dir.y * 2, focus.z + dir.z * 2);

    /* -------------------------------- readouts ------------------------------ */

    live.x = p.x;
    live.y = p.y;
    live.z = p.z;
    live.heading = bearing(dir.x, dir.z);
    live.altitude = p.y - groundAt(p.x, p.z).y;

    fpsAcc.current.t += rawDt;
    fpsAcc.current.n++;
    if (fpsAcc.current.t > 0.5) {
      live.fps = Math.round(fpsAcc.current.n / fpsAcc.current.t);
      fpsAcc.current = { t: 0, n: 0 };
    }

    nearestTimer.current += dt;
    if (nearestTimer.current > 0.25) {
      nearestTimer.current = 0;
      let best: string | null = null;
      let bestScore = Infinity;
      for (const lm of LANDMARKS) {
        const [lx, lz] = landmarkWorld(lm);
        if (!inPhase(lx, lz, 200)) continue;
        const d = Math.hypot(p.x - lx, p.z - lz);
        if (d < lm.radius && d / lm.radius < bestScore) {
          bestScore = d / lm.radius;
          best = lm.id;
        }
      }
      if (best !== st.nearest) setState({ nearest: best });

      const dist = nearestDistrict(p.x, p.z);
      const area = dist ? dist.name : 'South Bombay';
      if (area !== st.area) {
        setState({ area });
        if (st.started) notify('area', area);
      }
      live.nearVehicle = !carRef.current && nearestVehicleDistance(p.x, p.z, 5.5) < 5.5;
    }
  });

  return (
    <group>
      <primitive object={rig.root} />
      {car && <CarView car={car} />}
      {loose.map((l, i) => (
        <CarView key={i} car={l} />
      ))}
    </group>
  );
}
