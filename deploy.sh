#!/bin/bash
set -e

SERVER_USER="root"
SERVER_IP="72.22.68.33"
REMOTE_PATH="/var/www/derps"

echo "🚀 Starting deployment at $(date)"

echo "📦 Building React app..."
npm run build

echo "🔄 Uploading to $SERVER_IP..."
rsync -avz --delete build/ "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"

echo "🔁 Reloading Nginx..."
ssh "$SERVER_USER@$SERVER_IP" "systemctl reload nginx"

# Quick verification
echo "🔍 Verifying deployment..."
if ssh "$SERVER_USER@$SERVER_IP" "curl -s -o /dev/null -w '%{http_code}' http://localhost" | grep -q "200"; then
    echo "✅ Site is responding correctly"
else
    echo "⚠️  Deployment completed but site verification failed"
fi

echo "🎉 Deployment complete at $(date)"