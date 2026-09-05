'use client';

import * as THREE from 'three';
import { stoneTexture, tinTexture, tarpTexture } from '@/lib/textures';

let M: Record<string, THREE.Material> | null = null;

/**
 * Landmark geometry is a mix of extrusions, lathes and boxes, so no single UV
 * convention fits. Project the stone texture triplanar-ally from object space
 * instead: every surface then gets the same texel density in metres, whatever
 * shape it is.
 */
function triplanar(mat: THREE.MeshStandardMaterial, tilesPerMetre: number) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTri = { value: tilesPerMetre };
    shader.vertexShader =
      'varying vec3 vTriPos;\nvarying vec3 vTriNrm;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vTriPos = position;
         vTriNrm = normal;`
      );
    shader.fragmentShader =
      'varying vec3 vTriPos;\nvarying vec3 vTriNrm;\nuniform float uTri;\n' +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
           vec3 tw = abs(normalize(vTriNrm));
           tw = pow(tw, vec3(5.0));
           tw /= max(tw.x + tw.y + tw.z, 0.0001);
           vec4 triC =
             texture2D(map, vTriPos.zy * uTri) * tw.x +
             texture2D(map, vTriPos.xz * uTri) * tw.y +
             texture2D(map, vTriPos.xy * uTri) * tw.z;
           diffuseColor *= triC;
         #endif`
      );
  };
  mat.customProgramCacheKey = () => `tri${tilesPerMetre}`;
  return mat;
}

function stone(key: string, base: string, mortar: string, rough: number, tiles = 0.36) {
  return triplanar(
    new THREE.MeshStandardMaterial({
      map: stoneTexture(key, base, mortar),
      roughness: rough,
      metalness: 0,
    }),
    tiles
  );
}

export function materials() {
  if (M) return M;

  M = {
    /** Gateway of India: yellow Kharodi basalt. */
    basalt: stone('basalt', '#b2925a', '#8a7444', 0.88),
    /** Rajabai Tower & CSMT: buff Kurla stone. */
    kurla: stone('kurla', '#c8b083', '#a08a63', 0.86),
    /** CSMT's contrasting red sandstone banding. */
    redStone: stone('redstone', '#a05c44', '#7e4636', 0.86),
    /** Bombay High Court & the docks: blue-grey basalt. */
    blueStone: stone('bluestone', '#6d747c', '#525860', 0.9),
    /** Gothic dressings and statuary: pale Porbandar limestone. */
    limestone: stone('limestone', '#d9cfb6', '#bcb198', 0.82),
    /** The Taj's walls. */
    tajCream: stone('tajcream', '#d8c8a6', '#bba98a', 0.82),

    marble: stone('marble', '#f0ece0', '#ddd6c6', 0.42, 0.22),
    marbleGreen: new THREE.MeshStandardMaterial({ color: 0x8fae9a, roughness: 0.45 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd6a733, roughness: 0.32, metalness: 0.9 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xbe9645, roughness: 0.45, metalness: 0.75 }),

    /** The Taj's Florentine red-tiled domes. */
    tileRed: new THREE.MeshStandardMaterial({ color: 0x933a2c, roughness: 0.6 }),

    concrete: new THREE.MeshStandardMaterial({ color: 0xa8a297, roughness: 0.93 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x6f6b64, roughness: 0.95 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x383634, roughness: 0.97 }),

    glass: new THREE.MeshStandardMaterial({
      color: 0x5f7d92,
      roughness: 0.16,
      metalness: 0.55,
      envMapIntensity: 1.1,
    }),
    glassDark: new THREE.MeshStandardMaterial({
      color: 0x293a46,
      roughness: 0.14,
      metalness: 0.7,
      envMapIntensity: 1.1,
    }),

    steel: new THREE.MeshStandardMaterial({ color: 0x8d949a, roughness: 0.45, metalness: 0.8 }),
    cable: new THREE.MeshStandardMaterial({ color: 0xd2cec6, roughness: 0.5, metalness: 0.4 }),

    whitewash: new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.75 }),
    saffron: new THREE.MeshStandardMaterial({ color: 0xdd7a1c, roughness: 0.7 }),
    vermilion: new THREE.MeshStandardMaterial({ color: 0xb8342a, roughness: 0.7 }),
    teak: new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.75 }),
    darkGrey: new THREE.MeshStandardMaterial({ color: 0x383633, roughness: 0.8 }),
    black: new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: 0.6 }),
    taxiYellow: new THREE.MeshStandardMaterial({ color: 0xefbb28, roughness: 0.5 }),
    bestRed: new THREE.MeshStandardMaterial({ color: 0xb0322a, roughness: 0.55 }),
    trainBlue: new THREE.MeshStandardMaterial({ color: 0x2c4a80, roughness: 0.55 }),

    /* -------------------------------- vehicles ------------------------------ */
    /** Paint that takes a per-instance colour: left white so the tint reads true. */
    paint: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0.22 }),
    /** Mumbai Police livery: white shell, that one blue band. */
    policeBlue: new THREE.MeshStandardMaterial({ color: 0x1f4f9c, roughness: 0.45 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.28, metalness: 0.9 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.95 }),
    /** Lamp lenses. Emissive intensity is driven by the clock, not set here. */
    headLamp: new THREE.MeshStandardMaterial({
      color: 0xf6f1de,
      emissive: 0xfff3d0,
      emissiveIntensity: 0,
      roughness: 0.3,
    }),
    tailLamp: new THREE.MeshStandardMaterial({
      color: 0x8e2018,
      emissive: 0xff2a12,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    }),

    // The sheet textures are drawn near-white so they can be tinted. `tin` and
    // `tarp` carry a default weathering; the `*Sheet` pair is left white for
    // instanced roofs, which set their own colour per sheet.
    tin: triplanar(
      new THREE.MeshStandardMaterial({
        map: tinTexture(),
        color: 0x6e685d,
        roughness: 0.68,
        metalness: 0.28,
      }),
      0.42
    ),
    tinSheet: triplanar(
      new THREE.MeshStandardMaterial({ map: tinTexture(), roughness: 0.7, metalness: 0.22 }),
      0.42
    ),
    tarp: triplanar(
      new THREE.MeshStandardMaterial({ map: tarpTexture(), color: 0x3f6f96, roughness: 0.88 }),
      0.3
    ),
    tarpSheet: triplanar(
      new THREE.MeshStandardMaterial({ map: tarpTexture(), roughness: 0.88 }),
      0.3
    ),

    foliage: new THREE.MeshStandardMaterial({ color: 0x39602f, roughness: 0.92 }),
    foliageDry: new THREE.MeshStandardMaterial({ color: 0x4f6c30, roughness: 0.92 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6a5844, roughness: 0.96 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x4a6236, roughness: 0.96 }),

    lampGlow: new THREE.MeshStandardMaterial({
      color: 0xfff0d0,
      emissive: 0xffc46a,
      emissiveIntensity: 0,
      roughness: 0.4,
    }),
  };
  return M;
}

export type Materials = ReturnType<typeof materials>;
