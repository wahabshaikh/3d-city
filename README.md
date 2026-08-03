# City Explorer

A first-person 3D city explorer built with Next.js and Three.js. `/` lists the
cities; each city lives at `/city/<slug>`. Mumbai is the first one.

Everything you see is generated in the browser — there are no model files, no
textures on disk and no network requests. The geometry is authored from the real
architecture, and the textures are painted onto canvases at load time.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```

## Controls

| Key | |
| --- | --- |
| `W A S D` | walk |
| `Shift` | sprint |
| `Space` | jump, or rise when flying |
| `C` | descend when flying |
| `F` | toggle flight |
| `M` | city map and fast travel |
| `[` `]` | wind time of day back / forward |
| `H` | controls |
| `Esc` | release the cursor |

You start on Apollo Bunder facing the Gateway of India. You can walk anywhere,
swim, and cross the Sea Link and the Haji Ali causeway on foot.

## How Mumbai is built

**Geography is real.** The coastline in `lib/mumbai/coastline.ts` is traced from
the actual shore — the Colaba peninsula, Back Bay, the Malabar Hill promontory,
Haji Ali bay, Worli Point, Mahim Bay and the creek, Bandra's Land's End, Juhu
and Versova, then back down the harbour past the docks. Elephanta and Gorai are
separate islands. Every landmark, road, railway line and district sits at its
true latitude and longitude.

**Distance is compressed, buildings are not.** Mumbai is 27 km from Colaba Point
to Versova, which is not walkable. `lib/geo.ts` compresses horizontal distance by
4× while every building is modelled at true scale. The result is denser than
reality, which — for the densest city on earth — reads about right.

**Landmarks are modelled, not approximated.** Each is built from its real
dimensions and detailing:

- **Gateway of India** — 26 m, yellow basalt, one pointed arch on the harbour
  axis, four octagonal turrets, jali-screened side halls, 15 m dome
- **The Taj Mahal Palace** — six arcaded storeys, corner cupolas, the ribbed red
  Florentine dome, and the plain 1972 Tower wing to the north
- **Chhatrapati Shivaji Maharaj Terminus** — Victorian Gothic wings with steep
  gables and spired turrets, the octagonal ribbed dome at 48.8 m carrying the
  Lady of Progress with her torch and spoked wheel, the lion and tiger on the
  gate piers, and four arched train sheds behind
- **Rajabai Clock Tower** — 85 m of buff Kurla stone: square to the gallery at
  21 m, then octagonal with four clock faces, then spire
- **Bombay High Court**, **BMC Headquarters**, **CSMVS**, **Flora Fountain**,
  **Bombay Stock Exchange**
- **Marine Drive** — the Art Deco crescent, banded and finned with rounded
  corners and ziggurat crowns, behind a seawall of tetrapods
- **Haji Ali Dargah** — white marble on its islet 500 m offshore, one dome, one
  minaret, reached by the causeway
- **Bandra–Worli Sea Link** — twin cable-stayed spans on concrete pylons
- **Antilia**, **Siddhivinayak**, **Dhobi Ghat**, **Wankhede**, **Bandra Fort**,
  **Dharavi**, **Global Vipassana Pagoda**, **Elephanta Caves**, **Juhu Beach**

**The fabric between them is procedural.** `lib/mumbai/world.ts` divides the city
into 33 real districts — Fort, Girgaum, Malabar Hill, the Parel mill land, Worli,
Dharavi, Bandra, Andheri — each with its own building grammar: colonial stone,
Art Deco, chawls with common balconies and hanging washing, tin-and-tarpaulin
bastis, mill sheds, glass towers. Roughly 20,000 buildings, instanced and chunked
so the GPU can cull them. The maidans, Shivaji Park and the Mahalaxmi racecourse
are kept clear, as they are on the ground.

**And the things that make it Mumbai.** Kaali-peeli Padmini taxis, red BEST
double-deckers, auto-rickshaws (which run only north of Bandra, as the law
requires), nine-coach rakes on the Western and Central lines, black Sintex water
tanks on half the roofs, film hoardings, coconut palms, Koli fishing boats, and
after dark the Queen's Necklace.

## Layout

```
app/                     routes: / and /city/[slug]
lib/
  geo.ts                 lat/lon → world coordinates
  mumbai/coastline.ts    the traced shore
  mumbai/roads.ts        arterial roads and the suburban rail network
  mumbai/landmarks.ts    landmark registry: coordinates, blurbs, viewpoints
  mumbai/world.ts        districts and the procedural city generator
  mumbai/physics.ts      ground height, bridge decks, collision
  textures.ts            every texture, painted on a canvas at runtime
components/
  world/                 scene, sky, ocean, terrain, roads, traffic, player
  world/landmarks/       the modelled landmarks
  hud/                   landmark cards, minimap, city map, controls
```

## Adding a city

Add an entry to `lib/cities.ts`, then a `lib/<city>/` with its coastline, roads
and landmarks. The scene components are city-agnostic apart from the imports in
`components/world/Landmarks.tsx`.
