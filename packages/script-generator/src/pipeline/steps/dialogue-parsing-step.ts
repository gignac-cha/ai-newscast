/**
 * Dialogue Parsing Step
 * AI가 생성한 스크립트를 파싱하여 대화 라인으로 분리하는 단계
 */

import {
  ScriptPipelineStep,
  ConsolidatedNews,
  DialogueLine,
  TTSVoices,
  DialogueParsingError
} from '../../interfaces/index.ts';
import { Logger } from '@ai-newscast/core';

interface DialogueParsingInput {
  news: ConsolidatedNews;
  voices: TTSVoices;
  outputPath: string;
  rawScript: string;
  metrics?: any;
}

interface DialogueParsingOutput {
  news: ConsolidatedNews;
  voices: TTSVoices;
  outputPath: string;
  dialogueLines: DialogueLine[];
  parsedScript: {
    opening: string;
    main_content: string;
    closing: string;
  };
  rawScript?: string;
  metrics?: any;
}

export class DialogueParsingStep implements ScriptPipelineStep<DialogueParsingInput, DialogueParsingOutput> {
  readonly name = 'dialogue_parsing';

  async execute(input: DialogueParsingInput): Promise<DialogueParsingOutput> {
    Logger.info('📝 대화 라인 파싱 시작');
    
    if (!input.rawScript) {
      throw new DialogueParsingError('파싱할 스크립트가 없습니다');
    }

    if (!input.voices) {
      throw new DialogueParsingError('음성 설정이 없습니다');
    }

    const startTime = performance.now();

    try {
      // 스크립트 섹션 파싱 (현재는 전체를 main_content로 처리)
      const parsedScript = this.parseScriptSections(input.rawScript);
      
      // 대화 라인 파싱
      const dialogueLines = this.parseDialogueLines(input.rawScript, input.voices);
      
      const parsingTime = performance.now() - startTime;
      
      if (input.metrics) {
        input.metrics.parsingTime = parsingTime;
        input.metrics.dialogueLines = dialogueLines.length;
      }

      Logger.info(`   ✅ 대화 라인 파싱 완료 (${parsingTime.toFixed(1)}ms)`);
      Logger.info(`   🎬 파싱된 대화 라인: ${dialogueLines.length}개`);
      
      this.logParsingStats(dialogueLines);

      return {
        news: input.news,
        voices: input.voices,
        outputPath: input.outputPath,
        dialogueLines,
        parsedScript,
        rawScript: input.rawScript,
        metrics: input.metrics
      };

    } catch (error) {
      Logger.error('❌ 대화 라인 파싱 실패:', error);
      throw new DialogueParsingError(
        `대화 라인 파싱 실패: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 스크립트를 섹션별로 파싱 (오프닝, 본문, 클로징)
   * 현재는 AI가 이미 완전한 대화 형식으로 생성하므로 전체를 main_content로 처리
   */
  private parseScriptSections(scriptText: string): { opening: string; main_content: string; closing: string } {
    return {
      opening: '',
      main_content: scriptText,
      closing: ''
    };
  }

  /**
   * 스크립트를 대화 라인으로 파싱
   */
  private parseDialogueLines(scriptText: string, voices: TTSVoices): DialogueLine[] {
    const lines: DialogueLine[] = [];
    const scriptLines = scriptText.split('\n');
    
    let sequence = 1;
    const host1 = voices.default_newscast_hosts.host1;
    const host2 = voices.default_newscast_hosts.host2;
    
    // 오프닝 음악 추가
    lines.push({
      speaker: 'opening_music',
      voice_model: '',
      text: '오프닝 시그널 음악',
      sequence: sequence++,
      type: 'opening_music'
    });
    
    for (const line of scriptLines) {
      const trimmed = line.trim();
      
      // **진행자이름:** 형태의 대사 라인 찾기
      const speakerMatch = this.extractSpeakerDialogue(trimmed);
      
      if (speakerMatch) {
        const { speakerName, dialogueText } = speakerMatch;
        
        if (dialogueText && dialogueText.length > 0) {
          // 화자 이름에 따라 음성 모델 결정
          const voiceModel = this.getVoiceModelForSpeaker(speakerName, host1, host2);
          
          lines.push({
            speaker: speakerName,
            voice_model: voiceModel,
            text: dialogueText,
            sequence: sequence++,
            type: 'dialogue'
          });
        }
      }
    }
    
    // 클로징 음악 추가
    lines.push({
      speaker: 'closing_music',
      voice_model: '',
      text: '클로징 시그널 음악',
      sequence: sequence++,
      type: 'closing_music'
    });
    
    return lines;
  }

  /**
   * 대화 라인에서 화자와 대사 추출
   * 다양한 형식을 지원: **이름:**, **이름** :, [이름], 이름: 등
   */
  private extractSpeakerDialogue(line: string): { speakerName: string; dialogueText: string } | null {
    // **진행자이름:** 형태
    let match = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (match) {
      return {
        speakerName: match[1].trim(),
        dialogueText: match[2].trim()
      };
    }

    // **진행자이름** : 형태 (공백 있음)
    match = line.match(/^\*\*(.+?)\*\*\s*:\s*(.+)$/);
    if (match) {
      return {
        speakerName: match[1].trim(),
        dialogueText: match[2].trim()
      };
    }

    // [진행자이름] 형태
    match = line.match(/^\[(.+?)\]\s*:\s*(.+)$/);
    if (match) {
      return {
        speakerName: match[1].trim(),
        dialogueText: match[2].trim()
      };
    }

    // 진행자이름: 형태 (마크다운 없음)
    match = line.match(/^([가-힣]+)\s*:\s*(.+)$/);
    if (match) {
      const speakerName = match[1].trim();
      // 한국인 이름으로 보이는 경우만 매칭 (2-4글자)
      if (speakerName.length >= 2 && speakerName.length <= 4) {
        return {
          speakerName,
          dialogueText: match[2].trim()
        };
      }
    }

    return null;
  }

  /**
   * 화자 이름에 따라 음성 모델 결정
   */
  private getVoiceModelForSpeaker(
    speakerName: string,
    host1: { name: string; voice_model: string },
    host2: { name: string; voice_model: string }
  ): string {
    if (speakerName === host1.name) {
      return host1.voice_model;
    } else if (speakerName === host2.name) {
      return host2.voice_model;
    } else {
      // 알 수 없는 화자인 경우 이름 유사성으로 판단
      const similarity1 = this.calculateNameSimilarity(speakerName, host1.name);
      const similarity2 = this.calculateNameSimilarity(speakerName, host2.name);
      
      if (similarity1 > similarity2) {
        Logger.warn(`알 수 없는 화자 '${speakerName}'를 ${host1.name}으로 매핑`);
        return host1.voice_model;
      } else {
        Logger.warn(`알 수 없는 화자 '${speakerName}'를 ${host2.name}으로 매핑`);
        return host2.voice_model;
      }
    }
  }

  /**
   * 이름 유사성 계산 (간단한 문자열 포함 관계)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;
    
    let matches = 0;
    for (const char of shorter) {
      if (longer.includes(char)) {
        matches++;
      }
    }
    
    return matches / longer.length;
  }

  /**
   * 파싱 통계 로깅
   */
  private logParsingStats(dialogueLines: DialogueLine[]): void {
    const dialogueCount = dialogueLines.filter(line => line.type === 'dialogue').length;
    const musicCount = dialogueLines.filter(line => line.type !== 'dialogue').length;
    
    const speakerStats: Record<string, number> = {};
    for (const line of dialogueLines) {
      if (line.type === 'dialogue') {
        speakerStats[line.speaker] = (speakerStats[line.speaker] || 0) + 1;
      }
    }

    Logger.info(`   📊 파싱 통계:`);
    Logger.info(`      대화 라인: ${dialogueCount}개`);
    Logger.info(`      음악/효과: ${musicCount}개`);
    
    for (const [speaker, count] of Object.entries(speakerStats)) {
      Logger.info(`      ${speaker}: ${count}개 대사`);
    }
  }
}