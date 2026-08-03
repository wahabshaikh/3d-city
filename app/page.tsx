import Link from 'next/link';
import { CITIES } from '@/lib/cities';
import { MumbaiSkylineMark } from '@/components/MumbaiSkylineMark';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(1200px 700px at 15% -10%, #3a2350 0%, transparent 60%), radial-gradient(900px 600px at 110% 20%, #7a2f4a 0%, transparent 55%), #0a0710',
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '72px 28px 96px' }}>
        <header style={{ animation: 'fadeUp .6s ease both' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid rgba(242,193,78,.35)',
              color: '#f2c14e',
              fontSize: 12,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: '#f2c14e',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            First-person · WebGL
          </div>

          <h1
            style={{
              margin: '22px 0 0',
              fontSize: 'clamp(40px, 7vw, 76px)',
              lineHeight: 1.02,
              letterSpacing: '-0.035em',
              fontWeight: 800,
            }}
          >
            Walk a real city.
            <br />
            <span
              style={{
                background: 'linear-gradient(92deg,#f9b16e,#f2c14e 40%,#ef7d7d)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              On foot. In 3D.
            </span>
          </h1>

          <p
            style={{
              margin: '20px 0 0',
              maxWidth: 620,
              fontSize: 18,
              lineHeight: 1.6,
              color: 'rgba(244,238,230,.66)',
            }}
          >
            Landmarks modelled from their real architecture and placed at their real
            coordinates, on a coastline traced from the actual shore. Pick a city and start
            walking.
          </p>
        </header>

        <section
          style={{
            marginTop: 56,
            display: 'grid',
            gap: 22,
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          }}
        >
          {CITIES.map((city, i) => (
            <Link
              key={city.slug}
              href={`/city/${city.slug}`}
              style={{
                display: 'block',
                borderRadius: 20,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,.1)',
                background: 'rgba(255,255,255,.035)',
                backdropFilter: 'blur(8px)',
                animation: `fadeUp .6s ${0.1 + i * 0.06}s ease both`,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 190,
                  background: `linear-gradient(180deg, ${city.palette.sky[0]}, ${city.palette.sky[1]})`,
                }}
              >
                <MumbaiSkylineMark ink={city.palette.ink} />
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 16,
                    fontSize: 12,
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(26,16,38,.72)',
                    fontWeight: 700,
                  }}
                >
                  {city.country}
                </div>
              </div>

              <div style={{ padding: '20px 22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 27, letterSpacing: '-0.02em' }}>
                    {city.name}
                  </h2>
                  <span style={{ fontSize: 17, color: 'rgba(244,238,230,.5)' }}>
                    {city.local}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 12,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: city.palette.accent,
                  }}
                >
                  {city.tagline}
                </div>

                <p
                  style={{
                    margin: '14px 0 0',
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    color: 'rgba(244,238,230,.62)',
                  }}
                >
                  {city.blurb}
                </p>

                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {city.highlights.map((h) => (
                    <span
                      key={h}
                      style={{
                        fontSize: 11.5,
                        padding: '5px 9px',
                        borderRadius: 7,
                        border: '1px solid rgba(255,255,255,.12)',
                        color: 'rgba(244,238,230,.62)',
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(255,255,255,.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: 'rgba(244,238,230,.45)' }}>
                    {city.population} · {city.founded}
                  </span>
                  <span style={{ color: city.palette.accent, fontWeight: 600 }}>
                    Explore →
                  </span>
                </div>
              </div>
            </Link>
          ))}

          <div
            style={{
              borderRadius: 20,
              border: '1px dashed rgba(255,255,255,.14)',
              display: 'grid',
              placeItems: 'center',
              minHeight: 300,
              color: 'rgba(244,238,230,.3)',
              textAlign: 'center',
              padding: 24,
              animation: 'fadeUp .6s .18s ease both',
            }}
          >
            <div>
              <div style={{ fontSize: 30, marginBottom: 10 }}>◍</div>
              <div style={{ fontSize: 15, color: 'rgba(244,238,230,.45)' }}>
                More cities coming
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Istanbul · Cairo · Lisbon</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
