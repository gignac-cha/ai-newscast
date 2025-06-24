import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

interface AudioFile {
  file_path: string;
  sequence: number;
  type: string;
  speaker: string;
}

interface AudioList {
  title: string;
  program_name: string;
  generation_timestamp: string;
  total_dialogue_lines: number;
  dialogue_lines: number;
  music_lines: number;
  generated_audio_files: number;
  skipped_music_files: number;
  failed_audio_files: number;
  audio_files: AudioFile[];
  all_segments: Array<{
    sequence: number;
    type: string;
    speaker: string;
    text: string;
    has_audio: boolean;
  }>;
  metadata: {
    audio_generation_time_ms: number;
    success_rate: string;
    estimated_total_duration: string;
  };
}

async function checkFFmpegInstallation(): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}

async function mergeDialogueAudioFiles(audioFiles: AudioFile[], outputPath: string, topicFolderPath: string): Promise<void> {
  console.log('🔧 대사 음성 파일 병합 중...');
  const mergeStartTime = performance.now();

  // dialogue 타입만 필터링하고 sequence 순으로 정렬
  const dialogueFiles = audioFiles
    .filter(file => file.type === 'dialogue')
    .sort((a, b) => a.sequence - b.sequence);

  if (dialogueFiles.length === 0) {
    throw new Error('병합할 대사 오디오 파일이 없습니다.');
  }

  console.log(`   📊 병합 대상: ${dialogueFiles.length}개 대사 파일`);

  // 파일 존재 확인
  const existingFiles: AudioFile[] = [];
  for (const audioFile of dialogueFiles) {
    const fullPath = path.join(topicFolderPath, audioFile.file_path);
    try {
      await fs.access(fullPath);
      existingFiles.push(audioFile);
      console.log(`   ✅ ${audioFile.sequence.toString().padStart(3, '0')}: ${audioFile.speaker}`);
    } catch (error) {
      console.warn(`   ⚠️  파일 없음: ${audioFile.file_path}`);
    }
  }

  if (existingFiles.length === 0) {
    throw new Error('존재하는 오디오 파일이 없습니다.');
  }

  console.log(`   🎵 실제 병합할 파일: ${existingFiles.length}개`);

  // FFmpeg 파일 리스트 생성 (화자 간 0.5초 무음 구간 추가)
  const fileListPath = path.join(path.dirname(outputPath), 'dialogue-filelist.txt');
  
  let fileListContent = '';
  for (let i = 0; i < existingFiles.length; i++) {
    const audioFile = existingFiles[i];
    const fullPath = path.resolve(topicFolderPath, audioFile.file_path);
    
    // 오디오 파일 추가
    fileListContent += `file '${fullPath}'\n`;
    
    // 마지막 파일이 아니면 0.5초 무음 구간 추가
    if (i < existingFiles.length - 1) {
      fileListContent += `file 'silence.mp3'\n`;
    }
  }
  
  await fs.writeFile(fileListPath, fileListContent, 'utf-8');

  // 0.5초 무음 파일 생성
  const silencePath = path.join(path.dirname(outputPath), 'silence.mp3');
  console.log('   🔇 0.5초 무음 파일 생성 중...');
  
  await new Promise<void>((resolve, reject) => {
    const silenceCommand = [
      'ffmpeg',
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=24000',
      '-t', '0.5',
      '-c:a', 'mp3',
      '-y',
      silencePath
    ];

    const ffmpegSilence = spawn(silenceCommand[0], silenceCommand.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    ffmpegSilence.on('close', (code) => {
      if (code === 0) {
        console.log('   ✅ 무음 파일 생성 완료');
        resolve();
      } else {
        reject(new Error(`무음 파일 생성 실패: 코드 ${code}`));
      }
    });

    ffmpegSilence.on('error', (error) => {
      reject(new Error(`FFmpeg 실행 오류: ${error.message}`));
    });
  });

  // FFmpeg로 파일들 병합
  console.log('   🔗 오디오 파일들 병합 중...');
  const ffmpegCommand = [
    'ffmpeg',
    '-f', 'concat',
    '-safe', '0',
    '-i', fileListPath,
    '-c', 'copy',
    '-y', // 덮어쓰기
    outputPath
  ];

  console.log(`   🔧 FFmpeg 명령: ${ffmpegCommand.join(' ')}`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegCommand[0], ffmpegCommand.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      // 임시 파일들 정리
      try {
        await fs.unlink(fileListPath);
        await fs.unlink(silencePath);
      } catch (error) {
        console.warn(`   ⚠️  임시 파일 삭제 실패: ${error}`);
      }

      if (code === 0) {
        const mergeTime = performance.now() - mergeStartTime;
        console.log(`   ✅ 오디오 병합 완료: ${mergeTime.toFixed(1)}ms`);
        resolve();
      } else {
        console.error(`   ❌ FFmpeg 오류:\\n${stderr}`);
        reject(new Error(`FFmpeg 프로세스가 코드 ${code}로 종료되었습니다.`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg 실행 오류: ${error.message}`));
    });
  });
}

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.warn(`   ⚠️  오디오 길이 측정 실패: ${error}`);
    return 0;
  }
}

async function mergeNewscastDialogueAudio(topicFolderPath: string): Promise<void> {
  console.log('🎵 뉴스캐스트 대사 오디오 병합 시작...');
  const totalStartTime = performance.now();

  // FFmpeg 설치 확인
  const ffmpegInstalled = await checkFFmpegInstallation();
  if (!ffmpegInstalled) {
    throw new Error('FFmpeg가 설치되지 않았습니다. 오디오 병합을 위해 FFmpeg를 설치해주세요.');
  }

  // 오디오 파일 목록 로드
  const audioListPath = path.join(topicFolderPath, 'audio', 'audio-files.json');
  
  console.log('📄 오디오 파일 목록 로딩 중...');
  const loadStartTime = performance.now();
  
  const audioListContent = await fs.readFile(audioListPath, 'utf-8');
  const audioList: AudioList = JSON.parse(audioListContent);
  
  const loadTime = performance.now() - loadStartTime;
  console.log(`   ⏱️  파일 목록 로드: ${loadTime.toFixed(1)}ms`);
  console.log(`   📊 총 세그먼트: ${audioList.total_dialogue_lines}개`);
  console.log(`   🎤 대사 파일: ${audioList.dialogue_lines}개`);
  console.log(`   🎵 음악 구간: ${audioList.music_lines}개 (스킵)`);

  if (audioList.audio_files.length === 0) {
    throw new Error('병합할 오디오 파일이 없습니다.');
  }

  // 출력 파일 경로
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const outputFileName = `newscast-dialogue-${timestamp}.mp3`;
  const outputPath = path.join(topicFolderPath, outputFileName);

  // 대사 오디오 병합
  await mergeDialogueAudioFiles(audioList.audio_files, outputPath, topicFolderPath);

  // 최종 파일 정보
  const finalDuration = await getAudioDuration(outputPath);
  const fileStats = await fs.stat(outputPath);

  // 병합 결과 저장
  const mergeResult = {
    title: audioList.title,
    program_name: audioList.program_name,
    merge_timestamp: new Date().toISOString(),
    type: 'dialogue_only',
    input_files: audioList.dialogue_lines,
    skipped_music_segments: audioList.music_lines,
    output_file: outputFileName,
    final_duration_seconds: finalDuration,
    final_duration_formatted: `${Math.floor(finalDuration / 60)}분 ${Math.floor(finalDuration % 60)}초`,
    file_size_bytes: fileStats.size,
    file_size_formatted: `${(fileStats.size / 1024 / 1024).toFixed(2)} MB`,
    features: {
      silence_between_speakers: '0.5초',
      audio_quality: 'MP3',
      speakers: ['김민준 (남성)', '이서연 (여성)']
    },
    original_metadata: audioList.metadata
  };

  const mergeResultPath = path.join(topicFolderPath, 'newscast-dialogue-info.json');
  await fs.writeFile(mergeResultPath, JSON.stringify(mergeResult, null, 2), 'utf-8');

  const totalTime = performance.now() - totalStartTime;

  console.log(`\\n✅ 뉴스캐스트 대사 오디오 병합 완료!`);
  console.log(`   🎬 프로그램: ${audioList.program_name}`);
  console.log(`   🎤 병합된 대사: ${audioList.dialogue_lines}개`);
  console.log(`   🎵 최종 파일: ${outputFileName}`);
  console.log(`   ⏱️  재생 시간: ${mergeResult.final_duration_formatted}`);
  console.log(`   💾 파일 크기: ${mergeResult.file_size_formatted}`);
  console.log(`   🔇 화자 간 무음: 0.5초씩 추가`);
  console.log(`   🕐 전체 소요 시간: ${totalTime.toFixed(1)}ms`);
  console.log(`   📁 저장 위치: ${outputPath}`);
  console.log(`\\n💡 음악이 필요하다면 나중에 다음 구간에 추가할 수 있습니다:`);
  console.log(`   🎵 오프닝: 파일 시작 부분`);
  console.log(`   🎵 클로징: 파일 끝 부분`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('사용법: node --experimental-transform-types merge-dialogue-audio.ts <bigkinds-folder> <topic-number>');
    console.error('예시: node --experimental-transform-types merge-dialogue-audio.ts bigkinds/2025-06-21T17:20:21.389037 1');
    process.exit(1);
  }

  const [bigkindsFolder, topicNumber] = args;
  const topicFolderPath = path.join(bigkindsFolder, `topic-${topicNumber.padStart(2, '0')}`);
  const audioListPath = path.join(topicFolderPath, 'audio', 'audio-files.json');

  try {
    // 오디오 파일 목록 존재 확인
    await fs.access(audioListPath);
    
    await mergeNewscastDialogueAudio(topicFolderPath);

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.error(`❌ 오디오 파일 목록을 찾을 수 없습니다: ${audioListPath}`);
      console.error('먼저 generate-newscast-audio.ts를 실행하여 개별 오디오 파일들을 생성해주세요.');
    } else {
      console.error('❌ 오류 발생:', error);
    }
    process.exit(1);
  }
}

// ES 모듈에서 직접 실행 확인
const isMainModule = process.argv[1] && process.argv[1].endsWith('merge-dialogue-audio.ts');
if (isMainModule) {
  main();
}