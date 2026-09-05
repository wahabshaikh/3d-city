# Mumbai

An open-world game set in a Mumbai built from its real geography. Next.js and
Three.js, generated in the browser — no model files, no textures on disk, no
network requests. The geometry is authored from the real architecture and the
textures are painted onto canvases at load time.

You start on Apollo Bunder with the Gateway of India in front of you. Walk,
run, swim, take anything parked at the kerb and drive it.

## Chapter 1 — South Bombay

The full model runs 27 km from Colaba Point to Versova, which is more city than
a game can fill. So it ships in chapters, and Chapter 1 is the island city
south of Mahalaxmi: Colaba, the Fort, Nariman Point, Marine Drive, Malabar
Hill, Byculla and the docks. Sea on three sides, roughly 1.8 km by 2.5 km in
world metres.

The rest of Mumbai still exists in `lib/mumbai/` — the coastline, the arteries,
the districts, the landmarks — and `lib/mumbai/bounds.ts` is the one place that
decides how much of it is built. Widening a chapter is a change to that file.

## Playing it

| Key | |
| --- | --- |
| `W A S D` | run — steer, when you are driving |
| `Shift` | sprint |
| `Space` | jump — handbrake, in a car |
| `F` | get in / get out |
| Mouse | look around |
| Wheel | pull the camera in and out |
| `M` | map and fast travel |
| `T` | the guided tour of the district |
| `[` `]` | wind time of day back / forward |
| `H` | controls |
| `Esc` | pause |

Walk up to any vehicle and press `F`. Kaali-peeli Padminis, BEST double-deckers,
motorcycles and private cars all drive differently — a bus understeers, a bike
does not, and the handbrake is how you get a Padmini round a corner at speed.

## The guided tour

A camera tour of the chapter, timed to run one day from first light at the
Gateway of India to the Queen's Necklace after dark. Each stop is a single
moving shot with a piece of narration; you can pause it, step between stops, or
drop out and carry on from wherever the camera is standing. The itinerary is
`lib/mumbai/tour.ts`, trimmed to the stops the chapter actually builds.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```

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
  geo.ts                 lat/lon -> world coordinates
  store.ts               UI and game state, and the per-frame values the HUD polls
  mumbai/bounds.ts       the chapter boundary — how much city gets built
  mumbai/coastline.ts    the traced shore
  mumbai/roads.ts        arterial roads and the suburban rail network
  mumbai/districts.ts    the districts, their building grammar and grain
  mumbai/streets.ts      the generated lane network, and queries against it
  mumbai/landmarks.ts    landmark registry: coordinates, blurbs, viewpoints
  mumbai/tour.ts         the guided tour: sixteen stops, camera moves, script
  mumbai/world.ts        the procedural city generator
  mumbai/physics.ts      ground height, bridge decks, collision
  game/vehicles.ts       handling, and the vehicle roster
  game/traffic.ts        the pool of vehicles you can steal
  game/mapTexture.ts     the radar map, baked once at load
  textures.ts            every texture, painted on a canvas at runtime
components/
  world/                 scene, sky, ocean, terrain, streets, rail, landmarks
  world/vehicles.ts      every vehicle body, extruded from its side elevation
  game/PlayerRig         the player: on foot, driving, and the camera
  game/character.ts      the articulated ped rig and its walk cycle
  game/Vehicles          traffic and kerbside parking, instanced
  game/GameHud           radar, health, wanted level, speedometer
  hud/                   the tour panel, landmark cards, map screen
```

## Adding a city

Add an entry to `lib/cities.ts`, then a `lib/<city>/` with its coastline, roads
and landmarks. The scene components are city-agnostic apart from the imports in
`components/world/Landmarks.tsx`.
