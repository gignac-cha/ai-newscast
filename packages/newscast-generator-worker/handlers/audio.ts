import { generateNewscastAudio } from '@ai-newscast/newscast-generator/generate-newscast-audio.ts';
import type { NewscastOutput } from '@ai-newscast/core';
import type { Env } from '../types/env.ts';
import type { AudioGenerationResponse } from '../types/audio.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';
import { error } from '../utils/error.ts';
import { response } from '../utils/response.ts';

export async function handleAudio(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  console.log(`[AUDIO_HANDLER START] ${new Date().toISOString()}`);

  try {
    const url = new URL(request.url);
    const newscastID = url.searchParams.get('newscast-id');
    const topicIndex = url.searchParams.get('topic-index');

    console.log(`[AUDIO_HANDLER PARAMS] newscast-id: ${newscastID}, topic-index: ${topicIndex}`);

    if (!newscastID) {
      console.error(`[AUDIO_HANDLER ERROR] Missing newscast-id parameter`);
      return response(cors(error('Missing required parameter: newscast-id')));
    }

    if (!topicIndex) {
      console.error(`[AUDIO_HANDLER ERROR] Missing topic-index parameter`);
      return response(cors(error('Missing required parameter: topic-index')));
    }

    const topicIndexNumber = Number.parseInt(topicIndex, 10);
    if (!Number.isInteger(topicIndexNumber) || topicIndexNumber < 1) {
      console.error(`[AUDIO_HANDLER ERROR] Invalid topic-index: ${topicIndex}`);
      return response(cors(error('Invalid parameter: topic-index must be a positive integer')));
    }

    console.log(`[AUDIO_HANDLER VALIDATION] Parsed topic index: ${topicIndexNumber}`);

    // Check for required environment variables
    const apiKey = env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
      console.error(`[AUDIO_HANDLER ERROR] GOOGLE_CLOUD_API_KEY not configured`);
      return response(cors(error('GOOGLE_CLOUD_API_KEY not configured')));
    }

    const bucket = env.AI_NEWSCAST_BUCKET;
    if (!bucket) {
      console.error(`[AUDIO_HANDLER ERROR] AI_NEWSCAST_BUCKET not configured`);
      return response(cors(error('AI_NEWSCAST_BUCKET not configured')));
    }

    console.log(`[AUDIO_HANDLER ENV] Environment variables validated successfully`);

    // Pad topic index to 2 digits
    const topicIndexPadded = topicIndexNumber.toString().padStart(2, '0');
    console.log(`[AUDIO_HANDLER PATH] Padded topic index: ${topicIndexPadded}`);

    // Read newscast script from R2
    const scriptFilePath = `newscasts/${newscastID}/topic-${topicIndexPadded}/newscast-script.json`;
    console.log(`[AUDIO_HANDLER R2] Reading script file: ${scriptFilePath}`);
    const scriptObject = await bucket.get(scriptFilePath);

    if (!scriptObject) {
      console.error(`[AUDIO_HANDLER ERROR] Script file not found: ${scriptFilePath}`);
      return response(cors(error(`Newscast script file not found: ${scriptFilePath}`)));
    }

    console.log(`[AUDIO_HANDLER R2] Script file found, parsing JSON`);
    const newscastData = await scriptObject.json<NewscastOutput>();
    console.log(`[AUDIO_HANDLER SCRIPT] Raw newscast data type: ${typeof newscastData}`);
    console.log(`[AUDIO_HANDLER SCRIPT] Raw newscast data keys: ${Object.keys(newscastData || {}).join(', ')}`);
    console.log(`[AUDIO_HANDLER SCRIPT] newscastData.title: ${newscastData?.title}`);
    console.log(`[AUDIO_HANDLER SCRIPT] newscastData.script type: ${typeof newscastData?.script}`);
    console.log(`[AUDIO_HANDLER SCRIPT] newscastData.script is array: ${Array.isArray(newscastData?.script)}`);
    console.log(`[AUDIO_HANDLER SCRIPT] newscastData.script length: ${newscastData?.script?.length}`);

    if (!newscastData) {
      console.error(`[AUDIO_HANDLER ERROR] newscastData is null or undefined`);
      return response(cors(error('Failed to parse newscast script data')));
    }

    if (!newscastData.script) {
      console.error(`[AUDIO_HANDLER ERROR] newscastData.script is undefined. Available keys: ${Object.keys(newscastData).join(', ')}`);
      return response(cors(error('Missing script data in newscast file')));
    }

    if (!Array.isArray(newscastData.script)) {
      console.error(`[AUDIO_HANDLER ERROR] newscastData.script is not an array, type: ${typeof newscastData.script}`);
      return response(cors(error('Invalid script data format - expected array')));
    }

    console.log(`[AUDIO_HANDLER SCRIPT] Loaded script data: title="${newscastData.title}", script_lines=${newscastData.script.length}`);

    console.log(`[AUDIO_HANDLER TTS] Starting TTS audio generation with Google Cloud API`);
    const result = await generateNewscastAudio({
      newscastData,
      apiKey,
    });
    console.log(`[AUDIO_HANDLER TTS] Audio generation completed: ${result.audioFiles.length} files generated, ${result.stats.successCount} successful`);

    // Store audio files in R2
    console.log(`[AUDIO_HANDLER R2] Uploading ${result.audioFiles.length} audio files to R2`);
    const audioFileUploads = result.audioFiles.map(async (audioFile, index) => {
      const audioFilePath = `newscasts/${newscastID}/topic-${topicIndexPadded}/audio/${audioFile.fileName}`;
      console.log(`[AUDIO_HANDLER R2] Uploading audio file ${index + 1}/${result.audioFiles.length}: ${audioFile.fileName} (${audioFile.audioContent.length} bytes)`);
      return bucket.put(audioFilePath, audioFile.audioContent, {
        httpMetadata: {
          contentType: 'audio/mpeg',
        },
      });
    });

    // Store audio metadata
    const audioMetadataPath = `newscasts/${newscastID}/topic-${topicIndexPadded}/audio/audio-files.json`;
    console.log(`[AUDIO_HANDLER R2] Uploading audio metadata: ${audioMetadataPath}`);
    const audioMetadataUpload = bucket.put(audioMetadataPath, JSON.stringify(result.audioOutput, null, 2), {
      httpMetadata: {
        contentType: 'application/json; charset=utf-8',
      },
    });

    await Promise.all([...audioFileUploads, audioMetadataUpload]);
    console.log(`[AUDIO_HANDLER R2] All audio files and metadata uploaded successfully`);

    const responseData: AudioGenerationResponse = {
      success: true,
      newscast_id: newscastID,
      topic_index: topicIndexNumber,
      input_file: scriptFilePath,
      output_files: {
        audio_metadata: audioMetadataPath,
        audio_files: result.audioFiles.map(file => `newscasts/${newscastID}/topic-${topicIndexPadded}/audio/${file.fileName}`),
      },
      stats: result.stats,
      timestamp: new Date().toISOString(),
      message: `Generated TTS audio for topic ${topicIndexNumber}`,
      audio_output: result.audioOutput,
    };

    const totalTime = Date.now() - startTime;
    console.log(`[AUDIO_HANDLER SUCCESS] Completed in ${totalTime}ms for topic ${topicIndexNumber}`);

    return response(cors(json(responseData)));

  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[AUDIO_HANDLER ERROR] Failed after ${totalTime}ms:`, err);

    if (err instanceof Error) {
      console.error(`[AUDIO_HANDLER ERROR] Error name: ${err.name}`);
      console.error(`[AUDIO_HANDLER ERROR] Error message: ${err.message}`);
      console.error(`[AUDIO_HANDLER ERROR] Error stack (full): ${err.stack}`);
      console.error(`[AUDIO_HANDLER ERROR] Error cause: ${err.cause}`);
    } else {
      console.error(`[AUDIO_HANDLER ERROR] Non-Error object type: ${typeof err}`);
      console.error(`[AUDIO_HANDLER ERROR] Non-Error object: ${JSON.stringify(err)}`);
    }

    // Additional debug information
    console.error(`[AUDIO_HANDLER ERROR] startTime type: ${typeof startTime}`);
    console.error(`[AUDIO_HANDLER ERROR] Date.now() type: ${typeof Date.now()}`);
    console.error(`[AUDIO_HANDLER ERROR] new Date() test: ${new Date().toISOString()}`);

    return response(cors(error(err instanceof Error ? err : new Error('Unknown error in audio generation'))));
  }
}