#!/bin/bash

# KV에서 빌드 설정을 가져와서 환경변수로 설정하는 스크립트

set -e

KV_NAMESPACE_NAME="ai-newscast-kv"

echo "🔐 Loading configuration from Cloudflare KV..."

# KV namespace ID 동적으로 가져오기
echo "🔍 Finding KV namespace ID for '$KV_NAMESPACE_NAME'..."
KV_NAMESPACE_ID=$(npx wrangler kv namespace list 2>/dev/null | jq -r ".[] | select(.title == \"$KV_NAMESPACE_NAME\") | .id" 2>/dev/null || echo "")

if [ -z "$KV_NAMESPACE_ID" ] || [ "$KV_NAMESPACE_ID" = "null" ]; then
    echo "❌ KV namespace '$KV_NAMESPACE_NAME' not found"
    echo "❌ No configuration found in KV, falling back to .env file"
    exec "$@"
    exit 0
fi

echo "✅ Found KV namespace ID: $KV_NAMESPACE_ID"

# KV에서 환경변수 가져오기
echo "📦 Fetching latest-newscast-id-url..."
VITE_LATEST_NEWSCAST_ID_URL=$(npx wrangler kv key get --remote --namespace-id="$KV_NAMESPACE_ID" "latest-newscast-id-url" 2>/dev/null || echo "")

echo "📦 Fetching newscast-storage..."
VITE_NEWSCAST_STORAGE=$(npx wrangler kv key get --remote --namespace-id="$KV_NAMESPACE_ID" "newscast-storage" 2>/dev/null || echo "")

# 결과 확인 및 출력
if [ -n "$VITE_LATEST_NEWSCAST_ID_URL" ] && [ "$VITE_LATEST_NEWSCAST_ID_URL" != "null" ]; then
    echo "✅ VITE_LATEST_NEWSCAST_ID_URL: ${VITE_LATEST_NEWSCAST_ID_URL:0:50}..."
    export VITE_LATEST_NEWSCAST_ID_URL
else
    echo "⚠️  VITE_LATEST_NEWSCAST_ID_URL: Not found in KV"
fi

if [ -n "$VITE_NEWSCAST_STORAGE" ] && [ "$VITE_NEWSCAST_STORAGE" != "null" ]; then
    echo "✅ VITE_NEWSCAST_STORAGE: ${VITE_NEWSCAST_STORAGE:0:50}..."
    export VITE_NEWSCAST_STORAGE
else
    echo "⚠️  VITE_NEWSCAST_STORAGE: Not found in KV"
fi

# 환경변수가 설정되었는지 확인
if [ -n "$VITE_LATEST_NEWSCAST_ID_URL" ] || [ -n "$VITE_NEWSCAST_STORAGE" ]; then
    echo "✅ KV configuration loaded successfully"
else
    echo "❌ No configuration found in KV, falling back to .env file"
fi

echo "🚀 Proceeding with build..."

# 환경변수와 함께 빌드 실행
exec "$@"