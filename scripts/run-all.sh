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
RUN_PARALLEL=true
MAX_CONCURRENCY=-1
DRY_RUN=false

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
    --run-parallel)
      RUN_PARALLEL=true
      shift
      ;;
    --no-parallel)
      RUN_PARALLEL=false
      shift
      ;;
    --max-concurrency)
      MAX_CONCURRENCY="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --skip-topics        Skip news topics crawling (Step 1)"
      echo "  --skip-lists         Skip news lists crawling (Step 2)"
      echo "  --skip-details       Skip news details crawling (Step 3)"
      echo "  --skip-generation    Skip AI news generation (Step 4)"
      echo "  --output-dir DIR     Use existing output directory"
      echo "  --run-parallel       Enable parallel news generation (default: true)"
      echo "  --no-parallel        Disable parallel processing, use sequential"
      echo "  --max-concurrency N  Maximum concurrent processes (default: auto-detect cores)"
      echo "  --dry-run            Simulate pipeline execution without API calls"
      echo "  --help               Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                      # Run all steps with parallel generation"
      echo "  $0 --no-parallel                       # Run with sequential generation"
      echo "  $0 --max-concurrency 2                 # Limit to 2 concurrent processes"
      echo "  $0 --dry-run                           # Test pipeline logic without API calls"
      echo "  $0 --skip-topics --skip-lists          # Only run details and generation"
      echo "  $0 --output-dir output/2025-06-27...   # Resume from existing output"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

if [ "$DRY_RUN" = true ]; then
    echo "🚀 Starting AI Newscast Pipeline (DRY RUN MODE - no API calls)..."
else
    echo "🚀 Starting AI Newscast Pipeline..."
fi

# Determine concurrency settings
if [ "$MAX_CONCURRENCY" -eq -1 ]; then
    # Auto-detect CPU cores and use them directly
    CPU_CORES=$(nproc 2>/dev/null || echo 4)
    MAX_CONCURRENCY=$CPU_CORES
    echo "🧠 Auto-detected $CPU_CORES CPU cores, using $MAX_CONCURRENCY concurrent processes"
else
    echo "⚙️  Using manually configured $MAX_CONCURRENCY concurrent processes"
fi

# Check if GNU parallel is available for parallel processing
if [ "$RUN_PARALLEL" = true ] && ! command -v parallel &> /dev/null; then
    echo "⚠️  GNU parallel not found. Installing..."
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y parallel
    elif command -v brew &> /dev/null; then
        brew install parallel
    else
        echo "❌ Cannot install GNU parallel automatically. Falling back to sequential processing."
        RUN_PARALLEL=false
    fi
fi

if [ "$RUN_PARALLEL" = true ]; then
    echo "⚡ Parallel processing enabled (max $MAX_CONCURRENCY concurrent)"
else
    echo "🔄 Sequential processing enabled"
