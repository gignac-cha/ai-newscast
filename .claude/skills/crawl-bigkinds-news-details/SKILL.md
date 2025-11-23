---
name: crawl-bigkinds-news-details
description: Crawls detailed news content for specified topic indices (e.g., "1", "1,3,4", "all"). Use when user requests news details collection.
---

# BigKinds News Details Crawler

Crawls detailed news content (title, body, summary, metadata) for specified topics.

Supports: Single topic ("1번"), multiple topics ("1, 3, 4번"), or all topics ("모든 토픽").

## Instructions

### Step 1: Navigate to project root
```bash
source scripts/find-project-root.sh
```

### Step 2: Find latest output directory
```bash
ls -t outputs/ | head -n1
```

Note the directory name for use in Step 4.

### Step 3: Parse user request

Extract topic indices:
- "1번" → [1]
- "1, 3, 4번" → [1, 3, 4]
- "모든 토픽" or "전체" → [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

### Step 4: Execute crawler for each topic

Replace `{TIMESTAMP}` and `{INDEX}` with actual values:

```bash
cd packages/news-crawler
pnpm crawl:details \
  --news-ids "$(jq -r '.newsIDs | join(",")' ../../outputs/{TIMESTAMP}/topic-{INDEX_PADDED}/news-list.json)" \
  --output ../../outputs/{TIMESTAMP}/topic-{INDEX_PADDED} \
  --topic-index {INDEX}
```

**Important**:
- Use `../../outputs/` path (relative to packages/news-crawler)
- `{INDEX_PADDED}` is zero-padded (01, 02, ..., 10)
- Requires `jq` installed

### Step 5: Report results

Report format (use this exact structure):
```
✅ Collected news details for {N} topics

📁 outputs/{TIMESTAMP}/
   - topic-01/news/ ({count} files)
   - topic-03/news/ ({count} files)

⏱️ Total time: ~{newsCount} seconds
```

## Expected Output

- **Duration**: ~1 second per news article
- **Files**: Individual JSON files in `news/` folder
- **Rate limit**: 1 second between requests (handled internally)

## Troubleshooting

If command fails:
- Check jq installation: `jq --version`
- Verify news-list.json exists in topic folder
- Ensure topics were collected first

See `scripts/` directory for helper scripts.
