const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_API_URL = 'https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles/JSONMap/geojson';
const SITE_URL = 'https://result.election.gov.np/';
const DATA_DIR = path.join(__dirname, 'data', 'geojson');

// Ensure directories exist
['District', 'Const'].forEach(dir => {
  const dirPath = path.join(DATA_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeData() {
  console.log('Starting headless browser to bypass CSRF...');
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
        if (!res.ok) {
          console.log(`Fetch failed for ${fetchUrl} with status: ${res.status}`);
          return null;
        }
        return await res.json();
      } catch (e) {
        console.log(`Exception fetching ${fetchUrl}: ${e.message}`);
        return null; // Return null to indicate failure
      }
    }, url, token);
  };

  // Skip State Maps as we already have them.
  console.log('Skipping State Maps...');

  // 5. Fetch Constituency Maps using the Districts lookup
  console.log('\nFetching Constituency Maps using accurate IDs from districts.json...');
  const districtsPath = path.join(__dirname, 'data', 'lookup', 'districts.json');
  if (fs.existsSync(districtsPath)) {
    const districtsList = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
    for (const dist of districtsList) {
      if (dist.name === "NA" || dist.id <= 52) continue; // Skip placeholders and already fetched

      const distId = dist.id;
      const url = `${BASE_API_URL}/Const/dist-${distId}.json`;
      console.log(`Requesting ${url}...`);

      let data = null;
      for (let retries = 0; retries < 3; retries++) {
        data = await fetchJsonInBrowser(url, csrfToken);
        if (data) break;
        console.log(`Retry ${retries + 1}/3...`);
        await delay(1000);
      }

      if (data) {
        fs.writeFileSync(path.join(DATA_DIR, 'Const', `dist-${distId}.json`), JSON.stringify(data));
        console.log(`Saved dist-${distId}.json (${dist.name})`);
      } else {
        console.log(`Failed permanently to fetch dist-${distId}.json (${dist.name})`);
      }
      await delay(500);
    }
  } else {
    console.log('No districts.json lookup found! Please run fetch-lookups.js first.');
  }

  console.log('\nMap Data Scraping Complete!');
  await browser.close();
}

scrapeData().catch(console.error);
