import type { ScriptLine, NewscastOutput, AudioFileInfo, AudioOutput } from './types.ts';
import { getHostIdFromRole } from './runtime-utils.ts';
import { synthesizeText } from './tts-rest-client.ts';
import { calculateMP3Duration } from './mp3-duration-calculator.ts';

export interface GeneratedAudioFile {
  fileName: string;
  audioContent: Uint8Array;
  sequence: number;
  type: 'dialogue' | 'music';
  hostID?: string;
  scriptLine: ScriptLine;
  duration: number; // 계산된 duration (초)
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
  };
  status: 'success' | 'failed' | 'skipped';
}

export interface GenerateNewscastAudioOptions {
  newscastData: NewscastOutput;
  apiKey: string;
  newscastID: string;
  topicIndex: number;
  delayMs?: number;
}

export interface GenerateNewscastAudioResult {
  audioFiles: GeneratedAudioFile[];
  audioOutput: AudioOutput;
  stats: {
    startedAt: string;
    completedAt: string;
    elapsedMs: number;
    dialogueCount: number;
    musicCount: number;
    successCount: number;
    failCount: number;
    skipCount: number;
    successRate: string;
  };
}

async function generateSingleAudioFile(
  scriptLine: ScriptLine,
  sequence: number,
  apiKey: string
): Promise<Uint8Array | null> {
  console.log(`[AUDIO_TTS] Processing sequence ${sequence}: ${scriptLine.type} - ${scriptLine.role ?? 'no role'}`);

  // 음악 타입인 경우 TTS 생성하지 않고 null 반환
  if (scriptLine.type !== 'dialogue') {
    console.log(`[AUDIO_TTS] Skipping ${scriptLine.type} type (sequence ${sequence})`);
    return null;
  }

  if (!scriptLine.voiceModel) {
    console.error(`[AUDIO_TTS ERROR] No voice model specified for role: ${scriptLine.role}`);
    throw new Error(`음성 모델이 지정되지 않았습니다: ${scriptLine.role}`);
  }

  console.log(`[AUDIO_TTS] Generating TTS for sequence ${sequence}: "${scriptLine.content}" (voice: ${scriptLine.voiceModel})`);

  // REST API 클라이언트로 TTS 호출
  return await synthesizeText(
    scriptLine.content,
    scriptLine.voiceModel,
    apiKey,
    {
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
    }
  );
}

