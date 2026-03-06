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

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Leaflet
- **Backend**: Supabase Postgres + Realtime
- **Scraper**: Puppeteer + GitHub Actions Cron
