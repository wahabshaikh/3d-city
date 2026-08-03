'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '@/lib/store';

/** Sky, sun, haze and the environment map everything reflects. */

type Palette = {
  zenith: THREE.Color;
  horizon: THREE.Color;
  sun: THREE.Color;
  ground: THREE.Color;
  fog: THREE.Color;
  sunI: number;
  ambI: number;
};

const c = (h: number) => new THREE.Color(h);

const KEYS: { t: number; p: Palette }[] = [
  {
    t: 0.0,
    p: { zenith: c(0x070b1a), horizon: c(0x172038), sun: c(0x9fb4d8), ground: c(0x0a0d16), fog: c(0x0b1120), sunI: 0.12, ambI: 0.16 },
  },
  {
    t: 0.24,
    p: { zenith: c(0x2a3352), horizon: c(0xc98a6a), sun: c(0xffc48a), ground: c(0x3a3020), fog: c(0xa8846c), sunI: 1.0, ambI: 0.45 },
  },
  {
    t: 0.36,
    p: { zenith: c(0x4d84c4), horizon: c(0xd8cfae), sun: c(0xfff2d0), ground: c(0x8c8168), fog: c(0xd2cbb0), sunI: 2.5, ambI: 0.85 },
  },
  {
    t: 0.5,
    p: { zenith: c(0x3f7fc8), horizon: c(0xd6d2b8), sun: c(0xffffff), ground: c(0x9a9078), fog: c(0xcfcbb4), sunI: 3.1, ambI: 1.0 },
  },
  {
    t: 0.68,
    p: { zenith: c(0x4a7ab4), horizon: c(0xe0c49a), sun: c(0xffe0ae), ground: c(0x94805e), fog: c(0xd8bd98), sunI: 2.6, ambI: 0.85 },
  },
  {
    t: 0.79,
    p: { zenith: c(0x6b5a8c), horizon: c(0xf0a05c), sun: c(0xff9b4e), ground: c(0x6a4c36), fog: c(0xe0996a), sunI: 1.6, ambI: 0.55 },
  },
  {
    t: 0.86,
    p: { zenith: c(0x2e2c50), horizon: c(0xb05a48), sun: c(0xff7a44), ground: c(0x3a2c26), fog: c(0x9a5a4c), sunI: 0.6, ambI: 0.34 },
  },
  {
    t: 1.0,
    p: { zenith: c(0x070b1a), horizon: c(0x172038), sun: c(0x9fb4d8), ground: c(0x0a0d16), fog: c(0x0b1120), sunI: 0.12, ambI: 0.16 },
  },
];

function paletteAt(t: number): Palette {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].t < t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const k = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1);
  return {
    zenith: a.p.zenith.clone().lerp(b.p.zenith, k),
    horizon: a.p.horizon.clone().lerp(b.p.horizon, k),
    sun: a.p.sun.clone().lerp(b.p.sun, k),
    ground: a.p.ground.clone().lerp(b.p.ground, k),
    fog: a.p.fog.clone().lerp(b.p.fog, k),
    sunI: THREE.MathUtils.lerp(a.p.sunI, b.p.sunI, k),
    ambI: THREE.MathUtils.lerp(a.p.ambI, b.p.ambI, k),
  };
}

/** Sun direction for a given time of day, at Mumbai's latitude. */
export function sunDirection(t: number) {
  const angle = (t - 0.25) * Math.PI * 2; // 0.25 = sunrise in the east
  const elev = Math.sin(angle);
  const azim = Math.cos(angle);
  return new THREE.Vector3(azim * 0.85, Math.max(-0.35, elev), -0.35 - azim * 0.25).normalize();
}

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const skyFrag = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform float uNight;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -1.0, 1.0);
    // Thick Arabian Sea haze near the horizon, thinning fast with altitude.
    float k = pow(clamp(h * 1.05 + 0.06, 0.0, 1.0), 0.42);
    vec3 col = mix(uHorizon, uZenith, k);

    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSun * pow(sd, 620.0) * 14.0;               // disc
    col += uSun * pow(sd, 12.0) * 0.30;                // inner glow
    col += uSun * pow(sd, 2.2) * 0.10 * (1.0 - k);     // haze bloom along the horizon

    if (uNight > 0.01) {
      vec3 g = floor(d * 260.0);
      float s = hash(g);
      float star = smoothstep(0.9975, 1.0, s) * uNight * max(h, 0.0);
      col += vec3(star) * 1.4;
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SkyDome() {
  const tod = useStore((s) => s.timeOfDay);
  const { scene } = useThree();
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSun: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() },
      uNight: { value: 0 },
    }),
    []
  );

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [uniforms]
  );

  /** A cheap equirectangular environment so glass and water have something to reflect. */
  const envTex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 32;
    const t = new THREE.CanvasTexture(cv);
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  }, []);

  useEffect(() => {
    scene.environment = envTex;
    return () => {
      scene.environment = null;
    };
  }, [scene, envTex]);

  useEffect(() => {
    const p = paletteAt(tod);
    const dir = sunDirection(tod);
    uniforms.uZenith.value.copy(p.zenith);
    uniforms.uHorizon.value.copy(p.horizon);
    uniforms.uSun.value.copy(p.sun);
    uniforms.uSunDir.value.copy(dir);
    uniforms.uNight.value = THREE.MathUtils.clamp(1 - p.sunI / 1.2, 0, 1);

    scene.fog = new THREE.FogExp2(p.fog.getHex(), tod > 0.2 && tod < 0.84 ? 0.00023 : 0.00036);
    scene.background = null;

    if (sunRef.current) {
      sunRef.current.position.copy(dir).multiplyScalar(900);
      sunRef.current.intensity = p.sunI;
      sunRef.current.color.copy(p.sun);
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = p.ambI;
      hemiRef.current.color.copy(p.horizon);
      hemiRef.current.groundColor.copy(p.ground);
    }

    // repaint the env map with the current sky gradient
    const ctx = (envTex.image as HTMLCanvasElement).getContext('2d')!;
    const grd = ctx.createLinearGradient(0, 0, 0, 32);
    grd.addColorStop(0, `#${p.zenith.getHexString()}`);
    grd.addColorStop(0.48, `#${p.horizon.getHexString()}`);
    grd.addColorStop(0.52, `#${p.ground.getHexString()}`);
    grd.addColorStop(1, `#${p.ground.getHexString()}`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 32);
    envTex.needsUpdate = true;
  }, [tod, scene, uniforms, envTex]);

  // Keep the sky centred on the camera and the shadow frustum under the player.
  useFrame(({ camera }) => {
    const s = sunRef.current;
    if (!s) return;
    s.target.position.set(camera.position.x, 0, camera.position.z);
    s.target.updateMatrixWorld();
    s.position.copy(sunDirection(tod)).multiplyScalar(600).add(
      new THREE.Vector3(camera.position.x, 0, camera.position.z)
    );
  });

  return (
    <>
      <mesh material={mat} renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[8200, 32, 20]} />
      </mesh>
      <hemisphereLight ref={hemiRef} intensity={0.8} />
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={1600}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
        shadow-bias={-0.0008}
        shadow-normalBias={0.6}
      />
    </>
  );
}
