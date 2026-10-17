import { mapRow } from '../lib/supabase';
import type { ElectionResult } from '../lib/supabase';
import type { CandidateResult, PRResult, PRByDistrict } from '../types/election';
import type { ElectionConfig } from '../config/election';

const DATA_BRANCH = import.meta.env.VITE_DATA_BRANCH || 'main';

/**
 * Generic fetcher with local -> GitHub fallback logic
 */
async function fetchWithFallback<T>(election: ElectionConfig, filename: string): Promise<T | null> {
  if (election.phase === 'upcoming') return null;
  if (election.phase === 'archived') {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${election.dataPath}/${filename}`);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (err) {
      console.error(`Archive fetch failed for ${filename}:`, err);
      return null;
    }
  }
  const t = `?t=${new Date().getTime()}`;
  const isLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const BASE = import.meta.env.BASE_URL || '/';

  // 1. Try Local first if in local environment
  if (isLocal) {
    try {
      const res = await fetch(`${BASE}${election.dataPath}/${filename}${t}`);
      if (res.ok) {
        const data = await res.json();
        // Defensive check for empty/invalid data
        if (Array.isArray(data) && data.length > 0) return data as T;
        if (!Array.isArray(data) && data) return data as T;
      }
    } catch (err) {
      console.warn(`Local fetch failed for ${filename}, falling back to GitHub.`, err);
    }
  }

  // 2. Fallback to GitHub (or direct fetch if not local)
  try {
    const url = `https://raw.githubusercontent.com/Ashok314/election-np/${DATA_BRANCH}/frontend/public/${election.dataPath}/${filename}${t}`;
    const res = await fetch(url);
    if (res.ok) return (await res.json()) as T;
  } catch (err) {
    console.error(`GitHub fetch failed for ${filename}:`, err);
  }

  return null;
}

export const fetchFPTPData = async (election: ElectionConfig): Promise<CandidateResult[]> => {
  try {
    const raw = await fetchWithFallback<ElectionResult[]>(election, 'all-results.json');
    return (raw || []).map(mapRow);
  } catch (err) {
    console.error('Error processing FPTP data:', err);
    return [];
  }
};

export const fetchPRData = async (election: ElectionConfig): Promise<PRResult[]> => {
  const data = await fetchWithFallback<PRResult[]>(election, 'pr-results.json');
  return data || [];
};

export const fetchPRByDistrictData = async (election: ElectionConfig): Promise<PRByDistrict[]> => {
  const data = await fetchWithFallback<PRByDistrict[]>(election, 'pr-by-district.json');
  return data || [];
};
