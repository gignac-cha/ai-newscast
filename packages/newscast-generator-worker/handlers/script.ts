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
  const startTime = Date.now();
  console.log(`[SCRIPT_HANDLER START] ${new Date().toISOString()}`);

  try {
    const url = new URL(request.url);
    const newscastID = url.searchParams.get('newscast-id');
    const topicIndex = url.searchParams.get('topic-index');

    console.log(`[SCRIPT_HANDLER PARAMS] newscast-id: ${newscastID}, topic-index: ${topicIndex}`);

    if (!newscastID) {
      console.error(`[SCRIPT_HANDLER ERROR] Missing newscast-id parameter`);
      return response(cors(error('Missing required parameter: newscast-id')));
    }

    if (!topicIndex) {
      console.error(`[SCRIPT_HANDLER ERROR] Missing topic-index parameter`);
      return response(cors(error('Missing required parameter: topic-index')));
    }

    const topicIndexNumber = Number.parseInt(topicIndex, 10);
    if (!Number.isInteger(topicIndexNumber) || topicIndexNumber < 1) {
      console.error(`[SCRIPT_HANDLER ERROR] Invalid topic-index: ${topicIndex}`);
      return response(cors(error('Invalid parameter: topic-index must be a positive integer')));
    }

    console.log(`[SCRIPT_HANDLER VALIDATION] Parsed topic index: ${topicIndexNumber}`);

    // Check for required environment variables
    const apiKey = env.GOOGLE_GEN_AI_API_KEY;
    if (!apiKey) {
      console.error(`[SCRIPT_HANDLER ERROR] GOOGLE_GEN_AI_API_KEY not configured`);
      return response(cors(error('GOOGLE_GEN_AI_API_KEY not configured')));
    }

    const bucket = env.AI_NEWSCAST_BUCKET;
    if (!bucket) {
      console.error(`[SCRIPT_HANDLER ERROR] AI_NEWSCAST_BUCKET not configured`);
      return response(cors(error('AI_NEWSCAST_BUCKET not configured')));
    }

    console.log(`[SCRIPT_HANDLER ENV] Environment variables validated successfully`);

    // Pad topic index to 2 digits
    const topicIndexPadded = topicIndexNumber.toString().padStart(2, '0');
    console.log(`[SCRIPT_HANDLER PATH] Padded topic index: ${topicIndexPadded}`);

    // Read consolidated news from R2
    const newsFilePath = `newscasts/${newscastID}/topic-${topicIndexPadded}/news.json`;
    console.log(`[SCRIPT_HANDLER R2] Reading news file: ${newsFilePath}`);
    const newsObject = await bucket.get(newsFilePath);

    if (!newsObject) {
      console.error(`[SCRIPT_HANDLER ERROR] News file not found: ${newsFilePath}`);
      return response(cors(error(`News file not found: ${newsFilePath}`)));
    }

    console.log(`[SCRIPT_HANDLER R2] News file found, parsing JSON`);
    const newsData = await newsObject.json<GeneratedNews>();
    console.log(`[SCRIPT_HANDLER NEWS] Loaded news data: title="${newsData.title}", sources_count=${newsData.sources_count}`);

    console.log(`[SCRIPT_HANDLER CONFIG] Loading TTS host configuration`);
    const defaultVoices = ttsHostConfig as TTSVoices;
    console.log(`[SCRIPT_HANDLER CONFIG] TTS hosts loaded: ${Object.keys(defaultVoices).join(', ')}`);

    console.log(`[SCRIPT_HANDLER AI] Starting newscast script generation with Gemini API`);
    const result = await generateNewscastScript({
      news: newsData,
      promptTemplate: newscastScriptPrompt,
      voices: defaultVoices,
      apiKey,
      newscastID,
      topicIndex: topicIndexNumber,
    });
    console.log(`[SCRIPT_HANDLER AI] Script generation completed: ${result.stats.dialogue_count} dialogue lines, ${result.stats.music_count} music lines`);

    const scriptJSONPath = `newscasts/${newscastID}/topic-${topicIndexPadded}/newscast-script.json`;
    const scriptMarkdownPath = `newscasts/${newscastID}/topic-${topicIndexPadded}/newscast-script.md`;
    console.log(`[SCRIPT_HANDLER R2] Saving script files to: ${scriptJSONPath}, ${scriptMarkdownPath}`);

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
    console.log(`[SCRIPT_HANDLER R2] Script files saved successfully`);

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

    const totalTime = Date.now() - startTime;
    console.log(`[SCRIPT_HANDLER SUCCESS] Completed in ${totalTime}ms for topic ${topicIndexNumber}`);

    return response(cors(json(responseData)));

  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[SCRIPT_HANDLER ERROR] Failed after ${totalTime}ms:`, err);

    if (err instanceof Error) {
      console.error(`[SCRIPT_HANDLER ERROR] Error name: ${err.name}`);
      console.error(`[SCRIPT_HANDLER ERROR] Error message: ${err.message}`);
      console.error(`[SCRIPT_HANDLER ERROR] Error stack: ${err.stack}`);
    }

    return response(cors(error(err instanceof Error ? err : new Error('Unknown error in script generation'))));
  }
}
