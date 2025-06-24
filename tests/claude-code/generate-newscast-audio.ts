import fs from 'fs/promises';
import path from 'path';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { config } from 'dotenv';

config();

interface DialogueLine {
  speaker: string;
  voice_model: string;
  text: string;
  sequence: number;
  type: 'dialogue' | 'opening_music' | 'closing_music' | 'background_music';
}

interface NewscastScript {
  title: string;
  program_name: string;
  hosts: {
    host1: {
      name: string;
      voice_model: string;
      gender: string;
    };
    host2: {
      name: string;
      voice_model: string;
      gender: string;
    };
  };
  opening: string;
  main_content: string;
  closing: string;
  dialogue_lines: DialogueLine[];
  metadata: {
    total_articles: number;
    sources_count: number;
    main_sources: string[];
    generation_timestamp: string;
    estimated_duration: string;
    total_dialogue_lines: number;
  };
}

// Google Cloud TTS 클라이언트 초기화
// Google Cloud 클라이언트는 환경변수를 통한 인증을 사용
// GOOGLE_APPLICATION_CREDENTIALS 또는 GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS
const ttsClient = new TextToSpeechClient();

function getHostDisplayName(speaker: string): string {
  // 진행자 이름을 파일명에 적합한 형태로 변환
  if (speaker === '김민준') return 'host1-김민준';
  if (speaker === '이서연') return 'host2-이서연';
  return speaker.replace(/\s+/g, '_');
}

