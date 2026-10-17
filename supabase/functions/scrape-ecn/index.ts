/**
 * Supabase Edge Function: scrape-ecn
 *
 * Fetches real-time election results from ECN (election.gov.np) and
 * upserts them into the Supabase `election_results` table.
 *
 * Deployed as a scheduled function — trigger with pg_cron every 5 minutes.
 *
 * Strategy (no Puppeteer needed):
 *  1. GET the ECN homepage to receive the Set-Cookie: CsrfToken header
 *  2. Use that token in X-CSRF-Token header for all data API calls
 *  3. Iterate all 165 constituencies and upsert candidate data
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = 'https://result.election.gov.np/';
const BASE_API_URL =
  'https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles/Election2082/HOR/FPTP';

const CONSTITUENCIES: Array<{ distId: number; consts: number }> = [
  { distId: 1, consts: 1 },
  { distId: 2, consts: 1 },
  { distId: 3, consts: 2 },
  { distId: 4, consts: 5 },
  { distId: 5, consts: 1 },
  { distId: 6, consts: 1 },
  { distId: 7, consts: 1 },
  { distId: 8, consts: 1 },
  { distId: 9, consts: 6 },
  { distId: 10, consts: 4 },
  { distId: 11, consts: 1 },
  { distId: 12, consts: 1 },
  { distId: 13, consts: 1 },
  { distId: 14, consts: 2 },
  { distId: 15, consts: 4 },
  { distId: 16, consts: 4 },
  { distId: 17, consts: 1 },
  { distId: 18, consts: 1 },
  { distId: 19, consts: 2 },
  { distId: 20, consts: 4 },
  { distId: 21, consts: 4 },
  { distId: 22, consts: 4 },
  { distId: 23, consts: 1 },
  { distId: 24, consts: 2 },
  { distId: 25, consts: 2 },
  { distId: 26, consts: 10 },
  { distId: 27, consts: 2 },
  { distId: 28, consts: 3 },
  { distId: 29, consts: 2 },
  { distId: 30, consts: 2 },
  { distId: 31, consts: 2 },
  { distId: 32, consts: 4 },
  { distId: 33, consts: 4 },
  { distId: 34, consts: 4 },
  { distId: 35, consts: 3 },
  { distId: 36, consts: 2 },
  { distId: 37, consts: 1 },
  { distId: 38, consts: 1 },
  { distId: 39, consts: 3 },
  { distId: 40, consts: 2 },
  { distId: 41, consts: 2 },
  { distId: 42, consts: 2 },
  { distId: 43, consts: 2 },
  { distId: 44, consts: 1 },
  { distId: 45, consts: 2 },
  { distId: 46, consts: 5 },
  { distId: 47, consts: 3 },
  { distId: 48, consts: 1 },
  { distId: 49, consts: 1 },
  { distId: 50, consts: 2 },
  { distId: 51, consts: 1 },
  { distId: 52, consts: 1 },
  { distId: 53, consts: 1 },
  { distId: 54, consts: 1 },
  { distId: 55, consts: 1 },
  { distId: 56, consts: 3 },
  { distId: 57, consts: 1 },
  { distId: 58, consts: 1 },
  { distId: 59, consts: 1 },
  { distId: 60, consts: 1 },
  { distId: 61, consts: 1 },
  { distId: 62, consts: 1 },
  { distId: 63, consts: 2 },
  { distId: 64, consts: 2 },
  { distId: 65, consts: 3 },
  { distId: 66, consts: 2 },
  { distId: 67, consts: 1 },
  { distId: 68, consts: 2 },
  { distId: 69, consts: 1 },
  { distId: 70, consts: 1 },
  { distId: 71, consts: 5 },
  { distId: 72, consts: 1 },
  { distId: 73, consts: 1 },
  { distId: 74, consts: 1 },
  { distId: 75, consts: 3 },
  { distId: 77, consts: 2 },
  { distId: 78, consts: 1 },
];

async function getCsrfToken(): Promise<{ token: string; cookie: string } | null> {
  try {
    const res = await fetch(SITE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const setCookieHeader = res.headers.get('set-cookie') || '';
    const cookieMatch = setCookieHeader.match(/CsrfToken=([^;]+)/);
    if (!cookieMatch) return null;

    const token = cookieMatch[1];
    const cookieString = setCookieHeader
      .split(',')
      .map((c: string) => c.trim().split(';')[0])
      .join('; ');

    return { token, cookie: cookieString };
  } catch (e) {
    console.error('Failed to get CSRF token:', e);
    return null;
  }
}

async function fetchConstituency(
  distId: number,
  constId: number,
  csrfToken: string,
  cookie: string,
): Promise<any[] | null> {
  const url = `${BASE_API_URL}/HOR-${distId}-${constId}.json`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-CSRF-Token': csrfToken,
        Cookie: cookie,
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: SITE_URL,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    console.log('[scrape-ecn] Getting CSRF token...');
    const csrf = await getCsrfToken();
    if (!csrf) {
      return new Response(JSON.stringify({ error: 'Could not get CSRF token' }), { status: 500 });
    }
    console.log('[scrape-ecn] Got CSRF token. Starting constituency fetch...');

    const rows: any[] = [];
    let fetched = 0;
    let failed = 0;

    for (const { distId, consts } of CONSTITUENCIES) {
      for (let constId = 1; constId <= consts; constId++) {
        const candidates = await fetchConstituency(distId, constId, csrf.token, csrf.cookie);

        if (candidates && candidates.length > 0) {
          for (const c of candidates) {
            rows.push({
              dist_id: distId,
              const_id: constId,
              candidate_id: c.CandidateID || null,
              candidate_name: c.CandidateName || null,
              party_name: c.PoliticalPartyName || null,
              party_id: c.PartyID || null,
              symbol_name: c.SymbolName || null,
              gender: c.Gender || null,
              age: c.Age || null,
              votes: c.TotalVoteReceived || 0,
              remarks: c.Remarks || null,
              state_name: c.StateName || null,
              district_name: c.DistrictName || null,
              scraped_at: new Date().toISOString(),
            });
          }
          fetched++;
        } else {
          failed++;
        }

        // Small delay to be respectful to ECN servers
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    console.log(
      `[scrape-ecn] Fetched ${fetched} seats, ${failed} failed. Upserting ${rows.length} candidate rows...`,
    );

    // Upsert in batches of 200
    const BATCH = 200;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from('election_results')
        .upsert(batch, { onConflict: 'dist_id,const_id,candidate_id', ignoreDuplicates: false });
      if (error) console.error('Upsert error:', error.message);
    }

    console.log('[scrape-ecn] Done.');
    return new Response(
      JSON.stringify({ success: true, seats_fetched: fetched, candidates_upserted: rows.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
