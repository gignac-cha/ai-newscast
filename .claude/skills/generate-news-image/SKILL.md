---
name: generate-news-image
description: Generates news article images using Google Gemini API from consolidated news. Use when user requests image generation for topics (e.g., "1", "1,3,4", "all").
---

# News Image Generator

Generates professional news photographs from consolidated news articles using Google Gemini 2.5 Flash Image API.

Supports: Single topic ("1번"), multiple topics ("1, 3, 4번"), or all topics ("모든 토픽").

## Prerequisites

- Google Gemini API key in `.env` file: `GOOGLE_GEN_AI_API_KEY`
- Consolidated news generated (see generate-news skill)
- `news-image-generator` package built

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

### Step 5: Execute image generator for each topic

Replace `{TIMESTAMP}` and `{INDEX_PADDED}` with actual values:

```bash
cd packages/news-image-generator
export GOOGLE_GEN_AI_API_KEY="$(grep GOOGLE_GEN_AI_API_KEY ../../.env | head -1 | cut -d '=' -f2)"
pnpm generate:image \
  --news-file ../../outputs/{TIMESTAMP}/topic-{INDEX_PADDED}/news.json \
  --output-file ../../outputs/{TIMESTAMP}/topic-{INDEX_PADDED}/news-image.png \
  --aspect-ratio 16:9
```

**Important**:
- Use `../../outputs/` path (relative to packages/news-image-generator)
- `{INDEX_PADDED}` is zero-padded (01, 02, ..., 10)
- Default aspect ratio: 16:9 (for web/YouTube)
- Wait 2 seconds between topics (optional, Gemini has high rate limit)

### Step 6: Report results

Report format (use this exact structure):
```
✅ Generated images for {N} topics

📁 outputs/{TIMESTAMP}/
   - topic-01/news-image.png (1024x576, 16:9)
   - topic-01/news-image-info.json

⏱️ Total time: ~{totalTime} seconds
💰 Total cost: ~${totalCost} (${costPerImage} per image)
```

## Expected Output

- **Duration**: ~3-5 seconds per image
- **Files**: news-image.png, news-image-info.json, news-image-prompt.txt
- **Resolution**: 1024x576 (16:9 default)
- **Cost**: $0.039 per image (Gemini 2.5 Flash)

## Aspect Ratio Options

- `16:9` - Web/YouTube (default)
- `1:1` - Social media
- `3:4` - Vertical thumbnail
- `9:16` - Mobile stories

## Troubleshooting

If generation fails:
- Check API key: `echo $GOOGLE_GEN_AI_API_KEY`
- Verify news.json exists for the topic
- Check network connectivity
- Ensure sufficient API quota
- Content may be blocked by safety filters (rare)

See `scripts/` directory for helper scripts.
