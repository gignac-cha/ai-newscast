import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// Zod Schema for validation
const ImageInfoSchema = z.object({
  timestamp: z.string().datetime(),
  newscastID: z.string(),
  topicIndex: z.number(),
  model: z.string(),
  prompt: z.string(),
  aspectRatio: z.string(),
  resolution: z.string(),
  timing: z.object({
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    duration: z.number(),
  }),
  cost: z.object({
    outputTokens: z.number(),
    pricePerMillionTokens: z.number(),
    totalCost: z.number(),
  }),
});

export type ImageInfo = z.infer<typeof ImageInfoSchema>;

export interface GenerationResult {
  imageData: Buffer;
  imageInfo: ImageInfo;
}

export interface GenerateImageOptions {
  prompt: string;
  apiKey: string;
  newscastID: string;
  topicIndex: number;
  model?: string;
  aspectRatio?: string;
}

// Based on https://ai.google.dev/gemini-api/docs/image-generation
const MODEL_PRICING: { [key: string]: { price: number, unit: string } } = {
  'gemini-2.5-flash-image': { price: 30.00, unit: 'per_1M_tokens' },
  'imagen-3.0-generate-002': { price: 0.03, unit: 'per_image' },
  'gemini-3-pro-image-preview': { price: 0.00, unit: 'per_image' },
};
const TOKENS_PER_IMAGE = 1290; // For gemini-2.5-flash-image

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerationResult> {
  const {
    prompt,
    apiKey,
    newscastID,
    topicIndex,
    model = 'gemini-3-pro-image-preview',
    aspectRatio = '16:9'
  } = options;

  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  console.log(`[IMAGE_GENERATOR START] ${startedAt} - Generating image for ${newscastID} / ${topicIndex}`);

  if (!apiKey) {
    throw new Error('Google Gen AI API key is required.');
  }

  const genAI = new GoogleGenAI({ apiKey });

  try {
    console.log(`[IMAGE_GENERATOR AI] Starting AI generation with ${model}`);
    const aiStartTime = Date.now();
    
    const response = await genAI.models.generateContent({
        model,
        contents: [{
            role: "user",
            parts: [{ text: prompt }]
        }],
        config: {
            responseModalities: ["IMAGE"],
        }
    });

    const aiEndTime = Date.now();
    const duration = aiEndTime - aiStartTime;
    console.log(`[IMAGE_GENERATOR AI] AI generation completed in ${duration}ms`);

    const inlineData = response.candidates?.[0].content.parts[0].inlineData;

    if (!inlineData) {
        throw new Error('No image data found in the AI response.');
    }

    const imageData = Buffer.from(inlineData.data, "base64");
    const completedAt = new Date().toISOString();

    const priceInfo = MODEL_PRICING[model] || { price: 0, unit: 'unknown' };
    const cost = priceInfo.unit === 'per_1M_tokens'
      ? (priceInfo.price / 1_000_000) * TOKENS_PER_IMAGE
      : priceInfo.price;

    const imageInfo: ImageInfo = {
      timestamp: completedAt,
      newscastID,
      topicIndex,
      model,
      prompt,
      aspectRatio,
      resolution: '1024x576', // Placeholder, Gemini API doesn't return this yet.
      timing: {
        startedAt,
        completedAt,
        duration,
      },
      cost: {
        outputTokens: TOKENS_PER_IMAGE,
        pricePerMillionTokens: priceInfo.unit === 'per_1M_tokens' ? priceInfo.price : 0,
        totalCost: cost,
      },
    };

    // Validate with Zod
    ImageInfoSchema.parse(imageInfo);
    
    console.log(`[IMAGE_GENERATOR SUCCESS] Image generated successfully. Size: ${imageData.length} bytes`);

    return { imageData, imageInfo };

  } catch (error) {
    console.error(`[IMAGE_GENERATOR ERROR] Failed to generate image:`, error);
    throw error;
  }
}
