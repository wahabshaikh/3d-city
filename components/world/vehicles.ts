import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Every vehicle in the game, built from its side elevation.
 *
 * A car is a silhouette before it is anything else — the rake of a windscreen
 * and the drop of a boot lid are what tell a Padmini from a Gypsy at fifty
 * metres. So each body is drawn as a 2D profile in the (z, y) plane and
 * extruded across the car with a bevel, rather than stacked out of boxes.
 * Bevelling is what keeps a headlight from reading as a corner.
 *
 * Each vehicle comes apart into the same six pieces, so one instanced draw per
 * piece covers every copy of it on the map: `lower` (the painted body),
 * `upper` (roof, waistband, whatever takes the second colour), `glass`,
 * `wheels`, and the two lamp clusters.
 */

export type VehicleGeo = {
  lower: THREE.BufferGeometry;
  upper: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  /** All four (or six) wheels in one piece, for instanced traffic. */
  wheels: THREE.BufferGeometry;
  /**
   * The same wheels split by axle and re-centred on it, so the car you are
   * driving can steer its front pair and spin both. Traffic at fifty metres
   * does not need this; the car filling your screen does.
   */
  wheelsFront: THREE.BufferGeometry;
  wheelsRear: THREE.BufferGeometry;
  /** Axle positions along the car, [front, rear], and the tyre radius. */
  axle: [number, number];
  wheelRadius: number;
  head: THREE.BufferGeometry;
  tail: THREE.BufferGeometry;
};

type P = [number, number];

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
};

/**
 * Extrude a side elevation across the car. `pts` are (z, y) in metres with +z
 * forward; the result is centred on the origin and `width` wide in x.
 */
function profile(pts: P[], width: number, bevel = 0.06): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, width - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // Shape x -> world z, extrusion -> world -x. Re-centre across the car.
  g.rotateY(-Math.PI / 2);
  g.translate(width / 2 - bevel, 0, 0);
  g.computeVertexNormals();
  return g;
}

/** A strut running between two points of the side elevation, at ±x. */
function bar(a: P, b: P, width: number, thick: number, xOff = 0) {
  const dz = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dz, dy);
  const g = new THREE.BoxGeometry(width, thick, len + thick * 0.6);
  g.rotateX(-Math.atan2(dy, dz));
  g.translate(xOff, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
  return g;
}

/**
 * The greenhouse: glass first, then the painted frame standing proud of it.
 *
 * Drawing a cabin as one solid block of glass and dropping a roof panel on top
 * leaves the roof hovering. A car reads correctly only when the pillars and
 * the roof are bodywork and the glass is set back behind them, so that is how
 * it is built: `cabin` is the side elevation of the greenhouse — rear base,
 * rear top, front top, front base — and the frame is derived from it.
 */
function greenhouse(cabin: P[], width: number) {
  const [rearBase, rearTop, frontTop, frontBase] = cabin;
  const half = width / 2 - 0.035;
  const pillar = 0.075;
  const frame = mergeGeometries([
    // roof panel
    bar(rearTop, frontTop, width + 0.02, 0.07),
    // waist rail
    bar(rearBase, frontBase, width + 0.03, 0.06),
    // C and A pillars, both sides
    bar(rearBase, rearTop, pillar, 0.075, half),
    bar(rearBase, rearTop, pillar, 0.075, -half),
    bar(frontBase, frontTop, pillar, 0.075, half),
    bar(frontBase, frontTop, pillar, 0.075, -half),
  ])!;
  return { frame, glass: profile(cabin, width - 0.05, 0.015) };
}

/** Paint every vertex of a geometry one shade, so one mesh can hold two. */
function shade(g: THREE.BufferGeometry, v: number) {
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3).fill(v);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function wheelSet(r: number, w: number, at: [number, number, number][]) {
  return mergeGeometries(
    at.map(([x, y, z]) => {
      // A black disc reads as a hole in the bodywork. The hub is what stops it.
      const tyre = shade(new THREE.CylinderGeometry(r, r, w, 12), 0.09);
      tyre.rotateZ(Math.PI / 2);
      const hub = shade(new THREE.CylinderGeometry(r * 0.44, r * 0.44, w * 1.08, 10), 0.42);
      hub.rotateZ(Math.PI / 2);
      // One spoke, so a spinning wheel reads as spinning.
      const spoke = shade(new THREE.BoxGeometry(w * 1.12, r * 0.86, r * 0.14), 0.3);
      const merged = mergeGeometries([tyre, hub, spoke])!;
      merged.translate(x, y, z);
      return merged;
    })
  )!;
}

/** Wheels three ways: whole, and split by axle for the car you are driving. */
function wheelParts(r: number, w: number, at: [number, number, number][]) {
  const mid = (list: [number, number, number][]) =>
    list.length ? list.reduce((n, a) => n + a[2], 0) / list.length : 0;
  const front = at.filter((a) => a[2] > 0);
  const rear = at.filter((a) => a[2] <= 0);
  const fz = mid(front);
  const rz = mid(rear);
  const recentre = (list: [number, number, number][], z: number) =>
    list.map(([x, , az]) => [x, 0, az - z] as [number, number, number]);
  return {
    wheels: wheelSet(r, w, at),
    wheelsFront: wheelSet(r, w, recentre(front, fz)),
    wheelsRear: wheelSet(r, w, recentre(rear, rz)),
    axle: [fz, rz] as [number, number],
    wheelRadius: r,
  };
}

