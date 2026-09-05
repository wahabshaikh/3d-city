'use client';

import { useEffect, useRef } from 'react';
import { mapCanvas, mapX, mapZ, MAP } from '@/lib/game/mapTexture';
import { LANDMARKS, landmarkWorld } from '@/lib/mumbai/landmarks';
import { inPhase } from '@/lib/mumbai/bounds';
import { getState, live } from '@/lib/store';
import { copBlips } from '@/lib/game/police';
import { missionsW, passed } from '@/lib/game/missions';

/**
 * The radar. A crop of the baked map, rotated so the way you are facing is
 * always up, with a blip for anything worth walking towards and an arrow at
 * the centre that is you.
 */

export type Blip = {
  x: number;
  z: number;
  colour: string;
  /** Draw a ring instead of a dot — a destination rather than a place. */
  ring?: boolean;
};

const LM = LANDMARKS.filter((l) => inPhase(...landmarkWorld(l), 120)).map((l) => ({
  id: l.id,
  w: landmarkWorld(l),
}));

const SIZE = 178;
/** Metres from edge to edge of the radar. */
const SPAN = 340;

export function Radar({ blips = [] as Blip[] }: { blips?: Blip[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const blipRef = useRef(blips);
  blipRef.current = blips;

  useEffect(() => {
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const src = mapCanvas();

    const tick = () => {
      const cv = ref.current;
      if (cv) {
        if (cv.width !== SIZE * dpr) {
          cv.width = SIZE * dpr;
          cv.height = SIZE * dpr;
        }
        const ctx = cv.getContext('2d')!;
        const W = cv.width;
        const R = W / 2;
        const zoom = W / (SPAN * MAP.scale);
        const heading = (live.heading * Math.PI) / 180;

        ctx.save();
        ctx.clearRect(0, 0, W, W);
        ctx.beginPath();
        ctx.arc(R, R, R - dpr, 0, 7);
        ctx.clip();
        ctx.fillStyle = '#0d2c3e';
        ctx.fillRect(0, 0, W, W);

        ctx.translate(R, R);
        ctx.rotate(-heading);
        ctx.scale(zoom, zoom);
        ctx.translate(-mapX(live.x), -mapZ(live.z));
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(src, 0, 0);

        // Blips ride in map space so they rotate with it.
        const dot = (x: number, z: number, colour: string, ring: boolean, r: number) => {
          ctx.beginPath();
          ctx.arc(mapX(x), mapZ(z), r / zoom, 0, 7);
          if (ring) {
            ctx.strokeStyle = colour;
            ctx.lineWidth = 2.4 / zoom;
            ctx.stroke();
          } else {
            ctx.fillStyle = colour;
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.55)';
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();
          }
        };
        for (const l of LM) dot(l.w[0], l.w[1], '#f2c14e', false, 3 * dpr);
        for (const m of missionsW())
          if (!passed.has(m.id)) dot(m.world[0], m.world[1], '#ffd166', true, 5 * dpr);
        for (const c of copBlips()) dot(c.x, c.z, c.colour, false, 4.2 * dpr);
        const goal = getState().objectiveAt;
        if (goal) dot(goal[0], goal[1], '#ff5bb0', false, 5.2 * dpr);
        for (const b of blipRef.current) dot(b.x, b.z, b.colour, !!b.ring, 4.6 * dpr);
        ctx.restore();

        // The player, always at the centre and always pointing up.
        ctx.save();
        ctx.translate(R, R);
        ctx.beginPath();
        ctx.moveTo(0, -7 * dpr);
        ctx.lineTo(5 * dpr, 6 * dpr);
        ctx.lineTo(0, 3.2 * dpr);
        ctx.lineTo(-5 * dpr, 6 * dpr);
        ctx.closePath();
        ctx.fillStyle = getState().vehicle ? '#8ef0a0' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();
        ctx.restore();

        // North, so you can still find your way when the map is spinning.
        ctx.save();
        ctx.translate(R, R);
        ctx.rotate(-heading);
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.font = `600 ${10 * dpr}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('N', 0, -R + 12 * dpr);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        position: 'relative',
        borderRadius: '50%',
        boxShadow: '0 0 0 2px rgba(0,0,0,.55), 0 0 0 3.5px rgba(255,255,255,.22), 0 8px 26px rgba(0,0,0,.5)',
      }}
    >
      <canvas ref={ref} style={{ width: SIZE, height: SIZE, borderRadius: '50%', display: 'block' }} />
    </div>
  );
}
