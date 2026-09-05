'use client';

import { useEffect, useRef, useState } from 'react';
import { live, setState, useStore } from '@/lib/store';
import { Radar } from './Radar';

/**
 * The head-up display.
 *
 * Laid out the way the games it is imitating lay it out — radar down in the
 * corner where your eye is not, the numbers that matter opposite it, and
 * nothing at all in the middle of the screen.
 */

const NUM: React.CSSProperties = {
  fontFamily: '"Arial Black", "Helvetica Neue", Impact, system-ui, sans-serif',
  fontWeight: 900,
  letterSpacing: '-0.02em',
  fontStyle: 'italic',
  textShadow: '2px 3px 0 rgba(0,0,0,.62)',
  lineHeight: 1,
};

export function GameHud() {
  const wanted = useStore((s) => s.wanted);
  const health = useStore((s) => s.health);
  const armour = useStore((s) => s.armour);
  const money = useStore((s) => s.money);
  const vehicle = useStore((s) => s.vehicle);
  const area = useStore((s) => s.area);
  const objective = useStore((s) => s.objective);
  const notice = useStore((s) => s.notice);
  const downState = useStore((s) => s.down);
  const brief = useStore((s) => s.brief);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          textAlign: 'right',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        <div style={{ ...NUM, fontSize: 34, color: '#8fe38a' }}>
          ₹{money.toLocaleString('en-IN')}
        </div>
        <Stars n={wanted} />
        <Bars health={health} armour={armour} />
      </div>

      <div
        style={{
          position: 'fixed',
          left: 20,
          bottom: 18,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Caption notice={notice} area={area} vehicle={vehicle} />
        <Radar />
      </div>

      {vehicle && <Speedo />}
      {objective && (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 96,
            maxWidth: 340,
            textAlign: 'right',
            pointerEvents: 'none',
            color: '#f6efe2',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.4,
            textShadow: '1px 2px 0 rgba(0,0,0,.7)',
          }}
        >
          {objective}
        </div>
      )}

      {brief && <Brief brief={brief} />}
      <EnterPrompt hidden={!!vehicle || !!downState} />
      {downState && <Down kind={downState} />}
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Stars({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: 26,
            lineHeight: 1,
            color: i < n ? '#f2c14e' : 'rgba(255,255,255,.16)',
            textShadow: '1px 2px 0 rgba(0,0,0,.7)',
            animation: i === n - 1 ? 'starPop .35s ease' : undefined,
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function Bars({ health, armour }: { health: number; armour: number }) {
  const bar = (v: number, colour: string, glyph: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
      <span style={{ fontSize: 13, opacity: 0.85, textShadow: '1px 1px 0 rgba(0,0,0,.7)' }}>
        {glyph}
      </span>
      <div
        style={{
          width: 132,
          height: 11,
          background: 'rgba(0,0,0,.45)',
          border: '1.5px solid rgba(0,0,0,.6)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, v))}%`,
            height: '100%',
            background: colour,
            transition: 'width .18s linear',
          }}
        />
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {armour > 0 && bar(armour, '#9fd0e8', '🛡')}
      {bar(health, health > 25 ? '#e8574a' : '#ff2d1c', '❤')}
    </div>
  );
}

/** The caption over the radar: the district you are in, or what you just got into. */
function Caption({
  notice,
  area,
  vehicle,
}: {
  notice: { kind: string; text: string; sub?: string; seq: number } | null;
  area: string;
  vehicle: string | null;
}) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    setShown(notice.text);
    const id = setTimeout(() => setShown(null), 3200);
    return () => clearTimeout(id);
  }, [notice?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  const line = shown ?? vehicle ?? area;
  if (!line) return null;
  return (
    <div
      key={shown ?? 'idle'}
      style={{
        ...NUM,
        fontSize: shown ? 26 : 19,
        color: shown ? '#f2c14e' : 'rgba(246,239,226,.82)',
        animation: shown ? 'captionIn .4s ease both' : undefined,
        maxWidth: 320,
      }}
    >
      {line}
    </div>
  );
}

function Speedo() {
  const ref = useRef<HTMLDivElement>(null);
  const needle = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (ref.current) ref.current.textContent = String(Math.round(live.kmh));
      if (needle.current)
        needle.current.style.width = `${Math.min(100, (live.kmh / 130) * 100)}%`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      style={{
        position: 'fixed',
        right: 22,
        bottom: 22,
        pointerEvents: 'none',
        textAlign: 'right',
      }}
    >
      <div style={{ ...NUM, fontSize: 44, color: '#f6efe2' }}>
        <span ref={ref}>0</span>
        <span style={{ fontSize: 15, marginLeft: 6, opacity: 0.7 }}>KM/H</span>
      </div>
      <div
        style={{
          width: 160,
          height: 5,
          marginTop: 6,
          marginLeft: 'auto',
          background: 'rgba(0,0,0,.45)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          ref={needle}
          style={{
            height: '100%',
            width: '0%',
            background: 'linear-gradient(90deg,#8fe38a,#f2c14e 62%,#e8574a)',
          }}
        />
      </div>
    </div>
  );
}

/** What the giver says, on screen long enough to read once. */
function Brief({ brief }: { brief: { name: string; giver: string; text: string } }) {
  useEffect(() => {
    const id = setTimeout(() => setState({ brief: null }), 11000);
    return () => clearTimeout(id);
  }, [brief]);
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        top: 76,
        transform: 'translateX(-50%)',
        width: 'min(560px, calc(100vw - 40px))',
        pointerEvents: 'none',
        background: 'rgba(12,9,16,.78)',
        border: '1px solid rgba(242,193,78,.35)',
        borderRadius: 14,
        padding: '16px 20px 18px',
        backdropFilter: 'blur(10px)',
        animation: 'captionIn .35s ease both',
        zIndex: 30,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: '#f2c14e',
        }}
      >
        {brief.giver}
      </div>
      <div style={{ ...NUM, fontSize: 22, marginTop: 8 }}>{brief.name}</div>
      <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: 'rgba(244,238,230,.8)' }}>
        {brief.text}
      </p>
    </div>
  );
}

function EnterPrompt({ hidden }: { hidden: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (ref.current)
        ref.current.style.opacity = !hidden && live.nearVehicle ? '1' : '0';
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [hidden]);
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 118,
        transform: 'translateX(-50%)',
        opacity: 0,
        transition: 'opacity .18s',
        pointerEvents: 'none',
        background: 'rgba(10,8,14,.72)',
        border: '1px solid rgba(255,255,255,.16)',
        borderRadius: 8,
        padding: '7px 13px',
        fontSize: 13,
        letterSpacing: '.04em',
      }}
    >
      <b>F</b> — get in
    </div>
  );
}

function Down({ kind }: { kind: 'wasted' | 'busted' }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        zIndex: 40,
        background:
          kind === 'wasted'
            ? 'radial-gradient(900px 600px at 50% 50%, rgba(120,10,4,.5), rgba(40,2,0,.86))'
            : 'radial-gradient(900px 600px at 50% 50%, rgba(10,40,110,.5), rgba(2,8,40,.86))',
        animation: 'fadeIn .5s ease both',
      }}
    >
      <div
        style={{
          ...NUM,
          fontSize: 'clamp(48px,11vw,120px)',
          color: kind === 'wasted' ? '#ff5b4a' : '#7fb2ff',
          animation: 'downIn .7s cubic-bezier(.2,.9,.2,1) both',
        }}
      >
        {kind === 'wasted' ? 'WASTED' : 'BUSTED'}
      </div>
    </div>
  );
}
