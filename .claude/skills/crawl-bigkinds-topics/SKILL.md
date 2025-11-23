---
name: crawl-bigkinds-topics
description: Crawls trending news topics from BigKinds. Use when user asks to collect/fetch trending topics or start the news pipeline.
---

# BigKinds Topics Crawler

Crawls the top 10 trending news topics from BigKinds portal.

## Instructions

### Step 1: Navigate to project root
```bash
source scripts/find-project-root.sh
```

### Step 2: Execute crawler
```bash
cd packages/news-crawler
pnpm crawl:topics --output ../../outputs
```

**Important**:
- Use `../../outputs` path (relative to packages/news-crawler)

### Step 3: Report results

Report format (use this exact structure):
```
✅ Collected 10 trending topics

📁 outputs/{TIMESTAMP}/
   - topics.json
   - topics.html

Next: Collect news details for topics
```

## Expected Output

- **Duration**: ~2-3 seconds
- **Files**: topics.json, topics.html
- **Topics**: 10 trending news topics

## Troubleshooting

If command fails:
- Check pnpm installation: `pnpm --version`
- Verify network connectivity
- Ensure working directory is project root

See `scripts/` directory for helper scripts.
