import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import * as path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 환경변수 로드
config();

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

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

interface ConsolidatedNews {
  topic: string;
  total_articles: number;
  sources: string[];
  consolidated_content: string;
  original_timestamp: string;
  consolidation_timestamp: string;
}

/**
 * 특정 주제 폴더에서 모든 뉴스 데이터를 로드합니다
 */
async function loadNewsData(topicFolderPath: string): Promise<{ newsListData: NewsListData; newsItems: NewsItem[] }> {
  console.log(`📂 뉴스 데이터 로딩 중: ${topicFolderPath}`);
  
  // 뉴스 목록 데이터 로드
  const newsListPath = path.join(topicFolderPath, 'news-list.json');
  
  let newsListContent: string;
  try {
    newsListContent = await fs.readFile(newsListPath, 'utf-8');
  } catch (error) {
    throw new Error(`뉴스 목록 파일을 찾을 수 없습니다: ${newsListPath}`);
  }
  
  const newsListData: NewsListData = JSON.parse(newsListContent);
  
  // 개별 뉴스 상세 데이터 로드
  const newsItems: NewsItem[] = [];
  const newsFolder = path.join(topicFolderPath, 'news');
  
  try {
    const files = await fs.readdir(newsFolder);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(newsFolder, file);
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const newsItem: NewsItem = JSON.parse(fileContent);
          if (newsItem.content && newsItem.content.trim()) {
            newsItems.push(newsItem);
          }
        } catch (error) {
          console.warn(`⚠️  파일 읽기 오류 (${file}): ${error}`);
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  뉴스 폴더를 찾을 수 없습니다: ${newsFolder}`);
  }
  
  console.log(`✅ 로딩 완료: ${newsItems.length}개 뉴스 상세 데이터`);
  return { newsListData, newsItems };
}

/**
 * 뉴스 데이터들을 AI를 사용해 하나로 통합합니다
 */
async function consolidateNewsWithAI(newsListData: NewsListData, newsItems: NewsItem[]): Promise<string> {
  console.log(`🤖 AI를 사용한 뉴스 통합 시작...`);
  
  const topic = newsListData.topic;
  
  // 뉴스 내용들을 정리해서 AI에 전달할 형태로 구성
  const newsContents = newsItems.map((item, index) => {
    const title = item.metadata.title || item.news_detail.TITLE;
    const content = item.content;
    const provider = item.metadata.provider || item.news_detail.PROVIDER;
    const byline = item.metadata.byline || item.news_detail.BYLINE;
    
    return `=== 기사 ${index + 1} ===
언론사: ${provider}
기자: ${byline}
제목: ${title}
내용: ${content}
`;
  }).join('\n\n');

  const prompt = `
당신은 뉴스 정리 전문가입니다. 같은 주제에 대한 여러 뉴스 기사들을 하나의 통합된 내용으로 정리해주세요.

주제: ${topic}
총 기사 수: ${newsItems.length}개

=== 뉴스 기사들 ===
${newsContents}

=== 요청사항 ===
위 뉴스 기사들을 다음 조건에 맞게 하나의 통합된 내용으로 정리해주세요:

1. 모든 기사의 핵심 정보를 포함하되 중복되는 내용은 제거
2. 시간 순서대로 사건의 흐름을 정리
3. 객관적이고 정확한 정보만 포함
4. 읽기 쉽고 이해하기 쉬운 구조로 작성
5. 중요한 인물, 숫자, 날짜 등은 정확히 포함
6. 한국어로 자연스럽게 작성

통합된 뉴스 내용만 출력하고, 다른 설명이나 주석은 포함하지 마세요.
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

    const consolidatedContent = response.text?.trim() || '';
    console.log(`✅ AI 통합 완료 (${consolidatedContent.length} 문자)`);
    
    return consolidatedContent;
  } catch (error) {
    console.error('❌ AI API 호출 오류:', error);
    throw error;
  }
}

/**
 * 통합된 뉴스를 파일로 저장합니다
 */