fi

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
    if [ "$DRY_RUN" = true ]; then
        echo "📰 Step 1: [DRY RUN] Simulating news topics crawling..."
        TOPIC_COUNT=10
        echo "✅ [DRY RUN] Simulated 10 topics successfully"
        echo "📊 Found $TOPIC_COUNT topics (simulated)"
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
    if [ "$DRY_RUN" = true ]; then
        echo "📋 Step 2: [DRY RUN] Simulating news lists for all $TOPIC_COUNT topics..."
        for ((i=0; i<$TOPIC_COUNT; i++)); do
            TOPIC_NUM=$(printf "%02d" $((i + 1)))
            NEWS_COUNT=$((50 + RANDOM % 50))  # Random 50-100 news items
            echo "  ✅ [DRY RUN] Topic $TOPIC_NUM: Simulated $NEWS_COUNT news items"
        done
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
    if [ "$DRY_RUN" = true ]; then
        echo "🔍 Step 3: [DRY RUN] Simulating news details for all topics..."
        TOTAL_DETAILS=0
        for ((i=0; i<$TOPIC_COUNT; i++)); do
            TOPIC_NUM=$(printf "%02d" $((i + 1)))
            DETAILS_COUNT=$((30 + RANDOM % 40))  # Random 30-70 details
            TOTAL_DETAILS=$((TOTAL_DETAILS + DETAILS_COUNT))
            echo "  ✅ [DRY RUN] Topic $TOPIC_NUM: Simulated $DETAILS_COUNT news details"
            echo "  📁 [DRY RUN] Would save $DETAILS_COUNT detail files"
        done
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
    if [ "$DRY_RUN" = true ]; then
        if [ "$RUN_PARALLEL" = true ]; then
            echo "🤖 Step 4: [DRY RUN] Simulating consolidated news generation (parallel processing)..."
            echo "  ⚡ Would process $TOPIC_COUNT topics with $MAX_CONCURRENCY concurrent processes..."
            
            # Simulate parallel processing timing
            SIMULATED_TIME=$((45 / MAX_CONCURRENCY + 2))  # Rough parallel time estimate
            echo "  ⏱️  Simulating $SIMULATED_TIME seconds of parallel API calls..."
            sleep 2  # Brief simulation
            
            for ((i=0; i<$TOPIC_COUNT; i++)); do
                TOPIC_NUM=$(printf "%02d" $((i + 1)))
                echo "  ✅ [DRY RUN] Topic $TOPIC_NUM: Would generate consolidated news"
            done
            echo "  🎯 [DRY RUN] Parallel generation simulation completed!"
        else
            echo "🤖 Step 4: [DRY RUN] Simulating consolidated news generation (sequential processing)..."
            for ((i=0; i<$TOPIC_COUNT; i++)); do
                TOPIC_NUM=$(printf "%02d" $((i + 1)))
                echo "  🤖 [DRY RUN] Would generate news for topic $TOPIC_NUM..."
                sleep 0.5  # Brief simulation
                echo "  ✅ [DRY RUN] Topic $TOPIC_NUM: Would generate consolidated news"
                echo "  📄 [DRY RUN] Would save news.json and news.txt files"
            done
        fi
        TOTAL_GENERATED=$TOPIC_COUNT
    elif [ "$RUN_PARALLEL" = true ]; then
        echo "🤖 Step 4: Generating consolidated news for all topics (parallel processing)..."
        
        # Create temporary job list for GNU parallel
        JOB_LIST=$(mktemp)
        VALID_TOPICS=0
        
        for ((i=0; i<$TOPIC_COUNT; i++)); do
            TOPIC_NUM=$(printf "%02d" $((i + 1)))
            TOPIC_DIR="$OUTPUT_DIR/topic-$TOPIC_NUM"
            
            if [ -d "$TOPIC_DIR/news" ] && [ "$(find "$TOPIC_DIR/news" -name "*.json" -type f | wc -l)" -gt 0 ]; then
                echo "$TOPIC_DIR/news" >> "$JOB_LIST"
                VALID_TOPICS=$((VALID_TOPICS + 1))
            else
                echo "  ⏭️  No news details found for topic $TOPIC_NUM, skipping generation"
            fi
        done
        
        if [ $VALID_TOPICS -gt 0 ]; then
            echo "  ⚡ Processing $VALID_TOPICS topics with $MAX_CONCURRENCY concurrent processes..."
            
            # Use GNU parallel for concurrent processing
            # --delay 2: 2 second delay between job starts (rate limiting)
            # --progress: show progress
            # --tagstring: prefix output with topic directory
            # --jobs: limit concurrent jobs
            # --env: pass environment variables to child processes
            parallel --jobs "$MAX_CONCURRENCY" --delay 2 --progress --tagstring '{//}' --env GOOGLE_GENAI_API_KEY \
                'pnpm run:generator:news -- --input-folder {} --output-file {//}/news.json --print-format json 2>/dev/null || echo "[ERROR] Failed to generate news for {//}"' \
                :::: "$JOB_LIST"
            
            echo ""
            echo "  🎯 Parallel generation completed!"
        fi
        
        rm "$JOB_LIST"
        
    else
        echo "🤖 Step 4: Generating consolidated news for all topics (sequential processing)..."

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
    
    # Count total generated files (works for both parallel and sequential)
    if [ "$DRY_RUN" = true ]; then
        # Already set above in dry-run logic
        :
    else
        TOTAL_GENERATED=$(find "$OUTPUT_DIR" -name "news.json" -type f | wc -l)
    fi
fi

echo ""
echo "🎉 Complete pipeline finished successfully!"
echo "📂 Results saved in: $OUTPUT_DIR"
echo "📊 Pipeline summary:"
echo "  - Topics: $TOPIC_COUNT"
echo "  - News lists: $TOPIC_COUNT topics processed"
echo "  - News details: $TOTAL_DETAILS total details extracted"
echo "  - Generated news: $TOTAL_GENERATED consolidated articles"