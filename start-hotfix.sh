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

# Ensure logs directory exists
mkdir -p $DIR/logs

# The cron job definition:
# - caffeinate -is: prevents Mac from going to sleep while the script runs (idle & system sleep)
# - runs every 3 minutes
# - uses the execution timestamp to create a unique log file name inside backend/logs/
CRON_CMD="*/3 * * * * cd $DIR && $CAFFEINATE_PATH -is $NODE_PATH local-hotfix-scraper.js >> $DIR/logs/scrape_\$(date +\%Y-\%m-\%d_\%H-\%M-\%S).log 2>&1"

# Check if job already exists
(crontab -l 2>/dev/null | grep -q "local-hotfix-scraper.js")
if [ $? -eq 0 ]; then
    echo "⚠️  Cron job already installed! Running normally..."
else
    # Install the new cron job
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo "✅ Successfully installed 5-minute background cron task!"
    
    # Trigger the first run immediately so the user doesn't have to wait for logs
    echo "⚡ Triggering initial scrape in the background right now..."
    NOW=$(date +%Y-%m-%d_%H-%M-%S)
    cd $DIR && $CAFFEINATE_PATH -is $NODE_PATH local-hotfix-scraper.js >> $DIR/logs/scrape_$NOW.log 2>&1 &
fi

echo " "
echo "🟢 HOTFIX IS NOW RUNNING IN THE BACKGROUND VIA CRON!"
echo "It will run completely silently every 5 minutes."
echo "You can close this terminal and it will keep running!"
echo " "
echo "To watch the live logs: tail -f $DIR/logs/*"
echo "To stop the scraper:    crontab -r"
echo "---------------------------------------------------"
