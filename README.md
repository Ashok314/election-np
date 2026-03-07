# Nepal Election Dashboard 🇳🇵

A beautifully designed, real-time dashboard for tracking the House of Representatives (HOR) Nepal elections. Features an interactive choropleth map, live candidate sorting, and multi-language support.

> **⚠️ DISCLAIMER** 
> This project is completely vibe-coded and should **NOT** be used as a credible or official source for election results. We do not guarantee real-time data fetch accuracy, completeness, or consistency with the official Election Commission Nepal (ECN) systems.

## 🌟 Why this Dashboard? (The "No-Click" Philosophy)
Most election portals (like eKantipur or NepalVotes) force you to click through multiple pages, drop-downs, and tables just to find out who is winning in a specific district. 

**This dashboard is different.** The map *is* the interface.
- Zero extra clicks required.
- **Hover** over any Province to see the total party seat breakdown.
- **Hover** over any District to see the top parties in that specific region.
- **Hover** over any Constituency to instantly see the full candidate list, exact vote counts, and margins. 

Everything you need to know about the election is instantly available just by moving your mouse.

### Features
* **Bilingual Search**: Search for candidates and parties in English or Nepali.
* **Auto-Scraping (Every 5 Minutes)**: Fetches data dynamically and pipes it through Supabase Realtime using a scheduled GitHub Actions Cron Job that runs every 5 minutes.
* **Real-time Updates**: Powered by Supabase Realtime.
* **AI Powered Insights**: Powered by Gemini 3 Pro.

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
## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Leaflet
- **Backend**: Supabase Postgres + Realtime
- **Scraper**: Puppeteer + GitHub Actions Cron

## Contributing & Bug Reports 🐛
Since this entire dashboard was completely **vibe-coded**, there's a strong chance you might encounter layout bugs, missing candidate data, or mobile responsiveness issues! 
If you notice any weird behavior or data discrepancies, please [open an issue](https://github.com/Ashok314/election-np/issues) on this repository so it can be fixed.

## License
**Under Consideration.** Permission to copy, modify, or deploy this code for commercial or official use is currently restricted while the licensing model is decided.

* **Support the Project**: [☕ Buy me a coffee](https://buymeacoffee.com/ashok314)