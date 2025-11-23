---
name: generate-news
description: Generates consolidated AI news from collected articles using Google Gemini 2.5 Pro. Use when user requests news consolidation/generation for topics (e.g., "1", "1,3,4", "all").
---

# AI News Generator

Consolidates multiple news articles into a single comprehensive news story using Google Gemini 2.5 Pro AI.

Supports: Single topic ("1번"), multiple topics ("1, 3, 4번"), or all topics ("모든 토픽").

## Prerequisites

- Google Gemini API key in `.env` file: `GOOGLE_GEN_AI_API_KEY`
- News details collected (see crawl-bigkinds-news-details skill)

## Instructions

### Step 1: Navigate to project root
```bash
source scripts/find-project-root.sh
```

### Step 2: Find latest output directory
```bash
ls -t outputs/ | head -n1
```

Note the directory name for use in Step 5.

### Step 3: Verify API key
```bash
grep GOOGLE_GEN_AI_API_KEY .env
```

### Step 4: Parse user request

Extract topic indices:
- "1번" → [1]
- "1, 3, 4번" → [1, 3, 4]
- "모든 토픽" or "전체" → [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

### Step 5: Execute generator for each topic

Replace `{TIMESTAMP}` and `{INDEX_PADDED}` with actual values:

```bash
cd packages/news-generator
export GOOGLE_GEN_AI_API_KEY="$(grep GOOGLE_GEN_AI_API_KEY ../../.env | head -1 | cut -d '=' -f2)"
pnpm generate:news \
  --input-folder ../../outputs/{TIMESTAMP}/topic-{INDEX_PADDED}/news \
  --output-file ../../outputs/{TIMESTAMP}/topic-{INDEX_PADDED}/news.json
```

**Important**:
- Use `../../outputs/` path (relative to packages/news-generator)
- `{INDEX_PADDED}` is zero-padded (01, 02, ..., 10)
- Wait 3 seconds between topics (rate limit)

### Step 6: Report results

Report format (use this exact structure):
```
✅ Generated consolidated news for {N} topics

📁 outputs/{TIMESTAMP}/
   - topic-01/news.json ({sources} sources)
   - topic-01/news.md

⏱️ Total time: ~{totalTime} seconds
```

## Expected Output

- **Duration**: ~10-30 seconds per topic
- **Files**: news.json (structured data), news.md (markdown format)
- **Content**: 500+ character unified news story
- **Rate limit**: 3 seconds between API calls

## Troubleshooting

If generation fails:
- Check API key: `echo $GOOGLE_GEN_AI_API_KEY`
- Verify news folder exists with JSON files
- Check network connectivity
- Ensure sufficient API quota

See `scripts/` directory for helper scripts.