/** Lamp lenses, as flat pads set into the bodywork. */
function lamps(at: [number, number, number][], w: number, h: number) {
  return mergeGeometries(at.map(([x, y, z]) => box(w, h, 0.07, x, y, z)))!;
}

/* -------------------------------------------------------------------------- */

/** Premier Padmini kaali-peeli. Upright, slab-sided, 1960s Fiat under the skin. */
function taxi(): VehicleGeo {
  const body: P[] = [
    [-2.0, 0.44],
    [-2.05, 0.72],
    [-1.95, 0.98],
    [-0.85, 1.02],
    [0.9, 1.02],
    [1.85, 0.96],
    [2.02, 0.8],
    [2.02, 0.46],
    [1.5, 0.34],
    [-1.5, 0.34],
  ];
  const cabin: P[] = [
    [-1.02, 1.0],
    [-0.74, 1.5],
    [0.6, 1.52],
    [0.96, 1.0],
  ];
  const gh = greenhouse(cabin, 1.5);
  return {
    lower: profile(body, 1.66),
    upper: mergeGeometries([gh.frame, box(0.3, 0.16, 0.62, 0, 1.62, 0.15)])!,
    glass: gh.glass,
    ...wheelParts(0.31, 0.2, [
      [0.78, 0.31, 1.2],
      [-0.78, 0.31, 1.2],
      [0.78, 0.31, -1.2],
      [-0.78, 0.31, -1.2],
    ]),
    head: lamps(
      [
        [0.6, 0.78, 2.02],
        [-0.6, 0.78, 2.02],
      ],
      0.26,
      0.2
    ),
    tail: lamps(
      [
        [0.62, 0.8, -2.03],
        [-0.62, 0.8, -2.03],
      ],
      0.2,
      0.18
    ),
  };
}

/** BEST double-decker. Red, cream waistband, open rear staircase. */
function bus(): VehicleGeo {
  const body: P[] = [
    [-5.1, 0.5],
    [-5.2, 3.9],
    [5.2, 3.95],
    [5.2, 0.55],
    [4.4, 0.4],
    [-4.4, 0.4],
  ];
  return {
    lower: profile(body, 2.5, 0.1),
    upper: mergeGeometries([
      box(2.56, 0.42, 10.3, 0, 2.5, 0),
      box(2.56, 0.28, 10.3, 0, 0.66, 0),
      box(2.4, 0.1, 10.2, 0, 4.0, 0),
    ])!,
    glass: mergeGeometries([
      box(2.54, 0.95, 9.2, 0, 1.78, -0.2),
      box(2.54, 1.0, 9.2, 0, 3.32, -0.2),
      box(2.3, 1.15, 0.1, 0, 1.85, 5.16),
      box(2.3, 1.15, 0.1, 0, 3.4, 5.16),
    ])!,
    ...wheelParts(0.55, 0.32, [
      [1.24, 0.55, 3.3],
      [-1.24, 0.55, 3.3],
      [1.24, 0.55, -2.9],
      [-1.24, 0.55, -2.9],
      [1.24, 0.55, -3.9],
      [-1.24, 0.55, -3.9],
    ]),
    head: lamps(
      [
        [0.94, 0.86, 5.2],
        [-0.94, 0.86, 5.2],
      ],
      0.3,
      0.24
    ),
    tail: lamps(
      [
        [0.94, 0.9, -5.15],
        [-0.94, 0.9, -5.15],
      ],
      0.26,
      0.3
    ),
  };
}

/** Auto-rickshaw. Three wheels, black tub, yellow hood. */
function auto(): VehicleGeo {
  const body: P[] = [
    [-1.28, 0.36],
    [-1.3, 1.05],
    [-0.6, 1.15],
    [0.55, 1.1],
    [1.05, 0.82],
    [1.12, 0.42],
    [0.9, 0.3],
    [-1.0, 0.3],
  ];
  return {
    lower: profile(body, 1.28, 0.05),
    upper: mergeGeometries([
      box(1.34, 0.08, 2.1, 0, 1.74, -0.18),
      box(0.12, 0.62, 0.12, 0.6, 1.42, -1.2),
      box(0.12, 0.62, 0.12, -0.6, 1.42, -1.2),
      box(0.12, 0.66, 0.12, 0.56, 1.42, 0.4),
      box(0.12, 0.66, 0.12, -0.56, 1.42, 0.4),
    ])!,
    glass: mergeGeometries([box(1.06, 0.5, 0.07, 0, 1.36, 0.78)])!,
    ...wheelParts(0.28, 0.16, [
      [0, 0.28, 0.98],
      [0.6, 0.28, -0.86],
      [-0.6, 0.28, -0.86],
    ]),
    head: lamps([[0, 0.82, 1.12]], 0.22, 0.22),
    tail: lamps(
      [
        [0.42, 0.82, -1.31],
        [-0.42, 0.82, -1.31],
      ],
      0.14,
      0.14
    ),
  };
}

