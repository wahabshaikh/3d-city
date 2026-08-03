import { geo } from '../geo';

export type RoadKind = 'artery' | 'street' | 'promenade' | 'causeway' | 'bridge';

export type Road = {
  id: string;
  name: string;
  kind: RoadKind;
  /** Half-width in metres. */
  width: number;
  pts: [number, number][];
};

/** Real Mumbai arteries, traced station to junction. */
export const ROADS: Road[] = [
  {
    id: 'marine-drive',
    name: 'Netaji Subhash Chandra Bose Road',
    kind: 'promenade',
    width: 13,
    pts: [
      [18.9245, 72.8206],
      [18.93, 72.8196],
      [18.937, 72.8189],
      [18.944, 72.8174],
      [18.9505, 72.8147],
      [18.9548, 72.8134],
    ],
  },
  {
    id: 'colaba-causeway',
    name: 'Shahid Bhagat Singh Road',
    kind: 'artery',
    width: 8,
    pts: [
      [18.9045, 72.8148],
      [18.91, 72.8235],
      [18.9175, 72.8305],
      [18.9235, 72.8332],
      [18.931, 72.8345],
    ],
  },
  {
    id: 'dn-road',
    name: 'Dadabhai Naoroji Road',
    kind: 'artery',
    width: 8,
    pts: [
      [18.9265, 72.8329],
      [18.9322, 72.8317],
      [18.936, 72.833],
      [18.9398, 72.8348],
    ],
  },
  {
    id: 'mg-road',
    name: 'Mahatma Gandhi Road',
    kind: 'street',
    width: 6,
    pts: [
      [18.9235, 72.8332],
      [18.928, 72.8322],
      [18.9322, 72.8317],
      [18.9385, 72.8332],
    ],
  },
  {
    id: 'veer-nariman',
    name: 'Veer Nariman Road',
    kind: 'street',
    width: 6,
    pts: [
      [18.9322, 72.8317],
      [18.9335, 72.8272],
      [18.9345, 72.8225],
    ],
  },
  {
    id: 'walkeshwar',
    name: 'Walkeshwar & Bhulabhai Desai Road',
    kind: 'artery',
    width: 7,
    pts: [
      [18.9548, 72.8134],
      [18.9535, 72.8055],
      [18.9475, 72.7995],
      [18.9445, 72.796],
      [18.9525, 72.7975],
      [18.9615, 72.8025],
      [18.972, 72.8058],
      [18.98, 72.8085],
      [18.9812, 72.8125],
    ],
  },
  {
    id: 'peddar',
    name: 'Peddar Road',
    kind: 'artery',
    width: 7,
    pts: [
      [18.9558, 72.8115],
      [18.9635, 72.8068],
      [18.9681, 72.8098],
      [18.9755, 72.812],
      [18.9812, 72.8128],
    ],
  },
  {
    id: 'annie-besant',
    name: 'Annie Besant Road',
    kind: 'artery',
    width: 8,
    pts: [
      [18.9815, 72.8125],
      [18.99, 72.8135],
      [18.999, 72.816],
      [19.008, 72.8185],
      [19.0128, 72.816],
    ],
  },
  {
    id: 'worli-seaface',
    name: 'Worli Seaface',
    kind: 'promenade',
    width: 8,
    pts: [
      [18.9925, 72.8118],
      [19.0025, 72.812],
      [19.011, 72.8128],
      [19.0155, 72.8145],
    ],
  },
  {
    id: 'sea-link',
    name: 'Bandra–Worli Sea Link',
    kind: 'bridge',
    width: 20,
    pts: [
      [19.0125, 72.8158],
      [19.018, 72.8166],
      [19.026, 72.8178],
      [19.034, 72.8194],
      [19.0395, 72.8208],
    ],
  },
  {
    id: 'haji-ali-causeway',
    name: 'Haji Ali causeway',
    kind: 'causeway',
    width: 3.5,
    pts: [
      [18.9812, 72.8142],
      [18.9818, 72.8118],
      [18.9822, 72.81],
      [18.9822, 72.8092],
    ],
  },
  {
    id: 'bandra-bandstand',
    name: 'Bandstand & Turner Road',
    kind: 'street',
    width: 6,
    pts: [
      [19.0398, 72.8213],
      [19.0452, 72.8228],
      [19.046, 72.8185],
      [19.0525, 72.8235],
      [19.0578, 72.8322],
    ],
  },
  {
    id: 'linking-road',
    name: 'Linking Road',
    kind: 'artery',
    width: 7,
    pts: [
      [19.0525, 72.8335],
      [19.065, 72.834],
      [19.078, 72.8345],
      [19.0925, 72.8318],
      [19.098, 72.8285],
    ],
  },
  {
    id: 'wes',
    name: 'Western Express Highway',
    kind: 'artery',
    width: 12,
    pts: [
      [19.0455, 72.8478],
      [19.062, 72.853],
      [19.082, 72.8548],
      [19.104, 72.8552],
      [19.126, 72.8545],
    ],
  },
  {
    id: 'eastern',
    name: 'P. D’Mello & Eastern Freeway',
    kind: 'artery',
    width: 10,
    pts: [
      [18.925, 72.8365],
      [18.9425, 72.8425],
      [18.9705, 72.8452],
      [18.9995, 72.858],
      [19.0245, 72.8672],
      [19.0435, 72.8705],
    ],
  },
  {
    id: 'sion-mahim',
    name: 'Sion–Mahim Link Road',
    kind: 'artery',
    width: 8,
    pts: [
      [19.0392, 72.8402],
      [19.0402, 72.851],
      [19.0398, 72.8655],
    ],
  },
  {
    id: 'ambedkar',
    name: 'Dr. Ambedkar Road',
    kind: 'artery',
    width: 7,
    pts: [
      [18.9615, 72.8345],
      [18.9765, 72.8338],
      [18.9925, 72.8362],
      [19.0125, 72.8418],
      [19.0195, 72.8438],
    ],
  },
  {
    id: 'mahim-causeway',
    name: 'Mahim Causeway',
    kind: 'artery',
    width: 8,
    pts: [
      [19.0355, 72.8405],
      [19.0432, 72.8362],
      [19.0472, 72.8308],
    ],
  },
  {
    id: 'juhu-tara',
    name: 'Juhu Tara Road',
    kind: 'street',
    width: 6,
    pts: [
      [19.0835, 72.8268],
      [19.0955, 72.8272],
      [19.1055, 72.8278],
    ],
  },
];

