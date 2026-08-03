'use client';

import * as THREE from 'three';
import { mulberry32 } from './rng';

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function tex(c: HTMLCanvasElement, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function memo(key: string, make: () => THREE.Texture) {
  let t = cache.get(key);
  if (!t) cache.set(key, (t = make()));
  return t;
}

/* ------------------------------- facades --------------------------------- */

export type FacadeKind = 'deco' | 'colonial' | 'modern' | 'chawl' | 'slum' | 'tower' | 'mill';

const S = 512;

/**
 * Facades are drawn white-on-dark so the material's `color` can tint them to
 * whatever the district's palette calls for. One tile is 4 windows across.
 */
function drawFacade(kind: FacadeKind, seed: number) {
  const { c, g } = canvas(S, S);
  const r = mulberry32(seed);
  const cols = kind === 'slum' ? 2 : kind === 'tower' ? 8 : 4;
  const rows = kind === 'slum' ? 2 : kind === 'tower' ? 8 : 4;
  const cw = S / cols;
  const ch = S / rows;

  g.fillStyle = '#efeae2';
  g.fillRect(0, 0, S, S);

  // Grime: monsoon streaks and mildew, the default finish in Mumbai.
  for (let i = 0; i < 420; i++) {
    const x = r() * S;
    const y = r() * S;
    g.fillStyle = `rgba(${60 + r() * 40},${58 + r() * 40},${50 + r() * 30},${0.02 + r() * 0.06})`;
    g.fillRect(x, y, 2 + r() * 40, 2 + r() * 90);
  }

  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const x = cx * cw;
      const y = cy * ch;

      if (kind === 'slum') {
        if (r() < 0.45) {
          g.fillStyle = '#2b2723';
          g.fillRect(x + cw * 0.3, y + ch * 0.35, cw * 0.35, ch * 0.5);
        }
        continue;
      }

      const pad = kind === 'tower' ? 0.06 : 0.22;
      const wx = x + cw * pad;
      const wy = y + ch * (kind === 'tower' ? 0.14 : 0.2);
      const ww = cw * (1 - pad * 2);
      const wh = ch * (kind === 'tower' ? 0.66 : 0.5);

      // Glass
      const shade = 32 + r() * 34;
      g.fillStyle =
        kind === 'tower'
          ? `rgb(${shade + 20},${shade + 34},${shade + 46})`
          : `rgb(${shade},${shade + 4},${shade + 8})`;
      g.fillRect(wx, wy, ww, wh);

      // Reflection highlight
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.beginPath();
      g.moveTo(wx, wy + wh);
      g.lineTo(wx + ww * 0.55, wy);
      g.lineTo(wx + ww, wy);
      g.lineTo(wx + ww, wy + wh * 0.3);
      g.closePath();
      g.fill();

      if (kind !== 'tower') {
        // Mullions
        g.strokeStyle = 'rgba(240,238,232,.85)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(wx + ww / 2, wy);
        g.lineTo(wx + ww / 2, wy + wh);
        g.stroke();
        // Sill
        g.fillStyle = 'rgba(255,255,255,.75)';
        g.fillRect(wx - 4, wy + wh, ww + 8, 6);
      }

      if (kind === 'colonial') {
        // Round-headed opening with a keystone
        g.fillStyle = '#efeae2';
        g.beginPath();
        g.arc(wx + ww / 2, wy, ww / 2 + 3, Math.PI, 0);
        g.fill();
        g.fillStyle = 'rgba(40,38,34,.9)';
        g.beginPath();
        g.arc(wx + ww / 2, wy, ww / 2 - 1, Math.PI, 0);
        g.fill();
      }

      if (kind === 'chawl') {
        // Common balcony with railings and hanging washing
        g.fillStyle = 'rgba(120,116,108,.9)';
        g.fillRect(x, y + ch * 0.72, cw, 7);
        g.strokeStyle = 'rgba(90,88,82,.85)';
        g.lineWidth = 2.5;
        for (let i = 0; i < 7; i++) {
          g.beginPath();
          g.moveTo(x + (i + 0.5) * (cw / 7), y + ch * 0.58);
          g.lineTo(x + (i + 0.5) * (cw / 7), y + ch * 0.73);
          g.stroke();
        }
        if (r() < 0.7) {
          const hues = ['#c8442f', '#2f7ac8', '#d8a52f', '#3fa06a', '#b8449a'];
          for (let i = 0; i < 3; i++) {
            g.fillStyle = hues[Math.floor(r() * hues.length)];
            g.globalAlpha = 0.85;
            g.fillRect(x + cw * (0.12 + i * 0.28), y + ch * 0.58, cw * 0.16, ch * 0.13);
            g.globalAlpha = 1;
          }
        }
      }

      // Air conditioner boxes
      if (kind !== 'colonial' && r() < 0.24) {
        g.fillStyle = 'rgba(228,226,220,.95)';
        g.fillRect(wx + ww * 0.62, wy + wh + 7, ww * 0.34, ch * 0.13);
      }
    }
  }

  if (kind === 'deco') {
    // Horizontal deco banding between floors
    g.fillStyle = 'rgba(255,255,255,.5)';
    for (let cy = 0; cy < rows; cy++) g.fillRect(0, cy * ch + ch * 0.92, S, 8);
  }
  if (kind === 'mill') {
    g.strokeStyle = 'rgba(70,64,56,.45)';
    g.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      g.beginPath();
      g.moveTo(0, (i * S) / 20);
      g.lineTo(S, (i * S) / 20);
      g.stroke();
    }
  }
  return c;
}

