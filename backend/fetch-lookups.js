const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_API_URL = 'https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles';
const SITE_URL = 'https://result.election.gov.np/';
const DATA_DIR = path.join(__dirname, 'data', 'lookup');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function scrapeLookupData() {
    console.log('Starting headless browser to get lookups...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // 1. Visit the main page to get cookies and CSRF token initialized
    await page.goto(SITE_URL, { waitUntil: 'networkidle2' });

    // 2. Extract CSRF Token from cookies
    const cookies = await page.cookies();
    const csrfCookie = cookies.find(c => c.name === 'CsrfToken');

    if (!csrfCookie) {
        console.error('Failed to retrieve CsrfToken cookie!');
        await browser.close();
        return;
    }

    const csrfToken = csrfCookie.value;
    console.log(`Successfully obtained CSRF Token!`);

    // 3. Helper function to fetch JSON securely within page context
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

    // 4. Fetch Districts Lookup
    console.log('Fetching Districts Lookup...');
    const distUrl = `${BASE_API_URL}/Election2082/Local/Lookup/districts.json`;
    const distData = await fetchJsonInBrowser(distUrl, csrfToken);
    if (distData) {
        fs.writeFileSync(path.join(DATA_DIR, 'districts.json'), JSON.stringify(distData, null, 2));
        console.log('Saved districts.json');
    } else {
        console.log('Failed to fetch districts.json');
    }

    // 5. Fetch Constituencies Lookup
    console.log('Fetching Constituencies Lookup...');
    const constUrl = `${BASE_API_URL}/Election2082/HOR/Lookup/constituencies.json`;
    const constData = await fetchJsonInBrowser(constUrl, csrfToken);
    if (constData) {
        fs.writeFileSync(path.join(DATA_DIR, 'constituencies.json'), JSON.stringify(constData, null, 2));
        console.log('Saved constituencies.json');
    } else {
        console.log('Failed to fetch constituencies.json');
    }

    console.log('\nLookup Data Scraping Complete!');
    await browser.close();
}

scrapeLookupData().catch(console.error);
