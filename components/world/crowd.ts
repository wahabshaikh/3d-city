import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The crowd.
 *
 * Sixty thousand people is a number you can only reach with instancing, which
 * means one geometry and no per-frame CPU work — so the walk has to happen in
 * the vertex shader.
 *
 * Every vertex carries two extra attributes: the height of the joint it hangs
 * off, and which way that joint swings. The shader paces each figure back and
 * forth along the way it is facing — which, on a pavement, is along the lane —
 * and derives the stride from how far it has walked rather than from the clock,
 * so the legs slow to a stop at the turn and the feet never skate.
 */

/** Tag a geometry's vertices with a hinge height and a swing direction. */
function hinge(g: THREE.BufferGeometry, pivotY: number, swing: number) {
  const n = g.attributes.position.count;
  g.setAttribute('aPivot', new THREE.BufferAttribute(new Float32Array(n).fill(pivotY), 1));
  g.setAttribute('aSwing', new THREE.BufferAttribute(new Float32Array(n).fill(swing), 1));
  return g;
}

function capsule(r: number, len: number, x: number, top: number) {
  const g = new THREE.CapsuleGeometry(r, Math.max(0.02, len - r * 2), 2, 6);
  g.translate(x, top - len / 2, 0);
  return g;
}

const HIP = 0.88;
const SHOULDER = 1.4;

export function crowdGeometry() {
  // Legs swing from the hip, in opposition.
  const legs = mergeGeometries([
    hinge(capsule(0.082, 0.9, 0.085, HIP), HIP, 1),
    hinge(capsule(0.082, 0.9, -0.085, HIP), HIP, -1),
  ])!;

  const trunk = new THREE.CylinderGeometry(0.2, 0.165, 0.56, 8);
  trunk.scale(1, 1, 0.66);
  trunk.translate(0, 1.16, 0);

  const head = new THREE.SphereGeometry(0.115, 8, 6);
  head.scale(0.94, 1.06, 0.98);
  head.translate(0, 1.56, 0);
  const neck = new THREE.CylinderGeometry(0.05, 0.055, 0.08, 5);
  neck.translate(0, 1.44, 0);

  // Head and neck are rigid; the arms hanging off the same mesh are not.
  const skin = mergeGeometries([
    hinge(head, SHOULDER, 0),
    hinge(neck, SHOULDER, 0),
    hinge(capsule(0.052, 0.62, 0.215, SHOULDER), SHOULDER, -1),
    hinge(capsule(0.052, 0.62, -0.215, SHOULDER), SHOULDER, 1),
  ])!;

  return { lower: legs, shirt: hinge(trunk, HIP, 0), skin };
}

/**
 * Patch a standard material so instances walk. `uTime` is shared, so the whole
 * crowd costs one uniform update a frame.
 */
export function walking(mat: THREE.MeshStandardMaterial) {
  const uniforms = { uTime: { value: 0 } };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader =
      `uniform float uTime;
       attribute float aPivot;
       attribute float aSwing;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           // A phase per figure, from where it stands.
           float ph = instanceMatrix[3].x * 0.83 + instanceMatrix[3].z * 1.27;
           // Pace ±4.5 m along the way this one is facing.
           float walk = sin(uTime * 0.31 + ph) * 4.5;
           // Stride keys off distance walked, so the feet stay planted.
           float stride = sin(walk * 2.3);
           float ang = stride * 0.52 * aSwing;
           float c = cos(ang);
           float s = sin(ang);
           float y = transformed.y - aPivot;
           transformed.y = y * c - transformed.z * s + aPivot;
           transformed.z = y * s + transformed.z * c;
           transformed.z += walk;
           // A little vertical bob, and a lean into the walk.
           transformed.y -= abs(cos(walk * 2.3)) * 0.022 * step(0.01, abs(aSwing));
         #endif`
      );
  };
  mat.customProgramCacheKey = () => 'crowdwalk';
  return { mat, uniforms };
}