async function generateAudioForDialogue(dialogue: DialogueLine, outputPath: string): Promise<void> {
  // 음악 타입인 경우 TTS 생성하지 않고 스킵
  if (dialogue.type !== 'dialogue') {
    console.log(`   🎵 음악 구간 스킵: ${dialogue.sequence.toString().padStart(3, '0')}. [${dialogue.type}] ${dialogue.text}`);
    return;
  }

  const request = {
    input: { text: dialogue.text },
    voice: {
      languageCode: 'ko-KR',
      name: dialogue.voice_model,
    },
    audioConfig: {
      audioEncoding: 'MP3' as const,
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
    },
  };

  try {
    console.log(`   🎤 음성 생성 중: ${dialogue.sequence.toString().padStart(3, '0')}. [${dialogue.speaker}]`);
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    if (response.audioContent) {
      await fs.writeFile(outputPath, response.audioContent);
      console.log(`   ✅ 저장 완료: ${path.basename(outputPath)}`);
    } else {
      throw new Error('TTS 응답에서 오디오 콘텐츠를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error(`   ❌ 음성 생성 실패 [${dialogue.sequence}]: ${error}`);
    throw error;
  }
}

async function generateNewscastAudio(scriptPath: string, topicFolderPath: string): Promise<void> {
  console.log('🎙️ 뉴스캐스트 오디오 생성 시작...');
  const totalStartTime = performance.now();

  // 스크립트 파일 로드
  console.log('📄 뉴스캐스트 스크립트 로딩 중...');
  const loadStartTime = performance.now();
  
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: NewscastScript = JSON.parse(scriptContent);
  
  const loadTime = performance.now() - loadStartTime;
  console.log(`   ⏱️  스크립트 로드: ${loadTime.toFixed(1)}ms`);
  console.log(`   📊 총 대사 라인: ${script.dialogue_lines.length}개`);
  console.log(`   👥 진행자: ${script.hosts.host1.name} (${script.hosts.host1.voice_model}), ${script.hosts.host2.name} (${script.hosts.host2.voice_model})`);

  // 오디오 폴더 생성
  const audioFolderPath = path.join(topicFolderPath, 'audio');
  await fs.mkdir(audioFolderPath, { recursive: true });

  // 개별 대사 라인별 오디오 생성
  console.log('\\n🎵 개별 대사 라인 오디오 생성 중...');
  const audioGenerationStart = performance.now();
  
  const audioFiles: string[] = [];
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const dialogue of script.dialogue_lines) {
    let audioFileName: string;
    
    // 파일명 생성: {index}-{type}-{speaker}.mp3
    if (dialogue.type === 'dialogue') {
      const hostName = getHostDisplayName(dialogue.speaker);
      audioFileName = `${dialogue.sequence.toString().padStart(3, '0')}-${dialogue.type}-${hostName}.mp3`;
    } else {
      // 음악 타입인 경우
      audioFileName = `${dialogue.sequence.toString().padStart(3, '0')}-${dialogue.type}.mp3`;
    }
    
    const audioFilePath = path.join(audioFolderPath, audioFileName);
    
    try {
      await generateAudioForDialogue(dialogue, audioFilePath);
      
      if (dialogue.type === 'dialogue') {
        audioFiles.push(audioFilePath);
        successCount++;
        // API 요청 간격 조절 (과부하 방지)
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // 음악 파일은 생성되지 않으므로 스킵 카운트
        skipCount++;
      }
    } catch (error) {
      console.error(`   ❌ 대사 라인 ${dialogue.sequence} 생성 실패: ${error}`);
      failCount++;
    }
  }

  const audioGenerationTime = performance.now() - audioGenerationStart;

  // 오디오 파일 목록 저장
  const audioListPath = path.join(audioFolderPath, 'audio-files.json');
  
  // dialogue_lines에서 타입별 통계 계산
  const dialogueCount = script.dialogue_lines.filter(line => line.type === 'dialogue').length;
  const musicCount = script.dialogue_lines.filter(line => line.type !== 'dialogue').length;
  
  const audioList = {
    title: script.title,
    program_name: script.program_name,
    generation_timestamp: new Date().toISOString(),
    total_dialogue_lines: script.dialogue_lines.length,
    dialogue_lines: dialogueCount,
    music_lines: musicCount,
    generated_audio_files: successCount,
    skipped_music_files: skipCount,
    failed_audio_files: failCount,
    audio_files: audioFiles.map(filePath => {
      const fileName = path.basename(filePath);
      const parts = fileName.replace('.mp3', '').split('-');
      return {
        file_path: path.relative(topicFolderPath, filePath),
        sequence: parseInt(parts[0]),
        type: parts[1],
        speaker: parts.slice(2).join('-')
      };
    }),
    all_segments: script.dialogue_lines.map(line => ({
      sequence: line.sequence,
      type: line.type,
      speaker: line.speaker,
      text: line.text,
      has_audio: line.type === 'dialogue'
    })),
    metadata: {
      audio_generation_time_ms: audioGenerationTime,
      success_rate: `${((successCount / dialogueCount) * 100).toFixed(1)}%`,
      estimated_total_duration: script.metadata.estimated_duration
    }
  };

  await fs.writeFile(audioListPath, JSON.stringify(audioList, null, 2), 'utf-8');

  const totalTime = performance.now() - totalStartTime;

  console.log(`\\n✅ 뉴스캐스트 오디오 생성 완료!`);
  console.log(`   🎬 프로그램: ${script.program_name}`);
  console.log(`   📊 대화 라인: ${dialogueCount}개, 음악 구간: ${musicCount}개`);
  console.log(`   🎤 TTS 생성: ${successCount}개 성공, ${failCount}개 실패`);
  console.log(`   🎵 음악 구간: ${skipCount}개 스킵`);
  console.log(`   📈 TTS 성공률: ${((successCount / dialogueCount) * 100).toFixed(1)}%`);
  console.log(`   ⏱️  오디오 생성 시간: ${audioGenerationTime.toFixed(1)}ms`);
  console.log(`   🕐 전체 소요 시간: ${totalTime.toFixed(1)}ms`);
  console.log(`   📁 저장 위치: ${audioFolderPath}`);

  if (failCount > 0) {
    console.warn(`\\n⚠️  ${failCount}개 대사 라인 생성 실패. Google Cloud TTS API 설정을 확인해주세요.`);
  }
  
  if (skipCount > 0) {
    console.log(`\\n💡 ${skipCount}개 음악 구간은 별도로 음악 파일을 준비하여 추가해주세요:`);
    script.dialogue_lines
      .filter(line => line.type !== 'dialogue')
      .forEach(line => {
        const fileName = `${line.sequence.toString().padStart(3, '0')}-${line.type}.mp3`;
        console.log(`   🎵 ${fileName}: ${line.text}`);
      });
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('사용법: node --experimental-transform-types generate-newscast-audio.ts <bigkinds-folder> <topic-number>');
    console.error('예시: node --experimental-transform-types generate-newscast-audio.ts bigkinds/2025-06-20T23:19:18.489131 1');
    process.exit(1);
  }

  const [bigkindsFolder, topicNumber] = args;
  const topicFolderPath = path.join(bigkindsFolder, `topic-${topicNumber.padStart(2, '0')}`);
  const scriptJsonPath = path.join(topicFolderPath, 'newscast-script.json');

  try {
    // 스크립트 파일 존재 확인
    await fs.access(scriptJsonPath);
    
    // Google Cloud 인증 확인
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn('⚠️  GOOGLE_APPLICATION_CREDENTIALS가 설정되지 않았습니다.');
      console.warn('Google Cloud TTS 서비스 계정 키 파일 경로를 설정하거나,');
      console.warn('Application Default Credentials (ADC)가 설정되어 있어야 합니다.');
      console.warn('일단 시도해보겠습니다...');
    }

    await generateNewscastAudio(scriptJsonPath, topicFolderPath);

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.error(`❌ 스크립트 파일을 찾을 수 없습니다: ${scriptJsonPath}`);
      console.error('먼저 generate-newscast-script.ts를 실행하여 스크립트를 생성해주세요.');
    } else {
      console.error('❌ 오류 발생:', error);
    }
    process.exit(1);
  }
}

// ES 모듈에서 직접 실행 확인
const isMainModule = process.argv[1] && process.argv[1].endsWith('generate-newscast-audio.ts');
if (isMainModule) {
  main();
}