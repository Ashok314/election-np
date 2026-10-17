import districtsData from '../data/districts.json';
import { COLORS } from './theme';

export const PARTY_COLORS: Record<string, string> = {
  'Nepali Congress': COLORS.emerald,
  'CPN (UML)': COLORS.red,
  'CPN (Maoist Center)': COLORS.red, // Using red for both major left parties as they share red flags
  'Rastriya Swatantra Party': COLORS.blue,
  'Rastriya Prajatantra Party': COLORS.amber,
  'Janata Samajwadi Party': COLORS.pink,
  Independent: COLORS.violet,
  'नेपाली काँग्रेस': COLORS.emerald,
  'नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)': COLORS.red,
  'नेपाल कम्युनिष्ट पार्टी (माओवादी केन्द्र)': '#b91c1c', // Keeping specific shade for maoist
  'राष्ट्रिय स्वतन्त्र पार्टी': COLORS.blue,
  'राष्ट्रिय प्रजातन्त्र पार्टी': COLORS.amber,
  'जनता समाजवादी पार्टी, नेपाल': COLORS.pink,
  'श्रम संस्कृति पार्टी': '#f97316',
  स्वतन्त्र: COLORS.violet,
};

export const provinceNamesMap: Record<number, string> = {
  1: 'Koshi',
  2: 'Madhesh',
  3: 'Bagmati',
  4: 'Gandaki',
  5: 'Lumbini',
  6: 'Karnali',
  7: 'Sudurpashchim',
};

export const getPartyColor = (party: string) => PARTY_COLORS[party] || COLORS.slate[500];

// Lookup tables
export const districtLookup: Record<number, string> = {};
export const districtLookupNp: Record<number, string> = {};
export const provinceLookup: Record<number, string> = {};

interface DistrictData {
  id: number;
  name: string;
  name_np?: string;
  parentId: number;
}
(districtsData as DistrictData[]).forEach((d) => {
  districtLookup[d.id] = d.name;
  districtLookupNp[d.id] = d.name_np || d.name;
  provinceLookup[d.id] = provinceNamesMap[d.parentId] || 'Other';
});

export const TOTAL_FPTP_SEATS: number = 165;
export const TOTAL_PR_DISTRICTS: number = 77;
