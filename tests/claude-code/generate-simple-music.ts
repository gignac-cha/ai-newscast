import fs from 'fs/promises';
import path from 'path';

// 간단한 WAV 파일 생성 함수
function generateWAV(frequency: number, duration: number, sampleRate: number = 44100): Buffer {
  const samples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + samples * 2); // WAV 헤더 + 16비트 샘플
  
  // WAV 헤더 작성
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  
  // 오디오 데이터 생성 (사인파)
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    const amplitude = Math.floor(sample * 0.3 * 32767); // 30% 볼륨
    buffer.writeInt16LE(amplitude, 44 + i * 2);
  }
  
  return buffer;
}

// 화음 생성 (여러 주파수 조합)
function generateChord(frequencies: number[], duration: number, sampleRate: number = 44100): Buffer {
  const samples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + samples * 2);
  
  // WAV 헤더 (위와 동일)
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  
  // 여러 주파수 조합
  for (let i = 0; i < samples; i++) {
    let sample = 0;
    for (const freq of frequencies) {
      sample += Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    sample /= frequencies.length; // 평균화
    
    // 페이드 아웃 효과
    const fadeOut = i > samples * 0.8 ? (samples - i) / (samples * 0.2) : 1;
    sample *= fadeOut;
    
    const amplitude = Math.floor(sample * 0.3 * 32767);
    buffer.writeInt16LE(amplitude, 44 + i * 2);
  }
  
  return buffer;
}

async function generateNewsMusic(outputDir: string) {
  await fs.mkdir(outputDir, { recursive: true });
  
  // 오프닝: 밝고 에너지 넘치는 화음 (C Major 화음)
  const openingChord = [261.63, 329.63, 392.00]; // C, E, G
  const openingMusic = generateChord(openingChord, 3.0); // 3초
  await fs.writeFile(path.join(outputDir, '001-opening_music.wav'), openingMusic);
  
  // 클로징: 안정적이고 마무리감 있는 화음 (F Major 화음)
  const closingChord = [174.61, 220.00, 261.63]; // F, A, C (낮은 옥타브)
  const closingMusic = generateChord(closingChord, 2.5); // 2.5초
  await fs.writeFile(path.join(outputDir, '025-closing_music.wav'), closingMusic);
  
  console.log('🎵 간단한 뉴스 시그널 음악 생성 완료!');
  console.log(`   📁 저장 위치: ${outputDir}`);
  console.log('   🎼 001-opening_music.wav (3초, C Major 화음)');
  console.log('   🎼 025-closing_music.wav (2.5초, F Major 화음)');
  console.log('');
  console.log('💡 WAV 파일을 MP3로 변환하려면:');
  console.log('   ffmpeg -i 001-opening_music.wav 001-opening_music.mp3');
  console.log('   ffmpeg -i 025-closing_music.wav 025-closing_music.mp3');
}

// 실행
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.log('사용법: node --experimental-transform-types generate-simple-music.ts <output-directory>');
  console.log('예시: node --experimental-transform-types generate-simple-music.ts bigkinds/2025-06-21T17:20:21.389037/topic-01/audio');
  process.exit(1);
}

generateNewsMusic(args[0]).catch(console.error);