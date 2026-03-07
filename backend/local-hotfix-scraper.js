const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'all-results.json');
const BASE_API_URL = 'https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles/Election2082/HOR/FPTP';
const SITE_URL = 'https://result.election.gov.np/';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeData() {
    console.log(`\n[${new Date().toISOString()}] Starting Local Hotfix Scraper...`);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // 1. Visit to get CSRF cookies
    await page.goto(SITE_URL, { waitUntil: 'networkidle2' });
    const cookies = await page.cookies();
    const csrfCookie = cookies.find(c => c.name === 'CsrfToken');

    if (!csrfCookie) {
        console.error('Failed to retrieve CsrfToken cookie!');
        await browser.close();
        return;
    }
    const csrfToken = csrfCookie.value;

    const fetchJsonInBrowser = async (url, token) => {
        return await page.evaluate(async (fetchUrl, csrf) => {
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
            } catch (e) {
                return null;
            }
        }, url, token);
    };

    const constLookupPath = path.join(__dirname, 'data', 'lookup', 'constituencies.json');
    if (!fs.existsSync(constLookupPath)) {
        console.error("No constituencies.json lookup found!");
        await browser.close();
        return;
    }
    const constsList = JSON.parse(fs.readFileSync(constLookupPath, 'utf8'));

    const existingDataMap = new Map();
    if (fs.existsSync(OUTPUT_PATH)) {
        try {
            const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
            existing.forEach(row => {
                const key = `${row.dist_id}-${row.const_id}-${row.candidate_name}`;
                existingDataMap.set(key, row);
            });
        } catch (e) {
            console.warn("Could not read existing all-results.json, starting fresh.");
        }
    }

    let requestCount = 0;
    // Process each constituency sequentially
    for (const item of constsList) {
        const distId = item.distId;
        const numConsts = item.consts;

        for (let c = 1; c <= numConsts; c++) {
            const url = `${BASE_API_URL}/HOR-${distId}-${c}.json`;

            let data = null;
            for (let retries = 0; retries < 2; retries++) {
                data = await fetchJsonInBrowser(url, csrfToken);
                if (data) break;
                await delay(500);
            }

            if (data && Array.isArray(data)) {
                if (data.length === 0) {
                    console.log(`[EMPTY] HOR-${distId}-${c} returned an empty array.`);
                } else {
                    console.log(`[SUCCESS] HOR-${distId}-${c} returned ${data.length} records.`);
                    const uniqueCandidates = new Map();
                    data.forEach(row => {
                        const name = row.CandidateName;
                        const votes = row.TotalVoteReceived || 0;
                        if (!uniqueCandidates.has(name) || votes > (uniqueCandidates.get(name).TotalVoteReceived || 0)) {
                            uniqueCandidates.set(name, row);
                        }
                    });

                    // Format to exactly mimic Supabase Postgres schema shape
                    const formattedRows = Array.from(uniqueCandidates.values()).map(row => ({
                        dist_id: distId,
                        const_id: c,
                        candidate_name: row.CandidateName,
                        party_name: row.PoliticalPartyName,
                        votes: row.TotalVoteReceived || 0,
                        remarks: row.Remarks,
                        gender: row.Gender,
                        age: row.Age,
                    }));

                    formattedRows.forEach(row => {
                        const key = `${row.dist_id}-${row.const_id}-${row.candidate_name}`;
                        existingDataMap.set(key, row);
                    });
                }
            } else {
                console.warn(`[FAILED/403] Could not fetch data for HOR-${distId}-${c}. data:`, data);
            }

            requestCount++;

            // Incrementally write file directly so the dashboard populates immediately while running
            try {
                fs.writeFileSync(OUTPUT_PATH, JSON.stringify(Array.from(existingDataMap.values()), null, 2), 'utf8');
            } catch (e) {
                console.error(`[ERROR] Failed to save JSON file incrementally: ${e.message}`);
            }

            if (requestCount % 10 === 0) {
                console.log(`[WAIT] Batch of 10 reached. Waiting 3 seconds to avoid rate limit...`);
                await delay(3000);
            } else {
                await delay(500);
            }
        }
    }

    console.log(`[SUCCESS] Finished scrape loop. Total ${existingDataMap.size} candidates.`);
    await browser.close();
    return existingDataMap.size;
}

async function main() {
    try {
        const now = new Date().toLocaleString();
        console.log(`\n======================================================`);
        console.log(`▶️ [${now}] Starting scheduled scrape...`);
        console.log(`======================================================`);
        const startTime = Date.now();
        const count = await scrapeData();
        const endTime = Date.now();
        console.log(`✅ [${new Date().toLocaleString()}] Scrape finished.`);
        console.log(`Total candidates in database: ${count}`);
        console.log(`Scrape took ${((endTime - startTime) / 1000).toFixed(2)} seconds.`);

        if (count > 0) {
            console.log("Pushing to git hotfix-local-scrape branch...");
            execSync('git add ../frontend/public/data/all-results.json', { stdio: 'inherit' });

            const status = execSync('git status --porcelain', { env: process.env }).toString();
            if (status.includes('all-results.json')) {
                execSync('git commit --amend --no-edit --no-verify ../frontend/public/data/all-results.json', { stdio: 'inherit', env: process.env });
                // Running inside cron strips the MacOS credential helper context.
                // We pass in process.env so the credential-osxkeychain works.
                execSync('git push -f origin hotfix-local-scrape', { stdio: 'inherit', env: process.env });
                console.log("[SUCCESS] Git force-push complete.");
            } else {
                console.log("No new data changes to commit.");
            }
        }
    } catch (e) {
        console.error("Error in scraping attempt:", e);
        process.exit(1);
    }
}

main();
