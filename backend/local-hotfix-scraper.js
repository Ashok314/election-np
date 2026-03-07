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

    const allResults = [];

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

                allResults.push(...formattedRows);
            }

            // Incrementally write file directly so the dashboard populates immediately while running
            try {
                fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResults, null, 2), 'utf8');
            } catch (e) {
                console.error(`[ERROR] Failed to save JSON file incrementally: ${e.message}`);
            }

            await delay(150);
        }
    }

    console.log(`[SUCCESS] Finished scrape loop. Total ${allResults.length} candidates.`);
    await browser.close();
    return allResults.length;
}

async function runLoop() {
    console.log("Starting Loop...");
    while (true) {
        try {
            const count = await scrapeData();
            if (count > 0) {
                console.log("Pushing to git hotfix-local-scrape branch...");
                execSync('git add ../frontend/public/data/all-results.json', { stdio: 'inherit' });
                // Check if there are changes to commit
                const status = execSync('git status --porcelain').toString();
                if (status.includes('all-results.json')) {
                    execSync('git commit -m "chore: auto-update local election data" --no-verify', { stdio: 'inherit' });
                    execSync('git push origin hotfix-local-scrape', { stdio: 'inherit' });
                    console.log("[SUCCESS] Git push complete.");
                } else {
                    console.log("No new data changes to commit.");
                }
            }
        } catch (e) {
            console.error("Error in scraping loop attempt:", e);
        }

        console.log("Waiting 3 minutes before next scrape...");
        await delay(3 * 60 * 1000); // 3 minutes
    }
}

runLoop();
