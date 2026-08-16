export type City = {
  slug: string;
  name: string;
  local: string;
  country: string;
  tagline: string;
  blurb: string;
  /** Landmarks advertised on the city card. */
  highlights: string[];
  population: string;
  founded: string;
  available: boolean;
  /** Colours used for the card's procedural skyline. */
  palette: { sky: [string, string]; ink: string; accent: string };
};

export const CITIES: City[] = [
  {
    slug: 'mumbai',
    name: 'Mumbai',
    local: 'मुंबई',
    country: 'India',
    tagline: 'Urbs Prima in Indis',
    blurb:
      'Seven islands reclaimed into one peninsula, then filled with more people per square kilometre than almost anywhere on earth. Sixteen stops from first light at the Gateway of India to the Queen\'s Necklace after dark — or leave the tour and walk it yourself, from Colaba Causeway to Dharavi.',
    highlights: [
      'Gateway of India',
      'Chhatrapati Shivaji Maharaj Terminus',
      'Marine Drive',
      'Bandra–Worli Sea Link',
      'Haji Ali Dargah',
    ],
    population: '21.7 million',
    founded: '1507 · Portuguese Bombaim',
    available: true,
    palette: { sky: ['#f9b16e', '#c2557a'], ink: '#1a1026', accent: '#f2c14e' },
  },
];

export const getCity = (slug: string) => CITIES.find((c) => c.slug === slug);
