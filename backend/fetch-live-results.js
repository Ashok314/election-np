const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_API_URL = 'https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles/Election2082/HOR/FPTP';
const SITE_URL = 'https://result.election.gov.np/';
const DATA_DIR = path.join(__dirname, 'data', 'candidates');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchLiveResults() {
    console.log(`[${new Date().toISOString()}] Starting Live Results Scraper...`);
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

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
        console.log("No constituencies.json lookup found!");
        await browser.close();
        return;
    }

    const constsList = JSON.parse(fs.readFileSync(constLookupPath, 'utf8'));
    let allResults = [];

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
                fs.writeFileSync(path.join(DATA_DIR, `HOR-${distId}-${c}.json`), JSON.stringify(data));

                // Add District/Const metadata to each row for the aggregated master sheet
                const enriched = data.map(row => ({
                    ...row,
                    MetaDistId: distId,
                    MetaConstId: c,
                }));

                // Push the leading candidate to the overall table (the JSON usually pre-sorts by votes or we just take the top 1 if needed, assuming the JSON array is all candidates for that constituency)
                // Usually, `data` is an array of candidates. The first one is the leader.
                if (enriched.length > 0) {
                    allResults.push(enriched[0]);
                }

                console.log(`Saved HOR-${distId}-${c}.json`);
            } else {
                console.log(`Failed/Empty HOR-${distId}-${c}.json`);
            }
            await delay(100);
        }
    }

    // Save the master aggregator
    fs.writeFileSync(path.join(DATA_DIR, 'all-results.json'), JSON.stringify(allResults));
    console.log(`[${new Date().toISOString()}] Scraped ${allResults.length} constituencies. Saved master all-results.json.`);
    await browser.close();
}

fetchLiveResults().catch(console.error);
