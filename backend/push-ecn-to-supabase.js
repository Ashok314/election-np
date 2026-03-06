const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Auto-load environment variables from frontend/.env.local to make local testing easier
const envPath = path.join(__dirname, '..', 'frontend', '.env.local');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of envLines) {
        const match = line.match(/^([^#\s][^=]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^['"]|['"]$/g, ''); // Strip quotes
            process.env[key] = process.env[key] || val;
        }
    }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lcddjmnfhsrdshtueswn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
    process.exit(1);
}

// Create client with service role key in auth headers to bypass RLS and authenticate properly
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    global: {
        headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
    }
});

const BASE_API_URL = 'https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles/Election2082/HOR/FPTP';
const SITE_URL = 'https://result.election.gov.np/';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeAndPush() {
    console.log(`[${new Date().toISOString()}] Starting Puppeteer Scraper...`);
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
    console.log(`Successfully obtained CSRF Token!`);

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

    let totalUpserted = 0;

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
                // Enrich and prepare for Supabase upsert
                const rowsToInsert = data.map(row => ({
                    scraped_at: new Date().toISOString(),
                    dist_id: distId,
                    const_id: c,
                    candidate_name: row.CandidateName,
                    party_name: row.PoliticalPartyName,
                    votes: row.TotalVoteReceived || 0,
                    remarks: row.Remarks,
                    gender: row.Gender,
                    age: row.Age,
                }));

                const { error } = await supabase
                    .from('election_results')
                    .upsert(rowsToInsert, {
                        onConflict: 'dist_id, const_id, candidate_name'
                    });

                if (error) {
                    console.error(`Error pushing HOR-${distId}-${c} to Supabase:`, error.message);
                } else {
                    console.log(`Saved HOR-${distId}-${c}: ${rowsToInsert.length} candidates pushed.`);
                    totalUpserted += rowsToInsert.length;
                }
            } else {
                console.log(`Empty/403 for HOR-${distId}-${c}`);
            }
            // Be gentle on the API
            await delay(150);
        }
    }

    console.log(`[${new Date().toISOString()}] Scrape finished. Upserted ${totalUpserted} candidates to Supabase.`);
    await browser.close();
}

async function executeWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await scrapeAndPush();
            console.log(`[${new Date().toISOString()}] Scraper completed successfully on attempt ${attempt}.`);
            return; // Success, exit the loop
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Scrape attempt ${attempt} failed:`, err.message);
            if (attempt === maxRetries) {
                console.error("FATAL ERROR: Maximum retries reached. Exiting with failure.");
                process.exit(1); // Force the GitHub action to fail
            }
            console.log(`Waiting 10 seconds before retrying...`);
            await delay(10000);
        }
    }
}

executeWithRetry();
