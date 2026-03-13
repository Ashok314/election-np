#!/bin/bash

echo "🚀 Starting Nepal PR Election Hotfix Automation Setup..."
echo "-------------------------------------------------------"

# Get current paths
DIR="$(pwd)/backend"
NODE_PATH=$(which node)
CAFFEINATE_PATH=$(which caffeinate)

if [ -z "$NODE_PATH" ]; then
    echo "❌ Error: Could not find 'node' executable in PATH."
    exit 1
fi

echo "📍 Found Node path: $NODE_PATH"
echo "📍 Data Directory: $DIR"

# Ensure logs directory exists
mkdir -p "$DIR/logs"

# Check if screen daemon is already running and kill it so we restart clean
if screen -list | grep -q "election-pr-hotfix"; then
    echo "🔄 Restarting existing background daemon..."
    screen -X -S election-pr-hotfix quit
fi

# We use 'screen' instead of cron because GitHub authentication requires a TTY (terminal session).
echo "⚡ Starting background virtual terminal (Daemon for PR)..."
screen -dmS election-pr-hotfix bash -c "
    echo '🟢 PR VIRTUAL TTY DAEMON STARTED'
    while true; do
        NOW=\$(date +%Y-%m-%d_%H-%M-%S)
        LOG_FILE=\"$DIR/logs/pr_scrape_\$NOW.log\"
        echo \"▶️ [\$(date)] Waking up to scrape PR ECN...\" > \"\$LOG_FILE\"
        cd \"$DIR\" && \"$CAFFEINATE_PATH\" -is \"$NODE_PATH\" pr-scraper.js >> \"\$LOG_FILE\" 2>&1
        echo \"⏸️ [\$(date)] PR Scrape complete, waiting 10 minutes...\" >> \"\$LOG_FILE\"
        sleep 500
    done
"

echo " "
echo "🟢 PR HOTFIX IS NOW RUNNING SILENTLY IN A VIRTUAL TERMINAL!"
echo " "
echo "To watch the live logs: tail -f backend/logs/pr_scrape_*"
echo "To peek into the virtual terminal:  screen -r election-pr-hotfix"
echo "To kill the background daemon:      screen -X -S election-pr-hotfix quit"
echo "-------------------------------------------------------"
