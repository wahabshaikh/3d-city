'use client';

import { useEffect, useRef } from 'react';
import { TOUR, TOUR_SECONDS, stopDuration } from '@/lib/mumbai/tour';
import { live, useStore, getState, leaveTour, tourGo, tourPlay } from '@/lib/store';

const gold = '#f2c14e';
const panel: React.CSSProperties = {
  background: 'rgba(12,9,16,.74)',
  border: '1px solid rgba(255,255,255,.12)',
  backdropFilter: 'blur(12px)',
  borderRadius: 14,
};

/** The cut to black between one shot and the next. Polls, never re-renders. */
export function TourFade() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) el.style.opacity = String(live.fade);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#05040a',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}

export function TourPanel() {
  const index = useStore((s) => s.tour);
  const playing = useStore((s) => s.tourPlaying);
  const barRef = useRef<HTMLDivElement>(null);

  // Space plays and pauses, the arrows step between stops, Esc leaves.
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        tourPlay(!getState().tourPlaying);
      } else if (e.code === 'ArrowRight') tourGo(Math.min(index + 1, TOUR.length - 1));
      else if (e.code === 'ArrowLeft') tourGo(Math.max(index - 1, 0));
      else if (e.code === 'Escape') leaveTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    let raf = 0;
    const tick = () => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${live.stopProgress})`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [index]);

  if (index === null) return null;
  const i = Math.max(0, Math.min(index, TOUR.length - 1));
  const stop = TOUR[i];
  const elapsed = TOUR.slice(0, i).reduce((n, s) => n + stopDuration(s), 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 6,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Where we are in the itinerary */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '14px 20px 0',
        }}
      >
        <div
          style={{
            ...panel,
            pointerEvents: 'auto',
            padding: '9px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 12.5,
            letterSpacing: '.06em',
            color: 'rgba(244,238,230,.72)',
          }}
        >
          <span style={{ color: gold, letterSpacing: '.16em', textTransform: 'uppercase' }}>
            Mumbai tour
          </span>
          <Dots count={TOUR.length} at={i} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {i + 1} / {TOUR.length} · {clock(elapsed)} of {clock(TOUR_SECONDS)}
          </span>
        </div>
      </div>

      {/* The narration. Kept to a band along the bottom — the shot is the point. */}
      <div style={{ padding: '0 18px 18px', display: 'flex', justifyContent: 'center' }}>
        <div
          key={stop.id}
          style={{
            ...panel,
            pointerEvents: 'auto',
            width: 'min(600px, 100%)',
            padding: '14px 18px 12px',
            animation: 'fadeUp .55s ease both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: gold,
              }}
            >
              Stop {i + 1} · {stop.area}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(244,238,230,.4)', fontStyle: 'italic' }}>
              {stop.when}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 5 }}>
            <h2 style={{ margin: 0, fontSize: 20, letterSpacing: '-0.015em', lineHeight: 1.12 }}>
              {stop.title}
            </h2>
            {stop.local && (
              <span style={{ fontSize: 13.5, color: 'rgba(244,238,230,.45)' }}>{stop.local}</span>
            )}
          </div>

          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              lineHeight: 1.58,
              color: 'rgba(244,238,230,.76)',
            }}
          >
            {stop.script}
          </p>

          {/* progress through this shot */}
          <div
            style={{
              height: 2,
              background: 'rgba(255,255,255,.1)',
              borderRadius: 2,
              margin: '12px 0 10px',
              overflow: 'hidden',
            }}
          >
            <div
              ref={barRef}
              style={{
                height: '100%',
                background: gold,
                transformOrigin: 'left',
                transform: 'scaleX(0)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn onClick={() => tourGo(Math.max(i - 1, 0))} disabled={i === 0}>
              ← Back
            </Btn>
            <Btn onClick={() => tourPlay(!playing)} accent>
              {playing ? '❚❚ Pause' : '▶ Play'}
            </Btn>
            <Btn
              onClick={() => tourGo(Math.min(i + 1, TOUR.length - 1))}
              disabled={i === TOUR.length - 1}
            >
              Next →
            </Btn>
            <div style={{ flex: 1 }} />
            <Btn onClick={() => leaveTour()}>Explore on foot</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dots({ count, at }: { count: number; at: number }) {
  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: count }, (_, k) => (
        <button
          key={k}
          type="button"
          aria-label={`Stop ${k + 1}`}
          onClick={() => tourGo(k)}
          style={{
            width: k === at ? 16 : 6,
            height: 6,
            padding: 0,
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: k === at ? gold : k < at ? 'rgba(242,193,78,.4)' : 'rgba(255,255,255,.22)',
            transition: 'width .25s ease, background .25s ease',
          }}
        />
      ))}
    </span>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="hud-chip"
      style={{
        padding: '6px 12px',
        fontSize: 12,
        borderRadius: 8,
        border: `1px solid ${accent ? 'rgba(242,193,78,.5)' : 'rgba(255,255,255,.14)'}`,
        background: accent ? 'rgba(242,193,78,.14)' : 'transparent',
        color: disabled ? 'rgba(244,238,230,.3)' : accent ? gold : 'rgba(244,238,230,.82)',
        cursor: disabled ? 'default' : 'pointer',
        font: 'inherit',
        fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function clock(s: number) {
  const mm = Math.floor(s / 60);
  const ss = Math.round(s % 60);
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

