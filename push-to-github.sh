#!/bin/bash

# ============================================
# QuickMart - GitHub Push Script
# Just run: bash push-to-github.sh
# ============================================

TOKEN="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"
REPO="ssaatdesigns-web/quick-mart"
API="https://api.github.com"

echo "🚀 QuickMart → GitHub Pusher"
echo "================================"

# Check auth
USER=$(curl -s -H "Authorization: token $TOKEN" "$API/user" | python3 -c "import sys,json; print(json.load(sys.stdin).get('login','error'))" 2>/dev/null)
echo "✅ Logged in as: $USER"

push_file() {
  local content=$(base64 < "$1" | tr -d '\n')
  local repo_path="$2"
  
  # Get existing SHA if file exists
  local sha=$(curl -s \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "$API/repos/$REPO/contents/$repo_path" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null)

  local json_payload
  if [ -n "$sha" ]; then
    json_payload=$(python3 -c "import json; print(json.dumps({'message':'Add $repo_path','content':'$content','sha':'$sha'}))")
  else
    json_payload=$(python3 -c "import json; print(json.dumps({'message':'Add $repo_path','content':'$content'}))")
  fi

  local result=$(curl -s -X PUT \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d "$json_payload" \
    "$API/repos/$REPO/contents/$repo_path")

  local status=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ pushed' if 'content' in d else '❌ ' + d.get('message','unknown error'))" 2>/dev/null)
  echo "$repo_path  $status"
}

echo ""
echo "📦 Pushing files..."
echo "-------------------"

push_file "package.json" "package.json"
push_file "public/index.html" "public/index.html"
push_file "src/index.js" "src/index.js"
push_file "src/App.js" "src/App.js"

echo ""
echo "================================"
echo "🎉 Done! Check your repo at:"
echo "   https://github.com/$REPO"
echo ""
echo "Vercel will auto-deploy in ~60s if connected."
echo "================================"
