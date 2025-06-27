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
LOG_FILE=$(mktemp)
pnpm run:crawler:news-topics -- --output-file "$OUTPUT_DIR/topic-list.json" --print-log-format json --print-log-file "$LOG_FILE"

if [ -f "$OUTPUT_DIR/topic-list.json" ] && [ -f "$LOG_FILE" ]; then
    echo "✅ News topics crawled successfully"
    # Extract topic count from log file
    TOPIC_COUNT=$(jq -r '."total-topics"' "$LOG_FILE")
    echo "📊 Found $TOPIC_COUNT topics"
    rm "$LOG_FILE"
else
    echo "❌ Failed to crawl news topics"
    [ -f "$LOG_FILE" ] && rm "$LOG_FILE"
    exit 1
fi

# Step 2: Crawl news list for all topics
echo ""
echo "📋 Step 2: Crawling news lists for all $TOPIC_COUNT topics..."

for ((i=0; i<$TOPIC_COUNT; i++)); do
    TOPIC_NUM=$(printf "%02d" $((i + 1)))
    TOPIC_DIR="$OUTPUT_DIR/topic-$TOPIC_NUM"
    mkdir -p "$TOPIC_DIR"
    
    echo "  📄 Crawling topic $TOPIC_NUM..."
    LIST_LOG_FILE=$(mktemp)
    pnpm run:crawler:news-list -- --input-file "$OUTPUT_DIR/topic-list.json" --topic-index $i --output-file "$TOPIC_DIR/news-list.json" --print-log-format json --print-log-file "$LIST_LOG_FILE"
    
    if [ -f "$TOPIC_DIR/news-list.json" ] && [ -f "$LIST_LOG_FILE" ]; then
        NEWS_COUNT=$(jq -r '."total-news-list"' "$LIST_LOG_FILE")
        echo "  ✅ Topic $TOPIC_NUM: Found $NEWS_COUNT news items"
    else
        echo "  ❌ Failed to crawl news list for topic $TOPIC_NUM"
    fi
    rm "$LIST_LOG_FILE"
done

# Step 3: Crawl news details for all topics
echo ""
echo "🔍 Step 3: Crawling news details for all topics..."

TOTAL_DETAILS=0
for ((i=0; i<$TOPIC_COUNT; i++)); do
    TOPIC_NUM=$(printf "%02d" $((i + 1)))
    TOPIC_DIR="$OUTPUT_DIR/topic-$TOPIC_NUM"
    
    if [ -f "$TOPIC_DIR/news-list.json" ]; then
        echo "  🔍 Processing topic $TOPIC_NUM details..."
        DETAILS_LOG_FILE=$(mktemp)
        pnpm run:crawler:news-details -- --input-file "$TOPIC_DIR/news-list.json" --output-folder "$TOPIC_DIR/news" --print-log-format json --print-log-file "$DETAILS_LOG_FILE"
        
        if [ -f "$DETAILS_LOG_FILE" ]; then
            DETAILS_COUNT=$(jq -r '."total-news-details"' "$DETAILS_LOG_FILE")
            echo "  ✅ Topic $TOPIC_NUM: Extracted $DETAILS_COUNT news details"
            TOTAL_DETAILS=$((TOTAL_DETAILS + DETAILS_COUNT))
        else
            echo "  ❌ Failed to get details count for topic $TOPIC_NUM"
        fi
        rm "$DETAILS_LOG_FILE"
        
        # Check if news folder was created
        if [ -d "$TOPIC_DIR/news" ]; then
            DETAIL_FILES=$(find "$TOPIC_DIR/news" -name "*.json" -type f | wc -l)
            echo "  📁 Saved $DETAIL_FILES detail files"
        fi
    else
        echo "  ❌ No news list found for topic $TOPIC_NUM, skipping details"
    fi
done

echo ""
echo "🎉 Complete pipeline finished successfully!"
echo "📂 Results saved in: $OUTPUT_DIR"
echo "📊 Pipeline summary:"
echo "  - Topics: $TOPIC_COUNT"
echo "  - News lists: $TOPIC_COUNT topics processed"
echo "  - News details: $TOTAL_DETAILS total details extracted"