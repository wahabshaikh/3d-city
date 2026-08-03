import { geo } from '../geo';

/**
 * Traced from the real coastline of Mumbai: the Colaba peninsula, Back Bay with
 * the Marine Drive crescent, the Malabar Hill promontory, Haji Ali bay, Worli
 * Point, Mahim Bay and the creek, Bandra's Land's End, Juhu and Versova — then
 * back down the harbour side past the docks to Apollo Bunder.
 *
 * Order: south tip -> north along the Arabian Sea -> back south along the harbour.
 */
export const MAINLAND_LATLON: [number, number][] = [
  // --- West coast (Arabian Sea), south to north ---
  [18.8985, 72.8148], // Colaba Point
  [18.903, 72.8095], // Navy Nagar
  [18.913, 72.8125], // Cuffe Parade
  [18.921, 72.8185],
  [18.9245, 72.8206], // Nariman Point
  [18.93, 72.8193], // Marine Drive
  [18.937, 72.8186],
  [18.944, 72.817],
  [18.9505, 72.8143],
  [18.9548, 72.8129], // Girgaum Chowpatty
  [18.952, 72.806], // Malabar Hill, south shore
  [18.947, 72.7985], // Walkeshwar
  [18.9425, 72.794], // Malabar Point (Raj Bhavan)
  [18.947, 72.793],
  [18.956, 72.797], // Breach Candy
  [18.966, 72.803],
  [18.974, 72.806], // Bhulabhai Desai Road
  [18.9785, 72.8098],
  [18.9822, 72.8138], // Haji Ali bay bites inland, leaving the dargah offshore
  [18.9868, 72.8158],
  [18.9915, 72.8132],
  [19.0, 72.8118], // Worli Seaface
  [19.01, 72.8118],
  [19.0175, 72.8135], // Worli Point
  [19.02, 72.8215], // Mahim Bay
  [19.0225, 72.829], // Dadar Chowpatty
  [19.029, 72.835], // Shivaji Park
  [19.037, 72.8395], // Mahim
  [19.0415, 72.8412],
  [19.0435, 72.848], // Mahim Creek
  [19.047, 72.842],
  [19.0465, 72.833], // Bandra Reclamation
  [19.0475, 72.824],
  [19.0455, 72.8175], // Bandstand
  [19.0425, 72.8155], // Land's End / Bandra Fort
  [19.048, 72.815],
  [19.056, 72.819], // Chimbai
  [19.068, 72.8205], // Khar Danda
  [19.08, 72.8235],
  [19.095, 72.825], // Juhu Beach
  [19.108, 72.824],
  [19.125, 72.815], // Versova
  [19.14, 72.812],
  // --- Inland north + harbour side, north to south ---
  [19.145, 72.84],
  [19.14, 72.87],
  [19.12, 72.885],
  [19.095, 72.895],
  [19.07, 72.895],
  [19.05, 72.88],
  [19.04, 72.87], // Kurla / BKC
  [19.033, 72.862], // Dharavi
  [19.025, 72.87], // Sion
  [19.01, 72.872], // Wadala
  [19.0, 72.862], // Sewri
  [18.99, 72.853],
  [18.98, 72.848], // Reay Road
  [18.97, 72.846], // Mazgaon
  [18.96, 72.848], // Docks
  [18.948, 72.8455], // Ballard Estate
  [18.935, 72.842], // Fort
  [18.925, 72.839],
  [18.922, 72.836], // Apollo Bunder / Gateway of India
  [18.915, 72.83], // Colaba
  [18.906, 72.823], // Navy Nagar east
];

/** Gorai peninsula in the far north-west, home of the Global Vipassana Pagoda. */
export const GORAI_LATLON: [number, number][] = [
  [19.215, 72.798],
  [19.238, 72.798],
  [19.244, 72.812],
  [19.236, 72.822],
  [19.219, 72.818],
  [19.211, 72.808],
];

/** Elephanta Island (Gharapuri), out in Mumbai Harbour. */
export const ELEPHANTA_LATLON: [number, number][] = [
  [18.956, 72.925],
  [18.968, 72.921],
  [18.974, 72.933],
  [18.968, 72.943],
  [18.957, 72.939],
  [18.952, 72.931],
];

/** The rocky islet the Haji Ali Dargah stands on, 500 m off Worli. */
export const HAJI_ALI_ISLET_LATLON: [number, number][] = [
  [18.9819, 72.8079],
  [18.9832, 72.8085],
  [18.9836, 72.8101],
  [18.9827, 72.811],
  [18.9814, 72.8104],
  [18.9811, 72.8088],
];

export const MAINLAND = MAINLAND_LATLON.map(([a, b]) => geo(a, b));
export const GORAI = GORAI_LATLON.map(([a, b]) => geo(a, b));
export const ELEPHANTA = ELEPHANTA_LATLON.map(([a, b]) => geo(a, b));
export const HAJI_ALI_ISLET = HAJI_ALI_ISLET_LATLON.map(([a, b]) => geo(a, b));

export const LAND_POLYGONS = [MAINLAND, GORAI, ELEPHANTA, HAJI_ALI_ISLET];

export function pointInPolygon(x: number, z: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function onLand(x: number, z: number) {
  for (const p of LAND_POLYGONS) if (pointInPolygon(x, z, p)) return true;
  return false;
}

/** Approximate distance from (x,z) to the nearest coastline edge. Negative at sea. */
export function distanceToShore(x: number, z: number, poly: [number, number][]) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    const dx = xj - xi;
    const dz = zj - zi;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - xi) * dx + (z - zi) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = xi + t * dx;
    const pz = zi + t * dz;
    best = Math.min(best, Math.hypot(x - px, z - pz));
  }
  return best;
}
