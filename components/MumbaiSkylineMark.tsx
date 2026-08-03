/**
 * A silhouette of the Mumbai skyline used on the city card: Sea Link pylon,
 * Haji Ali, Rajabai Tower, CSMT's ribbed dome, the Gateway of India and the
 * Taj Mahal Palace, left to right.
 */

/** Semicircular dome sitting on y=`base`, centred at `cx`, radius `r`. */
const dome = (cx: number, base: number, r: number) =>
  `M ${cx - r} ${base} A ${r} ${r} 0 0 1 ${cx + r} ${base} Z`;

/** Slightly onion-profiled dome (rises higher than a hemisphere). */
const bulb = (cx: number, base: number, r: number, h: number) =>
  `M ${cx - r} ${base} C ${cx - r} ${base - h * 0.75}, ${cx - r * 0.55} ${base - h}, ${cx} ${
    base - h
  } C ${cx + r * 0.55} ${base - h}, ${cx + r} ${base - h * 0.75}, ${cx + r} ${base} Z`;

function Palm({ x, y, s = 1, ink }: { x: number; y: number; s?: number; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={ink}>
      <path d="M -1.1 0 C -1.6 -9, 0.6 -17, 1.6 -24 L 3.4 -24 C 2.2 -17, 0.6 -9, 1.1 0 Z" />
      {[-1, 1].map((d) =>
        [0, 1, 2].map((i) => (
          <path
            key={`${d}-${i}`}
            d={`M 2.5 -24 C ${2.5 + d * 5} ${-26 - i * 2.4}, ${2.5 + d * 10} ${
              -25 - i * 3.4
            }, ${2.5 + d * 13} ${-19 - i * 4.2} C ${2.5 + d * 9} ${-24 - i * 2.6}, ${
              2.5 + d * 5
            } ${-25 - i * 1.6}, 2.5 -22.5 Z`}
          />
        ))
      )}
    </g>
  );
}

export function MumbaiSkylineMark({ ink }: { ink: string }) {
  const soft = 'rgba(0,0,0,.16)';
  return (
    <svg
      viewBox="0 0 400 190"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden
    >
      <circle cx="330" cy="52" r="30" fill="rgba(255,255,255,.25)" />

      {/* Distant Worli / Nariman Point towers, hazed back */}
      <g fill={soft}>
        <rect x="8" y="96" width="13" height="74" />
        <rect x="24" y="112" width="10" height="58" />
        <rect x="160" y="104" width="11" height="66" />
        <rect x="173" y="118" width="9" height="52" />
        <rect x="252" y="110" width="12" height="60" />
      </g>

      <g fill={ink}>
        {/* --- Bandra–Worli Sea Link --- */}
        <rect x="0" y="139" width="86" height="4" />
        <path d="M 44 143 L 40 170 L 48 170 Z" />
        <path d="M 52 60 L 55 143 L 49 143 Z" />
        <g stroke={ink} strokeWidth="1" opacity=".85">
          {[6, 16, 26, 36, 66, 76, 86].map((x) => (
            <line key={x} x1="53" y1="63" x2={x} y2="139" />
          ))}
        </g>

        {/* --- Haji Ali Dargah --- */}
        <rect x="96" y="150" width="34" height="20" />
        <path d={dome(113, 150, 11)} />
        <rect x="111.5" y="130" width="3" height="9" />
        <rect x="126" y="126" width="6" height="24" />
        <path d={bulb(129, 126, 4.5, 7)} />

        {/* --- Rajabai Clock Tower (square base, octagon, spire) --- */}
        <rect x="139" y="98" width="20" height="72" />
        <rect x="136.5" y="94" width="25" height="5" />
        <rect x="141.5" y="66" width="15" height="28" />
        <circle cx="149" cy="80" r="5" fill="rgba(255,255,255,.5)" />
        <path d="M 140 66 L 149 34 L 158 66 Z" />
        <rect x="148.2" y="26" width="1.6" height="9" />

        {/* --- CSMT: gables, corner turrets, octagonal ribbed dome --- */}
        <rect x="186" y="138" width="62" height="32" />
        <rect x="190" y="130" width="54" height="9" />
        <path d="M 192 130 L 200 114 L 208 130 Z" />
        <path d="M 226 130 L 234 114 L 242 130 Z" />
        <rect x="186" y="112" width="7" height="58" />
        <path d="M 186 112 L 189.5 98 L 193 112 Z" />
        <rect x="241" y="112" width="7" height="58" />
        <path d="M 241 112 L 244.5 98 L 248 112 Z" />
        <rect x="205" y="106" width="24" height="26" />
        <path d={dome(217, 106, 14)} />
        <rect x="203.5" y="103" width="27" height="4" />
        {/* Lady of Progress */}
        <rect x="216.2" y="84" width="1.6" height="9" />
        <circle cx="217" cy="82" r="2.2" />
        <path d="M 214 80 L 220 80 L 219 74 L 215 74 Z" opacity=".9" />

        {/* --- Gateway of India --- */}
        <rect x="276" y="120" width="66" height="50" />
        {/* central pointed arch, cut out */}
        <path
          d="M 297 170 L 297 141 C 297 130, 303 124, 309 124 C 315 124, 321 130, 321 141 L 321 170 Z"
          fill="rgba(255,255,255,.28)"
        />
        {/* corner turrets with small domes */}
        {[277.5, 335.5].map((x) => (
          <g key={x}>
            <rect x={x} y="104" width="8" height="66" />
            <path d={dome(x + 4, 104, 5)} />
            <rect x={x + 3.3} y="94" width="1.4" height="6" />
          </g>
        ))}
        <rect x="294" y="112" width="30" height="10" />
        <path d={dome(309, 112, 15)} />
        <rect x="292.5" y="109" width="33" height="4" />
        <rect x="308.2" y="88" width="1.6" height="10" />
        {/* steps to the water */}
        <rect x="272" y="170" width="74" height="3" />

        {/* --- Taj Mahal Palace + Tower --- */}
        <rect x="350" y="128" width="50" height="42" />
        <rect x="352" y="122" width="46" height="7" />
        {[357, 393].map((x) => (
          <g key={x}>
            <rect x={x - 4} y="112" width="8" height="14" />
            <path d={bulb(x, 112, 5, 8)} />
          </g>
        ))}
        <rect x="366" y="110" width="18" height="14" />
        <path d={bulb(375, 110, 11, 17)} />
        <rect x="374.2" y="88" width="1.6" height="7" />

        <Palm x={72} y={170} s={1.05} ink={ink} />
        <Palm x={266} y={170} s={0.9} ink={ink} />
        <Palm x={180} y={170} s={0.8} ink={ink} />

        {/* waterline */}
        <rect x="0" y="170" width="400" height="20" />
      </g>
      <g stroke="rgba(255,255,255,.22)" strokeWidth="1.4" strokeLinecap="round">
        <line x1="14" y1="178" x2="46" y2="178" />
        <line x1="60" y1="184" x2="104" y2="184" />
        <line x1="120" y1="177" x2="150" y2="177" />
        <line x1="250" y1="182" x2="292" y2="182" />
      </g>
    </svg>
  );
}
