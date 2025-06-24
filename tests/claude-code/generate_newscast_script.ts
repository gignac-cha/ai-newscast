import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// Gemini API 키 설정
const apiKey = 'AIzaSyDFMA4j-VGE8lIxozE5_RYypnVGynhxdDA';
const genai = new GoogleGenAI({ apiKey });

// 뉴스 데이터 타입 정의
interface NewsDetail {
  TITLE: string;
  CONTENT: string;
  BYLINE: string;
  PROVIDER: string;
  DATE: string;
  CATEGORY: string;
  [key: string]: any;
}

interface NewsItem {
  extraction_timestamp: string;
  news_detail: NewsDetail;
  content: string;
  metadata: {
    title: string;
    provider: string;
    byline: string;
    category: string;
    [key: string]: any;
  };
}

interface NewsListData {
  topic: string;
  extraction_timestamp: string;
  total_news: number;
  news_list: Array<{
    news_id: string;
    title: string;
    provider_name: string;
    byline: string;
    [key: string]: any;
  }>;
}

interface NewscastScript {
  role: 'host1' | 'host2';
  text: string;
}

/**
 * 특정 주제 폴더에서 모든 뉴스 데이터를 로드합니다
 */
function loadNewsData(topicFolderPath: string): { newsListData: NewsListData; newsItems: NewsItem[] } {
  console.log(`📂 뉴스 데이터 로딩 중: ${topicFolderPath}`);
  
  // 뉴스 목록 데이터 로드
  const newsListPath = path.join(topicFolderPath, 'news-list.json');
  if (!fs.existsSync(newsListPath)) {
    throw new Error(`뉴스 목록 파일을 찾을 수 없습니다: ${newsListPath}`);
  }
  
  const newsListData: NewsListData = JSON.parse(fs.readFileSync(newsListPath, 'utf-8'));
  
  // 개별 뉴스 상세 데이터 로드
  const newsItems: NewsItem[] = [];
  const files = fs.readdirSync(topicFolderPath);
  
  for (const file of files) {
    if (file.endsWith('.json') && file !== 'news-list.json') {
      const filePath = path.join(topicFolderPath, file);
      try {
        const newsItem: NewsItem = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (newsItem.content && newsItem.content.trim()) {
          newsItems.push(newsItem);
        }
      } catch (error) {
        console.warn(`⚠️  파일 읽기 오류 (${file}): ${error}`);
      }
    }
  }
  
  console.log(`✅ 로딩 완료: ${newsItems.length}개 뉴스 상세 데이터`);
  return { newsListData, newsItems };
}

/**
 * 뉴스 데이터들을 요약하여 하나의 종합 정보로 만듭니다
 */