export async function generateNewscastAudio({
  newscastData,
  apiKey,
  newscastID,
  topicIndex,
  delayMs = 10000,
}: GenerateNewscastAudioOptions): Promise<GenerateNewscastAudioResult> {
  const startTime = new Date();
  console.log(`[AUDIO_GEN START] ${startTime.toISOString()}`);
  console.log(`[AUDIO_GEN CONFIG] TTS delay: ${delayMs}ms between requests`);

  if (!apiKey) {
    console.error(`[AUDIO_GEN ERROR] Google Cloud API key is required`);
    throw new Error('Google Cloud API key is required');
  }

  if (!newscastData) {
    console.error(`[AUDIO_GEN ERROR] Newscast data is required`);
    throw new Error('Newscast data is required');
  }

  console.log(`[AUDIO_GEN INPUT] Title: "${newscastData.title}", script lines: ${newscastData.script.length}`);
  const audioFiles: GeneratedAudioFile[] = [];
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  console.log(`[AUDIO_GEN PROCESS] Starting TTS generation for ${newscastData.script.length} script lines`);

  for (let i = 0; i < newscastData.script.length; i++) {
    const scriptLine = newscastData.script[i];
    const sequence = i + 1;

    let audioFileName: string;

    // 파일명 생성: {index}-{host-id}.mp3 (사용자 요청에 따라 host1/host2 형식 사용)
    if (scriptLine.type === 'dialogue') {
      const hostId = getHostIdFromRole(scriptLine.role);
      audioFileName = `${sequence.toString().padStart(3, '0')}-${hostId}.mp3`;
    } else {
      // 음악 타입인 경우
      audioFileName = `${sequence.toString().padStart(3, '0')}-${scriptLine.type}.mp3`;
    }

    console.log(`[AUDIO_GEN FILE] Processing ${i + 1}/${newscastData.script.length}: ${audioFileName}`);

    const fileStartTime = new Date();
    try {
      const audioContent = await generateSingleAudioFile(scriptLine, sequence, apiKey);
      const fileEndTime = new Date();
      const fileDuration = fileEndTime.getTime() - fileStartTime.getTime();

      if (audioContent) {
        // MP3 duration 계산
        console.log(`[AUDIO_GEN DURATION] Calculating duration for ${audioFileName} (${audioContent.length} bytes)`);
        const duration = calculateMP3Duration(audioContent);
        console.log(`[AUDIO_GEN DURATION] ${audioFileName}: ${duration} seconds`);

        audioFiles.push({
          fileName: audioFileName,
          audioContent,
          sequence,
          type: scriptLine.type as 'dialogue' | 'music',
          hostID: getHostIdFromRole(scriptLine.role),
          scriptLine,
          duration,
          timing: {
            startedAt: fileStartTime.toISOString(),
            completedAt: fileEndTime.toISOString(),
            duration: fileDuration
          },
          status: 'success'
        });
        successCount++;
        console.log(`[AUDIO_GEN SUCCESS] ${audioFileName} generated successfully (${successCount}/${newscastData.script.length})`);

        // API 요청 간격 조절 (Google Cloud TTS Chirp3 rate limit: 200/min)
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        // 음악 파일은 생성되지 않으므로 스킵 카운트
        audioFiles.push({
          fileName: audioFileName,
          audioContent: new Uint8Array(0),
          sequence,
          type: scriptLine.type as 'dialogue' | 'music',
          hostID: getHostIdFromRole(scriptLine.role),
          scriptLine,
          duration: 0,
          timing: {
            startedAt: fileStartTime.toISOString(),
            completedAt: fileEndTime.toISOString(),
            duration: fileDuration
          },
          status: 'skipped'
        });
        skipCount++;
        console.log(`[AUDIO_GEN SKIP] ${audioFileName} skipped (${skipCount} total skips)`);
      }
    } catch (error) {
      const fileEndTime = new Date();
      const fileDuration = fileEndTime.getTime() - fileStartTime.getTime();

      audioFiles.push({
        fileName: audioFileName,
        audioContent: new Uint8Array(0),
        sequence,
        type: scriptLine.type as 'dialogue' | 'music',
        hostID: getHostIdFromRole(scriptLine.role),
        scriptLine,
        duration: 0,
        timing: {
          startedAt: fileStartTime.toISOString(),
          completedAt: fileEndTime.toISOString(),
          duration: fileDuration
        },
        status: 'failed'
      });
      failCount++;
      console.error(`[AUDIO_GEN ERROR] Failed to generate ${audioFileName}:`, error);
      throw new Error(`스크립트 라인 ${sequence} 생성 실패: ${error}`);
    }
  }

  const completedAt = new Date();

  console.log(`[AUDIO_GEN STATS] Processing complete. Success: ${successCount}, Failed: ${failCount}, Skipped: ${skipCount}`);

  // script에서 타입별 통계 계산
  const dialogueCount = newscastData.script.filter(line => line.type === 'dialogue').length;
  const musicCount = newscastData.script.filter(line => line.type !== 'dialogue').length;
  console.log(`[AUDIO_GEN STATS] Script analysis: ${dialogueCount} dialogue lines, ${musicCount} music lines`);

  // AudioFileInfo 생성 (계산된 duration 사용) - success 파일만
  console.log(`[AUDIO_GEN OUTPUT] Creating audio file info for ${audioFiles.length} generated files`);
  const audioFileInfos: AudioFileInfo[] = audioFiles
    .filter(file => file.status === 'success')
    .map(file => ({
      filePath: `audio/${file.fileName}`,
      sequence: file.sequence,
      type: file.type,
      hostID: file.hostID ?? '',
      durationSeconds: file.duration
    }));

  const totalTime = completedAt.getTime() - startTime.getTime();
  const totalAudioSize = audioFiles
    .filter(file => file.status === 'success')
    .reduce((sum, file) => sum + file.audioContent.length, 0);
  const filesPerSecond = successCount / (totalTime / 1000);

  const audioOutput: AudioOutput = {
    timestamp: completedAt.toISOString(),
    title: newscastData.title,
    programName: newscastData.programName,
    totalScriptLines: newscastData.script.length,
    dialogueLines: dialogueCount,
    musicLines: musicCount,
    generatedAudioFiles: successCount,
    skippedMusicFiles: skipCount,
    failedAudioFiles: failCount,
    audioFiles: audioFileInfos,
    allSegments: newscastData.script.map((line, index) => ({
      sequence: index + 1,
      type: line.type,
      role: line.role,
      content: line.content,
      hasAudio: line.type === 'dialogue'
    })),
    metadata: {
      audioGenerationTimeMs: totalTime,
      successRate: `${((successCount / dialogueCount) * 100).toFixed(1)}%`,
      estimatedTotalDuration: newscastData.estimatedDuration
    },
    metrics: {
      newscastID,
      topicIndex,
      timing: {
        startedAt: startTime.toISOString(),
        completedAt: completedAt.toISOString(),
        duration: totalTime,
        ttsGenerationTime: totalTime
      },
      input: {
        totalScriptLines: newscastData.script.length,
        dialogueLines: dialogueCount,
        musicLines: musicCount
      },
      output: {
        generatedAudioFiles: successCount,
        skippedMusicFiles: skipCount,
        failedAudioFiles: failCount,
        totalAudioSize
      },
      performance: {
        filesPerSecond,
        successRate: `${((successCount / dialogueCount) * 100).toFixed(1)}%`
      },
      items: audioFiles.map(file => ({
        sequence: file.sequence,
        fileName: file.fileName,
        status: file.status,
        timing: file.timing,
        fileSize: file.audioContent.length,
        durationSeconds: file.duration
      }))
    }
  };

  console.log(`[AUDIO_GEN SUCCESS] Completed in ${totalTime}ms`);
  console.log(`[AUDIO_GEN SUCCESS] Generated ${successCount} audio files, skipped ${skipCount}, failed ${failCount}`);
  console.log(`[AUDIO_GEN SUCCESS] Success rate: ${((successCount / dialogueCount) * 100).toFixed(1)}%`);

  return {
    audioFiles,
    audioOutput,
    stats: {
      startedAt: startTime.toISOString(),
      completedAt: completedAt.toISOString(),
      elapsedMs: completedAt.getTime() - startTime.getTime(),
      dialogueCount,
      musicCount,
      successCount,
      failCount,
      skipCount,
      successRate: `${((successCount / dialogueCount) * 100).toFixed(1)}%`,
    },
  };
}

export const generateAudio = generateNewscastAudio;