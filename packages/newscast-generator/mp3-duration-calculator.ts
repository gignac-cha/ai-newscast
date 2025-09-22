/**
 * MP3 Duration Calculator for Cloudflare Workers
 *
 * Calculates MP3 audio duration by parsing headers from Uint8Array
 * Compatible with both Node.js and Cloudflare Workers environments
 */

/**
 * MP3 MPEG 버전별 비트레이트 테이블
 */
const BITRATE_TABLES = {
  // MPEG Version 1, Layer III
  mpeg1_layer3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],

  // MPEG Version 2 & 2.5, Layer III (Google TTS 사용)
  mpeg2_layer3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};

/**
 * MP3 MPEG 버전별 샘플레이트 테이블
 */
const SAMPLE_RATE_TABLES = {
  // MPEG Version 1
  mpeg1: [44100, 48000, 32000, 0],

  // MPEG Version 2
  mpeg2: [22050, 24000, 16000, 0],

  // MPEG Version 2.5
  mpeg25: [11025, 12000, 8000, 0],
};

/**
 * MP3 헤더 정보 인터페이스
 */
export interface MP3HeaderInfo {
  version: 'mpeg1' | 'mpeg2' | 'mpeg25';
  layer: number;
  bitrate: number; // kbps
  sampleRate: number; // Hz
  padding: boolean;
  frameLength: number; // bytes
  isValid: boolean;
}

/**
 * MP3 헤더를 파싱하여 오디오 정보 추출
 *
 * @param buffer - MP3 데이터의 첫 4바이트 이상
 * @returns MP3 헤더 정보
 */
export function parseMP3Header(buffer: Uint8Array): MP3HeaderInfo {
  if (buffer.length < 4) {
    return {
      version: 'mpeg2',
      layer: 3,
      bitrate: 32, // Google TTS 기본값
      sampleRate: 24000,
      padding: false,
      frameLength: 0,
      isValid: false,
    };
  }

  // 32비트 헤더 구성
  const header = (buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3];

  // Frame sync 확인 (첫 11비트가 모두 1인지)
  const frameSync = (header >> 21) & 0x7FF;
  if (frameSync !== 0x7FF) {
    return { version: 'mpeg2', layer: 3, bitrate: 32, sampleRate: 24000, padding: false, frameLength: 0, isValid: false };
  }

  // MPEG 버전 추출 (비트 19-20)
  const versionBits = (header >> 19) & 0x3;
  let version: 'mpeg1' | 'mpeg2' | 'mpeg25';
  switch (versionBits) {
    case 0b11: version = 'mpeg1'; break;
    case 0b10: version = 'mpeg2'; break;
    case 0b00: version = 'mpeg25'; break;
    default: version = 'mpeg2'; break;
  }

  // Layer 추출 (비트 17-18)
  const layerBits = (header >> 17) & 0x3;
  const layer = layerBits === 0b01 ? 3 : (layerBits === 0b10 ? 2 : 1);

  // 비트레이트 인덱스 추출 (비트 12-15)
  const bitrateIndex = (header >> 12) & 0xF;
  const bitrateTable = version === 'mpeg1' ? BITRATE_TABLES.mpeg1_layer3 : BITRATE_TABLES.mpeg2_layer3;
  const bitrate = bitrateTable[bitrateIndex] || 32;

  // 샘플레이트 인덱스 추출 (비트 10-11)
  const sampleRateIndex = (header >> 10) & 0x3;
  const sampleRateTable = version === 'mpeg1' ? SAMPLE_RATE_TABLES.mpeg1 :
                         version === 'mpeg2' ? SAMPLE_RATE_TABLES.mpeg2 :
                         SAMPLE_RATE_TABLES.mpeg25;
  const sampleRate = sampleRateTable[sampleRateIndex] || 24000;

  // Padding 비트 (비트 9)
  const padding = ((header >> 9) & 0x1) === 1;

  // 프레임 길이 계산
  const samplesPerFrame = version === 'mpeg1' ? 1152 : 576;
  const frameLength = Math.floor((samplesPerFrame * bitrate * 1000 / 8) / sampleRate) + (padding ? 1 : 0);

  return {
    version,
    layer,
    bitrate,
    sampleRate,
    padding,
    frameLength,
    isValid: true,
  };
}

