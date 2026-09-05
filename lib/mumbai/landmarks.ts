import { geo } from '../geo';
import { inPhase } from './bounds';

export type Landmark = {
  id: string;
  name: string;
  local?: string;
  area: string;
  built?: string;
  blurb: string;
  /** [lat, lon] of the real thing. */
  at: [number, number];
  /** How far away the info card starts showing. */
  radius: number;
  /** Where fast-travel drops you, relative to the landmark, and where you look. */
  view: [number, number, number];
  lookAt?: [number, number, number];
};

const ALL_LANDMARKS: Landmark[] = [
  {
    id: 'gateway-of-india',
    name: 'Gateway of India',
    local: 'गेटवे ऑफ इंडिया',
    area: 'Apollo Bunder, Colaba',
    built: '1924 · George Wittet',
    blurb:
      'A 26 m basalt arch in the Indo-Saracenic style, raised to mark the 1911 landing of George V and Mary. Four turrets, jali latticework and a 15 m central dome face the harbour. The last British troops left India through it in 1948.',
    at: [18.922, 72.8347],
    radius: 150,
    view: [70, 6, 10],
  },
  {
    id: 'taj-mahal-palace',
    name: 'The Taj Mahal Palace',
    local: 'ताज महल पॅलेस',
    area: 'Apollo Bunder, Colaba',
    built: '1903 · Sitaram Khanderao Vaidya',
    blurb:
      "Jamsetji Tata's hotel, opened five years before the Gateway it now faces. Six storeys of Indo-Saracenic arcades under a ribbed red Florentine dome, with the plain 20-storey Tower wing of 1972 alongside.",
    at: [18.9223, 72.832],
    radius: 165,
    view: [78, 9, 78],
  },
  {
    id: 'csmt',
    name: 'Chhatrapati Shivaji Maharaj Terminus',
    local: 'छत्रपती शिवाजी महाराज टर्मिनस',
    area: 'Fort',
    built: '1888 · F. W. Stevens',
    blurb:
      'Victorian Gothic Revival crossed with Mughal detail, and a UNESCO World Heritage Site. An octagonal ribbed dome rises 48.8 m, crowned by the 4.3 m "Lady of Progress" with her torch and spoked wheel. A lion and a tiger guard the gates; 18 platforms sit behind.',
    at: [18.9398, 72.8354],
    radius: 240,
    view: [-62, 14, 100],
  },
  {
    id: 'bmc',
    name: 'BMC Headquarters',
    local: 'बृहन्मुंबई महानगरपालिका',
    area: 'Fort',
    built: '1893 · F. W. Stevens',
    blurb:
      "Stevens' answer to his own railway terminus across the road: a wedge-shaped Gothic pile with a 78 m central tower and a winged figure of Urbs Prima in Indis over the entrance.",
    at: [18.9378, 72.8324],
    radius: 120,
    view: [-80, 10, 75],
  },
  {
    id: 'rajabai-tower',
    name: 'Rajabai Clock Tower',
    local: 'राजाबाई टॉवर',
    area: 'University of Mumbai, Fort',
    built: '1878 · Sir George Gilbert Scott',
    blurb:
      'Modelled on Big Ben and paid for by the broker Premchand Roychand, who named it for his blind mother — the chimes told her the hour. 85 m of buff Kurla stone: square to the first gallery, then octagonal, then spire.',
    at: [18.92964, 72.82999],
    radius: 160,
    view: [80, 8, 60],
  },
  {
    id: 'bombay-high-court',
    name: 'Bombay High Court',
    local: 'मुंबई उच्च न्यायालय',
    area: 'Fort',
    built: '1878 · James Augustus Fuller',
    blurb:
      'Early English Gothic in blue basalt, 171 m long, with a central tower carrying the figures of Justice and Mercy — and, carved by a disgruntled mason, a monkey holding the scales of justice.',
    at: [18.9302, 72.8298],
    radius: 130,
    view: [90, 8, 0],
  },
  {
    id: 'csmvs',
    name: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya',
    local: 'छत्रपती शिवाजी महाराज वस्तु संग्रहालय',
    area: 'Fort',
    built: '1922 · George Wittet',
    blurb:
      'The old Prince of Wales Museum. Wittet gave it a tiled Indo-Saracenic dome on a Bijapur model, set in palm gardens — the same architect who would design the Gateway of India.',
    at: [18.926667, 72.832222],
    radius: 140,
    view: [0, 8, 110],
  },
  {
    id: 'flora-fountain',
    name: 'Flora Fountain',
    local: 'हुतात्मा चौक',
    area: 'Hutatma Chowk, Fort',
    built: '1864 · R. Norman Shaw',
    blurb:
      'Portland stone Roman goddess Flora at the crossing where the Fort walls once stood. Renamed Hutatma Chowk — Martyrs\' Square — for those killed in the Samyukta Maharashtra movement.',
    at: [18.9322, 72.8317],
    radius: 90,
    view: [0, 4, 45],
  },
  {
    id: 'bse',
    name: 'Bombay Stock Exchange',
    local: 'फिरोज जीजीभॉय टॉवर्स',
    area: 'Dalal Street, Fort',
    built: '1980',
    blurb:
      'Phiroze Jeejeebhoy Towers on Dalal Street — 29 storeys over Asia\'s oldest stock exchange, founded in 1875 under a banyan tree at the top of the same street.',
    at: [18.9296, 72.8331],
    radius: 120,
    view: [60, 10, 60],
  },
  {
    id: 'marine-drive',
    name: 'Marine Drive',
    local: 'क्वीन्स नेकलेस',
    area: 'Netaji Subhash Chandra Bose Road',
    built: '1940 · reclaimed land',
    blurb:
      'A three-kilometre C of Art Deco apartment blocks facing the Arabian Sea, fronted by tetrapods and a parapet everyone sits on. Seen from Malabar Hill after dark the street lamps curve away like a string of pearls — the Queen\'s Necklace.',
    at: [18.944, 72.817],
    radius: 420,
    view: [-26, 5, 165],
  },
  {
    id: 'girgaum-chowpatty',
    name: 'Girgaum Chowpatty',
    local: 'गिरगाव चौपाटी',
    area: 'Marine Drive north',
    blurb:
      'The beach at the top of the necklace: bhelpuri and pav bhaji stalls, ferris wheels, and every September the immersion of the largest Ganesh idols in the city.',
    at: [18.9548, 72.8129],
    radius: 200,
    view: [72, 5, 26],
  },
  {
    id: 'wankhede',
    name: 'Wankhede Stadium',
    local: 'वानखेडे स्टेडियम',
    area: 'Churchgate',
    built: '1974',
    blurb:
      'Home of Mumbai cricket, 33,000 seats under a Teflon-fabric canopy. India won the 2011 World Cup here — Dhoni finishing it off in style.',
    at: [18.9389, 72.8258],
    radius: 200,
    view: [0, 10, 170],
  },
  {
    id: 'nariman-point',
    name: 'Nariman Point',
    local: 'नरिमन पॉइंट',
    area: 'South Mumbai',
    blurb:
      "Reclaimed in the 1970s to be India's business district: Air India Building, Express Towers and the Oberoi stacked at the southern tip of the necklace.",
    at: [18.9258, 72.8225],
    radius: 220,
    view: [0, 12, 160],
  },
  {
    id: 'haji-ali',
    name: 'Haji Ali Dargah',
    local: 'हाजी अली दर्गाह',
    area: 'Worli bay',
    built: '1431',
    blurb:
      'The tomb of the Sufi saint Sayyed Pir Haji Ali Shah Bukhari, on an islet 500 m offshore. Whitewashed Indo-Islamic marble with one dome and one minaret, reached by a causeway that vanishes at high tide.',
    at: [18.9822, 72.8092],
    radius: 220,
    view: [95, 6, 20],
  },
  {
    id: 'dhobi-ghat',
    name: 'Mahalaxmi Dhobi Ghat',
    local: 'धोबी घाट',
    area: 'Mahalaxmi',
    built: '1890',
    blurb:
      "The world's largest open-air laundry: hundreds of concrete flogging pens where dhobis have beaten the city's washing against stone for over a century. Best seen from the bridge at Mahalaxmi station.",
    at: [18.98, 72.8305],
    radius: 140,
    view: [0, 12, 100],
  },
  {
    id: 'antilia',
    name: 'Antilia',
    local: 'अँटिलिया',
    area: "Altamount Road, Cumballa Hill",
    built: '2010 · Perkins & Will',
    blurb:
      "Mukesh Ambani's 173 m, 27-storey house — floors at double and triple height, hanging gardens, 168 parking spaces and a snow room. Designed around the lotus and the sun.",
    at: [18.9681, 72.8095],
    radius: 180,
    view: [80, 20, 120],
  },
  {
    id: 'siddhivinayak',
    name: 'Shree Siddhivinayak Temple',
    local: 'श्री सिद्धिविनायक मंदिर',
    area: 'Prabhadevi',
    built: '1801',
    blurb:
      "Mumbai's richest temple, dedicated to the Ganesha whose trunk turns right. A gold-plated shikhara over the sanctum, a queue that runs for hours on Tuesdays, and a multi-coloured dome lit up at night.",
    at: [19.01692, 72.830409],
    radius: 140,
    view: [0, 6, 80],
  },
  {
    id: 'sea-link',
    name: 'Bandra–Worli Sea Link',
    local: 'वांद्रे-वरळी सागरी सेतू',
    area: 'Mahim Bay',
    built: '2010 · Rajiv Gandhi Setu',
    blurb:
      "5.6 km and eight lanes across Mahim Bay, on twin cable-stayed spans of 250 m hung from 126 m pylons. India's first cable-stayed bridge built in open sea; it cut the Bandra–Worli run to ten minutes.",
    at: [19.0364, 72.8172],
    radius: 600,
    view: [-260, 30, 200],
  },
  {
    id: 'worli-skyline',
    name: 'Worli Skyline',
    local: 'वरळी',
    area: 'Worli',
    blurb:
      'The mill-land towers: Imperial I and II at 254 m, World One and the rest of the Lodha cluster rising over Worli village and the old chawls.',
    at: [19.0035, 72.8215],
    radius: 300,
    view: [0, 20, 220],
  },
  {
    id: 'bandra-fort',
    name: 'Bandra Fort',
    local: 'कॅस्टेला दे अगुआडा',
    area: "Land's End, Bandra",
    built: '1640 · Portuguese',
    blurb:
      'Castella de Aguada, the Portuguese watchtower at the mouth of Mahim Bay. Its ramparts now look straight down the Sea Link — the classic Bandra sunset spot.',
    at: [19.0425, 72.8155],
    radius: 150,
    view: [40, 8, 60],
  },
  {
    id: 'dharavi',
    name: 'Dharavi',
    local: 'धारावी',
    area: 'Between Mahim and Sion',
    blurb:
      'A square mile of tin, tarpaulin and enterprise holding roughly a million people — leather, pottery at Kumbharwada, and a recycling trade that processes most of what Mumbai throws away.',
    at: [19.04, 72.854],
    radius: 300,
    view: [0, 8, 180],
  },
  {
    id: 'juhu-beach',
    name: 'Juhu Beach',
    local: 'जुहू चौपाटी',
    area: 'Juhu',
    blurb:
      'Six kilometres of sand, pav bhaji carts and evening crowds, with the Bollywood houses of Juhu Vile Parle behind the palms.',
    at: [19.0968, 72.825],
    radius: 350,
    view: [70, 4, 0],
  },
  {
    id: 'global-vipassana-pagoda',
    name: 'Global Vipassana Pagoda',
    local: 'ग्लोबल विपश्यना पॅगोडा',
    area: 'Gorai',
    built: '2009',
    blurb:
      "A golden Burmese stupa on the Gorai creek, modelled on the Shwedagon. Its 97 m stone dome — the largest pillarless one in the world — covers a hall seating 8,000 meditators.",
    at: [19.22806, 72.80605],
    radius: 300,
    view: [0, 12, 220],
  },
  {
    id: 'elephanta',
    name: 'Elephanta Caves',
    local: 'घारापुरी लेणी',
    area: 'Gharapuri Island, Mumbai Harbour',
    built: '5th–8th century CE',
    blurb:
      'Rock-cut Shaiva cave temples an hour by ferry from the Gateway, centred on the three-headed Trimurti Sadashiva — six metres of Shiva as creator, preserver and destroyer.',
    at: [18.9633, 72.9315],
    radius: 300,
    view: [-80, 20, 90],
  },
];

/**
 * Only what is inside the current chapter. The rest of the registry stays in
 * the file — the map screen has nowhere to send you until the chapter that
 * unlocks them ships.
 */
export const LANDMARKS: Landmark[] = ALL_LANDMARKS.filter((l) =>
  inPhase(...(geo(l.at[0], l.at[1]) as [number, number]), 60)
);

export const LOCKED_LANDMARKS: Landmark[] = ALL_LANDMARKS.filter(
  (l) => !LANDMARKS.includes(l)
);

export const LANDMARKS_BY_ID = Object.fromEntries(ALL_LANDMARKS.map((l) => [l.id, l]));

export function landmarkWorld(l: Landmark): [number, number] {
  return geo(l.at[0], l.at[1]);
}
