# Election Nepal Backend Scripts

This directory contains the scripts responsible for scraping Election Commission Nepal (ECN) data and serving it to the frontend.

## Background Daemon (Hotfix)
The primary pipeline is currently powered by a completely detached virtual terminal daemon (`screen`). This circumvents issues with rate limiting, cron authentication against the MacOS Keychain, and Supabase IO limits.

To start the infinite scraper, run the following from the root of the repository:
```bash
./start-hotfix.sh
```

### 🛠️ Daemon Management Commands

Once the daemon is running in the background, you can manage it using the following commands:

**1. Check if it is running (Status)**
See if the `election-hotfix` screen session exists in the background:
```bash
screen -list
```

**2. Watch the Live Logs**
The daemon pipes all script output natively into uniquely timestamped log files. 
```bash
tail -f backend/logs/*
```

**3. Peek into the Virtual Terminal**
To physically "teleport" inside the invisible background process and watch the script run directly on the virtual terminal:
```bash
screen -r election-hotfix
```
*(Press `CTRL+A`, then `d` to detach and leave it running in the background again).*

**4. Kill the Daemon (Stop Scraping)**
If you want to end the infinite loop and shut down the hotfix completely:
```bash
screen -X -S election-hotfix quit
```
