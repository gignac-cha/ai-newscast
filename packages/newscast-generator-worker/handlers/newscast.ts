import { generateNewscast } from '@ai-newscast/newscast-generator/generate-newscast.ts';
import type { Env } from '../types/env.ts';
import { cors, json, error, response } from '@ai-newscast/core-worker';

export async function handleNewscast(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  console.log(`[NEWSCAST_HANDLER START] ${new Date().toISOString()}`);

  try {
    const url = new URL(request.url);
    const newscastID = url.searchParams.get('newscast-id');
    const topicIndex = url.searchParams.get('topic-index');
    const saveToR2 = url.searchParams.get('save') === 'true';

    console.log(`[NEWSCAST_HANDLER PARAMS] newscast-id: ${newscastID}, topic-index: ${topicIndex}, saveToR2: ${saveToR2}`);

    if (!newscastID) {
      console.error(`[NEWSCAST_HANDLER ERROR] Missing newscast-id parameter`);
      return response(cors(error('Missing required parameter: newscast-id')));
    }

    if (!topicIndex) {
      console.error(`[NEWSCAST_HANDLER ERROR] Missing topic-index parameter`);
      return response(cors(error('Missing required parameter: topic-index')));
    }

    const topicIndexNumber = Number.parseInt(topicIndex, 10);
    if (!Number.isInteger(topicIndexNumber) || topicIndexNumber < 1) {
      console.error(`[NEWSCAST_HANDLER ERROR] Invalid topic-index: ${topicIndex}`);
      return response(cors(error('Invalid parameter: topic-index must be a positive integer')));
    }

    console.log(`[NEWSCAST_HANDLER VALIDATION] Parsed topic index: ${topicIndexNumber}`);

    // Check for required environment variables
    const lambdaApiURL = env.AWS_LAMBDA_NEWSCAST_API_URL;
    if (!lambdaApiURL) {
      console.error(`[NEWSCAST_HANDLER ERROR] AWS_LAMBDA_NEWSCAST_API_URL not configured`);
      return response(cors(error('AWS_LAMBDA_NEWSCAST_API_URL not configured')));
    }

    const bucket = env.AI_NEWSCAST_BUCKET;
    if (!bucket) {
      console.error(`[NEWSCAST_HANDLER ERROR] AI_NEWSCAST_BUCKET not configured`);
      return response(cors(error('AI_NEWSCAST_BUCKET not configured')));
    }

    console.log(`[NEWSCAST_HANDLER ENV] Environment variables validated successfully`);

    // Pad topic index to 2 digits
    const topicIndexPadded = topicIndexNumber.toString().padStart(2, '0');
    console.log(`[NEWSCAST_HANDLER PATH] Padded topic index: ${topicIndexPadded}`);

    // Generate newscast by calling Lambda API Gateway
    console.log(`[NEWSCAST_HANDLER LAMBDA] Calling Lambda API Gateway to merge audio files`);
    const mergeResult = await generateNewscast({
      newscastID: newscastID,
      topicIndex: topicIndexNumber,
      lambdaApiURL: lambdaApiURL,
    });
    console.log(`[NEWSCAST_HANDLER LAMBDA] Lambda merge completed: ${mergeResult.fileSizeFormatted}`);

    const totalTime = Date.now() - startTime;

    // Remove audioData from merge_result before sending response
    const { audioData, ...mergeResultWithoutAudio } = mergeResult;

    const responseData: {
      success: boolean;
      newscastID: string;
      topicIndex: number;
      mergeResult: typeof mergeResultWithoutAudio;
      timestamp: string;
      outputPath?: string;
      message: string;
    } = {
      success: true,
      newscastID,
      topicIndex: topicIndexNumber,
      mergeResult: mergeResultWithoutAudio,
      timestamp: new Date().toISOString(),
      message: '',
    };

    if (saveToR2) {
      // Save merged audio to R2
      const mergedAudioPath = `newscasts/${newscastID}/topic-${topicIndexPadded}/newscast.mp3`;
      console.log(`[NEWSCAST_HANDLER R2] Uploading merged audio: ${mergedAudioPath} (${mergeResult.audioData.length} bytes)`);
      await bucket.put(mergedAudioPath, mergeResult.audioData, {
        httpMetadata: {
          contentType: 'audio/mpeg',
        },
      });
      console.log(`[NEWSCAST_HANDLER R2] Merged audio uploaded successfully`);

      // Save newscast-audio-info.json to R2
      const audioInfoPath = `newscasts/${newscastID}/topic-${topicIndexPadded}/newscast-audio-info.json`;
      const audioInfoData = JSON.stringify(mergeResultWithoutAudio, null, 2);
      console.log(`[NEWSCAST_HANDLER R2] Uploading audio info: ${audioInfoPath} (${audioInfoData.length} bytes)`);
      await bucket.put(audioInfoPath, audioInfoData, {
        httpMetadata: {
          contentType: 'application/json',
        },
      });
      console.log(`[NEWSCAST_HANDLER R2] Audio info uploaded successfully`);

      responseData.outputPath = mergedAudioPath;
      responseData.message = `Generated and saved newscast audio for topic ${topicIndexNumber}`;
    } else {
      responseData.message = `Generated newscast audio for topic ${topicIndexNumber}`;
    }

    console.log(`[NEWSCAST_HANDLER SUCCESS] Completed in ${totalTime}ms for topic ${topicIndexNumber}`);

    return response(cors(json(responseData)));

  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[NEWSCAST_HANDLER ERROR] Failed after ${totalTime}ms:`, err);

    if (err instanceof Error) {
      console.error(`[NEWSCAST_HANDLER ERROR] Error name: ${err.name}`);
      console.error(`[NEWSCAST_HANDLER ERROR] Error message: ${err.message}`);
      console.error(`[NEWSCAST_HANDLER ERROR] Error stack: ${err.stack}`);
    }

    return response(cors(error(err instanceof Error ? err : new Error('Unknown error in newscast generation'))));
  }
}