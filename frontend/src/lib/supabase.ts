import { createClient } from '@supabase/supabase-js';

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
  };
}