async function saveConsolidatedNews(
  newsListData: NewsListData, 
  newsItems: NewsItem[], 
  consolidatedContent: string, 
  outputPath: string
): Promise<void> {
  const sources = [...new Set(newsItems.map(item => 
    item.metadata.provider || item.news_detail.PROVIDER
  ).filter(Boolean))];

  const consolidatedNews: ConsolidatedNews = {
    topic: newsListData.topic,
    total_articles: newsItems.length,
    sources: sources,
    consolidated_content: consolidatedContent,
    original_timestamp: newsListData.extraction_timestamp,
    consolidation_timestamp: new Date().toISOString()
  };

  // JSON 형태로 저장
  await fs.writeFile(outputPath, JSON.stringify(consolidatedNews, null, 2), 'utf-8');
  console.log(`💾 통합 뉴스 저장 완료: ${outputPath}`);
  
  // 텍스트 버전도 저장 (읽기 쉽게)
  const textOutputPath = outputPath.replace('.json', '.txt');
  const textOutput = `주제: ${consolidatedNews.topic}
총 기사 수: ${consolidatedNews.total_articles}개
참고 언론사: ${consolidatedNews.sources.join(', ')}
정리 일시: ${consolidatedNews.consolidation_timestamp}

=== 통합 내용 ===
${consolidatedNews.consolidated_content}
`;
  
  await fs.writeFile(textOutputPath, textOutput, 'utf-8');
  console.log(`📝 텍스트 버전 저장: ${textOutputPath}`);
}

/**
 * 메인 실행 함수
 */
async function main() {
  const startTime = Date.now();
  
  try {
    // 명령행 인자 처리
    const args = process.argv.slice(2);
    if (args.length < 1) {
      console.log('사용법: node --experimental-transform-types consolidate-news.ts <topic-folder-path>');
      console.log('예시: node --experimental-transform-types consolidate-news.ts bigkinds/2025-06-20T23:19:18.489131/topic-01');
      console.log('결과: 해당 주제 폴더에 news.json 파일로 저장됩니다.');
      process.exit(1);
    }
    
    const topicFolderPath = path.resolve(args[0]);
    
    try {
      const stat = await fs.stat(topicFolderPath);
      if (!stat.isDirectory()) {
        throw new Error(`지정된 경로가 폴더가 아닙니다: ${topicFolderPath}`);
      }
    } catch (error) {
      throw new Error(`주제 폴더를 찾을 수 없습니다: ${topicFolderPath} (오류: ${error.message})`);
    }
    
    console.log('🚀 뉴스 통합 시작');
    console.log('='.repeat(50));
    
    // 1단계: 뉴스 데이터 로드
    const loadStartTime = Date.now();
    const { newsListData, newsItems } = await loadNewsData(topicFolderPath);
    const loadTime = Date.now() - loadStartTime;
    
    console.log(`📋 주제: ${newsListData.topic}`);
    console.log(`📊 뉴스 개수: ${newsItems.length}개`);
    console.log(`⏱️  데이터 로딩 시간: ${loadTime}ms`);
    
    if (newsItems.length === 0) {
      throw new Error('통합할 뉴스 데이터가 없습니다.');
    }
    
    // 2단계: AI를 사용한 뉴스 통합
    console.log('\n🤖 AI를 사용한 뉴스 통합 중...');
    const aiStartTime = Date.now();
    const consolidatedContent = await consolidateNewsWithAI(newsListData, newsItems);
    const aiTime = Date.now() - aiStartTime;
    
    // 3단계: 결과 저장
    console.log('\n💾 결과 저장 중...');
    const saveStartTime = Date.now();
    const outputPath = path.join(topicFolderPath, 'news.json');
    await saveConsolidatedNews(newsListData, newsItems, consolidatedContent, outputPath);
    const saveTime = Date.now() - saveStartTime;
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n✅ 뉴스 통합 완료!');
    console.log(`📊 총 ${newsItems.length}개 기사 → 1개 통합 내용`);
    console.log(`📁 저장 위치: ${outputPath}`);
    console.log(`📝 텍스트 버전: ${outputPath.replace('.json', '.txt')}`);
    
    console.log('\n⏱️  실행 시간 분석:');
    console.log(`  📂 데이터 로딩: ${loadTime}ms`);
    console.log(`  🤖 AI 통합: ${aiTime}ms`);
    console.log(`  💾 파일 저장: ${saveTime}ms`);
    console.log(`  🚀 전체 시간: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}초)`);
    
    // 미리보기
    console.log('\n📰 통합 내용 미리보기:');
    console.log('-'.repeat(40));
    const preview = consolidatedContent.length > 200 
      ? consolidatedContent.substring(0, 200) + '...'
      : consolidatedContent;
    console.log(preview);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { loadNewsData, consolidateNewsWithAI, saveConsolidatedNews };