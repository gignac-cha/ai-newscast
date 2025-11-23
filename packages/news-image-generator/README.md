# News Image Generator

Generates images for news articles using Google Gemini AI. This package is designed to take a text prompt and produce a relevant, high-quality image suitable for news content.

## Overview

This package provides both a CLI and a library function to generate images based on textual prompts. It is optimized for the AI Newscast pipeline, extracting necessary metadata from file paths and saving both the image and a detailed information file.

## Key Features

- **AI-powered Image Generation**: Uses Google Gemini models (e.g., `gemini-2.5-flash-image`) to create images from prompts.
- **CLI and Library**: Can be used as a standalone tool or imported into other packages.
- **Pure Function Design**: Core logic is separated from file I/O for better reusability and testing.
- **Metadata Generation**: Automatically creates a detailed JSON file with metrics on timing, cost, and model used.
- **Type-safe**: Written in TypeScript with Zod validation for data integrity.

## Quick Start

### Installation

```bash
# Run from the project root to install all dependencies
pnpm install
```

### CLI Usage

The primary way to use this package is via its command-line interface. You must provide a path to a `news.json` file and an output path for the image. The script will then generate a prompt from the news content and use it to create the image.

```bash
# Make sure to set your API key
export GOOGLE_GEN_AI_API_KEY="your-api-key-here"

# Run via pnpm from the root directory
pnpm run run:generator:news-image -- --news-file outputs/2025-11-21T14-50-17-255Z/topic-01/news.json --output-file outputs/2025-11-21T14-50-17-255Z/topic-01/news-image.png
```

#### Options:

-   `-n, --news-file <path>`: (Required) Path to a `news.json` file containing the article data.
-   `-o, --output-file <path>`: (Required) Path where the generated image will be saved.
-   `-m, --model <model>`: (Optional) The Gemini model to use. Defaults to `gemini-2.5-flash-image`.
-   `-a, --aspect-ratio <ratio>`: (Optional) The desired aspect ratio. Defaults to `16:9`.

### Library Usage

You can also import the `generateImage` function (defined in `news-image-generator.ts`) directly into other TypeScript files.

```typescript
import { generateImage, GenerateImageOptions } from '@ai-newscast/news-image-generator';

async function main() {
  const options: GenerateImageOptions = {
    prompt: 'A photorealistic image of a world leader giving a speech at the UN.',
    apiKey: process.env.GOOGLE_GEN_AI_API_KEY!,
    newscastID: '2025-11-22-test',
    topicIndex: 1,
    model: 'gemini-2.5-flash-image',
    aspectRatio: '16:9'
  };

  try {
    const { imageData, imageInfo } = await generateImage(options);
    // Now you can use the image data (Buffer) and info object
    console.log('Image generated!', imageInfo);
  } catch (error) {
    console.error('Failed to generate image', error);
  }
}

main();
```

## Output Files

For a given output file `news-image.png`, the tool will generate two files:

1.  `news-image.png`: The generated image.
2.  `news-image-info.json`: A JSON file with detailed metadata about the generation process.

### Example `news-image-info.json`

```json
{
  "timestamp": "2025-11-22T15:30:00.123Z",
  "newscastID": "2025-11-22T12-00-00-000Z",
  "topicIndex": 1,
  "model": "gemini-2.5-flash-image",
  "prompt": "A professional news photograph for the article...",
  "aspectRatio": "16:9",
  "resolution": "1024x576",
  "timing": {
    "startedAt": "2025-11-22T15:29:58.000Z",
    "completedAt": "2025-11-22T15:30:00.123Z",
    "duration": 2123
  },
  "cost": {
    "outputTokens": 1290,
    "pricePerMillionTokens": 30.00,
    "totalCost": 0.0387
  }
}
```

## Development

For more details on the architecture and internal conventions, see the [AI Development Guide (CLAUDE.md)](./CLAUDE.md).
