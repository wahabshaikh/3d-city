import { geo } from '../geo';

/**
 * The guided tour.
 *
 * Sixteen stops, laid out the way the city itself is laid out — south to
 * north, Colaba Point to Juhu — and timed to run one day from first light at
 * the Gateway to the Queen's Necklace after dark. Each stop is a single moving
 * shot: the camera dollies from `from` to `to` while the narration runs, and
 * the tour cuts through black between stops.
 *
 * Positions are given in latitude and longitude, like everything else here, so
 * a stop cannot drift away from the thing it is pointing at.
 */

export type Mark = {
  /** [lat, lon] */
  at: [number, number];
  /** Metres above the land datum. */
  y: number;
};

export type Stop = {
  id: string;
  title: string;
  local?: string;
  area: string;
  /** Shown against the clock — "first light", "the morning rush". */
  when: string;
  script: string;
  /** 0 = midnight, 0.5 = noon. */
  tod: number;
  from: Mark;
  to: Mark;
  look: Mark;
  /** Pan the camera by moving the look-at target as well. */
  lookTo?: Mark;
  /** Length of the shot itself, before the cuts either side. */
  seconds: number;
};

const m = (lat: number, lon: number, y: number): Mark => ({ at: [lat, lon], y });

export const TOUR: Stop[] = [
  {
    id: 'gateway',
    title: 'Gateway of India',
    local: 'गेटवे ऑफ इंडिया',
    area: 'Apollo Bunder, Colaba',
    when: 'first light',
    script:
      'Start where every visitor to Bombay once started: a basalt arch on the harbour wall, built to mark the landing of a king and finished thirteen years after he had gone home. Twenty-six metres of Gujarati stonework in the Indo-Saracenic manner — Islamic arch, Hindu bracket, a dome the British would have called Saracenic and the masons simply built. In February 1948 the last British troops in India marched out through it to their ships.',
    tod: 0.255,
    from: m(18.9218, 72.8368, 9),
    to: m(18.9219, 72.8357, 6),
    look: m(18.922, 72.8347, 13),
    seconds: 17,
  },
  {
    id: 'taj',
    title: 'The Taj Mahal Palace',
    local: 'ताज महल पॅलेस',
    area: 'Apollo Bunder',
    when: 'early morning',
    script:
      'Behind you, and five years older than the arch it faces: Jamsetji Tata\'s hotel, opened in 1903. Six storeys of arcaded balconies under a ribbed red Florentine dome, with the plain 1972 Tower wing standing alongside it. The story that Tata built it after being turned away from a whites-only hotel is probably a later invention — but it was the first building in the city with electricity.',
    tod: 0.3,
    from: m(18.9222, 72.8341, 5),
    to: m(18.9222, 72.8333, 17),
    look: m(18.9223, 72.832, 22),
    lookTo: m(18.9223, 72.832, 34),
    seconds: 16,
  },
  {
    id: 'colaba',
    title: 'Colaba Causeway',
    local: 'कुलाबा कॉजवे',
    area: 'Shahid Bhagat Singh Road',
    when: 'the shops opening',
    script:
      'Down at street level, which is where Mumbai actually happens. The causeway was built in 1838 to tie Colaba island to Bombay island, and it has been a market ever since — hawkers on the footpath, shopfronts behind them, and a painted board over every one of them. Look at the ground floors: this ribbon of hand-lettered signage is as much the city\'s architecture as anything with a dome on it.',
    tod: 0.345,
    // Down the middle of a Colaba lane, snapped to the generated centreline.
    from: m(18.92019, 72.82741, 1.75),
    to: m(18.91501, 72.82374, 1.75),
    look: m(18.9076, 72.81848, 5),
    seconds: 17,
  },
  {
    id: 'csmt',
    title: 'Chhatrapati Shivaji Maharaj Terminus',
    local: 'छत्रपती शिवाजी महाराज टर्मिनस',
    area: 'Fort',
    when: 'the morning rush',
    script:
      'Victorian Gothic crossed with Mughal detail, finished in 1888, and a UNESCO World Heritage Site since 2004. The ribbed octagonal dome goes up 48.8 metres and carries a figure called the Lady of Progress, torch in one hand, spoked wheel in the other. Three million people a day pass through the eighteen platforms behind it — the busiest station in India, and still the building everyone photographs.',
    tod: 0.385,
    from: m(18.9382, 72.8334, 22),
    to: m(18.9389, 72.8341, 13),
    look: m(18.9398, 72.8354, 28),
    seconds: 18,
  },
  {
    id: 'flora',
    title: 'Flora Fountain',
    local: 'हुतात्मा चौक',
    area: 'Hutatma Chowk, Fort',
    when: 'mid morning',
    script:
      'A Roman goddess in Portland stone, standing at the crossing where the Fort walls stood until they were pulled down in the 1860s. The square around her was renamed Hutatma Chowk — Martyrs\' Square — for the hundred and six people shot here in 1960 while demanding a Marathi-speaking state of Maharashtra. They got it. Both names are still in use.',
    tod: 0.43,
    from: m(18.9313, 72.8327, 3.2),
    to: m(18.9319, 72.8321, 3.2),
    look: m(18.9322, 72.8317, 6),
    seconds: 14,
  },
  {
    id: 'rajabai',
    title: 'Rajabai Clock Tower',
    local: 'राजाबाई टॉवर',
    area: 'University of Mumbai',
    when: 'late morning',
    script:
      'Eighty-five metres of buff Kurla stone over the Oval Maidan, modelled on Big Ben by an architect who never came to see the site. It was paid for by the broker Premchand Roychand on one condition: that it carry his mother\'s name. Rajabai was blind, and the chimes told her when to take her evening meal.',
    tod: 0.465,
    // Kept over the Oval Maidan, which is the one piece of ground here
    // guaranteed to be clear, tilting up the tower as it comes.
    from: m(18.929, 72.8258, 60),
    to: m(18.9294, 72.8274, 50),
    look: m(18.92964, 72.82999, 46),
    lookTo: m(18.92964, 72.82999, 74),
    seconds: 15,
  },
  {
    id: 'marine-drive',
    title: 'Marine Drive',
    local: 'मरीन ड्राइव्ह',
    area: 'Netaji Subhash Chandra Bose Road',
    when: 'noon',
    script:
      'Three kilometres of Art Deco laid along reclaimed land in the 1930s — the second largest collection of Deco buildings anywhere, after Miami Beach. Banded facades, rounded corners, ziggurat crowns, and in front of them a seawall of tetrapods and a parapet the whole city sits on. Nobody calls the road by its official name.',
    tod: 0.515,
    from: m(18.9335, 72.8128, 62),
    to: m(18.9448, 72.8118, 52),
    look: m(18.9395, 72.8182, 18),
    lookTo: m(18.9505, 72.8155, 18),
    seconds: 19,
  },
  {
    id: 'chowpatty',
    title: 'Girgaum Chowpatty',
    local: 'गिरगाव चौपाटी',
    area: 'the north end of the necklace',
    when: 'the afternoon',
    script:
      'The beach at the top of the crescent: bhelpuri and pav bhaji stalls, ferris wheels, and families out after dark because the sand is cooler than the flats behind it. Every September the largest Ganesh idols in the city are carried down here and walked into the sea. Tilak revived that procession in the 1890s precisely because the British could not ban a religious festival.',
    tod: 0.555,
    // Along the seaward parapet at the top of Marine Drive, onto the sand.
    from: m(18.95, 72.81409, 4),
    to: m(18.9527, 72.81348, 4),
    look: m(18.9552, 72.8128, 5),
    seconds: 15,
  },
  {
    id: 'dhobi-ghat',
    title: 'Mahalaxmi Dhobi Ghat',
    local: 'धोबी घाट',
    area: 'Mahalaxmi',
    when: 'the working day',
    script:
      "Seven hundred concrete pens, open to the sky, where the dhobis have beaten the city's washing against stone since 1890. Hotels, hospitals and half of south Mumbai still send their laundry here; every piece comes back to the right household, tracked by a code of coloured thread nobody has ever written down.",
    tod: 0.6,
    from: m(18.979, 72.8322, 30),
    to: m(18.9796, 72.8313, 19),
    look: m(18.98, 72.8305, 3),
    seconds: 15,
  },
  {
    id: 'haji-ali',
    title: 'Haji Ali Dargah',
    local: 'हाजी अली दर्गाह',
    area: 'Worli bay',
    when: 'the tide going out',
    script:
      'The tomb of a fifteenth-century Sufi merchant who gave away his fortune, on an islet five hundred metres offshore. White Indo-Islamic marble, one dome, one minaret, and a causeway with no railing that the sea takes back twice a day — at high tide the walk simply is not there. People of every faith in the city walk it.',
    tod: 0.645,
    // Out along the causeway itself, which is barely wider than the walk.
    from: m(18.98153, 72.81291, 3.4),
    to: m(18.98211, 72.81053, 3.4),
    look: m(18.9822, 72.8092, 12),
    seconds: 16,
  },
  {
    id: 'worli',
    title: 'Worli and the mill land',
    local: 'वरळी',
    area: 'Central Mumbai',
    when: 'late afternoon',
    script:
      'Everything tall here stands on a cotton mill. Bombay ran on textiles for a century until the great strike of 1982 put a quarter of a million people out of work and the mills never reopened; the land was worth more than the cloth. Imperial I and II go up 254 metres over the chawls that housed the mill hands, who are mostly still there.',
    tod: 0.685,
    // Stood off the sea face, so the mill-land cluster reads as a skyline
    // rather than as the wall of whichever tower you happen to be next to.
    from: m(18.9975, 72.8052, 74),
    to: m(19.008, 72.8072, 64),
    look: m(19.0035, 72.8205, 88),
    lookTo: m(19.0062, 72.8215, 88),
    seconds: 16,
  },
  {
    id: 'dharavi',
    title: 'Dharavi',
    local: 'धारावी',
    area: 'between Mahim and Sion',
    when: 'the light going',
    script:
      'A square mile between two railway lines holding something like a million people, on land nobody wanted because it was mangrove swamp. It is not only housing: leather, pottery at Kumbharwada, garments, and a recycling trade that takes in most of what Mumbai throws away and turns over something close to a billion dollars a year. Roofs of corrugated iron gone to rust, and gullies you can touch both walls of.',
    tod: 0.715,
    from: m(19.0374, 72.851, 30),
    to: m(19.039, 72.8528, 17),
    look: m(19.0412, 72.8552, 5),
    seconds: 16,
  },
  {
    id: 'sea-link',
    title: 'Bandra–Worli Sea Link',
    local: 'वांद्रे-वरळी सागरी सेतू',
    area: 'Mahim Bay',
    when: 'golden hour',
    script:
      'Five and a half kilometres of cable-stayed deck across the open sea, hung from pylons 126 metres high on cables that would stretch to the earth\'s circumference laid end to end. It took ten years and cut the Bandra to Worli run from an hour to ten minutes. Before it, everything going north had to squeeze through Mahim.',
    tod: 0.75,
    from: m(19.0175, 72.816, 34),
    to: m(19.0305, 72.8186, 32),
    look: m(19.0364, 72.8205, 44),
    lookTo: m(19.0398, 72.8208, 62),
    seconds: 18,
  },
  {
    id: 'bandra-fort',
    title: 'Bandra Fort',
    local: 'कॅस्टेला दे अगुआडा',
    area: "Land's End, Bandra",
    when: 'sunset',
    script:
      'Castella de Aguada — the fort of the waterpoint — put up by the Portuguese in 1640 to watch the mouth of Mahim Bay, and half demolished by the British in case Napoleon ever took it. What is left is a low rampart that now looks straight down the Sea Link, which is why half of Bandra comes here at this hour.',
    tod: 0.785,
    // Off the point to the north-west, with the ramparts in the foreground and
    // the bridge running away behind them.
    from: m(19.0455, 72.8132, 32),
    to: m(19.044, 72.8148, 23),
    look: m(19.0372, 72.8189, 38),
    lookTo: m(19.0342, 72.8197, 44),
    seconds: 15,
  },
  {
    id: 'juhu',
    title: 'Juhu Beach',
    local: 'जुहू चौपाटी',
    area: 'Juhu',
    when: 'dusk',
    script:
      'Six kilometres of sand, and behind the palms the addresses that made this the most photographed suburb in India. The crowd is the point: pav bhaji carts, cricket, horses, and on Sunday evenings a good fraction of the western suburbs standing in the shallows with their shoes in their hands.',
    tod: 0.815,
    // On the sand, facing the sun going down into the Arabian Sea.
    from: m(19.0952, 72.82525, 3.2),
    to: m(19.0974, 72.82545, 3.2),
    look: m(19.0985, 72.8218, 9),
    seconds: 14,
  },
  {
    id: 'queens-necklace',
    title: "The Queen's Necklace",
    local: 'क्वीन्स नेकलेस',
    area: 'Marine Drive from Malabar Hill',
    when: 'after dark',
    script:
      'End where the city shows off. From the hill at the top of Back Bay the street lamps of Marine Drive curve away in a single unbroken line, and somebody in the 1930s decided that looked like a string of pearls on a dark throat. They were sodium once, and there was a long argument about replacing them with white LEDs — because the necklace, everyone agreed, is supposed to be gold.',
    tod: 0.9,
    from: m(18.9612, 72.804, 148),
    to: m(18.9558, 72.8072, 118),
    look: m(18.9401, 72.818, 14),
    lookTo: m(18.9318, 72.8212, 14),
    seconds: 20,
  },
];

/** Seconds of black between one shot and the next. */
export const CUT = 0.55;

export function stopDuration(s: Stop) {
  return s.seconds + CUT * 2;
}

export const TOUR_SECONDS = TOUR.reduce((n, s) => n + stopDuration(s), 0);

/** Mark -> world [x, y, z]. */
export function markWorld(k: Mark): [number, number, number] {
  const [x, z] = geo(k.at[0], k.at[1]);
  return [x, k.y, z];
}
