'use client';

import * as THREE from 'three';
import { useMemo } from 'react';

/* ------------------------------- primitives ------------------------------- */

export type Hole = {
  cx: number;
  w: number;
  /** Height at which the arch springs from the jamb. */
  spring: number;
  h: number;
  kind?: 'round' | 'pointed' | 'ogee' | 'square';
};

export function archPath(hole: Hole): THREE.Path {
  const { cx, w, spring, h, kind = 'round' } = hole;
  const hw = w / 2;
  const p = new THREE.Path();
  p.moveTo(cx - hw, 0);
  p.lineTo(cx - hw, spring);
  if (kind === 'square') {
    p.lineTo(cx - hw, h);
    p.lineTo(cx + hw, h);
  } else if (kind === 'pointed') {
    p.quadraticCurveTo(cx - hw * 0.92, spring + (h - spring) * 0.72, cx, h);
    p.quadraticCurveTo(cx + hw * 0.92, spring + (h - spring) * 0.72, cx + hw, spring);
  } else if (kind === 'ogee') {
    // Mughal/Indo-Islamic cusped profile: swells out, then curls to a point.
    p.bezierCurveTo(
      cx - hw * 1.16,
      spring + (h - spring) * 0.34,
      cx - hw * 0.5,
      spring + (h - spring) * 0.62,
      cx,
      h
    );
    p.bezierCurveTo(
      cx + hw * 0.5,
      spring + (h - spring) * 0.62,
      cx + hw * 1.16,
      spring + (h - spring) * 0.34,
      cx + hw,
      spring
    );
  } else {
    p.absarc(cx, spring, hw, Math.PI, 0, true);
  }
  p.lineTo(cx + hw, 0);
  p.lineTo(cx - hw, 0);
  return p;
}

/** A wall panel of width `w` and height `h`, `d` thick, pierced by arches. */
export function wallGeometry(w: number, h: number, d: number, holes: Hole[] = []) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.lineTo(-w / 2, 0);
  shape.holes = holes.map(archPath);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}

export function Wall({
  w,
  h,
  d,
  holes,
  material,
  ...props
}: {
  w: number;
  h: number;
  d: number;
  holes?: Hole[];
  material: THREE.Material;
} & Omit<React.ComponentProps<'mesh'>, 'material'>) {
  const geo = useMemo(() => wallGeometry(w, h, d, holes), [w, h, d, holes]);
  return <mesh geometry={geo} material={material} castShadow receiveShadow {...props} />;
}

/** Dome profile: `bulge` > 0 gives an onion, 0 a hemisphere. */
export function domeGeometry(r: number, h: number, bulge = 0, segments = 40) {
  const pts: THREE.Vector2[] = [];
  const N = 26;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = (t * Math.PI) / 2;
    const rr = Math.cos(a) * r * (1 + bulge * Math.sin(a * 2));
    pts.push(new THREE.Vector2(Math.max(0.0001, rr), Math.sin(a) * h));
  }
  return new THREE.LatheGeometry(pts, segments);
}

export function Dome({
  r,
  h,
  bulge = 0,
  ribs = 0,
  ribTube = 0.22,
  material,
  ...props
}: {
  r: number;
  h: number;
  bulge?: number;
  ribs?: number;
  ribTube?: number;
  material: THREE.Material;
} & Omit<React.ComponentProps<'group'>, 'material'>) {
  const geo = useMemo(() => domeGeometry(r, h, bulge), [r, h, bulge]);
  const ribGeo = useMemo(() => {
    if (!ribs) return null;
    const g = new THREE.TorusGeometry(1, ribTube / Math.max(r, 1), 6, 40, Math.PI);
    return g;
  }, [ribs, ribTube, r]);
  return (
    <group {...props}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
      {ribGeo &&
        Array.from({ length: ribs }, (_, i) => (
          <mesh
            key={i}
            geometry={ribGeo}
            material={material}
            scale={[r * 1.008, h * 1.008, r * 1.008]}
            rotation={[0, (i * Math.PI) / ribs, 0]}
            castShadow
          />
        ))}
    </group>
  );
}

