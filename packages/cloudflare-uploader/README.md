# @ai-newscast/cloudflare-uploader

Cloudflare R2 uploader for AI Newscast files using S3-compatible API.

## Features

- Strong TypeScript typing with Zod validation
- S3-compatible API for Cloudflare R2
- CLI interface with Commander.js
- Support for test mode uploads
- Comprehensive error handling
- Progress tracking and statistics

## Installation

```bash
pnpm install @ai-newscast/cloudflare-uploader
```

## Environment Variables

Create a `.env` file with the following variables:

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_access_key
```

## CLI Usage

### Basic Upload

```bash
cloudflare-uploader upload \
  -i output/2025-10-05T19-53-26-599Z/topic-01 \
  -n 2025-10-05T19-53-26-599Z \
  -t 1
```

### Test Mode Upload

Upload to `tests/newscasts` instead of `newscasts`:

```bash
cloudflare-uploader upload \
  -i output/2025-10-05T19-53-26-599Z/topic-01 \
  -n 2025-10-05T19-53-26-599Z \
  -t 1 \
  --test
```

### Command-line Options

```bash
cloudflare-uploader upload \
  -i output/2025-10-05T19-53-26-599Z/topic-01 \
  -n 2025-10-05T19-53-26-599Z \
  -t 1 \
  --account-id YOUR_ACCOUNT_ID \
  --access-key-id YOUR_ACCESS_KEY_ID \
  --secret-access-key YOUR_SECRET_ACCESS_KEY \
  --bucket-name ai-newscast
```

## Programmatic Usage

```typescript
import { uploadNewscast } from '@ai-newscast/cloudflare-uploader';

const result = await uploadNewscast({
  inputDir: 'output/2025-10-05T19-53-26-599Z/topic-01',
  newscastID: '2025-10-05T19-53-26-599Z',
  topicIndex: 1,
  accountID: process.env.CLOUDFLARE_ACCOUNT_ID!,
  accessKeyID: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  bucketName: 'ai-newscast',
}, false);

console.log(`Uploaded ${result.filesUploaded} files (${result.totalBytes} bytes)`);
console.log(`Duration: ${result.duration}ms`);
```

## R2 Path Structure

### Production
```
newscasts/{newscastID}/topic-{topicIndex}/
  ├── newscast.mp3
  ├── newscast-audio-info.json
  ├── newscast-script.json
  ├── newscast-script.md
  ├── news.json
  ├── news.md
  └── audio/
      ├── 001-music.mp3
      ├── 002-host1.mp3
      └── audio-files.json
```

### Test Mode
```
tests/newscasts/{newscastID}/topic-{topicIndex}/
  └── (same structure as production)
```

## API Reference

### UploadOptions

```typescript
interface UploadOptions {
  inputDir: string;           // Input directory path
  newscastID: string;         // Newscast ID (ISO timestamp)
  topicIndex: number;         // Topic index (1-10)
  basePath: string;           // Base path in R2 bucket
  accountID: string;          // Cloudflare Account ID
  accessKeyID: string;        // R2 Access Key ID
  secretAccessKey: string;    // R2 Secret Access Key
  bucketName: string;         // R2 bucket name
}
```

### UploadResult

```typescript
interface UploadResult {
  filesUploaded: number;      // Number of files uploaded
  totalBytes: number;         // Total bytes uploaded
  duration: number;           // Upload duration (milliseconds)
  uploadedFiles: string[];    // List of R2 keys
}
```

## Error Handling

The uploader provides detailed error messages for common issues:

- Missing or invalid credentials
- Validation errors (Zod)
- S3 API errors (bucket not found, permission denied, etc.)
- File system errors

## Development

### Type Checking

```bash
pnpm typecheck
```

### Build (Type Check Only)

```bash
pnpm build
```

### Development Mode

```bash
pnpm dev upload -i output/... -n ... -t 1
```

## License

MIT

## Authors

AI Newscast Team
