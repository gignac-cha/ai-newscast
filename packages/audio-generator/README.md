# @ai-newscast/audio-generator

Google Cloud Text-to-Speech integration for generating high-quality Korean newscast audio using Chirp HD models.

## Features

- ✅ **Google Cloud TTS Integration** - Chirp HD premium models
- ✅ **8 Korean Voice Models** - Gender-balanced professional announcers  
- ✅ **Rate Limiting** - API quota protection with exponential backoff
- ✅ **Error Recovery** - Automatic retry with intelligent error handling
- ✅ **Progress Tracking** - Real-time monitoring with performance metrics
- ✅ **TypeScript** - Full type safety with Zod runtime validation

## Quick Start

```bash
# Generate audio from newscast script
pnpm --filter @ai-newscast/audio-generator generate-audio ./script.json ./output

# With custom configuration
node dist/cli.js ./script.json ./output --config ./config.json --verbose
```

## API Usage

```typescript
import { AudioGenerator } from '@ai-newscast/audio-generator';

const generator = new AudioGenerator({
  rateLimit: { requestsPerSecond: 10 },
  tts: { speakingRate: 1.0, pitch: 0.0 }
});

const result = await generator.generateNewscastAudio(
  './newscast-script.json',
  './output',
  (progress) => console.log(\`\${progress.percentage}% complete\`)
);
```

## Configuration

```json
{
  "rateLimit": {
    "requestsPerSecond": 10,
    "delayBetweenRequests": 100
  },
  "tts": {
    "languageCode": "ko-KR",
    "speakingRate": 1.0,
    "audioEncoding": "MP3"
  }
}
```

## Environment Setup

```bash
# Google Cloud credentials (required)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Or use Application Default Credentials
gcloud auth application-default login
```

## Voice Models

8 Chirp HD Korean models with professional character mapping:
- **김민준** (ko-KR-Chirp3-HD-Charon) - 신뢰감 있는 남성 메인 앵커
- **이서연** (ko-KR-Chirp3-HD-Aoede) - 부드러운 여성 메인 앵커  
- **박지훈** (ko-KR-Chirp3-HD-Fenrir) - 명확한 남성 서브 앵커
- **정유진** (ko-KR-Chirp3-HD-Kore) - 지적인 여성 서브 앵커
- And 4 more specialized voices for different content types

## Output Structure

```
output/
├── audio/
│   ├── 001-dialogue-host1-김민준.mp3
│   ├── 002-dialogue-host2-이서연.mp3
│   ├── ...
│   └── audio-files.json              # Metadata & results
```

## Performance

- **Rate Limited**: 10 requests/second (configurable)
- **Error Recovery**: 3 retries with exponential backoff
- **Memory Efficient**: Streaming audio generation
- **Progress Tracking**: Real-time statistics and ETA