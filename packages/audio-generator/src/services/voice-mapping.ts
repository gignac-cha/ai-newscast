import { VoiceConfig, ChirpHDModel } from '../types/index.js';

// Korean name mapping for TTS voices based on the legacy tts-voices.json
export class VoiceMappingService {
  private static readonly VOICE_CONFIGS: Record<ChirpHDModel, VoiceConfig> = {
    'ko-KR-Chirp3-HD-Aoede': {
      name: '이서연',
      gender: 'female',
      description: '부드럽고 따뜻한 목소리의 여성 아나운서',
      role: '메인 앵커',
      voice_type: 'premium_chirp',
    },
    'ko-KR-Chirp3-HD-Charon': {
      name: '김민준',
      gender: 'male',
      description: '신뢰감 있고 안정적인 목소리의 남성 아나운서',
      role: '메인 앵커',
      voice_type: 'premium_chirp',
    },
    'ko-KR-Chirp3-HD-Fenrir': {
      name: '박지훈',
      gender: 'male',
      description: '명확하고 힘있는 목소리의 남성 아나운서',
      role: '서브 앵커',
      voice_type: 'premium_chirp',
    },
    'ko-KR-Chirp3-HD-Kore': {
      name: '정유진',
      gender: 'female',
      description: '지적이고 차분한 목소리의 여성 아나운서',
      role: '서브 앵커',
      voice_type: 'premium_chirp',
    },
    'ko-KR-Chirp3-HD-Leda': {
      name: '한소영',
      gender: 'female',
      description: '밝고 친근한 목소리의 여성 아나운서',
      role: '리포터',
      voice_type: 'premium_chirp',
    },
    'ko-KR-Chirp3-HD-Orus': {
      name: '최성호',
      gender: 'male',
      description: '깊이 있고 권위적인 목소리의 남성 아나운서',
      role: '시니어 앵커',
      voice_type: 'premium_chirp',
    },
    'ko-KR-Chirp3-HD-Puck': {
      name: '윤태현',
      gender: 'male',
      description: '생동감 있고 활기찬 목소리의 남성 아나운서',
      role: '스포츠/엔터테인먼트 앵커',
      voice_type: 'premium_chirp',
    },
    'ko-KR-Chirp3-HD-Zephyr': {
      name: '강은비',
      gender: 'female',
      description: '선명하고 매력적인 목소리의 여성 아나운서',
      role: '날씨/문화 앵커',
      voice_type: 'premium_chirp',
    },
  };

  private static readonly DEFAULT_HOSTS = {
    host1: {
      voice_model: 'ko-KR-Chirp3-HD-Charon' as ChirpHDModel,
      name: '김민준',
      gender: 'male',
    },
    host2: {
      voice_model: 'ko-KR-Chirp3-HD-Aoede' as ChirpHDModel,
      name: '이서연',
      gender: 'female',
    },
  };

  /**
   * Get voice configuration by model name
   */
  public static getVoiceConfig(voiceModel: ChirpHDModel): VoiceConfig {
    return this.VOICE_CONFIGS[voiceModel];
  }

  /**
   * Get Korean display name for file naming
   */
  public static getDisplayName(speaker: string): string {
    // Convert speaker name to file-safe format
    if (speaker === '김민준') return 'host1-김민준';
    if (speaker === '이서연') return 'host2-이서연';
    return speaker.replace(/\s+/g, '_');
  }

  /**
   * Get all available voice models
   */
  public static getAllVoiceModels(): ChirpHDModel[] {
    return Object.keys(this.VOICE_CONFIGS) as ChirpHDModel[];
  }

  /**
   * Get voice models by gender
   */
  public static getVoiceModelsByGender(gender: 'male' | 'female'): ChirpHDModel[] {
    return Object.entries(this.VOICE_CONFIGS)
      .filter(([_, config]) => config.gender === gender)
      .map(([model, _]) => model as ChirpHDModel);
  }

  /**
   * Get default newscast hosts configuration
   */
  public static getDefaultHosts() {
    return this.DEFAULT_HOSTS;
  }

  /**
   * Validate if a voice model exists
   */
  public static isValidVoiceModel(voiceModel: string): voiceModel is ChirpHDModel {
    return voiceModel in this.VOICE_CONFIGS;
  }

  /**
   * Get voice selection strategies for different content types
   */
  public static getVoiceSelectionStrategy(contentType: 'newscast' | 'report' | 'analysis' | 'entertainment'): ChirpHDModel[] {
    switch (contentType) {
      case 'newscast':
        return ['ko-KR-Chirp3-HD-Charon', 'ko-KR-Chirp3-HD-Aoede'];
      case 'report':
        return ['ko-KR-Chirp3-HD-Leda', 'ko-KR-Chirp3-HD-Fenrir'];
      case 'analysis':
        return ['ko-KR-Chirp3-HD-Orus', 'ko-KR-Chirp3-HD-Kore'];
      case 'entertainment':
        return ['ko-KR-Chirp3-HD-Puck', 'ko-KR-Chirp3-HD-Zephyr'];
      default:
        return this.getAllVoiceModels();
    }
  }
}