/** The generic Indian hatchback-saloon that fills every Mumbai street. */
function sedan(): VehicleGeo {
  const body: P[] = [
    [-2.15, 0.46],
    [-2.2, 0.78],
    [-2.05, 1.02],
    [-0.95, 1.06],
    [0.98, 1.04],
    [1.98, 0.94],
    [2.2, 0.8],
    [2.2, 0.48],
    [1.6, 0.32],
    [-1.6, 0.32],
  ];
  const cabin: P[] = [
    [-1.15, 1.04],
    [-0.62, 1.42],
    [0.5, 1.44],
    [1.04, 1.02],
  ];
  const gh = greenhouse(cabin, 1.58);
  return {
    lower: profile(body, 1.74),
    upper: gh.frame,
    glass: gh.glass,
    ...wheelParts(0.33, 0.22, [
      [0.8, 0.33, 1.34],
      [-0.8, 0.33, 1.34],
      [0.8, 0.33, -1.34],
      [-0.8, 0.33, -1.34],
    ]),
    head: lamps(
      [
        [0.62, 0.84, 2.2],
        [-0.62, 0.84, 2.2],
      ],
      0.34,
      0.18
    ),
    tail: lamps(
      [
        [0.66, 0.88, -2.2],
        [-0.66, 0.88, -2.2],
      ],
      0.26,
      0.22
    ),
  };
}

/** Mumbai Police Gypsy: a short, square 4x4 with a light bar. */
function police(): VehicleGeo {
  const body: P[] = [
    [-1.85, 0.58],
    [-1.9, 1.62],
    [1.0, 1.6],
    [1.05, 1.05],
    [1.9, 1.0],
    [1.98, 0.86],
    [1.98, 0.6],
    [1.5, 0.44],
    [-1.5, 0.44],
  ];
  return {
    lower: profile(body, 1.62, 0.05),
    upper: mergeGeometries([
      box(1.6, 0.1, 2.9, 0, 1.66, -0.45),
      box(1.62, 0.22, 0.5, 0, 0.98, 0), // waistband stripe
    ])!,
    glass: mergeGeometries([
      box(1.5, 0.55, 0.09, 0, 1.32, 1.02),
      box(0.08, 0.5, 2.5, 0.77, 1.3, -0.4),
      box(0.08, 0.5, 2.5, -0.77, 1.3, -0.4),
      box(1.5, 0.5, 0.09, 0, 1.3, -1.88),
    ])!,
    ...wheelParts(0.38, 0.24, [
      [0.79, 0.38, 1.18],
      [-0.79, 0.38, 1.18],
      [0.79, 0.38, -1.18],
      [-0.79, 0.38, -1.18],
    ]),
    head: lamps(
      [
        [0.6, 0.9, 1.98],
        [-0.6, 0.9, 1.98],
      ],
      0.3,
      0.22
    ),
    tail: lamps(
      [
        [0.64, 1.1, -1.9],
        [-0.64, 1.1, -1.9],
      ],
      0.2,
      0.3
    ),
  };
}

/** A 150cc commuter motorcycle — the thing that actually gets through the jam. */
function bike(): VehicleGeo {
  const body: P[] = [
    [-0.86, 0.62],
    [-0.72, 0.86],
    [-0.1, 0.84],
    [0.18, 0.72],
    [0.42, 0.9],
    [0.66, 0.9],
    [0.72, 0.66],
    [0.5, 0.5],
    [-0.5, 0.5],
  ];
  return {
    lower: profile(body, 0.34, 0.05),
    upper: mergeGeometries([
      box(0.62, 0.05, 0.06, 0, 1.02, 0.5), // handlebars
      box(0.08, 0.44, 0.08, 0, 0.9, 0.62),
    ])!,
    glass: mergeGeometries([box(0.3, 0.2, 0.04, 0, 1.06, 0.6)])!,
    ...wheelParts(0.32, 0.12, [
      [0, 0.32, 0.66],
      [0, 0.32, -0.68],
    ]),
    head: lamps([[0, 0.88, 0.72]], 0.18, 0.18),
    tail: lamps([[0, 0.86, -0.88]], 0.12, 0.1),
  };
}

export const VEHICLE_BUILDERS = [taxi, bus, auto, sedan, police, bike] as const;

/** Stable indices — the world generator stores these on kerbside parking. */
export const V_TAXI = 0;
export const V_BUS = 1;
export const V_AUTO = 2;
export const V_SEDAN = 3;
export const V_POLICE = 4;
export const V_BIKE = 5;

let cache: VehicleGeo[] | null = null;

export function vehicleGeometry(): VehicleGeo[] {
  if (!cache) cache = VEHICLE_BUILDERS.map((f) => f());
  return cache;
}
