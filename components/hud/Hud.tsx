'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore, setState, live, travelTo, getState } from '@/lib/store';
import { LANDMARKS, LANDMARKS_BY_ID, landmarkWorld } from '@/lib/mumbai/landmarks';
import { compassLabel } from '@/lib/geo';
import { MiniMap, BigMap } from './CityMap';

const gold = '#f2c14e';
const panel: React.CSSProperties = {
  background: 'rgba(12,9,16,.72)',
  border: '1px solid rgba(255,255,255,.12)',
  backdropFilter: 'blur(10px)',
  borderRadius: 14,
};

export function Hud() {
  const started = useStore((s) => s.started);
  const locked = useStore((s) => s.locked);
  const loaded = useStore((s) => s.loaded);
  const showMap = useStore((s) => s.showMap);
  const showHelp = useStore((s) => s.showHelp);

  return (
    <>
      <Crosshair visible={locked} />
      <TopBar />
      <LandmarkCard />
      <BottomRight />
      {showMap && <MapOverlay />}
      {showHelp && <HelpOverlay />}
      {(!started || !locked) && <StartOverlay started={started} loaded={loaded} />}
    </>
  );
}

/* --------------------------------- pieces --------------------------------- */

function Crosshair({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: 'rgba(255,255,255,.85)',
          boxShadow: '0 0 0 1.5px rgba(0,0,0,.45)',
        }}
      />
    </div>
  );
}

/** Compass strip, coordinates and frame rate. Polls `live` rather than re-rendering. */
function TopBar() {
  const ref = useRef<HTMLDivElement>(null);
  const mode = useStore((s) => s.mode);
  const tod = useStore((s) => s.timeOfDay);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const h = live.heading;
        el.textContent = `${compassLabel(h)} ${Math.round(h)
          .toString()
          .padStart(3, '0')}°   ·   ${live.inWater ? 'in the water' : `${Math.round(
          live.altitude
        )} m`}   ·   ${live.fps} fps`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const hh = Math.floor(tod * 24);
  const mm = Math.floor((tod * 24 - hh) * 60);

  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          ...panel,
          padding: '8px 16px',
          fontSize: 12.5,
          letterSpacing: '.08em',
          color: 'rgba(244,238,230,.8)',
          fontVariantNumeric: 'tabular-nums',
        }}
        ref={ref}
      />
      <div
        style={{
          ...panel,
          padding: '8px 14px',
          fontSize: 12.5,
          color: gold,
          letterSpacing: '.08em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}
        {mode === 'fly' && <span style={{ marginLeft: 10, color: '#7ee0ff' }}>FLY</span>}
      </div>
    </div>
  );
}

/** The card that appears when you walk up to something. */
function LandmarkCard() {
  const nearest = useStore((s) => s.nearest);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (nearest) setShown(nearest);
    else {
      const t = setTimeout(() => setShown(null), 220);
      return () => clearTimeout(t);
    }
  }, [nearest]);

  const lm = shown ? LANDMARKS_BY_ID[shown] : null;
  if (!lm) return null;

  return (
    <div
      style={{
        ...panel,
        position: 'fixed',
        left: 20,
        bottom: 20,
        width: 385,
        maxWidth: 'calc(100vw - 40px)',
        padding: '18px 20px 20px',
        opacity: nearest ? 1 : 0,
        transform: nearest ? 'none' : 'translateY(8px)',
        transition: 'opacity .22s ease, transform .22s ease',
        pointerEvents: 'none',
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
        {lm.area}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 7 }}>
        <h2 style={{ margin: 0, fontSize: 21, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
          {lm.name}
        </h2>
      </div>
      {lm.local && (
        <div style={{ fontSize: 15, color: 'rgba(244,238,230,.55)', marginTop: 3 }}>{lm.local}</div>
      )}
      {lm.built && (
        <div style={{ fontSize: 12, color: 'rgba(244,238,230,.42)', marginTop: 6 }}>{lm.built}</div>
      )}
      <p
        style={{
          margin: '11px 0 0',
          fontSize: 13.5,
          lineHeight: 1.6,
          color: 'rgba(244,238,230,.72)',
        }}
      >
        {lm.blurb}
      </p>
    </div>
  );
}

function BottomRight() {
  const mode = useStore((s) => s.mode);
  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
      }}
    >
      <div style={{ ...panel, padding: 8, lineHeight: 0 }}>
        <MiniMap />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Chip onClick={() => setState({ showMap: true })}>Map · M</Chip>
        <Chip onClick={() => setState({ mode: mode === 'fly' ? 'walk' : 'fly' })}>
          {mode === 'fly' ? 'Walk · F' : 'Fly · F'}
        </Chip>
        <Chip onClick={() => setState({ showHelp: true })}>Keys · H</Chip>
      </div>
    </div>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...panel,
        padding: '7px 12px',
        fontSize: 12,
        color: 'rgba(244,238,230,.82)',
        cursor: 'pointer',
        font: 'inherit',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function MapOverlay() {
  const tod = useStore((s) => s.timeOfDay);
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6,4,10,.78)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 330px',
        gap: 20,
        padding: 24,
        animation: 'fadeUp .2s ease both',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setState({ showMap: false });
      }}
    >
      <div style={{ ...panel, overflow: 'hidden', minHeight: 0 }}>
        <BigMap onPick={(id) => travelTo(id)} />
      </div>

      <div style={{ ...panel, padding: 18, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Mumbai</h2>
          <button
            onClick={() => setState({ showMap: false })}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(244,238,230,.5)',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'rgba(244,238,230,.5)', marginTop: 8, lineHeight: 1.5 }}>
          Click a marker on the map, or a name below, to travel there.
        </p>

        <div style={{ margin: '16px 0' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: gold,
              marginBottom: 8,
            }}
          >
            Time of day
          </div>
          <input
            type="range"
            min={0}
            max={0.999}
            step={0.005}
            value={tod}
            onChange={(e) => setState({ timeOfDay: Number(e.target.value) })}
            style={{ width: '100%', accentColor: gold }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              ['Dawn', 0.25],
              ['Noon', 0.5],
              ['Golden', 0.74],
              ['Sunset', 0.8],
              ['Night', 0.02],
            ].map(([label, v]) => (
              <button
                key={label as string}
                onClick={() => setState({ timeOfDay: v as number })}
                style={{
                  padding: '5px 10px',
                  fontSize: 11.5,
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,.14)',
                  background: 'transparent',
                  color: 'rgba(244,238,230,.7)',
                  cursor: 'pointer',
                }}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: gold,
            margin: '18px 0 8px',
          }}
        >
          Landmarks
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LANDMARKS.map((l) => (
            <button
              key={l.id}
              onClick={() => travelTo(l.id)}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'rgba(244,238,230,.85)',
                cursor: 'pointer',
                font: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13.5 }}>{l.name}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(244,238,230,.4)' }}>{l.area}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const KEYMAP: [string, string][] = [
  ['W A S D', 'Walk'],
  ['Shift', 'Sprint'],
  ['Space', 'Jump / rise'],
  ['C', 'Descend (flying)'],
  ['Mouse', 'Look'],
  ['F', 'Toggle flight'],
  ['M', 'City map & fast travel'],
  ['[  ]', 'Wind time back / forward'],
  ['H', 'This panel'],
  ['Esc', 'Release the cursor'],
];

function HelpOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(6,4,10,.7)',
        backdropFilter: 'blur(5px)',
      }}
      onClick={() => setState({ showHelp: false })}
    >
      <div style={{ ...panel, padding: 26, width: 380 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Controls</h2>
        {KEYMAP.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '7px 0',
              borderTop: '1px solid rgba(255,255,255,.07)',
              fontSize: 13.5,
            }}
          >
            <span style={{ color: gold, fontFamily: 'ui-monospace, monospace' }}>{k}</span>
            <span style={{ color: 'rgba(244,238,230,.7)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StartOverlay({ started, loaded }: { started: boolean; loaded: boolean }) {
  return (
    <div
      id="lock-target"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: started
          ? 'rgba(6,4,10,.55)'
          : 'radial-gradient(900px 600px at 50% 40%, rgba(58,35,80,.6), rgba(6,4,10,.94))',
        backdropFilter: 'blur(6px)',
        cursor: loaded ? 'pointer' : 'progress',
        textAlign: 'center',
      }}
    >
      <div style={{ animation: 'fadeUp .5s ease both', padding: 24 }}>
        {!started && (
          <>
            <div
              style={{
                fontSize: 11.5,
                letterSpacing: '.24em',
                textTransform: 'uppercase',
                color: gold,
              }}
            >
              City Explorer
            </div>
            <h1
              style={{
                margin: '14px 0 0',
                fontSize: 'clamp(46px,9vw,86px)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                fontWeight: 800,
              }}
            >
              Mumbai
            </h1>
            <div style={{ fontSize: 22, color: 'rgba(244,238,230,.45)', marginTop: 8 }}>मुंबई</div>
            <p
              style={{
                margin: '20px auto 0',
                maxWidth: 460,
                fontSize: 15,
                lineHeight: 1.65,
                color: 'rgba(244,238,230,.6)',
              }}
            >
              You start on Apollo Bunder, facing the Gateway of India with the Taj behind
              it. Marine Drive is fifteen minutes north-west on foot; the Sea Link is
              further, so press <b style={{ color: gold }}>M</b> when you want to jump.
            </p>
          </>
        )}
        {started && <h2 style={{ margin: 0, fontSize: 26 }}>Paused</h2>}

        <div
          style={{
            marginTop: 28,
            display: 'inline-flex',
            padding: '13px 26px',
            borderRadius: 999,
            border: `1px solid ${loaded ? gold : 'rgba(255,255,255,.2)'}`,
            color: loaded ? gold : 'rgba(244,238,230,.45)',
            fontSize: 14.5,
            letterSpacing: '.04em',
          }}
        >
          {loaded ? (started ? 'Click to resume' : 'Click to explore') : 'Building the city…'}
        </div>

        <div
          style={{
            marginTop: 22,
            fontSize: 12.5,
            color: 'rgba(244,238,230,.38)',
            letterSpacing: '.05em',
          }}
        >
          W A S D to walk · Shift to run · F to fly · M for the map
        </div>

        <div style={{ marginTop: 26 }}>
          <Link
            href="/"
            style={{ fontSize: 12.5, color: 'rgba(244,238,230,.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            ← All cities
          </Link>
        </div>
      </div>
    </div>
  );
}
