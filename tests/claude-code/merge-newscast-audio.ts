import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(require('child_process').exec);

interface AudioFile {
  file_path: string;
  sequence: number;
  speaker: string;
}

interface AudioList {
  title: string;
  program_name: string;
  generation_timestamp: string;
  total_dialogue_lines: number;
  generated_audio_files: number;
  failed_audio_files: number;
  audio_files: AudioFile[];
  metadata: {
    audio_generation_time_ms: number;
    success_rate: string;
    estimated_total_duration: string;
  };
}

async function checkFFmpegInstallation(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}

async function mergeAudioFiles(audioFiles: AudioFile[], outputPath: string, topicFolderPath: string): Promise<void> {
  console.log('🔧 오디오 파일 병합 중...');
  const mergeStartTime = performance.now();

  // 파일 존재 확인 및 정렬
  const existingFiles: AudioFile[] = [];
  for (const audioFile of audioFiles.sort((a, b) => a.sequence - b.sequence)) {
    const fullPath = path.join(topicFolderPath, audioFile.file_path);
    try {
      await fs.access(fullPath);
      existingFiles.push(audioFile);
    } catch (error) {
      console.warn(`   ⚠️  파일 없음: ${audioFile.file_path}`);
    }
  }

  if (existingFiles.length === 0) {
    throw new Error('병합할 오디오 파일이 없습니다.');
  }

  console.log(`   📊 병합 대상: ${existingFiles.length}개 파일`);

  // FFmpeg 파일 리스트 생성
  const fileListPath = path.join(path.dirname(outputPath), 'filelist.txt');
  const fileListContent = existingFiles
    .map(audioFile => `file '${path.resolve(topicFolderPath, audioFile.file_path)}'`)
    .join('\\n');
  
  await fs.writeFile(fileListPath, fileListContent, 'utf-8');

  // FFmpeg 명령 실행
  const ffmpegCommand = [
    'ffmpeg',
    '-f', 'concat',
    '-safe', '0',
    '-i', fileListPath,
    '-c', 'copy',
    '-y', // 덮어쓰기
    outputPath
  ];

  console.log(`   🔧 FFmpeg 실행: ${ffmpegCommand.join(' ')}`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegCommand[0], ffmpegCommand.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      // 임시 파일 리스트 삭제
      try {
        await fs.unlink(fileListPath);
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

async function addSilenceBetweenSpeakers(audioFiles: AudioFile[], outputPath: string, topicFolderPath: string): Promise<void> {
  console.log('🔧 화자 간 무음 구간 (0.2초) 추가하여 오디오 병합 중...');
  const mergeStartTime = performance.now();

  // 파일 존재 확인 및 정렬
  const existingFiles: AudioFile[] = [];
  for (const audioFile of audioFiles.sort((a, b) => a.sequence - b.sequence)) {
    const fullPath = path.join(topicFolderPath, audioFile.file_path);
    try {
      await fs.access(fullPath);
      existingFiles.push(audioFile);
    } catch (error) {
      console.warn(`   ⚠️  파일 없음: ${audioFile.file_path}`);
    }
  }

  if (existingFiles.length === 0) {
    throw new Error('병합할 오디오 파일이 없습니다.');
  }

  console.log(`   📊 병합 대상: ${existingFiles.length}개 파일`);

  // 무음 파일 생성 (0.2초)
  const silencePath = path.join(path.dirname(outputPath), 'silence.mp3');
  await execAsync(`ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=24000 -t 0.2 -c:a mp3 -y "${silencePath}"`);

  // 복잡한 필터 그래프로 오디오 연결
  const inputs: string[] = [];
  const filterComplex: string[] = [];
  
  for (let i = 0; i < existingFiles.length; i++) {
    const audioPath = path.resolve(topicFolderPath, existingFiles[i].file_path);
    inputs.push('-i', audioPath);
    
    if (i > 0) {
      inputs.push('-i', silencePath);
    }
  }

  // 필터 그래프 생성
  let filterGraph = '';
  let currentLabel = '';
  
  for (let i = 0; i < existingFiles.length; i++) {
    if (i === 0) {
      filterGraph += `[0:a]`;
      currentLabel = '[a0]';
    } else {
      const silenceIndex = i * 2 - 1;
      const audioIndex = i * 2;
      filterGraph += `${currentLabel}[${silenceIndex}:a][${audioIndex}:a]concat=n=3:v=0:a=1`;
      currentLabel = `[a${i}]`;
    }
    
    if (i < existingFiles.length - 1) {
      filterGraph += currentLabel;
    } else {
      filterGraph += '[out]';
    }
  }

  const ffmpegCommand = [
    'ffmpeg',
    ...inputs,
    '-filter_complex', filterGraph,
    '-map', '[out]',
    '-c:a', 'mp3',
    '-b:a', '128k',
    '-y',
    outputPath
  ];

  console.log(`   🔧 FFmpeg 실행 (무음 구간 포함)`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegCommand[0], ffmpegCommand.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      // 임시 무음 파일 삭제
      try {
        await fs.unlink(silencePath);
      } catch (error) {
        console.warn(`   ⚠️  임시 파일 삭제 실패: ${error}`);
      }

      if (code === 0) {
        const mergeTime = performance.now() - mergeStartTime;
        console.log(`   ✅ 오디오 병합 완료 (0.2초 무음 구간 포함): ${mergeTime.toFixed(1)}ms`);
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
    const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.warn(`   ⚠️  오디오 길이 측정 실패: ${error}`);
    return 0;
  }
}

async function mergeNewscastAudio(topicFolderPath: string): Promise<void> {
  console.log('🎵 뉴스캐스트 오디오 병합 시작...');
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
  console.log(`   📊 총 오디오 파일: ${audioList.audio_files.length}개`);

  if (audioList.audio_files.length === 0) {
    throw new Error('병합할 오디오 파일이 없습니다.');
  }

  // 출력 파일 경로
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const outputFileName = `newscast-${timestamp}-all.mp3`;
  const outputPath = path.join(topicFolderPath, outputFileName);

  // 오디오 병합 (무음 구간 포함)
  await addSilenceBetweenSpeakers(audioList.audio_files, outputPath, topicFolderPath);

  // 최종 파일 정보
  const finalDuration = await getAudioDuration(outputPath);
  const fileStats = await fs.stat(outputPath);

  // 병합 결과 저장
  const mergeResult = {
    title: audioList.title,
    program_name: audioList.program_name,
    merge_timestamp: new Date().toISOString(),
    input_files: audioList.audio_files.length,
    output_file: outputFileName,
    final_duration_seconds: finalDuration,
    final_duration_formatted: `${Math.floor(finalDuration / 60)}분 ${Math.floor(finalDuration % 60)}초`,
    file_size_bytes: fileStats.size,
    file_size_formatted: `${(fileStats.size / 1024 / 1024).toFixed(2)} MB`,
    original_metadata: audioList.metadata
  };

  const mergeResultPath = path.join(topicFolderPath, 'newscast-audio-info.json');
  await fs.writeFile(mergeResultPath, JSON.stringify(mergeResult, null, 2), 'utf-8');

  const totalTime = performance.now() - totalStartTime;

  console.log(`\\n✅ 뉴스캐스트 오디오 병합 완료!`);
  console.log(`   🎬 프로그램: ${audioList.program_name}`);
  console.log(`   📊 입력 파일: ${audioList.audio_files.length}개`);
  console.log(`   🎵 최종 파일: ${outputFileName}`);
  console.log(`   ⏱️  재생 시간: ${mergeResult.final_duration_formatted}`);
  console.log(`   💾 파일 크기: ${mergeResult.file_size_formatted}`);
  console.log(`   🕐 전체 소요 시간: ${totalTime.toFixed(1)}ms`);
  console.log(`   📁 저장 위치: ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('사용법: node --experimental-transform-types merge-newscast-audio.ts <bigkinds-folder> <topic-number>');
    console.error('예시: node --experimental-transform-types merge-newscast-audio.ts bigkinds/2025-06-20T23:19:18.489131 1');
    process.exit(1);
  }

  const [bigkindsFolder, topicNumber] = args;
  const topicFolderPath = path.join(bigkindsFolder, `topic-${topicNumber.padStart(2, '0')}`);
  const audioListPath = path.join(topicFolderPath, 'audio', 'audio-files.json');

  try {
    // 오디오 파일 목록 존재 확인
    await fs.access(audioListPath);
    
    await mergeNewscastAudio(topicFolderPath);

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ 오디오 파일 목록을 찾을 수 없습니다: ${audioListPath}`);
      console.error('먼저 generate-newscast-audio.ts를 실행하여 개별 오디오 파일들을 생성해주세요.');
    } else {
      console.error('❌ 오류 발생:', error);
    }
    process.exit(1);
  }
}

// ES 모듈에서 직접 실행 확인
const isMainModule = process.argv[1] && process.argv[1].endsWith('merge-newscast-audio.ts');
if (isMainModule) {
  main();
}