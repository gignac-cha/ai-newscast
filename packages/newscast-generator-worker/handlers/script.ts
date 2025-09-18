import { generateNewscastScript } from '@ai-newscast/newscast-generator/generate-newscast-script.ts';
import newscastScriptPrompt from '@ai-newscast/newscast-generator/prompts/newscast-script.md';
import ttsHostConfig from '@ai-newscast/newscast-generator/config/tts-hosts.json';
import type { GeneratedNews } from '@ai-newscast/core';
import type { TTSVoices } from '@ai-newscast/newscast-generator/types.ts';
import type { Env } from '../types/env.ts';
import type { ScriptGenerationResponse } from '../types/script.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';
import { error } from '../utils/error.ts';
import { response } from '../utils/response.ts';

export async function handleScript(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const newscastID = url.searchParams.get('newscast-id');
    const topicIndex = url.searchParams.get('topic-index');

    if (!newscastID) {
      return response(cors(error('Missing required parameter: newscast-id')));
    }

    if (!topicIndex) {
      return response(cors(error('Missing required parameter: topic-index')));
    }

    const topicIndexNumber = Number.parseInt(topicIndex, 10);
    if (!Number.isInteger(topicIndexNumber) || topicIndexNumber < 1) {
      return response(cors(error('Invalid parameter: topic-index must be a positive integer')));
    }

    // Check for required environment variables
    const apiKey = env.GOOGLE_GEN_AI_API_KEY;
    if (!apiKey) {
      return response(cors(error('GOOGLE_GEN_AI_API_KEY not configured')));
    }

    const bucket = env.AI_NEWSCAST_BUCKET;
    if (!bucket) {
      return response(cors(error('AI_NEWSCAST_BUCKET not configured')));
    }

    // Pad topic index to 2 digits
    const topicIndexPadded = topicIndexNumber.toString().padStart(2, '0');

    // Read consolidated news from R2
    const newsFilePath = `newscasts/${newscastID}/topic-${topicIndexPadded}/news.json`;
    const newsObject = await bucket.get(newsFilePath);

    if (!newsObject) {
      return response(cors(error(`News file not found: ${newsFilePath}`)));
    }

    const newsData = await newsObject.json<GeneratedNews>();

    const defaultVoices = ttsHostConfig as TTSVoices;

    const result = await generateNewscastScript({
      news: newsData,
      promptTemplate: newscastScriptPrompt,
      voices: defaultVoices,
      apiKey,
    });

    const scriptJSONPath = `newscasts/${newscastID}/topic-${topicIndexPadded}/newscast-script.json`;
    const scriptMarkdownPath = `newscasts/${newscastID}/topic-${topicIndexPadded}/newscast-script.md`;

    await Promise.all([
      bucket.put(scriptJSONPath, JSON.stringify(result.output, null, 2), {
        httpMetadata: {
          contentType: 'application/json; charset=utf-8',
        },
      }),
      bucket.put(scriptMarkdownPath, result.markdown, {
        httpMetadata: {
          contentType: 'text/markdown; charset=utf-8',
        },
      }),
    ]);

    const responseData: ScriptGenerationResponse = {
      success: true,
      newscast_id: newscastID,
      topic_index: topicIndexNumber,
      input_file: newsFilePath,
      output_files: {
        json: scriptJSONPath,
        markdown: scriptMarkdownPath,
      },
      stats: result.stats,
      timestamp: new Date().toISOString(),
      message: `Generated newscast script for topic ${topicIndexNumber}`,
      script: result.output,
    };

    return response(cors(json(responseData)));

  } catch (err) {
    console.error('Error in handleScript:', err);
    return response(cors(error(err instanceof Error ? err : new Error('Unknown error in script generation'))));
  }
}
