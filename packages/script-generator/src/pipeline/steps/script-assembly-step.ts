/**
 * Script Assembly Step
 * 파싱된 대화 라인들을 최종 NewscastScript 객체로 조합하고 저장하는 단계
 */

import fs from 'fs/promises';
import path from 'path';
import {
  ScriptPipelineStep,
  NewscastScript,
  DialogueLine,
  ConsolidatedNews,
  TTSVoices,
  ScriptGenerationError
} from '../../interfaces/index.ts';
import { Logger, DateUtils } from '@ai-newscast/core';

interface ScriptAssemblyInput {
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

export class ScriptAssemblyStep implements ScriptPipelineStep<ScriptAssemblyInput, NewscastScript> {
  readonly name = 'script_assembly';

  async execute(input: ScriptAssemblyInput): Promise<NewscastScript> {
    Logger.info('🎬 뉴스캐스트 스크립트 조합 및 저장 시작');
    
    const startTime = performance.now();

    try {
      // NewscastScript 객체 생성
      const newscastScript = this.assembleNewscastScript(
        input.news,
        input.voices,
        input.parsedScript,
        input.dialogueLines
      );

      // 스크립트 유효성 검증
      this.validateScript(newscastScript);

      // 파일 저장
      await this.saveNewscastScript(newscastScript, input.outputPath);

      const savingTime = performance.now() - startTime;
      
      if (input.metrics) {
        input.metrics.savingTime = savingTime;
      }

      Logger.info(`   ✅ 스크립트 조합 및 저장 완료 (${savingTime.toFixed(1)}ms)`);
      this.logScriptSummary(newscastScript);

      return newscastScript;

    } catch (error) {
      Logger.error('❌ 스크립트 조합 및 저장 실패:', error);
      throw new ScriptGenerationError(
        `스크립트 조합 실패: ${error instanceof Error ? error.message : String(error)}`,
        'script_assembly',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * NewscastScript 객체 조합
   */
  private assembleNewscastScript(
    news: ConsolidatedNews,
    voices: TTSVoices,
    parsedScript: { opening: string; main_content: string; closing: string },
    dialogueLines: DialogueLine[]
  ): NewscastScript {
    const host1 = voices.default_newscast_hosts.host1;
    const host2 = voices.default_newscast_hosts.host2;
    const mainSources = news.sources.slice(0, 5);

    return {
      title: news.topic,
      program_name: voices.metadata.default_program,
      hosts: {
        host1: {
          name: host1.name,
          voice_model: host1.voice_model,
          gender: host1.gender
        },
        host2: {
          name: host2.name,
          voice_model: host2.voice_model,
          gender: host2.gender
        }
      },
      opening: parsedScript.opening,
      main_content: parsedScript.main_content,
      closing: parsedScript.closing,
      dialogue_lines: dialogueLines,
      metadata: {
        total_articles: news.total_articles,
        sources_count: news.sources.length,
        main_sources: mainSources,
        generation_timestamp: new Date().toISOString(),
        estimated_duration: this.estimateDuration(parsedScript.main_content),
        total_dialogue_lines: dialogueLines.length
      }
    };
  }

  /**
   * 예상 진행 시간 계산
   */
  private estimateDuration(text: string): string {
    // 한국어 기준 분당 약 300-400자 읽기 속도
    const charactersPerMinute = 350;
    const minutes = Math.ceil(text.length / charactersPerMinute);
    return `약 ${minutes}분`;
  }

  /**
   * 스크립트 유효성 검증
   */
  private validateScript(script: NewscastScript): void {
    if (!script.title || script.title.trim().length === 0) {
      throw new Error('스크립트 제목이 없습니다');
    }

    if (!script.main_content || script.main_content.trim().length === 0) {
      throw new Error('스크립트 본문이 없습니다');
    }

    if (!script.dialogue_lines || script.dialogue_lines.length === 0) {
      throw new Error('대화 라인이 없습니다');
    }

    if (!script.hosts.host1.name || !script.hosts.host2.name) {
      throw new Error('진행자 정보가 불완전합니다');
    }

    // 대화 라인 중 실제 대사가 있는지 확인
    const dialogueCount = script.dialogue_lines.filter(line => line.type === 'dialogue').length;
    if (dialogueCount === 0) {
      throw new Error('실제 대사 라인이 없습니다');
    }

    Logger.debug(`스크립트 유효성 검증 완료: ${dialogueCount}개 대사 라인`);
  }

  /**
   * 뉴스캐스트 스크립트 파일 저장
   */
  private async saveNewscastScript(script: NewscastScript, outputPath: string): Promise<void> {
    // 출력 디렉토리 생성
    await fs.mkdir(outputPath, { recursive: true });

    // JSON 형태로 저장
    const jsonPath = path.join(outputPath, 'newscast-script.json');
    await fs.writeFile(jsonPath, JSON.stringify(script, null, 2), 'utf-8');

    // 읽기 쉬운 텍스트 형태로 저장
    const textContent = this.formatScriptAsText(script);
    const txtPath = path.join(outputPath, 'newscast-script.txt');
    await fs.writeFile(txtPath, textContent, 'utf-8');

    Logger.info(`   📁 저장 위치:`);
    Logger.info(`     - ${jsonPath}`);
    Logger.info(`     - ${txtPath}`);
  }

  /**
   * 읽기 쉬운 텍스트 형태로 스크립트 포맷팅
   */
  private formatScriptAsText(script: NewscastScript): string {
    const header = `# ${script.title}

## ${script.program_name} 뉴스캐스트 스크립트
진행자: ${script.hosts.host1.name} (${script.hosts.host1.voice_model}), ${script.hosts.host2.name} (${script.hosts.host2.voice_model})
생성 시간: ${script.metadata.generation_timestamp}
예상 진행 시간: ${script.metadata.estimated_duration}
참고 자료: ${script.metadata.total_articles}개 기사 (${script.metadata.sources_count}개 언론사)
주요 언론사: ${script.metadata.main_sources.join(', ')}
총 대사 라인: ${script.metadata.total_dialogue_lines}개

---

${script.main_content}

---

## 대사별 TTS 정보 (Google TTS API용)

${script.dialogue_lines.map(line => 
  `${line.sequence.toString().padStart(3, '0')}. [${line.speaker}] ${line.voice_model}
     "${line.text}"`
).join('\n\n')}`;

    return header;
  }

  /**
   * 스크립트 요약 정보 로깅
   */
  private logScriptSummary(script: NewscastScript): void {
    const dialogueCount = script.dialogue_lines.filter(line => line.type === 'dialogue').length;
    const musicCount = script.dialogue_lines.filter(line => line.type !== 'dialogue').length;

    Logger.info(`   📊 스크립트 요약:`);
    Logger.info(`      제목: ${script.title}`);
    Logger.info(`      프로그램: ${script.program_name}`);
    Logger.info(`      진행자: ${script.hosts.host1.name}, ${script.hosts.host2.name}`);
    Logger.info(`      예상 시간: ${script.metadata.estimated_duration}`);
    Logger.info(`      대사 라인: ${dialogueCount}개`);
    Logger.info(`      음악/효과: ${musicCount}개`);
    Logger.info(`      참고 기사: ${script.metadata.total_articles}개 (${script.metadata.sources_count}개 언론사)`);
  }
}