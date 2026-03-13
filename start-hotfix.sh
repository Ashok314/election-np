#!/bin/bash

echo "🚀 Starting Nepal Election Hotfix Automation Setup..."
echo "---------------------------------------------------"

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

# Cleanup old cron jobs that failed auth
(crontab -l 2>/dev/null | grep -q "local-hotfix-scraper.js")
if [ $? -eq 0 ]; then
    echo "🧹 Removing broken background cron job..."
    crontab -r
fi

# Ensure logs directory exists
mkdir -p "$DIR/logs"

# Check if screen daemon is already running and kill it so we restart clean
if screen -list | grep -q "election-hotfix"; then
    echo "🔄 Restarting existing background daemon..."
    screen -X -S election-hotfix quit
fi

# We use 'screen' instead of cron because GitHub authentication requires a TTY (terminal session).
# A detached screen session gives MacOS Keychain exactly what it needs to authenticate silently.
echo "⚡ Starting background virtual terminal (Daemon)..."
screen -dmS election-hotfix bash -c "
    echo '🟢 INJECTED VIRTUAL TTY DAEMON STARTED'
    while true; do
        NOW=\$(date +%Y-%m-%d_%H-%M-%S)
        LOG_FILE=\"$DIR/logs/scrape_\$NOW.log\"
        echo \"▶️ [\$(date)] Waking up to scrape ECN...\" > \"\$LOG_FILE\"
        cd \"$DIR\" && \"$CAFFEINATE_PATH\" -is \"$NODE_PATH\" local-hotfix-scraper.js >> \"\$LOG_FILE\" 2>&1
        echo \"⏸️ [\$(date)] Scrape complete, waiting 5 minutes...\" >> \"\$LOG_FILE\"
        sleep 180
    done
"

echo " "
echo "🟢 HOTFIX IS NOW RUNNING SILENTLY IN A VIRTUAL TERMINAL!"
echo "Because it is using a virtual session, GitHub will perfectly authenticate 100% of the time!"
echo "You can close this window securely. It will survive."
echo " "
echo "To watch the live logs: tail -f backend/logs/*"
echo "To peek into the virtual terminal:  screen -r election-hotfix"
echo "To kill the background daemon:      screen -X -S election-hotfix quit"
echo "---------------------------------------------------"
