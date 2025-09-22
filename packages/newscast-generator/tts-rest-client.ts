/**
 * Google Cloud Text-to-Speech REST API Client
 *
 * Cloudflare Workers 호환 TTS 클라이언트
 * Node.js SDK 대신 REST API를 직접 호출
 */

// Google Cloud TTS REST API 인터페이스
export interface TTSRequest {
  input: {
    text: string;
  };
  voice: {
    languageCode: string;
    name: string;
    ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  };
  audioConfig: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
    speakingRate?: number;
    pitch?: number;
    volumeGainDb?: number;
  };
}

export interface TTSResponse {
  audioContent: string; // Base64 encoded audio
}

export interface TTSVoice {
  languageCodes: string[];
  name: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
}

export interface TTSVoicesResponse {
  voices: TTSVoice[];
}

export class GoogleTTSRestClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://texttospeech.googleapis.com/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Cloud API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * 텍스트를 음성으로 합성
   */
  async synthesizeSpeech(request: TTSRequest): Promise<Uint8Array> {
    const url = `${this.baseUrl}/text:synthesize?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API 호출 실패 (${response.status}): ${errorText}`);
    }

    const ttsResponse: TTSResponse = await response.json();

    if (!ttsResponse.audioContent) {
      throw new Error('TTS 응답에서 오디오 콘텐츠를 찾을 수 없습니다.');
    }

    // Base64 디코딩하여 Uint8Array로 변환 (Cloudflare Workers 호환)
    return this.decodeBase64Audio(ttsResponse.audioContent);
  }

  /**
   * 사용 가능한 음성 목록 조회
   */
  async listVoices(languageCode?: string): Promise<TTSVoice[]> {
    const params = new URLSearchParams({ key: this.apiKey });
    if (languageCode) {
      params.set('languageCode', languageCode);
    }

    const url = `${this.baseUrl}/voices?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`음성 목록 조회 실패 (${response.status}): ${errorText}`);
    }

    const data: TTSVoicesResponse = await response.json();
    return data.voices || [];
  }

  /**
   * 한국어 음성 목록 조회
   */
  async listKoreanVoices(): Promise<TTSVoice[]> {
    const voices = await this.listVoices('ko-KR');
    return voices.filter(voice => voice.languageCodes.includes('ko-KR'));
  }

  /**
   * Base64 오디오 데이터를 Uint8Array로 변환
   * Node.js와 Cloudflare Workers 모두 호환
   */
  private decodeBase64Audio(base64Data: string): Uint8Array {
    // Node.js 환경에서는 Buffer 사용
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      return new Uint8Array(Buffer.from(base64Data, 'base64'));
    }

    // Cloudflare Workers 환경에서는 atob 사용
    if (typeof atob !== 'undefined') {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    throw new Error('Base64 디코딩을 지원하지 않는 환경입니다.');
  }
}

/**
 * 편의 함수: 간단한 TTS 호출
 */
export async function synthesizeText(
  text: string,
  voiceModel: string,
  apiKey: string,
  options: {
    speakingRate?: number;
    pitch?: number;
    volumeGainDb?: number;
  } = {}
): Promise<Uint8Array> {
  const client = new GoogleTTSRestClient(apiKey);

  const request: TTSRequest = {
    input: { text },
    voice: {
      languageCode: 'ko-KR',
      name: voiceModel,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: options.speakingRate ?? 1.0,
      pitch: options.pitch ?? 0.0,
      volumeGainDb: options.volumeGainDb ?? 0.0,
    },
  };

  return await client.synthesizeSpeech(request);
}

/**
 * 편의 함수: 한국어 음성 목록 조회
 */
export async function getKoreanVoices(apiKey: string): Promise<TTSVoice[]> {
  const client = new GoogleTTSRestClient(apiKey);
  return await client.listKoreanVoices();
}