/** Kalash / finial: the stacked pot-and-spike that tops most Indian domes. */
export function Finial({
  h = 3,
  r = 0.5,
  material,
  ...props
}: { h?: number; r?: number; material: THREE.Material } & Omit<
  React.ComponentProps<'group'>,
  'material'
>) {
  return (
    <group {...props}>
      <mesh material={material} castShadow>
        <cylinderGeometry args={[r * 1.5, r * 1.7, h * 0.12, 12]} />
      </mesh>
      <mesh material={material} position={[0, h * 0.22, 0]} castShadow>
        <sphereGeometry args={[r * 1.15, 14, 10]} />
      </mesh>
      <mesh material={material} position={[0, h * 0.48, 0]} castShadow>
        <cylinderGeometry args={[r * 0.28, r * 0.6, h * 0.36, 10]} />
      </mesh>
      <mesh material={material} position={[0, h * 0.78, 0]} castShadow>
        <sphereGeometry args={[r * 0.42, 10, 8]} />
      </mesh>
      <mesh material={material} position={[0, h * 0.94, 0]} castShadow>
        <coneGeometry args={[r * 0.2, h * 0.24, 8]} />
      </mesh>
    </group>
  );
}

/** Chhatri: the open domed kiosk on four (or eight) columns. */
export function Chhatri({
  r,
  colH,
  domeH,
  cols = 8,
  bulge = 0.12,
  material,
  ...props
}: {
  r: number;
  colH: number;
  domeH: number;
  cols?: number;
  bulge?: number;
  material: THREE.Material;
} & Omit<React.ComponentProps<'group'>, 'material'>) {
  return (
    <group {...props}>
      <mesh material={material} position={[0, 0.2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[r * 1.15, r * 1.25, 0.4, cols * 2]} />
      </mesh>
      {Array.from({ length: cols }, (_, i) => {
        const a = (i / cols) * Math.PI * 2;
        return (
          <mesh
            key={i}
            material={material}
            position={[Math.cos(a) * r * 0.86, colH / 2 + 0.4, Math.sin(a) * r * 0.86]}
            castShadow
          >
            <cylinderGeometry args={[r * 0.1, r * 0.11, colH, 8]} />
          </mesh>
        );
      })}
      <mesh material={material} position={[0, colH + 0.65, 0]} castShadow>
        <cylinderGeometry args={[r * 1.1, r * 1.05, 0.5, cols * 2]} />
      </mesh>
      <Dome r={r} h={domeH} bulge={bulge} material={material} position={[0, colH + 0.9, 0]} />
      <Finial h={domeH * 0.5} r={r * 0.16} material={material} position={[0, colH + 0.9 + domeH, 0]} />
    </group>
  );
}

/** Octagonal or square corner turret with a small dome or spire. */
export function Turret({
  r,
  h,
  sides = 8,
  cap = 'dome',
  material,
  ...props
}: {
  r: number;
  h: number;
  sides?: number;
  cap?: 'dome' | 'spire' | 'none';
  material: THREE.Material;
} & Omit<React.ComponentProps<'group'>, 'material'>) {
  return (
    <group {...props}>
      <mesh material={material} position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r * 0.9, r, h, sides]} />
      </mesh>
      <mesh material={material} position={[0, h * 0.72, 0]} castShadow>
        <cylinderGeometry args={[r * 1.12, r * 1.12, h * 0.05, sides]} />
      </mesh>
      <mesh material={material} position={[0, h + 0.2, 0]} castShadow>
        <cylinderGeometry args={[r * 1.06, r * 1.06, 0.4, sides]} />
      </mesh>
      {cap === 'dome' && (
        <>
          <Dome r={r} h={r * 1.15} bulge={0.1} material={material} position={[0, h + 0.4, 0]} />
          <Finial h={r * 1.1} r={r * 0.16} material={material} position={[0, h + 0.4 + r * 1.15, 0]} />
        </>
      )}
      {cap === 'spire' && (
        <>
          <mesh material={material} position={[0, h + 0.4 + r * 2.2, 0]} castShadow>
            <coneGeometry args={[r * 1.02, r * 4.4, sides]} />
          </mesh>
          <mesh material={material} position={[0, h + 0.4 + r * 4.7, 0]} castShadow>
            <sphereGeometry args={[r * 0.2, 8, 6]} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** Steep Gothic gable with a rose-window roundel. */
export function Gable({
  w,
  h,
  d,
  material,
  roundel = true,
  ...props
}: {
  w: number;
  h: number;
  d: number;
  material: THREE.Material;
  roundel?: boolean;
} & Omit<React.ComponentProps<'group'>, 'material'>) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.lineTo(-w / 2, 0);
    if (roundel) {
      const hole = new THREE.Path();
      hole.absarc(0, h * 0.38, Math.min(w, h) * 0.15, 0, Math.PI * 2, false);
      s.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 14 });
    g.translate(0, 0, -d / 2);
    return g;
  }, [w, h, d, roundel]);
  return (
    <group {...props}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
    </group>
  );
}

