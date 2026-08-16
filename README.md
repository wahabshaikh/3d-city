# City Explorer

A virtual city tour and first-person explorer, built with Next.js and Three.js.
`/` lists the cities; each city lives at `/city/<slug>`. Mumbai is the first one.

You can take the guided tour or walk the place yourself.

Everything you see is generated in the browser — there are no model files, no
textures on disk and no network requests. The geometry is authored from the real
architecture, and the textures are painted onto canvases at load time.

## The tour

Sixteen stops, about four and a half minutes, laid out the way the city is laid
out — south to north, Colaba Point to Juhu — and timed to run one day, from
first light at the Gateway of India to the Queen's Necklace after dark.

Each stop is a single moving shot with a piece of narration: the camera dollies
and pans while you read, and the tour cuts through black between stops. You can
pause it, step back and forward, jump to any stop from the row of markers, or
drop out at any point and carry on on foot from wherever the camera is standing.

> Gateway of India · The Taj Mahal Palace · Colaba Causeway · Chhatrapati
> Shivaji Maharaj Terminus · Flora Fountain · Rajabai Clock Tower · Marine
> Drive · Girgaum Chowpatty · Mahalaxmi Dhobi Ghat · Haji Ali Dargah · Worli and
> the mill land · Dharavi · Bandra–Worli Sea Link · Bandra Fort · Juhu Beach ·
> the Queen's Necklace

The itinerary is `lib/mumbai/tour.ts` — stop positions are given in latitude and
longitude like everything else, so a shot cannot drift away from the thing it is
pointing at.

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
| `T` | take the guided tour |
| `W A S D` | walk |
| `Shift` | sprint |
| `Space` | jump, or rise when flying |
| `C` | descend when flying |
| `F` | toggle flight |
| `M` | city map and fast travel |
| `[` `]` | wind time of day back / forward |
| `H` | controls |
| `Esc` | release the cursor |

While the tour is running, `Space` pauses it, `←` `→` step between stops, and
`Esc` leaves it and hands you the camera.

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

**The streets are generated, not just the named ones.** `roads.ts` carries the
nineteen arteries; between them, `lib/mumbai/streets.ts` lays a lane grid on each
district's own grain — the Fort on the line of the old shoreline, the
reclamations with the sea wall, Dharavi's gullies at whatever angle they happen
to run — clipped to the coast, to the arteries and to the maidans, with the cross
family giving way at every junction. Blocks come out uneven on purpose: lines are
shifted off the module and every so often one is never cut at all. The whole
network is drawn as one quad per span, with the footpath, kerb and carriageway
living in the texture, so one material covers a Dharavi gully and a Bandra
approach road alike.

**The fabric between them is procedural.** `lib/mumbai/world.ts` divides the city
into 33 real districts — Fort, Girgaum, Malabar Hill, the Parel mill land, Worli,
Dharavi, Bandra, Andheri — each with its own building grammar: colonial stone,
Art Deco, chawls with common balconies and hanging washing, tin-and-tarpaulin
bastis, mill sheds, glass towers. Plots take their frontage from the kerb and
butt up against their neighbours, so a block reads as a street wall rather than a
scatter of boxes; back buildings fill the interiors and still line up with the
block. Instanced and chunked so the GPU can cull them. The maidans, Shivaji Park
and the Mahalaxmi racecourse are kept clear, as they are on the ground.

**And the things that make it Mumbai.** A painted signboard over every ground
floor and an awning under half of them. Handcarts on the kerb, and cars and
kaali-peelis parked on it. Sixty thousand people on the footpaths, swaying in the
vertex shader so a crowd doesn't read as a field of bollards. Kaali-peeli Padmini
taxis, red BEST double-deckers, auto-rickshaws (which run only north of Bandra,
as the law requires), nine-coach rakes on the Western and Central lines, black
Sintex water tanks on half the roofs, film hoardings, coconut palms, Koli fishing
boats — and after dark, every street lamp in the city drawing an additive sprite
that holds its size at range, which is what makes Marine Drive read as the
Queen's Necklace from three kilometres away.

## Layout

```
app/                     routes: / and /city/[slug]
lib/
  geo.ts                 lat/lon → world coordinates
  store.ts               UI state, and the per-frame values the HUD polls
  mumbai/coastline.ts    the traced shore
  mumbai/roads.ts        arterial roads and the suburban rail network
  mumbai/districts.ts    the 33 districts, their building grammar and grain
  mumbai/streets.ts      the generated lane network, and queries against it
  mumbai/landmarks.ts    landmark registry: coordinates, blurbs, viewpoints
  mumbai/tour.ts         the guided tour: sixteen stops, camera moves, script
  mumbai/world.ts        the procedural city generator
  mumbai/physics.ts      ground height, bridge decks, collision
  textures.ts            every texture, painted on a canvas at runtime
components/
  world/                 scene, sky, ocean, terrain, streets, traffic, player
  world/TourDirector     flies the camera through the tour
  world/landmarks/       the modelled landmarks
  hud/                   the tour panel, landmark cards, minimap, city map
```

## Adding a city

Add an entry to `lib/cities.ts`, then a `lib/<city>/` with its coastline, roads
and landmarks. The scene components are city-agnostic apart from the imports in
`components/world/Landmarks.tsx`.
