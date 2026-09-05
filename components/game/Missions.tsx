'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { missionsW, passed, type MissionW } from '@/lib/game/missions';
import { groundAt } from '@/lib/mumbai/physics';
import { addMoney, getState, live, notify, setState } from '@/lib/store';

/**
 * The jobs, on the ground.
 *
 * A giver is a slowly turning column of light you walk into; the objective is
 * the same column in a different colour, sitting wherever you have to get to
 * next. Both are additive cylinders with a soft edge, which is the oldest
 * trick in this genre and still the one that reads from furthest away.
 */

const markerVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const markerFrag = /* glsl */ `
  uniform vec3 uColour;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // Bright at the base, gone by the top, with a band running up it.
    float fade = pow(1.0 - vUv.y, 1.7);
    float band = 0.35 + 0.65 * smoothstep(0.0, 1.0, sin((vUv.y * 5.0 - uTime * 1.4)) * 0.5 + 0.5);
    gl_FragColor = vec4(uColour * (0.55 + band * 0.9), fade * 0.62);
  }
`;

function markerMaterial(colour: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uColour: { value: new THREE.Color(colour) }, uTime: { value: 0 } },
    vertexShader: markerVert,
    fragmentShader: markerFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

const GIVER = 0xf2c14e;
const GOAL = 0xff5bb0;

export function Missions() {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(2.6, 2.6, 7, 20, 1, true);
    g.translate(0, 3.5, 0);
    return g;
  }, []);
  const giverMat = useMemo(() => markerMaterial(GIVER), []);
  const goalMat = useMemo(() => markerMaterial(GOAL), []);
  useEffect(
    () => () => {
      geo.dispose();
      giverMat.dispose();
      goalMat.dispose();
    },
    [geo, giverMat, goalMat]
  );

  const givers = useRef<Map<string, THREE.Mesh>>(new Map());
  const goal = useRef<THREE.Mesh>(null);
  /** Live mission, kept out of React so the frame loop can touch it. */
  const run = useRef<{ m: MissionW; stage: number; left: number } | null>(null);
  const cooldown = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = getState();
    giverMat.uniforms.uTime.value += dt;
    goalMat.uniforms.uTime.value += dt;
    cooldown.current = Math.max(0, cooldown.current - dt);

    // A run ends the moment you do.
    if (st.down && run.current) {
      run.current = null;
      setState({ objective: null, objectiveAt: null });
      notify('mission', 'Mission failed');
    }

    const active = run.current;

    for (const [id, mesh] of givers.current) {
      mesh.visible = !active && !passed.has(id) && !st.down;
    }

    if (!active) {
      if (goal.current) goal.current.visible = false;
      if (st.locked && !st.down && cooldown.current === 0) {
        for (const m of missionsW()) {
          if (passed.has(m.id)) continue;
          if (Math.hypot(live.x - m.world[0], live.z - m.world[1]) > 4) continue;
          run.current = { m, stage: 0, left: m.seconds ?? 0 };
          notify('mission', m.name, m.giver);
          setState({
            objective: m.stages[0].text,
            objectiveAt: m.stagesW[0].world,
            brief: { name: m.name, giver: m.giver, text: m.brief },
          });
          break;
        }
      }
      return;
    }

    const stage = active.m.stagesW[active.stage];

    if (goal.current) {
      goal.current.visible = true;
      const [gx, gz] = stage.world;
      goal.current.position.set(gx, groundAt(gx, gz).y, gz);
      const r = (stage.radius ?? 14) / 2.6;
      goal.current.scale.set(r, 1, r);
    }

    if (active.m.seconds) {
      active.left -= dt;
      if (active.left <= 0) {
        run.current = null;
        cooldown.current = 2.5;
        setState({ objective: null, objectiveAt: null });
        notify('mission', 'Out of time');
        return;
      }
      const mm = Math.floor(active.left / 60);
      const ss = Math.floor(active.left % 60);
      const line = `${stage.text}  —  ${mm}:${ss.toString().padStart(2, '0')}`;
      if (st.objective !== line) setState({ objective: line });
    }

    const d = Math.hypot(live.x - stage.world[0], live.z - stage.world[1]);
    const arrived =
      d < (stage.radius ?? 14) &&
      (!stage.driving || !!st.vehicle) &&
      (!stage.walking || !st.vehicle);
    if (!arrived) return;

    active.stage++;
    if (active.stage >= active.m.stagesW.length) {
      const { m } = active;
      run.current = null;
      cooldown.current = 2.5;
      passed.add(m.id);
      addMoney(m.reward);
      setState({ objective: null, objectiveAt: null });
      notify('mission', 'Mission passed', `₹${m.reward.toLocaleString('en-IN')}`);
      return;
    }
    const next = active.m.stagesW[active.stage];
    setState({ objective: next.text, objectiveAt: next.world });
  });

  return (
    <group>
      {missionsW().map((m) => {
        const [x, z] = m.world;
        return (
          <mesh
            key={m.id}
            ref={(r) => {
              if (r) givers.current.set(m.id, r);
            }}
            geometry={geo}
            material={giverMat}
            position={[x, groundAt(x, z).y, z]}
            renderOrder={3}
          />
        );
      })}
      <mesh ref={goal} geometry={geo} material={goalMat} visible={false} renderOrder={3} />
    </group>
  );
}