/** A run of columns carrying a lintel — verandah, arcade or portico. */
export function Colonnade({
  count,
  span,
  h,
  r,
  material,
  ...props
}: {
  count: number;
  span: number;
  h: number;
  r: number;
  material: THREE.Material;
} & Omit<React.ComponentProps<'group'>, 'material'>) {
  return (
    <group {...props}>
      {Array.from({ length: count }, (_, i) => {
        const x = -span / 2 + (span / (count - 1)) * i;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh material={material} position={[0, h / 2, 0]} castShadow>
              <cylinderGeometry args={[r, r * 1.08, h, 12]} />
            </mesh>
            <mesh material={material} position={[0, h + 0.18, 0]} castShadow>
              <boxGeometry args={[r * 3, 0.36, r * 3]} />
            </mesh>
            <mesh material={material} position={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[r * 3, 0.36, r * 3]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Simple moulded string course / cornice band. */
export function Cornice({
  w,
  d,
  y,
  t = 0.5,
  overhang = 0.6,
  material,
}: {
  w: number;
  d: number;
  y: number;
  t?: number;
  overhang?: number;
  material: THREE.Material;
}) {
  return (
    <group position={[0, y, 0]}>
      <mesh material={material} castShadow receiveShadow>
        <boxGeometry args={[w + overhang * 2, t, d + overhang * 2]} />
      </mesh>
      <mesh material={material} position={[0, -t * 0.8, 0]} castShadow>
        <boxGeometry args={[w + overhang, t * 0.6, d + overhang]} />
      </mesh>
    </group>
  );
}

/** Balustrade running around a roof or terrace. */
export function Balustrade({
  w,
  d,
  h = 1.1,
  material,
  ...props
}: { w: number; d: number; h?: number; material: THREE.Material } & Omit<
  React.ComponentProps<'group'>,
  'material'
>) {
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    const stepX = w / Math.max(2, Math.round(w / 1.6));
    const stepZ = d / Math.max(2, Math.round(d / 1.6));
    for (let x = -w / 2; x <= w / 2 + 0.01; x += stepX) {
      out.push([x, -d / 2]);
      out.push([x, d / 2]);
    }
    for (let z = -d / 2 + stepZ; z < d / 2 - 0.01; z += stepZ) {
      out.push([-w / 2, z]);
      out.push([w / 2, z]);
    }
    return out;
  }, [w, d]);
  return (
    <group {...props}>
      {posts.map(([x, z], i) => (
        <mesh key={i} material={material} position={[x, h / 2, z]} castShadow>
          <cylinderGeometry args={[h * 0.16, h * 0.2, h, 6]} />
        </mesh>
      ))}
      {[
        [0, -d / 2, w, 0.3],
        [0, d / 2, w, 0.3],
      ].map(([x, z, len], i) => (
        <mesh key={`r${i}`} material={material} position={[x, h, z]} castShadow>
          <boxGeometry args={[len + 0.3, 0.22, 0.44]} />
        </mesh>
      ))}
      {[-w / 2, w / 2].map((x, i) => (
        <mesh key={`s${i}`} material={material} position={[x, h, 0]} castShadow>
          <boxGeometry args={[0.44, 0.22, d]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Hipped roof: a `w` × `d` footprint rising to a ridge of length `w - 2*inset`.
 * The Victorian Gothic ranges of the Fort all wear one.
 */
export function hipRoofGeometry(w: number, d: number, h: number, inset = 0) {
  const hw = w / 2;
  const hd = d / 2;
  const rw = Math.max(0.2, hw - inset);
  const v = new Float32Array([
    // base
    -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
    // ridge
    -rw, h, 0, rw, h, 0,
  ]);
  const idx = [
    0, 1, 5, 0, 5, 4, // back slope
    2, 3, 4, 2, 4, 5, // front slope
    1, 2, 5, // right hip
    3, 0, 4, // left hip
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function HipRoof({
  w,
  d,
  h,
  inset = 0,
  material,
  ...props
}: {
  w: number;
  d: number;
  h: number;
  inset?: number;
  material: THREE.Material;
} & Omit<React.ComponentProps<'mesh'>, 'material'>) {
  const geo = useMemo(() => hipRoofGeometry(w, d, h, inset), [w, d, h, inset]);
  return <mesh geometry={geo} material={material} castShadow receiveShadow {...props} />;
}

/** Jali: pierced stone screen. Rendered as an alpha-tested grid. */
export function jaliTexture(size = 256, holes = 8) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#000';
  const cell = size / holes;
  for (let i = 0; i < holes; i++)
    for (let j = 0; j < holes; j++) {
      g.save();
      g.translate((i + 0.5) * cell, (j + 0.5) * cell);
      g.rotate(Math.PI / 4);
      g.fillRect(-cell * 0.3, -cell * 0.3, cell * 0.6, cell * 0.6);
      g.restore();
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
