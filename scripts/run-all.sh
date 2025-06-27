#!/bin/bash

# AI Newscast Pipeline Runner
# This script runs the complete news crawling and processing pipeline

set -e

# Parse command line arguments
SKIP_TOPICS=false
SKIP_LISTS=false
SKIP_DETAILS=false
SKIP_GENERATION=false
OUTPUT_DIR_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-topics)
      SKIP_TOPICS=true
      shift
      ;;
    --skip-lists)
      SKIP_LISTS=true
      shift
      ;;
    --skip-details)
      SKIP_DETAILS=true
      shift
      ;;
    --skip-generation)
      SKIP_GENERATION=true
      shift
      ;;
    --output-dir)
      OUTPUT_DIR_OVERRIDE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --skip-topics      Skip news topics crawling (Step 1)"
      echo "  --skip-lists       Skip news lists crawling (Step 2)"
      echo "  --skip-details     Skip news details crawling (Step 3)"
      echo "  --skip-generation  Skip AI news generation (Step 4)"
      echo "  --output-dir DIR   Use existing output directory"
      echo "  --help             Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Run all steps"
      echo "  $0 --skip-topics --skip-lists        # Only run details and generation"
      echo "  $0 --output-dir output/2025-06-27... # Resume from existing output"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo "🚀 Starting AI Newscast Pipeline..."

# Get absolute path to project root
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$PROJECT_ROOT"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a  # automatically export all variables
    source "$PROJECT_ROOT/.env"
    set +a  # stop automatically exporting
fi

# Create or use output directory
if [ -n "$OUTPUT_DIR_OVERRIDE" ]; then
    OUTPUT_DIR="$PROJECT_ROOT/$OUTPUT_DIR_OVERRIDE"
    if [ ! -d "$OUTPUT_DIR" ]; then
        echo "❌ Error: Output directory does not exist: $OUTPUT_DIR"
        exit 1
    fi
    echo "📁 Using existing output directory: $OUTPUT_DIR"
else
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%S-%6N")
    OUTPUT_DIR="$PROJECT_ROOT/output/$TIMESTAMP"
    mkdir -p "$OUTPUT_DIR"
    echo "📁 Created output directory: $OUTPUT_DIR"
fi

# Step 1: Crawl news topics
if [ "$SKIP_TOPICS" = true ]; then
    echo "⏭️  Step 1: Skipping news topics crawling..."
    if [ -f "$OUTPUT_DIR/topic-list.json" ]; then
        TOPIC_COUNT=$(jq -r 'length' "$OUTPUT_DIR/topic-list.json")
        echo "📊 Found existing $TOPIC_COUNT topics"
    else
        echo "❌ Error: No topic-list.json found in output directory"
        exit 1
    fi
else
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
fi

# Step 2: Crawl news list for all topics
echo ""
if [ "$SKIP_LISTS" = true ]; then
    echo "⏭️  Step 2: Skipping news lists crawling..."
    # Count existing news lists
    EXISTING_LISTS=0
    for ((i=0; i<$TOPIC_COUNT; i++)); do
        TOPIC_NUM=$(printf "%02d" $((i + 1)))
        TOPIC_DIR="$OUTPUT_DIR/topic-$TOPIC_NUM"
        if [ -f "$TOPIC_DIR/news-list.json" ]; then
            EXISTING_LISTS=$((EXISTING_LISTS + 1))
        fi
    done
    echo "📊 Found existing news lists for $EXISTING_LISTS/$TOPIC_COUNT topics"
else
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
fi

# Step 3: Crawl news details for all topics
echo ""
if [ "$SKIP_DETAILS" = true ]; then
    echo "⏭️  Step 3: Skipping news details crawling..."
    # Count existing news details
    TOTAL_DETAILS=0
    for ((i=0; i<$TOPIC_COUNT; i++)); do
        TOPIC_NUM=$(printf "%02d" $((i + 1)))
        TOPIC_DIR="$OUTPUT_DIR/topic-$TOPIC_NUM"
        if [ -d "$TOPIC_DIR/news" ]; then
            DETAIL_FILES=$(find "$TOPIC_DIR/news" -name "*.json" -type f | wc -l)
            TOTAL_DETAILS=$((TOTAL_DETAILS + DETAIL_FILES))
        fi
    done
    echo "📊 Found existing $TOTAL_DETAILS news detail files"
else
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
fi

# Step 4: Generate consolidated news for all topics
echo ""
if [ "$SKIP_GENERATION" = true ]; then
    echo "⏭️  Step 4: Skipping AI news generation..."
    # Count existing generated news
    TOTAL_GENERATED=0
    for ((i=0; i<$TOPIC_COUNT; i++)); do
        TOPIC_NUM=$(printf "%02d" $((i + 1)))
        TOPIC_DIR="$OUTPUT_DIR/topic-$TOPIC_NUM"
        if [ -f "$TOPIC_DIR/news.json" ]; then
            TOTAL_GENERATED=$((TOTAL_GENERATED + 1))
        fi
    done
    echo "📊 Found existing $TOTAL_GENERATED generated news files"
else
    echo "🤖 Step 4: Generating consolidated news for all topics..."

    TOTAL_GENERATED=0
    for ((i=0; i<$TOPIC_COUNT; i++)); do
        TOPIC_NUM=$(printf "%02d" $((i + 1)))
        TOPIC_DIR="$OUTPUT_DIR/topic-$TOPIC_NUM"
        
        if [ -d "$TOPIC_DIR/news" ] && [ "$(find "$TOPIC_DIR/news" -name "*.json" -type f | wc -l)" -gt 0 ]; then
            echo "  🤖 Generating news for topic $TOPIC_NUM..."
            GENERATOR_LOG_FILE=$(mktemp)
            GOOGLE_GENAI_API_KEY="$GOOGLE_GENAI_API_KEY" pnpm run:generator:news -- --input-folder "$TOPIC_DIR/news" --output-file "$TOPIC_DIR/news.json" --print-format json --print-log-file "$GENERATOR_LOG_FILE"
            
            if [ -f "$TOPIC_DIR/news.json" ] && [ -f "$GENERATOR_LOG_FILE" ]; then
                GENERATED_COUNT=$(jq -r '."total-news-generated"' "$GENERATOR_LOG_FILE")
                echo "  ✅ Topic $TOPIC_NUM: Generated $GENERATED_COUNT consolidated news"
                TOTAL_GENERATED=$((TOTAL_GENERATED + GENERATED_COUNT))
            else
                echo "  ❌ Failed to generate news for topic $TOPIC_NUM"
            fi
            rm "$GENERATOR_LOG_FILE"
            
            # Check if both JSON and TXT files were created
            if [ -f "$TOPIC_DIR/news.json" ] && [ -f "$TOPIC_DIR/news.txt" ]; then
                echo "  📄 Saved news.json and news.txt files"
            fi
        else
            echo "  ⏭️  No news details found for topic $TOPIC_NUM, skipping generation"
        fi
    done
fi

echo ""
echo "🎉 Complete pipeline finished successfully!"
echo "📂 Results saved in: $OUTPUT_DIR"
echo "📊 Pipeline summary:"
echo "  - Topics: $TOPIC_COUNT"
echo "  - News lists: $TOPIC_COUNT topics processed"
echo "  - News details: $TOTAL_DETAILS total details extracted"
echo "  - Generated news: $TOTAL_GENERATED consolidated articles"