function summarizeNewsData(newsListData: NewsListData, newsItems: NewsItem[]): string {
  const topic = newsListData.topic;
  const totalNews = newsItems.length;
  
  // 주요 언론사 통계
  const providers = newsItems.map(item => item.metadata.provider || item.news_detail.PROVIDER).filter(Boolean);
  const providerCounts = providers.reduce((acc, provider) => {
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 뉴스 내용들을 모아서 정리
  const newsContents = newsItems
    .map(item => {
      const title = item.metadata.title || item.news_detail.TITLE;
      const content = item.content;
      const provider = item.metadata.provider || item.news_detail.PROVIDER;
      
      return `[${provider}] ${title}\n${content}\n`;
    })
    .join('\n---\n\n');
  
  const summary = `
주제: ${topic}
총 뉴스 개수: ${totalNews}개
주요 언론사: ${Object.entries(providerCounts).slice(0, 5).map(([provider, count]) => `${provider}(${count}개)`).join(', ')}

=== 통합 뉴스 내용 ===
${newsContents}
  `.trim();
  
  return summary;
}

/**
 * Gemini API를 사용하여 팟캐스트 스크립트 생성
 */
async function generateNewscastScript(newsData: string): Promise<NewscastScript[]> {
  console.log(`🤖 AI 팟캐스트 스크립트 생성 중...`);
  
  const prompt = `
당신은 한국어 팟캐스트 스크립트 작성 전문가입니다.

다음은 한 주제에 대한 여러 뉴스 기사들을 통합한 데이터입니다:

${newsData}

위 뉴스 데이터를 바탕으로 다음 조건에 맞는 팟캐스트 스크립트를 작성해주세요:

1. 두 명의 한국인 호스트가 진행하는 대화형 뉴스 팟캐스트
2. 호스트 이름: 김민수(host1), 박서연(host2)
3. 자연스러운 대화체로 뉴스 내용을 전달
4. 중요한 정보는 놓치지 않고 포함
5. 청취자가 이해하기 쉽게 설명
6. 적절한 분량 (3-5분 분량)

출력 형식은 정확히 다음 JSON Array 형태로만 응답해주세요:
[
  { "role": "host1", "text": "김민수 대사" },
  { "role": "host2", "text": "박서연 대사" },
  { "role": "host1", "text": "김민수 대사" },
  { "role": "host2", "text": "박서연 대사" },
  ...
]

JSON 배열만 출력하고 다른 설명이나 텍스트는 포함하지 마세요.
  `;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.5-pro-preview-03-25',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    const responseText = response.text;
    console.log(`✅ AI 응답 받음 (${responseText.length} 문자)`);
    
    // JSON 파싱 시도
    try {
      const script: NewscastScript[] = JSON.parse(responseText);
      return script;
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.log('원본 응답:', responseText);
      throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다');
    }
  } catch (error) {
    console.error('AI API 호출 오류:', error);
    throw error;
  }
}

/**
 * 팟캐스트 스크립트를 파일로 저장
 */
function saveNewscastScript(script: NewscastScript[], outputPath: string): void {
  const jsonOutput = JSON.stringify(script, null, 2);
  fs.writeFileSync(outputPath, jsonOutput, 'utf-8');
  console.log(`💾 스크립트 저장 완료: ${outputPath}`);
  
  // 텍스트 버전도 저장 (읽기 쉽게)
  const textOutputPath = outputPath.replace('.json', '.txt');
  const textOutput = script.map((line, index) => {
    const hostName = line.role === 'host1' ? '김민수' : '박서연';
    return `[${index + 1}] ${hostName}: ${line.text}`;
  }).join('\n\n');
  
  fs.writeFileSync(textOutputPath, textOutput, 'utf-8');
  console.log(`📝 텍스트 버전 저장: ${textOutputPath}`);
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    // 명령행 인자 처리
    const args = process.argv.slice(2);
    if (args.length < 1) {
      console.log('사용법: npx ts-node generate_newscast_script.ts <topic-folder-path> [output-name]');
      console.log('예시: npx ts-node generate_newscast_script.ts bigkinds-2025-06-20T22:52:40.099530/topic-01');
      console.log('예시: npx ts-node generate_newscast_script.ts bigkinds-2025-06-20T22:52:40.099530/topic-01 custom-script');
      process.exit(1);
    }
    
    const topicFolderPath = args[0];
    const outputName = args[1] || 'newscast-script';
    
    if (!fs.existsSync(topicFolderPath)) {
      throw new Error(`주제 폴더를 찾을 수 없습니다: ${topicFolderPath}`);
    }
    
    console.log('🚀 뉴스캐스트 스크립트 생성 시작');
    console.log('=' .repeat(50));
    
    // 1단계: 뉴스 데이터 로드
    const { newsListData, newsItems } = loadNewsData(topicFolderPath);
    console.log(`📋 주제: ${newsListData.topic}`);
    console.log(`📊 뉴스 개수: ${newsItems.length}개`);
    
    // 2단계: 뉴스 데이터 요약
    console.log('\n📝 뉴스 데이터 통합 중...');
    const summarizedNews = summarizeNewsData(newsListData, newsItems);
    
    // 3단계: AI 스크립트 생성
    console.log('\n🤖 AI 팟캐스트 스크립트 생성 중...');
    const script = await generateNewscastScript(summarizedNews);
    
    // 4단계: 결과 저장
    console.log('\n💾 결과 저장 중...');
    const outputPath = path.join(path.dirname(topicFolderPath), `${outputName}.json`);
    saveNewscastScript(script, outputPath);
    
    console.log('\n✅ 뉴스캐스트 스크립트 생성 완료!');
    console.log(`📊 총 대화: ${script.length}개`);
    console.log(`📁 저장 위치: ${outputPath}`);
    console.log(`📝 텍스트 버전: ${outputPath.replace('.json', '.txt')}`);
    
    // 미리보기
    console.log('\n🎙️ 스크립트 미리보기:');
    console.log('-'.repeat(40));
    script.slice(0, 4).forEach((line, index) => {
      const hostName = line.role === 'host1' ? '김민수' : '박서연';
      console.log(`[${index + 1}] ${hostName}: ${line.text}`);
    });
    if (script.length > 4) {
      console.log(`... (총 ${script.length}개 대화)`);
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

export { loadNewsData, summarizeNewsData, generateNewscastScript, saveNewscastScript };