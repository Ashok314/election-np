import { createClient } from '@supabase/supabase-js';
import districtsData from '../data/districts.json';

// Create a lookup for defensive mapping
const provinceNames: Record<number, string> = {
  1: "Koshi", 2: "Madhesh", 3: "Bagmati", 4: "Gandaki",
  5: "Lumbini", 6: "Karnali", 7: "Sudurpashchim"
};
const districtMap: Record<number, { name: string, state: string }> = {};
(districtsData as any).forEach((d: any) => {
  districtMap[d.id] = {
    name: d.name,
    state: provinceNames[d.parentId] || "Other"
  };
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// In dev without Supabase creds, fallback gracefully
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type ElectionResult = {
  id: number;
  dist_id: number;
  const_id: number;
  candidate_id: number;
  candidate_name: string;
  party_name: string;
  party_id: number;
  symbol_name: string;
  gender: string;
  age: number;
  votes: number;
  remarks: string | null;
  state_name: string;
  district_name: string;
  scraped_at: string;
  qualification?: string;
};

// Map Supabase row -> frontend CandidateResult shape
export function mapRow(row: ElectionResult) {
  const info = districtMap[row.dist_id];
  return {
    MetaDistId: row.dist_id,
    MetaConstId: row.const_id,
    CandidateName: row.candidate_name,
    PoliticalPartyName: row.party_name,
    TotalVoteReceived: row.votes,
    Remarks: row.remarks ?? '',
    Gender: row.gender,
    Age: row.age,
    Qualification: row.qualification,
    StateName: row.state_name || info?.state || 'Other',
    DistrictName: row.district_name || info?.name || `Dist ${row.dist_id}`,
  };
}