function drawFacadeLights(kind: FacadeKind, seed: number) {
  const { c, g } = canvas(S, S);
  const r = mulberry32(seed + 999);
  const cols = kind === 'slum' ? 2 : kind === 'tower' ? 8 : 4;
  const rows = kind === 'slum' ? 2 : kind === 'tower' ? 8 : 4;
  const cw = S / cols;
  const ch = S / rows;
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  for (let cx = 0; cx < cols; cx++)
    for (let cy = 0; cy < rows; cy++) {
      if (r() > (kind === 'tower' ? 0.55 : 0.6)) continue;
      const warm = r();
      g.fillStyle =
        kind === 'slum'
          ? '#ffb765'
          : warm < 0.6
            ? `rgb(255,${185 + r() * 40},${110 + r() * 60})`
            : `rgb(${190 + r() * 40},${215 + r() * 30},255)`;
      const pad = kind === 'tower' ? 0.06 : 0.22;
      g.fillRect(
        cx * cw + cw * pad,
        cy * ch + ch * (kind === 'tower' ? 0.14 : 0.2),
        cw * (1 - pad * 2),
        ch * (kind === 'tower' ? 0.66 : 0.5)
      );
    }
  return c;
}

export function facade(kind: FacadeKind) {
  return memo(`facade:${kind}`, () => tex(drawFacade(kind, kind.length * 7717)));
}
export function facadeLights(kind: FacadeKind) {
  return memo(`facadeL:${kind}`, () => tex(drawFacadeLights(kind, kind.length * 7717)));
}

/* -------------------------------- surfaces -------------------------------- */

export function groundTexture() {
  return memo('ground', () => {
    const { c, g } = canvas(512, 512);
    const r = mulberry32(4242);
    g.fillStyle = '#5f5a4d';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) {
      const v = r();
      g.fillStyle = `rgba(${70 + v * 66},${66 + v * 62},${52 + v * 52},${0.08 + r() * 0.24})`;
      g.fillRect(r() * 512, r() * 512, 1 + r() * 9, 1 + r() * 9);
    }
    // scrub and the dusty green of the maidans — sparse, this is a paved city
    for (let i = 0; i < 130; i++) {
      g.fillStyle = `rgba(${62 + r() * 30},${72 + r() * 32},${48 + r() * 26},${0.08 + r() * 0.18})`;
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 4 + r() * 26, 4 + r() * 20, r() * 3, 0, 7);
      g.fill();
    }
    const t = tex(c, 60);
    return t;
  });
}

