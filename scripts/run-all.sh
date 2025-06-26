#!/bin/bash

# AI Newscast Pipeline Runner
# This script runs the complete news crawling and processing pipeline

set -e

echo "🚀 Starting AI Newscast Pipeline..."

# Get absolute path to project root
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

# Create output directory with timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%S-%6N")
OUTPUT_DIR="$PROJECT_ROOT/output/$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

echo "📁 Output directory: $OUTPUT_DIR"

# Step 1: Crawl news topics
echo "📰 Step 1: Crawling news topics..."
pnpm crawl:news-topics -- --output-file "$OUTPUT_DIR/topic-list.json" --print-format json

if [ -f "$OUTPUT_DIR/topic-list.json" ]; then
    echo "✅ News topics crawled successfully"
    # Count topics using simple method (avoid jq dependency)
    TOPIC_COUNT=$(grep -o '"rank"' "$OUTPUT_DIR/topic-list.json" | wc -l)
    echo "📊 Found $TOPIC_COUNT topics"
else
    echo "❌ Failed to crawl news topics"
    exit 1
fi

echo "🎉 Pipeline completed successfully!"
echo "📂 Results saved in: $OUTPUT_DIR"