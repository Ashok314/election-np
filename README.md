# Nepal Election Dashboard 🇳🇵

A beautifully designed, real-time dashboard for tracking the House of Representatives (HOR) Nepal elections. Features an interactive choropleth map, live candidate sorting, and multi-language support.

## Election lifecycle and reuse

`frontend/src/config/election.ts` lists elections with their IDs, Nepali and Gregorian years, phases (`upcoming`, `live`, or `archived`), and data paths relative to `frontend/public`. The header selector switches between saved election results and the next election. A live election is selected by default when available; otherwise the first saved election in the list is shown. Keep saved elections in newest-first order. The selected election is retained in the URL through the `election` query parameter so shared links reopen the same election.

- **Completed election (`archived` internally):** loads a saved snapshot from `frontend/public/data/elections/2082/`, shows “Election ended”, and does not poll or fall back to a mutable GitHub data source. This preserves the repository's saved data. No data update timestamp is shown because a verified one is not available.
- **Upcoming:** shows the full dashboard and map with unpublished-result placeholders, without fetching vote results or assigning an unconfirmed date. The next election's map is a separate copy of the 2026 boundaries and is labeled as a reference map.
- **Live:** enables the existing 5-second FPTP and 60-second PR refresh intervals. The header labels the time as the browser's load time, not the source data's update time.

For the next election, keep the 2082 entry and snapshot directory intact, set the next entry's years and phase, and point `dataPath` at a separate directory for that election's JSON files. Keep its ID stable to preserve shared links. For the current scraper's existing output, `dataPath: 'data'` retains the original live behavior. Before using the scraper for another election, check its ECN API URLs and response format, lookups, constituency boundaries, and output locations; adapt the scraper or data mapping if the API changes. Changing the dashboard configuration alone does not retarget the scraper. The frontend reads the same normalized JSON shapes per election, so previously saved results remain available without the old API. Live deployments use `VITE_DATA_BRANCH` (default `main`) for the GitHub raw source. Saved results are served with the deployed site.

Each election directory also contains `nepal-constituencies.geojson`; maps are loaded from the selected election's directory. Replace the next election's reference file with its own confirmed boundaries and set `referenceMapYear: null` when available. Keep its phase `upcoming` until results should be read; then select `live` for automatic refresh or `archived` for saved results.

To review the dashboard without running scrapers or their Git operations:

```bash
npm run dev --workspace=frontend -- --host 127.0.0.1
```

Open the local URL printed by Vite with the `/election-np/` path. Run `npm test --workspace=frontend`, `npm run lint --workspace=frontend`, and `npm run build --workspace=frontend` to validate changes.

## Screen Captures

![Screen Capture](https://raw.githubusercontent.com/Ashok314/election-np/main/frontend/public/og-image.webp)

> **⚠️ DISCLAIMER**
> This project is completely vibe-coded and should **NOT** be used as a credible or official source for election results. We do not guarantee real-time data fetch accuracy, completeness, or consistency with the official Election Commission Nepal (ECN) systems.

## 🌟 Why this Dashboard? (The "No-Click" Philosophy)

Most election portals (like eKantipur or NepalVotes) force you to click through multiple pages, drop-downs, and tables just to find out who is winning in a specific district.

**This dashboard is different.** The map _is_ the interface.

- Zero extra clicks required.
- **Hover** over any Province to see the total party seat breakdown.
- **Hover** over any District to see the top parties in that specific region.
- **Hover** over any Constituency to instantly see the full candidate list, exact vote counts, and margins.

Everything you need to know about the election is instantly available just by moving your mouse.

### Features

- **Bilingual Search**: Search for candidates and parties in English or Nepali.
- **Auto-Scraping (Every 5 Minutes)**: Fetches data dynamically and pipes it through Supabase Realtime using a scheduled GitHub Actions Cron Job that runs every 5 minutes.
- **Real-time Updates**: Powered by Supabase Realtime.
- **AI Powered Insights**: Powered by Gemini 3 Pro.

## Quickstart (Local Development) 🚀

Since the live Supabase instance occasionally exhausts its free tier IO budget, the dashboard is designed to be ridiculously easy to run locally in under two minutes:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Ashok314/election-np.git
   cd election-np
   ```

2. **Start the local Supabase instance:**
   Install the Supabase CLI if you haven't already (`brew install supabase/tap/supabase` on Mac), then run:

   ```bash
   supabase start
   ```

   This immediately spins up a local Postgres database, applies all schema migrations automatically, and provides you with the local `VITE_SUPABASE_URL` and anon keys!

3. **Install and run the frontend:**

   ```bash
   cd frontend
   npm install

   # Copy the sample env and replace with your local Supabase keys
   cp .env.example .env.local

   npm run dev
   ```

4. **(Optional) Run the Scraper locally:**
   ```bash
   cd backend
   npm install
   node push-ecn-to-supabase.js
   ```

### 🚨 Temporary Supabase-Free Local Scraper (Hotfix)

If the Supabase database is down or you do not want to set up local PostgreSQL/Supabase CLI, a lightweight file-system-only hotfix is available on the `hotfix-local-scrape` branch. It works instantly without needing _any_ `.env` files or databases!

1. Checkout the hotfix branch:
   ```bash
   git checkout hotfix-local-scrape
   ```
2. Run the specialized local scraper (automatically handles batching and writes data to a local `all-results.json` file):
   ```bash
   cd backend
   npm install
   # Run this on a 5-minute cron interval (not to overwhelm the ECN servers)
   node local-hotfix-scraper.js
   ```
3. The frontend (running via `npm run dev`) automatically polls this generated JSON file natively every 5 seconds.
4. **Deployment**: When `.github/workflows/deploy.yml` is configured to listen to this branch, running the scraper automatically commits the JSON and triggers a GitHub Pages deployment to statically host the live data!

## Architecture

- **Frontend**: React + Vite + Tailwind CSS + Leaflet
- **Backend**: Supabase Postgres + Realtime
- **Scraper**: Puppeteer + GitHub Actions Cron

## Contributing & Bug Reports 🐛

Since this entire dashboard was completely **vibe-coded**, there's a strong chance you might encounter layout bugs, missing candidate data, or mobile responsiveness issues!
If you notice any weird behavior or data discrepancies, please [open an issue](https://github.com/Ashok314/election-np/issues) on this repository so it can be fixed.

## License

**Under Consideration.** Permission to copy, modify, or deploy this code for commercial or official use is currently restricted while the licensing model is decided.

- **Support the Project**: [☕ Buy me a coffee](https://buymeacoffee.com/ashok314)