export type RailLine = {
  id: string;
  name: string;
  colour: string;
  pts: [number, number][];
  stations: { name: string; at: [number, number] }[];
};

/** The suburban network — the thing that actually moves Mumbai. */
export const RAIL_LINES: RailLine[] = [
  {
    id: 'western',
    name: 'Western Line',
    colour: '#b8352c',
    pts: [
      [18.9352, 72.8272],
      [18.9452, 72.8236],
      [18.9542, 72.8192],
      [18.9628, 72.8152],
      [18.9692, 72.8196],
      [18.9822, 72.8232],
      [18.9962, 72.8288],
      [19.0082, 72.8305],
      [19.0186, 72.8434],
      [19.0288, 72.8438],
      [19.041, 72.8422],
      [19.0544, 72.8406],
      [19.07, 72.839],
      [19.081, 72.841],
      [19.0995, 72.844],
      [19.1197, 72.8464],
    ],
    stations: [
      { name: 'Churchgate', at: [18.9352, 72.8272] },
      { name: 'Marine Lines', at: [18.9452, 72.8236] },
      { name: 'Charni Road', at: [18.9542, 72.8192] },
      { name: 'Grant Road', at: [18.9628, 72.8152] },
      { name: 'Mumbai Central', at: [18.9692, 72.8196] },
      { name: 'Mahalaxmi', at: [18.9822, 72.8232] },
      { name: 'Lower Parel', at: [18.9962, 72.8288] },
      { name: 'Prabhadevi', at: [19.0082, 72.8305] },
      { name: 'Dadar', at: [19.0186, 72.8434] },
      { name: 'Mahim Junction', at: [19.041, 72.8422] },
      { name: 'Bandra', at: [19.0544, 72.8406] },
      { name: 'Khar Road', at: [19.07, 72.839] },
      { name: 'Santacruz', at: [19.081, 72.841] },
      { name: 'Vile Parle', at: [19.0995, 72.844] },
      { name: 'Andheri', at: [19.1197, 72.8464] },
    ],
  },
  {
    id: 'central',
    name: 'Central Line',
    colour: '#2f5fa8',
    pts: [
      [18.9398, 72.8354],
      [18.949, 72.8368],
      [18.9562, 72.8392],
      [18.9762, 72.8332],
      [18.9912, 72.8358],
      [19.0186, 72.8442],
      [19.0272, 72.8508],
      [19.0392, 72.8618],
      [19.0652, 72.8792],
    ],
    stations: [
      { name: 'CSMT', at: [18.9398, 72.8354] },
      { name: 'Masjid', at: [18.949, 72.8368] },
      { name: 'Sandhurst Road', at: [18.9562, 72.8392] },
      { name: 'Byculla', at: [18.9762, 72.8332] },
      { name: 'Parel', at: [18.9912, 72.8358] },
      { name: 'Dadar', at: [19.0186, 72.8442] },
      { name: 'Matunga', at: [19.0272, 72.8508] },
      { name: 'Sion', at: [19.0392, 72.8618] },
      { name: 'Kurla', at: [19.0652, 72.8792] },
    ],
  },
];

export const roadWorld = (r: Road) => r.pts.map(([a, b]) => geo(a, b));
export const railWorld = (r: RailLine) => r.pts.map(([a, b]) => geo(a, b));