/**
 * MP3 파일의 duration을 계산
 *
 * @param uint8Array - MP3 파일의 Uint8Array 데이터
 * @returns duration (초)
 */
export function calculateMP3Duration(uint8Array: Uint8Array): number {
  const headerInfo = parseMP3Header(uint8Array);

  if (!headerInfo.isValid || headerInfo.bitrate === 0) {
    // 헤더 파싱 실패 시 Google TTS 기본값 사용
    const GOOGLE_TTS_BITRATE = 32; // kbps
    const durationSeconds = (uint8Array.length * 8) / (GOOGLE_TTS_BITRATE * 1000);
    return Math.round(durationSeconds * 100) / 100;
  }

  // 정확한 비트레이트로 계산
  const fileSizeBytes = uint8Array.length;
  const durationSeconds = (fileSizeBytes * 8) / (headerInfo.bitrate * 1000);

  return Math.round(durationSeconds * 100) / 100; // 소수점 2자리 반올림
}

/**
 * 텍스트 길이 기반 duration 추정 (fallback용)
 *
 * @param text - TTS에 사용된 텍스트
 * @param speakingRate - 말하기 속도 (기본값: 1.0)
 * @returns 추정 duration (초)
 */
export function estimateDurationFromText(text: string, speakingRate: number = 1.0): number {
  // 한국어 기준 평균 말하기 속도: 약 3.5글자/초
  const koreanChars = text.match(/[가-힣]/g)?.length || 0;
  const englishWords = text.match(/[a-zA-Z]+/g)?.length || 0;
  const numbers = text.match(/\d+/g)?.length || 0;
  const punctuation = text.match(/[.,!?;:]/g)?.length || 0;

  let baseDuration = 0;
  baseDuration += koreanChars / 3.5; // 한국어
  baseDuration += englishWords / 2.5; // 영어 (2.5단어/초)
  baseDuration += numbers / 1.0; // 숫자 (천천히)
  baseDuration += punctuation * 0.3; // 문장부호 pause

  const adjustedDuration = baseDuration / speakingRate;
  return Math.max(1.0, Math.min(30.0, adjustedDuration));
}

/**
 * MP3 duration과 텍스트 기반 추정을 조합한 정확한 계산
 *
 * @param uint8Array - MP3 파일 데이터
 * @param text - 원본 텍스트
 * @param speakingRate - 말하기 속도
 * @returns 최종 duration (초)
 */
export function calculateAccurateDuration(
  uint8Array: Uint8Array,
  text: string,
  speakingRate: number = 1.0
): number {
  const mp3Duration = calculateMP3Duration(uint8Array);
  const textEstimate = estimateDurationFromText(text, speakingRate);

  // MP3 파싱이 성공한 경우 MP3 기반 duration 사용
  const headerInfo = parseMP3Header(uint8Array);
  if (headerInfo.isValid && headerInfo.bitrate > 0) {
    return mp3Duration;
  }

  // 헤더 파싱 실패 시 두 값의 가중 평균 (MP3: 70%, 텍스트: 30%)
  const weightedDuration = (mp3Duration * 0.7) + (textEstimate * 0.3);
  return Math.round(weightedDuration * 100) / 100;
}

/**
 * MP3 파일 정보를 문자열로 출력 (디버깅용)
 */
export function getMP3Info(uint8Array: Uint8Array): string {
  const headerInfo = parseMP3Header(uint8Array);
  const duration = calculateMP3Duration(uint8Array);
  const fileSizeKB = (uint8Array.length / 1024).toFixed(2);

  return [
    `MP3 파일 정보:`,
    `- 크기: ${fileSizeKB}KB`,
    `- Duration: ${duration}초`,
    `- MPEG: ${headerInfo.version.toUpperCase()}`,
    `- Layer: ${headerInfo.layer}`,
    `- 비트레이트: ${headerInfo.bitrate}kbps`,
    `- 샘플레이트: ${headerInfo.sampleRate}Hz`,
    `- 유효성: ${headerInfo.isValid ? '✅' : '❌'}`,
  ].join('\n');
}