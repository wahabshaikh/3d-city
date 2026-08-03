'use client';

import { useEffect, useRef } from 'react';
import { MAINLAND, GORAI, ELEPHANTA } from '@/lib/mumbai/coastline';
import { ROADS, RAIL_LINES, roadWorld, railWorld } from '@/lib/mumbai/roads';
import { LANDMARKS, landmarkWorld } from '@/lib/mumbai/landmarks';
import { live } from '@/lib/store';

type View = { cx: number; cz: number; scale: number };

const LM = LANDMARKS.map((l) => ({ ...l, w: landmarkWorld(l) }));

function draw(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  view: View,
  opts: { labels: boolean; dpr: number; hoveredId?: string | null }
) {
  const { cx, cz, scale } = view;
  const px = (x: number) => (x - cx) * scale + W / 2;
  const py = (z: number) => (z - cz) * scale + H / 2;

  ctx.clearRect(0, 0, W, H);

  // sea
  ctx.fillStyle = '#0e2430';
  ctx.fillRect(0, 0, W, H);

  // land
  for (const poly of [MAINLAND, GORAI, ELEPHANTA]) {
    ctx.beginPath();
    poly.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), py(z)) : ctx.moveTo(px(x), py(z))));
    ctx.closePath();
    ctx.fillStyle = '#232019';
    ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,.32)';
    ctx.lineWidth = 1 * opts.dpr;
    ctx.stroke();
  }

  // rail
  ctx.lineWidth = 1.4 * opts.dpr;
  for (const line of RAIL_LINES) {
    ctx.beginPath();
    railWorld(line).forEach(([x, z], i) => (i ? ctx.lineTo(px(x), py(z)) : ctx.moveTo(px(x), py(z))));
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.setLineDash([4 * opts.dpr, 4 * opts.dpr]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // roads
  for (const r of ROADS) {
    ctx.beginPath();
    roadWorld(r).forEach(([x, z], i) => (i ? ctx.lineTo(px(x), py(z)) : ctx.moveTo(px(x), py(z))));
    ctx.strokeStyle =
      r.kind === 'bridge' ? 'rgba(242,193,78,.72)' : 'rgba(214,203,180,.28)';
    ctx.lineWidth = (r.kind === 'artery' || r.kind === 'bridge' ? 1.9 : 1.1) * opts.dpr;
    ctx.stroke();
  }

  // landmarks
  for (const l of LM) {
    const x = px(l.w[0]);
    const y = py(l.w[1]);
    if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
    const hot = opts.hoveredId === l.id;
    ctx.beginPath();
    ctx.arc(x, y, (hot ? 5 : 3.2) * opts.dpr, 0, 7);
    ctx.fillStyle = hot ? '#fff' : '#f2c14e';
    ctx.fill();
    if (opts.labels) {
      ctx.font = `${11 * opts.dpr}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = hot ? '#fff' : 'rgba(244,238,230,.78)';
      ctx.textAlign = 'left';
      ctx.fillText(l.name, x + 8 * opts.dpr, y + 4 * opts.dpr);
    }
  }

  // player
  const ax = px(live.x);
  const ay = py(live.z);
  const a = (live.heading * Math.PI) / 180;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, -8 * opts.dpr);
  ctx.lineTo(5.4 * opts.dpr, 6 * opts.dpr);
  ctx.lineTo(0, 3 * opts.dpr);
  ctx.lineTo(-5.4 * opts.dpr, 6 * opts.dpr);
  ctx.closePath();
  ctx.fillStyle = '#7ee0ff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 1 * opts.dpr;
  ctx.stroke();
  ctx.restore();
}

export function MiniMap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const cv = ref.current;
      if (cv) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const size = 168;
        if (cv.width !== size * dpr) {
          cv.width = size * dpr;
          cv.height = size * dpr;
        }
        const ctx = cv.getContext('2d')!;
        draw(ctx, cv.width, cv.height, { cx: live.x, cz: live.z, scale: 0.052 * dpr }, {
          labels: false,
          dpr,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        width: 168,
        height: 168,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,.14)',
        background: '#0e2430',
      }}
    />
  );
}

export function BigMap({ onPick }: { onPick: (id: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hovered = useRef<string | null>(null);
  const viewRef = useRef<View>({ cx: 0, cz: 0, scale: 1 });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const cv = ref.current;
      if (cv) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = cv.getBoundingClientRect();
        if (cv.width !== rect.width * dpr) {
          cv.width = rect.width * dpr;
          cv.height = rect.height * dpr;
        }
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (const [x, z] of [...MAINLAND, ...GORAI, ...ELEPHANTA]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
        const pad = 120;
        const scale = Math.min(
          cv.width / (maxX - minX + pad * 2),
          cv.height / (maxZ - minZ + pad * 2)
        );
        const view = { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, scale };
        viewRef.current = view;
        draw(ref.current!.getContext('2d')!, cv.width, cv.height, view, {
          labels: true,
          dpr,
          hoveredId: hovered.current,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const hit = (e: React.MouseEvent) => {
    const cv = ref.current!;
    const rect = cv.getBoundingClientRect();
    const dpr = cv.width / rect.width;
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const { cx, cz, scale } = viewRef.current;
    let best: string | null = null;
    let bestD = 22 * dpr;
    for (const l of LM) {
      const x = (l.w[0] - cx) * scale + cv.width / 2;
      const y = (l.w[1] - cz) * scale + cv.height / 2;
      const d = Math.hypot(mx - x, my - y);
      if (d < bestD) {
        bestD = d;
        best = l.id;
      }
    }
    return best;
  };

  return (
    <canvas
      ref={ref}
      onMouseMove={(e) => {
        hovered.current = hit(e);
        (e.currentTarget as HTMLCanvasElement).style.cursor = hovered.current
          ? 'pointer'
          : 'default';
      }}
      onClick={(e) => {
        const id = hit(e);
        if (id) onPick(id);
      }}
      style={{ width: '100%', height: '100%', display: 'block', borderRadius: 14 }}
    />
  );
}
