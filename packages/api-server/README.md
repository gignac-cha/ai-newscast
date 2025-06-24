# @ai-newscast/api-server

> Cloudflare Workers API for managing AI newscast batch timestamps

## 🚀 Features

- **REST API**: Latest batch ID management with KV storage
- **Type Safety**: Full TypeScript support with core package integration
- **CORS Support**: Cross-origin requests enabled
- **Health Monitoring**: KV connection status monitoring
- **Error Handling**: Comprehensive error responses

## 📦 Package Integration

```typescript
// Uses shared types from @ai-newscast/core
import type { NewscastTimestamp } from '@ai-newscast/core';
```

## 🔧 Development

### Local Development
```bash
# From package directory
pnpm dev

# From project root
pnpm --filter @ai-newscast/api-server dev
```

### Build & Deploy
```bash
# Build (included in workspace build)
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy
```

## 🛠️ Setup

### 1. Create KV Namespace
```bash
cd packages/api-server
pnpm kv:create
```

### 2. Update Configuration
Edit `wrangler.toml` and replace `your-kv-namespace-id` with the actual ID from step 1.

### 3. Deploy
```bash
pnpm deploy
```

## 📡 API Endpoints

### GET /latest
Get the latest batch timestamp.

```bash
curl https://ai-newscast-latest-id.your-subdomain.workers.dev/latest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "latest_id": "2025-06-23T10-30-45-123456",
    "output_folder": "output/2025-06-23T10-30-45-123456",
    "retrieved_at": "2025-06-23T10:30:45.123Z"
  }
}
```

### POST /update
Update the latest batch timestamp.

```bash
curl -X POST https://ai-newscast-latest-id.your-subdomain.workers.dev/update \
  -H "Content-Type: application/json" \
  -d '{"id": "2025-06-23T11-15-22-789012"}'
```

**Request:**
```json
{
  "id": "2025-06-23T11-15-22-789012"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_id": "2025-06-23T11-15-22-789012",
    "output_folder": "output/2025-06-23T11-15-22-789012",
    "updated_at": "2025-06-23T11:15:22.789Z"
  }
}
```

### GET /health
Check API and KV connection status.

```bash
curl https://ai-newscast-latest-id.your-subdomain.workers.dev/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "kv_connection": "ok",
    "api_version": "2.1.1",
    "timestamp": "2025-06-23T10:30:45.123Z"
  }
}
```

## 🔑 KV Management

```bash
# List all keys
pnpm kv:list

# Get LATEST_ID value
pnpm kv:get LATEST_ID

# Set LATEST_ID value manually
pnpm kv:put LATEST_ID "2025-06-23T10-30-45-123456"
```

## 🏗️ Integration with Pipeline

### Bash Integration
```bash
# Update timestamp after successful crawling
TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S-%6N")
curl -X POST https://your-worker.workers.dev/update \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$TIMESTAMP\"}"
```

### TypeScript Integration
```typescript
import type { NewscastTimestamp } from '@ai-newscast/core';

class BatchManager {
  private readonly apiUrl = 'https://your-worker.workers.dev';
  
  async getLatestBatch(): Promise<NewscastTimestamp | null> {
    const response = await fetch(`${this.apiUrl}/latest`);
    const data = await response.json();
    return data.success ? data.data.latest_id : null;
  }
  
  async updateLatestBatch(timestamp: NewscastTimestamp): Promise<boolean> {
    const response = await fetch(`${this.apiUrl}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: timestamp })
    });
    const data = await response.json();
    return data.success;
  }
}
```

## 📊 Error Handling

All errors follow this format:
```json
{
  "success": false,
  "error": "Error description"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request (bad timestamp format)
- `404`: Endpoint not found
- `500`: Server error or KV connection failure

## 🔧 Timestamp Format

Timestamps must follow this format:
```
2025-06-23T10-30-45-123456
YYYY-MM-DDTHH-MM-SS-MICROSECONDS
```

This matches the AI newscast project's output folder structure.