// USC + LA-area location aliases. Cross-referenced with the 2021-06 USC
// Concept3D campus map PDF for canonical building names. Coordinates
// populated once by hand from the campus map + Google Maps; Task 2 of the
// geo-tools plan can re-verify them via Google Geocoding if surveyor-grade
// precision is ever needed.
//
// When a student uses an unknown alias twice in a week, add a new entry.
//
// Header last reviewed: 2026-04-21

export interface Alias {
  canonical: string
  variants: string[]
  lat: number
  lng: number
  neighborhood: string
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const ALIASES: Alias[] = [
  // Dorms
  { canonical: 'Parkside', variants: ['parkside', 'parkside apts', 'parkside apartments', 'pks', 'irc', 'ah'], lat: 34.017, lng: -118.291, neighborhood: 'USC UPC / SW cluster' },
  { canonical: 'Webb Tower', variants: ['webb', 'webb tower', 'wto'], lat: 34.023, lng: -118.287, neighborhood: 'USC UPC / NW campus' },
  { canonical: 'University Gateway', variants: ['gateway', 'university gateway', 'ugw'], lat: 34.021, lng: -118.278, neighborhood: 'USC UPC / Figueroa' },
  { canonical: 'Pardee Tower', variants: ['pardee', 'pardee tower', 'ptd'], lat: 34.018, lng: -118.282, neighborhood: 'USC UPC / SE dorms' },
  { canonical: 'New North', variants: ['new north', 'new residential college', 'new', 'nrc'], lat: 34.021, lng: -118.281, neighborhood: 'USC UPC / E dorms' },
  { canonical: 'Fluor Tower', variants: ['fluor', 'fluor tower', 'flt'], lat: 34.023, lng: -118.288, neighborhood: 'USC UPC / NW campus' },
  { canonical: 'Cardinal Gardens', variants: ['cardinal gardens', 'cardinal'], lat: 34.027, lng: -118.283, neighborhood: 'USC N of campus' },
  { canonical: 'Century Apartments', variants: ['century', 'century apartments', 'ca century'], lat: 34.025, lng: -118.279, neighborhood: 'USC N of campus' },

  // Landmarks
  { canonical: 'Tommy Trojan', variants: ['tommy trojan', 'tommy', 'trojan statue'], lat: 34.020, lng: -118.285, neighborhood: 'USC UPC center' },
  { canonical: 'Lyon Center', variants: ['lyon', 'lyon center', 'lrc'], lat: 34.023, lng: -118.288, neighborhood: 'USC UPC / NW campus' },
  { canonical: 'Leavey Library', variants: ['leavey', 'leavey library', 'lvl'], lat: 34.022, lng: -118.283, neighborhood: 'USC UPC center' },
  { canonical: 'Doheny Library', variants: ['doheny', 'doheny memorial library', 'dml'], lat: 34.020, lng: -118.284, neighborhood: 'USC UPC center' },
  { canonical: 'USC Village', variants: ['village', 'usc village', 'mccarthy', 'mccarthy honors', 'mhc'], lat: 34.024, lng: -118.285, neighborhood: 'USC Village' },
  { canonical: 'Ronald Tutor Campus Center', variants: ['tutor campus center', 'tcc', 'ronald tutor'], lat: 34.021, lng: -118.286, neighborhood: 'USC UPC center' },
  { canonical: 'Annenberg', variants: ['annenberg', 'asc', 'wallis annenberg', 'ann'], lat: 34.021, lng: -118.288, neighborhood: 'USC UPC center' },
  { canonical: 'Watt Hall', variants: ['watt', 'watt hall', 'wah'], lat: 34.020, lng: -118.289, neighborhood: 'USC UPC / Roski' },
  { canonical: 'Bovard Auditorium', variants: ['bovard', 'bovard auditorium'], lat: 34.020, lng: -118.286, neighborhood: 'USC UPC center' },
  { canonical: 'JFF', variants: ['jff', 'fertitta', 'fertitta hall', 'fertitta cafe'], lat: 34.019, lng: -118.279, neighborhood: 'USC Marshall side' },
  { canonical: 'THH', variants: ['thh', 'taper', 'taper hall'], lat: 34.022, lng: -118.285, neighborhood: 'USC UPC center' },
  { canonical: 'DMC', variants: ['dmc', 'vkc', 'cpa', 'von kleinsmid', 'medicine crow', 'center for international and public affairs'], lat: 34.021, lng: -118.284, neighborhood: 'USC UPC center' },

  // Anchors
  { canonical: 'UPC', variants: ['upc', 'university park campus', 'main campus'], lat: 34.0205, lng: -118.2855, neighborhood: 'USC UPC center' },
  { canonical: 'HSC', variants: ['hsc', 'health sciences campus'], lat: 34.061, lng: -118.207, neighborhood: 'USC Health Sciences' },
  { canonical: 'Frat Row', variants: ['frat row', 'frat road', '28th st', '28th street', 'row'], lat: 34.025, lng: -118.286, neighborhood: 'USC UPC / 28th St corridor' },
  { canonical: 'Jefferson', variants: ['jefferson', 'jefferson blvd', 'jefferson boulevard'], lat: 34.025, lng: -118.287, neighborhood: 'USC UPC / N boundary' },
  { canonical: 'Figueroa', variants: ['figueroa', 'figueroa st', 'fig'], lat: 34.023, lng: -118.278, neighborhood: 'USC UPC / E boundary' },

  // Neighborhoods
  { canonical: 'K-town', variants: ['k town', 'ktown', 'k-town', 'koreatown', 'korea town'], lat: 34.063, lng: -118.300, neighborhood: 'Koreatown' },
  { canonical: 'DTLA', variants: ['dtla', 'downtown', 'downtown la', 'downtown los angeles'], lat: 34.053, lng: -118.243, neighborhood: 'Downtown LA' },
  { canonical: 'Arcadia', variants: ['arcadia', '626', 'sgv', 'san gabriel valley'], lat: 34.139, lng: -118.035, neighborhood: '626 / SGV' },
  { canonical: 'San Gabriel', variants: ['san gabriel'], lat: 34.096, lng: -118.106, neighborhood: '626 / SGV' },
  { canonical: 'Santa Monica', variants: ['santa monica', 'sm'], lat: 34.020, lng: -118.491, neighborhood: 'West LA' },
  { canonical: 'Hollywood', variants: ['hollywood'], lat: 34.099, lng: -118.329, neighborhood: 'Hollywood' },
  { canonical: 'Rowland Heights', variants: ['rowland heights', 'rowland'], lat: 33.978, lng: -117.905, neighborhood: '626 / SGV' },
  { canonical: 'Irvine', variants: ['irvine', 'oc'], lat: 33.683, lng: -117.794, neighborhood: 'Orange County' },

  // Transit
  { canonical: 'Union Station', variants: ['union station', 'la union station'], lat: 34.056, lng: -118.236, neighborhood: 'Downtown LA' },
  { canonical: 'LAX', variants: ['lax', 'los angeles airport'], lat: 33.942, lng: -118.408, neighborhood: 'LAX' },
]

export function resolveAlias(input: string): Alias | null {
  if (!input) return null
  const needle = normalize(input)
  if (!needle) return null
  for (const a of ALIASES) {
    if (normalize(a.canonical) === needle) return a
    for (const v of a.variants) {
      if (normalize(v) === needle) return a
    }
  }
  return null
}
