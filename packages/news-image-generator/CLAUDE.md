# News Image Generator Package - AI Development Guide

## 📋 Package Role and Responsibilities

### Core Role
1.  Generate a news-appropriate image from a given text prompt.
2.  Integrate with Google Gemini's image generation capabilities (e.g., Gemini 2.5 Flash Image).
3.  Produce both an image file and a detailed metadata JSON file.
4.  Provide a reusable, pure function for image generation, and a CLI for pipeline integration.

### Implementation Status
- ✅ **Complete** - TypeScript implementation.
- ✅ Pure function library (`news-image-generator.ts`).
- ✅ Commander.js CLI (`command.ts`).
- ✅ Google Gemini Image API integration.
- ✅ Zod schema for metadata validation.

---

## 🏗️ File Structure and Architecture

### Design Philosophy
1.  **Purity**: `image-generator.ts` contains the core `generateImage` function which is pure and has no side effects like file I/O.
2.  **Separation of Concerns**: `command.ts` is responsible for all CLI logic, argument parsing, and file system interactions. The core logic knows nothing about where prompts come from or where images are saved.
3.  **Reusability**: The pure function design allows `generateImage` to be easily imported and used in other contexts, such as a Cloudflare Worker or another service.
4.  **Configuration over Code**: The model, aspect ratio, and other parameters are passed as options, not hardcoded.

### File Layout
```
packages/news-image-generator/
├── news-image-generator.ts         # Pure function library (core logic)
├── command.ts                 # CLI interface (Commander.js)
├── package.json               # Dependencies and scripts
├── README.md                  # User-facing documentation
└── CLAUDE.md                  # This development guide
```

---

## 🔧 API and Function Signatures

### Core Function (`news-image-generator.ts`)

#### `generateImage()`
```typescript
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerationResult>

interface GenerateImageOptions {
  prompt: string;
  apiKey: string;
  newscastID: string;
  topicIndex: number;
  model?: string;
  aspectRatio?: string;
}

interface GenerationResult {
  imageData: Buffer;
  imageInfo: ImageInfo;
}
```

**Role**: Takes a prompt and configuration, calls the Google Gemini API, and returns the image data and metadata.

**Parameters**: An `options` object containing the prompt, API key, and other generation parameters.

**Returns**: A promise that resolves to an object containing the image `Buffer` and a structured `imageInfo` object.

### Type Definitions

#### `ImageInfo` (Output Metadata)
This is the structure of the `*-info.json` file. It's validated by a Zod schema internally.

```typescript
interface ImageInfo {
  timestamp: string;      // ISO 8601
  newscastID: string;
  topicIndex: number;
  model: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;     // e.g., "1024x576"
  timing: {
    startedAt: string;    // ISO 8601
    completedAt: string;  // ISO 8601
    duration: number;     // milliseconds
  };
  cost: {
    outputTokens: number;
    pricePerMillionTokens: number;
    totalCost: number;      // USD
  };
}
```

---

## 🎨 Coding Conventions (Package-Specific)

### Purity Principle (CRITICAL)

#### MUST: `news-image-generator.ts` must contain only pure functions.
Side effects like reading from or writing to the file system are strictly forbidden in this file.

```typescript
// ✅ CORRECT (news-image-generator.ts)
  // Logic to call external API and process data in memory
  const response = await callGeminiImageAPI(options.prompt);
  const imageData = Buffer.from(response.b64Json, 'base64');
  const imageInfo = buildMetadata(response);
  return { imageData, imageInfo };
}

// ❌ WRONG (Do NOT do this in news-image-generator.ts)
import { writeFile } from 'fs/promises';

export async function generateImage(options: GenerateImageOptions) {
  const result = await callGeminiImageAPI(options.prompt);
  await writeFile('output.png', result.b64Json, 'base64'); // ❌ File I/O is a side effect
}
```

#### MUST: All file system access must be in `command.ts`.
`command.ts` is the "impure" part of the package that interacts with the outside world.

```typescript
// ✅ CORRECT (command.ts)
import { generateImage } from './news-image-generator.ts';
import { writeFile, readFile } from 'fs/promises';

program.action(async (options) => {
  const prompt = await readFile(options.promptFile, 'utf-8');
  const result = await generateImage({ prompt, ... });
  await writeFile(options.outputFile, result.imageData); // ✅ Correct place for file writing
});
```

### Google Gemini API Usage

#### MUST: Handle API Errors Gracefully.
The `generateImage` function should wrap API calls in a `try...catch` block and throw an informative error on failure. The CLI in `command.ts` is responsible for catching this error and exiting with a non-zero status code.

```typescript
// ✅ CORRECT (news-image-generator.ts)
try {
  const response = await aiModel.generateContent(...);
  // ...
} catch (error) {
  console.error('[IMAGE_GENERATOR ERROR] Failed to generate image:', error);
  throw error; // Re-throw the error for the caller to handle
}
```

#### MUST: Check for API Key.
The function must immediately throw an error if the API key is missing.

```typescript
// ✅ CORRECT (news-image-generator.ts)
if (!apiKey) {
  throw new Error('Google Gen AI API key is required.');
}
```

---

## 🔗 Dependencies and Interactions

-   **`@ai-newscast/core`**: This package may eventually use shared types from `core`.
-   **Upstream (Prompt Generator)**: This package expects a prompt from an external source, likely another package like `@ai-newscast/news-image-prompt-generator`.
-   **Downstream (Newscast Assembler)**: The generated image and metadata will be used by a later step in the pipeline to assemble the final newscast.

---

## ⚠️ Critical Rules (MUST/NEVER)

#### MUST: Separate pure logic from I/O.
-   `news-image-generator.ts`: Pure functions only.
-   `command.ts`: Handles all file and network I/O orchestration.

#### NEVER: Hardcode model names or other settings in `news-image-generator.ts`.
All configurable parameters should be passed in via the `options` object.

```typescript
// ✅ CORRECT
export async function generateImage(options) {
  const model = options.model || 'gemini-2.5-flash-image';
  // ...
}

// ❌ WRONG
export async function generateImage(options) {
  const model = 'gemini-2.5-flash-image'; // ❌ Hardcoded value
  // ...
}
```

---
*This guide helps AI agents understand and correctly modify the package. Last updated: 2025-11-22.*
