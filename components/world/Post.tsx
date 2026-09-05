'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { getState, live } from '@/lib/store';

/**
 * The grade.
 *
 * Half of what people remember about a game's look is not its geometry, it is
 * what happens to the frame after the geometry is drawn. This is the cheap end
 * of that: bloom so a street lamp and a lit signboard actually glow, a colour
 * grade that swings warm at golden hour and cold and green after dark, a
 * vignette, and a whisker of grain to break up the flat sky gradients.
 *
 * Bloom runs before tone mapping, the grade after it — that is the difference
 * between a lamp blooming and the whole frame washing out.
 */

const gradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uLift: { value: new THREE.Color(0, 0, 0) },
    uSaturation: { value: 1.06 },
    uContrast: { value: 1.05 },
    uVignette: { value: 0.34 },
    uGrain: { value: 0.018 },
    uTime: { value: 0 },
    uShake: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uTint;
    uniform vec3 uLift;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uTime;
    uniform float uShake;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      // A crash punches the frame sideways and pulls the channels apart.
      if (uShake > 0.001) {
        uv += vec2(sin(uTime * 61.0), cos(uTime * 47.0)) * uShake * 0.006;
      }
      vec2 off = (uv - 0.5) * uShake * 0.008;
      vec3 col = vec3(
        texture2D(tDiffuse, uv + off).r,
        texture2D(tDiffuse, uv).g,
        texture2D(tDiffuse, uv - off).b
      );

      col = col * uTint + uLift;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;

      float d = distance(uv, vec2(0.5));
      col *= 1.0 - uVignette * smoothstep(0.32, 0.92, d);

      col += (hash(uv * 1024.0 + fract(uTime) * 91.0) - 0.5) * uGrain;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

/** Grade keys, in the same time-of-day space as the sky. */
type Grade = { tint: [number, number, number]; lift: [number, number, number]; sat: number };

const GRADES: { t: number; g: Grade }[] = [
  { t: 0.0, g: { tint: [0.82, 0.88, 1.12], lift: [0.006, 0.008, 0.018], sat: 0.82 } },
  { t: 0.24, g: { tint: [1.06, 0.98, 0.95], lift: [0.012, 0.006, 0.004], sat: 1.04 } },
  { t: 0.5, g: { tint: [1.0, 1.0, 1.0], lift: [0.0, 0.0, 0.0], sat: 1.06 } },
  { t: 0.72, g: { tint: [1.09, 1.0, 0.9], lift: [0.008, 0.003, 0.0], sat: 1.14 } },
  { t: 0.8, g: { tint: [1.16, 0.98, 0.86], lift: [0.016, 0.006, 0.0], sat: 1.22 } },
  { t: 0.88, g: { tint: [0.92, 0.92, 1.08], lift: [0.008, 0.008, 0.016], sat: 0.94 } },
  { t: 1.0, g: { tint: [0.82, 0.88, 1.12], lift: [0.006, 0.008, 0.018], sat: 0.82 } },
];

function gradeAt(t: number): Grade {
  let i = 0;
  while (i < GRADES.length - 2 && GRADES[i + 1].t < t) i++;
  const a = GRADES[i];
  const b = GRADES[i + 1];
  const k = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1);
  const mix = (u: number, v: number) => THREE.MathUtils.lerp(u, v, k);
  return {
    tint: [0, 1, 2].map((c) => mix(a.g.tint[c], b.g.tint[c])) as [number, number, number],
    lift: [0, 1, 2].map((c) => mix(a.g.lift[c], b.g.lift[c])) as [number, number, number],
    sat: mix(a.g.sat, b.g.sat),
  };
}

export function Post() {
  const { gl, scene, camera, size } = useThree();

  const { composer, bloom, grade } = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.42,
      0.62,
      0.86
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const grade = new ShaderPass(gradeShader);
    composer.addPass(grade);
    return { composer, bloom, grade };
  }, [gl, scene, camera]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    composer.setSize(size.width, size.height);
    composer.setPixelRatio(gl.getPixelRatio());
    bloom.resolution.set(size.width, size.height);
  }, [composer, bloom, gl, size]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame((_, dt) => {
    const t = getState().timeOfDay;
    const g = gradeAt(t);
    const u = grade.uniforms;
    (u.uTint.value as THREE.Color).setRGB(...g.tint);
    (u.uLift.value as THREE.Color).setRGB(...g.lift);
    u.uSaturation.value = g.sat;
    u.uTime.value += dt;
    u.uShake.value = live.impact;
    // Lamps and signage carry the night, so let them bloom harder after dark.
    const night = t < 0.26 || t > 0.75 ? 1 : 0;
    bloom.strength = THREE.MathUtils.damp(bloom.strength, 0.34 + night * 0.5, 3, dt);
    composer.render(dt);
  }, 1);

  return null;
}
