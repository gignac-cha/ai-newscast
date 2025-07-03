import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join, basename, relative } from 'path';
import { existsSync } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import type { ScriptLine, NewscastOutput, AudioFileInfo, AudioOutput } from './types.ts';
import { getHostIdFromRole } from './utils.ts';

const execAsync = promisify(exec);

// Google Cloud TTS 클라이언트 초기화
const ttsClient = new TextToSpeechClient();

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const ffmpegPath = ffmpeg.path;
    const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
    const { stdout } = await execAsync(`"${ffprobePath}" -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
    return parseFloat(stdout.trim());
  } catch (error) {
    // ffprobe 실패 시 시스템 ffprobe 시도
    try {
      const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
      return parseFloat(stdout.trim());
    } catch (systemError) {
      console.warn(`   ⚠️  오디오 길이 측정 실패: ${error}`);
      return 0;
    }
  }
}

async function generateAudioForDialogue(
  scriptLine: ScriptLine, 
  sequence: number,
  outputPath: string
): Promise<void> {
  // 음악 타입인 경우 TTS 생성하지 않고 스킵
  if (scriptLine.type !== 'dialogue') {
    console.log(`   🎵 음악 구간 스킵: ${sequence.toString().padStart(3, '0')}. [${scriptLine.type}] ${scriptLine.content}`);
    return;
  }

  if (!scriptLine.voice_model) {
    throw new Error(`음성 모델이 지정되지 않았습니다: ${scriptLine.role}`);
  }

  const request = {
    input: { text: scriptLine.content },
    voice: {
      languageCode: 'ko-KR',
      name: scriptLine.voice_model,
    },
    audioConfig: {
      audioEncoding: 'MP3' as const,
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
    },
  };

  try {
    console.log(`   🎤 음성 생성 중: ${sequence.toString().padStart(3, '0')}. [${scriptLine.name}]`);
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    if (response.audioContent) {
      await writeFile(outputPath, response.audioContent);
      console.log(`   ✅ 저장 완료: ${basename(outputPath)}`);
    } else {
      throw new Error('TTS 응답에서 오디오 콘텐츠를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error(`   ❌ 음성 생성 실패 [${sequence}]: ${error}`);
    throw error;
  }
}

export async function generateAudio(
  inputFile: string,
  outputDir: string,
  printFormat: string = 'text',
  printLogFile?: string
): Promise<void> {
  const startTime = Date.now();

  // Google Cloud API 키 확인
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_CLOUD_API_KEY environment variable is required');
    process.exit(1);
  }

  // 입력 파일 확인
  if (!existsSync(inputFile)) {
    console.error(`Error: Input file does not exist: ${inputFile}`);
    process.exit(1);
  }

  // 스크립트 데이터 로드
  const scriptContent = await readFile(inputFile, 'utf-8');
  const newscastData: NewscastOutput = JSON.parse(scriptContent);

  // 오디오 폴더 생성
  const audioFolderPath = join(outputDir, 'audio');
  await mkdir(audioFolderPath, { recursive: true });

  console.log('🎙️ 뉴스캐스트 오디오 생성 시작...');
  console.log(`   📊 총 스크립트 라인: ${newscastData.script.length}개`);
  console.log(`   👥 진행자: ${newscastData.hosts.host1.name} (${newscastData.hosts.host1.voice_model}), ${newscastData.hosts.host2.name} (${newscastData.hosts.host2.voice_model})`);

  // 개별 스크립트 라인별 오디오 생성
  console.log('\n🎵 개별 스크립트 라인 오디오 생성 중...');
  const audioGenerationStart = Date.now();
  
  const audioFiles: AudioFileInfo[] = [];
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

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
    
    const audioFilePath = join(audioFolderPath, audioFileName);
    
    try {
      await generateAudioForDialogue(scriptLine, sequence, audioFilePath);
      
      if (scriptLine.type === 'dialogue') {
        // 생성된 오디오 파일의 길이 측정
        const duration = await getAudioDuration(audioFilePath);
        
        audioFiles.push({
          file_path: relative(outputDir, audioFilePath),
          sequence,
          type: scriptLine.type,
          host_id: getHostIdFromRole(scriptLine.role),
          duration_seconds: duration
        });
        successCount++;
        // API 요청 간격 조절 (과부하 방지)
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // 음악 파일은 생성되지 않으므로 스킵 카운트
        skipCount++;
      }
    } catch (error) {
      console.error(`   ❌ 스크립트 라인 ${sequence} 생성 실패: ${error}`);
      failCount++;
    }
  }

  const audioGenerationTime = Date.now() - audioGenerationStart;

  // 오디오 파일 목록 저장
  const audioListPath = join(audioFolderPath, 'audio-files.json');
  
  // script에서 타입별 통계 계산
  const dialogueCount = newscastData.script.filter(line => line.type === 'dialogue').length;
  const musicCount = newscastData.script.filter(line => line.type !== 'dialogue').length;
  
  const audioOutput: AudioOutput = {
    title: newscastData.title,
    program_name: newscastData.program_name,
    generation_timestamp: new Date().toISOString(),
    total_script_lines: newscastData.script.length,
    dialogue_lines: dialogueCount,
    music_lines: musicCount,
    generated_audio_files: successCount,
    skipped_music_files: skipCount,
    failed_audio_files: failCount,
    audio_files: audioFiles,
    all_segments: newscastData.script.map((line, index) => ({
      sequence: index + 1,
      type: line.type,
      role: line.role,
      content: line.content,
      has_audio: line.type === 'dialogue'
    })),
    metadata: {
      audio_generation_time_ms: audioGenerationTime,
      success_rate: `${((successCount / dialogueCount) * 100).toFixed(1)}%`,
      estimated_total_duration: newscastData.estimated_duration
    }
  };

  await writeFile(audioListPath, JSON.stringify(audioOutput, null, 2), 'utf-8');

  const endTime = Date.now();
  const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

  // 로그 출력 생성
  const logOutput = {
    timestamp: new Date().toISOString(),
    'elapsed-time': `${elapsedSeconds}s`,
    'dialogue-lines': dialogueCount,
    'music-lines': musicCount,
    'audio-files-generated': successCount,
    'files-skipped': skipCount,
    'files-failed': failCount,
    'success-rate': `${((successCount / dialogueCount) * 100).toFixed(1)}%`,
    'output-dir': audioFolderPath,
  };

  // 로그 출력
  if (printFormat === 'json') {
    console.log(JSON.stringify(logOutput, null, 2));
  } else {
    console.log(`\n✅ 뉴스캐스트 오디오 생성 완료!`);
    console.log(`   🎬 프로그램: ${newscastData.program_name}`);
    console.log(`   📊 대화 라인: ${dialogueCount}개, 음악 구간: ${musicCount}개`);
    console.log(`   🎤 TTS 생성: ${successCount}개 성공, ${failCount}개 실패`);
    console.log(`   🎵 음악 구간: ${skipCount}개 스킵`);
    console.log(`   📈 TTS 성공률: ${((successCount / dialogueCount) * 100).toFixed(1)}%`);
    console.log(`   ⏱️  오디오 생성 시간: ${audioGenerationTime.toFixed(1)}ms`);
    console.log(`   🕐 전체 소요 시간: ${elapsedSeconds}s`);
    console.log(`   📁 저장 위치: ${audioFolderPath}`);

    if (failCount > 0) {
      console.warn(`\n⚠️  ${failCount}개 스크립트 라인 생성 실패. Google Cloud TTS API 설정을 확인해주세요.`);
    }
    
    if (skipCount > 0) {
      console.log(`\n💡 ${skipCount}개 음악 구간은 별도로 음악 파일을 준비하여 추가해주세요:`);
      newscastData.script
        .filter(line => line.type !== 'dialogue')
        .forEach((line) => {
          const sequence = newscastData.script.indexOf(line) + 1;
          const fileName = `${sequence.toString().padStart(3, '0')}-${line.type}.mp3`;
          console.log(`   🎵 ${fileName}: ${line.content}`);
        });
    }
  }

  // 로그 파일 저장
  if (printLogFile) {
    await mkdir(dirname(printLogFile), { recursive: true });
    await writeFile(printLogFile, JSON.stringify(logOutput, null, 2));
  }
}