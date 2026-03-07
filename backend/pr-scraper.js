/**
 * pr-scraper.js — Samanupatik (PR) Scraper
 * Separate from local-hotfix-scraper.js — safe to run independently.
 * Outputs: pr-results.json (national totals) + pr-by-district.json (per-constituency winners)
 * Usage: node pr-scraper.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'pr-results.json');
const DIST_OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'pr-by-district.json');
const BASE_API_URL = 'https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles/Election2082/HOR/PR/HOR';
const SITE_URL = 'https://result.election.gov.np/';

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapePRData() {
    console.log(`\n[${new Date().toISOString()}] Starting PR Scraper (समानुपातिक)...`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto(SITE_URL, { waitUntil: 'networkidle2' });
    const cookies = await page.cookies();
    const csrfCookie = cookies.find(c => c.name === 'CsrfToken');

    if (!csrfCookie) {
        console.error('Failed to retrieve CsrfToken cookie!');
        await browser.close();
        return 0;
    }
    const csrfToken = csrfCookie.value;

    const fetchJson = async (url) => page.evaluate(async (fetchUrl, csrf) => {
        try {
            const res = await fetch(fetchUrl, {
                headers: {
                    'X-CSRF-Token': csrf,
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (!res.ok) return null;
            return await res.json();
        } catch { return null; }
    }, url, csrfToken);

    const constLookupPath = path.join(__dirname, 'data', 'lookup', 'constituencies.json');
    if (!fs.existsSync(constLookupPath)) {
        console.error('constituencies.json not found at:', constLookupPath);
        await browser.close();
        return 0;
    }
    const constsList = JSON.parse(fs.readFileSync(constLookupPath, 'utf8'));

    // National: party_name → { total_votes, constituencies_counted }
    const partyTotals = new Map();
    // Per-constituency: dist_id-const_id → { dist_id, const_id, party_name, total_votes }
    const constResults = [];
    const constResultsMap = new Map();

    let requestCount = 0;

    for (const item of constsList) {
        const distId = item.distId;
        const numConsts = item.consts;

        for (let c = 1; c <= numConsts; c++) {
            const url = `${BASE_API_URL}/HOR-${distId}-${c}.json`;

            let data = null;
            for (let retry = 0; retry < 2; retry++) {
                data = await fetchJson(url);
                if (data) break;
                await delay(300);
            }

            if (data && Array.isArray(data) && data.length > 0) {
                console.log(`[SUCCESS] PR HOR-${distId}-${c}: ${data.length} parties | top: ${data[0].PoliticalPartyName}`);

                // Accumulate national totals
                data.forEach(row => {
                    const party = row.PoliticalPartyName;
                    const votes = row.TotalVoteReceived || 0;
                    if (!party) return;
                    const existing = partyTotals.get(party) || { total_votes: 0, constituencies_counted: 0 };
                    partyTotals.set(party, {
                        party_name: party,
                        total_votes: existing.total_votes + votes,
                        constituencies_counted: existing.constituencies_counted + 1,
                    });
                });

                // Store ALL parties for this constituency (sorted by votes desc)
                // Flat rows: {dist_id, const_id, party_name, total_votes}
                const sorted = data
                    .filter(row => row.PoliticalPartyName && (row.TotalVoteReceived || 0) > 0)
                    .sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0));

                // Remove any existing entries for this constituency then append all
                const key = `${distId}-${c}`;
                if (constResultsMap.has(key)) {
                    const startIdx = constResultsMap.get(key);
                    // Remove old entries for this key (they're contiguous)
                    constResults.splice(startIdx);
                }
                constResultsMap.set(key, constResults.length);
                sorted.forEach(row => {
                    constResults.push({
                        dist_id: distId,
                        const_id: c,
                        party_name: row.PoliticalPartyName,
                        total_votes: row.TotalVoteReceived || 0,
                    });
                });
            } else {
                console.log(`[SKIP] PR HOR-${distId}-${c}: no data`);
            }

            requestCount++;

            // Write both output files incrementally
            const natSorted = Array.from(partyTotals.values()).sort((a, b) => b.total_votes - a.total_votes);
            fs.writeFileSync(OUTPUT_PATH, JSON.stringify(natSorted, null, 2), 'utf8');
            fs.writeFileSync(DIST_OUTPUT_PATH, JSON.stringify(constResults, null, 2), 'utf8');

            if (requestCount % 10 === 0) {
                console.log(`[WAIT] ${requestCount} requests done. Waiting 3s...`);
                await delay(3000);
            } else {
                await delay(400);
            }
        }
    }

    const totalVotes = Array.from(partyTotals.values()).reduce((s, p) => s + p.total_votes, 0);
    console.log(`\n[DONE] ${partyTotals.size} parties, ${constResults.length} constituencies, ${totalVotes.toLocaleString()} total votes`);
    await browser.close();
    return partyTotals.size;
}

async function main() {
    try {
        const now = new Date().toLocaleString();
        console.log(`\n======================================================`);
        console.log(`▶️  [${now}] PR Scraper starting...`);
        console.log(`======================================================`);
        const startTime = Date.now();
        const count = await scrapePRData();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ PR Scrape done in ${elapsed}s. ${count} parties written.`);

        if (count > 0) {
            console.log('Pushing PR data to git...');
            execSync('git add ../frontend/public/data/pr-results.json ../frontend/public/data/pr-by-district.json', { stdio: 'inherit' });
            const status = execSync('git status --porcelain', { env: process.env }).toString();
            if (status.includes('pr-results.json') || status.includes('pr-by-district.json')) {
                execSync('git commit -m "chore: update PR election data" --no-verify', { stdio: 'inherit', env: process.env });
                execSync('git pull --rebase origin hotfix-local-scrape', { stdio: 'inherit', env: process.env });
                execSync('git push origin hotfix-local-scrape', { stdio: 'inherit', env: process.env });
                console.log('[SUCCESS] Pushed PR data to git.');
            } else {
                console.log('No changes to commit.');
            }
        }
    } catch (e) {
        console.error('PR Scraper error:', e);
        process.exit(1);
    }
}

main();