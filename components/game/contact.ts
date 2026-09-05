import * as THREE from 'three';

/**
 * A contact shadow.
 *
 * The sun's shadow map covers three hundred metres of city, which leaves a
 * person about two texels wide — enough for a building, nothing at all for a
 * pair of feet. So everything the player looks at up close also gets a soft
 * blob laid on the ground under it. It is a cheat, and it is the single
 * cheapest thing you can do to stop a character reading as floating.
 */

let tex: THREE.Texture | null = null;

function blobTexture() {
  if (tex) return tex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.62)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.34)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  tex = new THREE.CanvasTexture(cv);
  return tex;
}

let mat: THREE.MeshBasicMaterial | null = null;

export function contactMaterial() {
  if (mat) return mat;
  mat = new THREE.MeshBasicMaterial({
    map: blobTexture(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    toneMapped: false,
  });
  return mat;
}

let geo: THREE.PlaneGeometry | null = null;

export function contactGeometry() {
  if (!geo) {
    geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
  }
  return geo;
}