export function sandTexture() {
  return memo('sand', () => {
    const { c, g } = canvas(256, 256);
    const r = mulberry32(77);
    g.fillStyle = '#c4ad8b';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const v = r();
      g.fillStyle = `rgba(${150 + v * 70},${132 + v * 62},${100 + v * 54},${0.15 + r() * 0.3})`;
      g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
    }
    return tex(c, 26);
  });
}

export function roadTexture() {
  return memo('road', () => {
    const { c, g } = canvas(128, 512);
    const r = mulberry32(31);
    g.fillStyle = '#3c3a38';
    g.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 2600; i++) {
      const v = r();
      g.fillStyle = `rgba(${70 + v * 60},${68 + v * 58},${66 + v * 56},${0.05 + r() * 0.22})`;
      g.fillRect(r() * 128, r() * 512, 1 + r() * 5, 1 + r() * 5);
    }
    // Centre line dashes
    g.fillStyle = 'rgba(226,214,150,.65)';
    for (let y = 0; y < 512; y += 64) g.fillRect(62, y, 4, 34);
    // Kerb edges
    g.fillStyle = 'rgba(238,236,230,.4)';
    g.fillRect(4, 0, 3, 512);
    g.fillRect(121, 0, 3, 512);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

export function waterNormals() {
  return memo('waterN', () => {
    const N = 256;
    const { c, g } = canvas(N, N);
    const img = g.createImageData(N, N);
    const r = mulberry32(9001);
    const grid = 32;
    const gx: number[] = [];
    const gy: number[] = [];
    for (let i = 0; i < grid * grid; i++) {
      const a = r() * Math.PI * 2;
      gx.push(Math.cos(a));
      gy.push(Math.sin(a));
    }
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const noise = (x: number, y: number) => {
      const x0 = Math.floor(x) & (grid - 1);
      const y0 = Math.floor(y) & (grid - 1);
      const x1 = (x0 + 1) & (grid - 1);
      const y1 = (y0 + 1) & (grid - 1);
      const fx = x - Math.floor(x);
      const fy = y - Math.floor(y);
      const d = (ix: number, iy: number, dx: number, dy: number) =>
        gx[iy * grid + ix] * dx + gy[iy * grid + ix] * dy;
      const u = fade(fx);
      const v = fade(fy);
      const n00 = d(x0, y0, fx, fy);
      const n10 = d(x1, y0, fx - 1, fy);
      const n01 = d(x0, y1, fx, fy - 1);
      const n11 = d(x1, y1, fx - 1, fy - 1);
      return (n00 + u * (n10 - n00) + v * (n01 - n00 + u * (n11 - n01 - n10 + n00))) * 0.5 + 0.5;
    };
    const height = (x: number, y: number) =>
      noise(x * 4, y * 4) * 0.6 + noise(x * 11, y * 11) * 0.3 + noise(x * 23, y * 23) * 0.1;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const s = 1 / N;
        const hL = height((x - 1) * s * grid, y * s * grid);
        const hR = height((x + 1) * s * grid, y * s * grid);
        const hD = height(x * s * grid, (y - 1) * s * grid);
        const hU = height(x * s * grid, (y + 1) * s * grid);
        const nx = (hL - hR) * 2.2;
        const ny = (hD - hU) * 2.2;
        const nz = 1;
        const len = Math.hypot(nx, ny, nz);
        const i = (y * N + x) * 4;
        img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

/** Coursed ashlar for the Victorian Gothic and Indo-Saracenic landmarks. */
export function stoneTexture(key: string, base: string, mortar: string, courses = 8) {
  return memo(`stone:${key}`, () => {
    const { c, g } = canvas(256, 256);
    const r = mulberry32(key.length * 613 + 7);
    g.fillStyle = mortar;
    g.fillRect(0, 0, 256, 256);
    const h = 256 / courses;
    for (let row = 0; row < courses; row++) {
      const off = (row % 2) * (256 / 8);
      for (let col = 0; col < 8; col++) {
        const x = ((col * 256) / 8 + off) % 256;
        g.save();
        g.beginPath();
        g.rect(x + 1.5, row * h + 1.5, 256 / 8 - 3, h - 3);
        g.clip();
        g.fillStyle = base;
        g.fillRect(x, row * h, 256 / 8, h);
        for (let i = 0; i < 24; i++) {
          g.fillStyle = `rgba(${40 + r() * 150},${40 + r() * 140},${34 + r() * 120},${0.05 + r() * 0.13})`;
          g.fillRect(x + r() * 32, row * h + r() * h, 2 + r() * 10, 2 + r() * 8);
        }
        g.restore();
      }
    }
    return tex(c, 1);
  });
}

export function tinTexture() {
  return memo('tin', () => {
    const { c, g } = canvas(256, 256);
    const r = mulberry32(515);
    g.fillStyle = '#8a8378';
    g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 10) {
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.fillRect(x, 0, 4, 256);
      g.fillStyle = 'rgba(0,0,0,.16)';
      g.fillRect(x + 5, 0, 4, 256);
    }
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(${130 + r() * 60},${70 + r() * 40},${34 + r() * 26},${0.1 + r() * 0.4})`;
      g.beginPath();
      g.ellipse(r() * 256, r() * 256, 3 + r() * 16, 3 + r() * 12, 0, 0, 7);
      g.fill();
    }
    return tex(c, 1);
  });
}

export function tarpTexture() {
  return memo('tarp', () => {
    const { c, g } = canvas(256, 256);
    const r = mulberry32(88);
    g.fillStyle = '#2f6fae';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${20 + r() * 60},${80 + r() * 70},${140 + r() * 90},${0.12 + r() * 0.3})`;
      g.fillRect(r() * 256, r() * 256, 2 + r() * 30, 1 + r() * 5);
    }
    return tex(c, 1);
  });
}

/** Faded film posters. Abstract enough to evoke, not to imitate anyone real. */
export function hoardingTexture(i: number) {
  return memo(`hoard:${i}`, () => {
    const { c, g } = canvas(512, 256);
    const r = mulberry32(1200 + i * 97);
    const beds: [string, string][] = [
      ['#d8342a', '#f2c14e'],
      ['#1f7a8c', '#f4e3b2'],
      ['#7a2f6a', '#f09b3d'],
      ['#12603f', '#e8d36b'],
      ['#c2185b', '#ffd9a0'],
      ['#1a3a72', '#ff9f43'],
    ];
    const [a, b] = beds[i % beds.length];
    const grd = g.createLinearGradient(0, 0, 512, 256);
    grd.addColorStop(0, a);
    grd.addColorStop(1, b);
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 256);

    // A hero silhouette, the standard grammar of a Mumbai hoarding
    g.fillStyle = 'rgba(20,12,10,.62)';
    g.beginPath();
    g.ellipse(150, 120, 52, 66, 0, 0, 7);
    g.fill();
    g.beginPath();
    g.moveTo(60, 256);
    g.quadraticCurveTo(150, 150, 240, 256);
    g.fill();

    // Title block + Devanagari-ish strokes
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.fillRect(280, 60, 200, 10);
    for (let k = 0; k < 5; k++) {
      const w = 40 + r() * 130;
      g.fillStyle = k === 0 ? '#fff' : 'rgba(255,255,255,.72)';
      g.fillRect(280, 86 + k * 26, w, k === 0 ? 20 : 12);
    }
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(0, 232, 512, 24);
    return tex(c, 1);
  });
}

/** Ganesh pandal / temple cloth: saffron with gold trim. */
export function clothTexture(colour: string, trim: string) {
  return memo(`cloth:${colour}${trim}`, () => {
    const { c, g } = canvas(128, 128);
    g.fillStyle = colour;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = trim;
    for (let i = 0; i < 128; i += 16) g.fillRect(0, i, 128, 3);
    return tex(c, 1);
  });
}
