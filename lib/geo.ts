import * as THREE from 'three';

/**
 * Mumbai is ~27 km from Colaba Point to Versova. Rendering it 1:1 would make it
 * unwalkable, so horizontal distance is compressed by COMPRESS while every
 * building is modelled at true scale. The result reads like Mumbai — which is
 * genuinely one of the densest cities on earth — rather than a scale model.
 */
export const COMPRESS = 4;

/** World origin sits on the Gateway of India, Apollo Bunder. */
export const ORIGIN = { lat: 18.922, lon: 72.8347 };

const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON = 105250; // cos(19°N) corrected

/** lat/lon -> world [x (east), z (south)]. North is -Z. */
export function geo(lat: number, lon: number): [number, number] {
  return [
    ((lon - ORIGIN.lon) * M_PER_DEG_LON) / COMPRESS,
    (-(lat - ORIGIN.lat) * M_PER_DEG_LAT) / COMPRESS,
  ];
}

export function geoV3(lat: number, lon: number, y = 0): THREE.Vector3 {
  const [x, z] = geo(lat, lon);
  return new THREE.Vector3(x, y, z);
}

export function geoPairs(pts: [number, number][]): [number, number][] {
  return pts.map(([la, lo]) => geo(la, lo));
}

/** Compass bearing in degrees for a world-space direction. */
export function bearing(dx: number, dz: number): number {
  return (THREE.MathUtils.radToDeg(Math.atan2(dx, -dz)) + 360) % 360;
}

export const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compassLabel(deg: number): string {
  return COMPASS[Math.round(deg / 45) % 8];
}
