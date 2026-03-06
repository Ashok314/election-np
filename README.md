# Nepal Election Dashboard 🇳🇵

A beautifully designed, real-time dashboard for tracking the House of Representatives (HOR) Nepal elections. Features an interactive choropleth map, live candidate sorting, and multi-language support.

> **⚠️ DISCLAIMER** 
> This project is completely vibe-coded and should **NOT** be used as a credible or official source for election results. We do not guarantee real-time data fetch accuracy, completeness, or consistency with the official Election Commission Nepal (ECN) systems.

### Features
* **Interactive Map**: Hover over any District or Constituency to see live vote breakdowns.
* **Bilingual Search**: Search for candidates and parties in English or Nepali.
* **Auto-Scraping**: Fetches data dynamically and pipes it through Supabase Realtime using GitHub Actions.
* **Japan Easter Egg**: Made with ❤️ in Japan.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Leaflet
- **Backend**: Supabase Postgres + Realtime
- **Scraper**: Puppeteer + GitHub Actions Cron
