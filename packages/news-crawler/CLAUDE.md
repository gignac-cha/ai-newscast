# News Crawler Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. BigKinds에서 트렌딩 토픽 추출 (10개 고유, 중복 제거)
2. 토픽별 뉴스 목록 수집 (최대 100개/토픽)
3. 개별 뉴스 상세 정보 추출 (제목, 본문, 메타데이터)
4. 다른 패키지에서 import 가능한 함수 export

### 구현 상태
- ✅ **완성** - TypeScript 구현
- ✅ 3단계 크롤링 파이프라인
- ✅ Commander.js CLI
- ✅ Zod 타입 검증

---

## 🏗️ 파일 구조 및 역할

```
packages/news-crawler/
├── command.ts               # 메인 CLI 엔트리포인트 (Commander.js)
├── crawl-news-topics.ts     # 토픽 추출 로직
├── crawl-news-list.ts       # 뉴스 목록 수집 로직
├── crawl-news-detail.ts     # 상세정보 추출 로직
├── schemas.ts               # Zod 타입 스키마
├── package.json             # 의존성 및 exports
└── output/                  # 크롤링 결과 (git ignore)
    └── {ISO_TIMESTAMP}/     # 타임스탬프별 디렉터리
```

---

## 🔧 API 및 함수 시그니처

### crawl-news-topics.ts
```typescript
export async function crawlNewsTopics(
  outputFile: string
): Promise<TopicListOutput>

interface TopicListOutput {
  topics: Array<{
    rank: number;
    title: string;
    keywords: string[];
    news_count: number;
    news_ids: string[];
    href: string;
  }>;
  count: number;
  timestamp: string;
}
```

### crawl-news-list.ts
```typescript
export async function crawlNewsList(
  inputFile: string,
  topicIndex: number,
  outputFile: string
): Promise<NewsListOutput>

interface NewsListOutput {
  topic: {
    rank: number;
    title: string;
  };
  news: Array<{
    newsId: string;
    title: string;
    media: string;
    publishedAt: string;
  }>;
  count: number;
  timestamp: string;
}
```

### crawl-news-detail.ts
```typescript
export async function crawlNewsDetail(
  newsId: string,
  outputFile: string
): Promise<NewsDetailOutput>

interface NewsDetailOutput {
  newsId: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  media: string;
  reporter: string;
  publishedAt: string;
  url: string;
}
```

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: `newsID`, `topicIndex` (루트 CLAUDE.md 참조)
- **시간 단위**: 밀리세컨드 기본, 단위 생략 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용, `||` 금지 (루트 CLAUDE.md 참조)

### TypeScript 특화 규칙

#### 함수명: camelCase
```typescript
// ✅ CORRECT
export async function crawlNewsTopics(outputFile: string) {
  // ...
}

// ❌ WRONG
export async function crawl_news_topics(output_file: string) {
  // ❌ snake_case in TypeScript
}
```

#### Import 확장자 필수
```typescript
// ✅ CORRECT
import { crawlNewsTopics } from './crawl-news-topics.ts';

// ❌ WRONG
import { crawlNewsTopics } from './crawl-news-topics';  // ❌ .ts 생략
```

#### 타입: Zod schemas 필수
```typescript
// ✅ CORRECT
import { z } from 'zod';

const TopicSchema = z.object({
  rank: z.number(),
  title: z.string(),
  keywords: z.array(z.string()),
});

export type Topic = z.infer<typeof TopicSchema>;

// ❌ WRONG
interface Topic {  // ❌ 런타임 검증 없음
  rank: number;
  title: string;
  keywords: string[];
}
```

#### JSON 필드: snake_case (BigKinds API 호환)
```typescript
// ✅ CORRECT
interface TopicOutput {
  news_count: number;    // BigKinds API 응답
  news_ids: string[];    // BigKinds API 응답
}

// ❌ WRONG
interface TopicOutput {
  newsCount: number;     // ❌ API와 불일치
  newsIds: string[];     // ❌ API와 불일치
}
```

---

## 🚨 에러 처리 방식

### Commander.js + try/catch

```typescript
// ✅ CORRECT
import { Command } from 'commander';

const program = new Command();

program
  .command('topics')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      const result = await crawlNewsTopics(options.output);
      console.log(`✓ Crawled ${result.count} topics`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ❌ WRONG
program
  .command('topics')
  .action(async (options) => {
    const result = await crawlNewsTopics(options.output);  // ❌ 에러 처리 없음
    console.log(`Crawled ${result.count} topics`);
  });
```

### 로깅: 진행 상황 출력

```typescript
// ✅ CORRECT
console.log(`Crawling topic ${topicIndex + 1}/10: ${topicTitle}`);
console.log(`Found ${newsList.length} articles`);
console.log(`✓ Saved to ${outputFile}`);

// ❌ WRONG
// (아무 출력 없음) ❌
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **core**: 공통 타입 정의 import (선택적)
- **news-generator**: 이 패키지의 출력을 입력으로 사용
- **newscast-generator**: 간접적으로 이 패키지의 출력 사용

### Export (다른 패키지에서 사용 가능)

```typescript
// news-generator에서 사용 예시
import { crawlNewsTopics } from '@ai-newscast/news-crawler/crawl-news-topics';
import { crawlNewsList } from '@ai-newscast/news-crawler/crawl-news-list';
import { crawlNewsDetail } from '@ai-newscast/news-crawler/crawl-news-detail';

const topics = await crawlNewsTopics('./output/topic-list.json');
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### Rate Limiting (MUST)

#### MUST: 1초 간격 대기
```typescript
// ✅ CORRECT
for (const news of newsList) {
  await crawlNewsDetail(news.newsId, outputFile);
  await new Promise(resolve => setTimeout(resolve, 1000));  // 1초 대기
}

// ❌ WRONG
for (const news of newsList) {
  await crawlNewsDetail(news.newsId, outputFile);  // ❌ 간격 없음 (서버 과부하)
}
```

#### NEVER: 동시 요청
```typescript
// ❌ WRONG
const tasks = newsList.map(news => crawlNewsDetail(news.newsId, outputFile));
await Promise.all(tasks);  // ❌ 동시 요청 금지
```

### 출력 관리 (MUST)

#### MUST: ISO 타임스탬프 디렉터리
```typescript
// ✅ CORRECT
const timestamp = new Date().toISOString().replace(/:/g, '-');
const outputDir = `output/${timestamp}/`;

// ❌ WRONG
const outputDir = "output/latest/";  // ❌ 덮어쓰기 위험
```

#### NEVER: 기존 파일 덮어쓰기
```typescript
// ✅ CORRECT
import { existsSync } from 'fs';

if (existsSync(outputFile)) {
  throw new Error(`Output file already exists: ${outputFile}`);
}

// ❌ WRONG
await writeFile(outputFile, JSON.stringify(data));  // ❌ 무조건 덮어쓰기
```

### BigKinds API (MUST)

#### MUST: UTF-8 인코딩 처리
```typescript
// ✅ CORRECT
const response = await fetch(url);
const html = await response.text();
// Cheerio는 자동으로 UTF-8 처리

// ❌ WRONG
const buffer = await response.arrayBuffer();  // ❌ 인코딩 문제 가능
```

#### MUST: HTML 파싱 에러 처리
```typescript
// ✅ CORRECT
import * as cheerio from 'cheerio';

const $ = cheerio.load(html);
const title = $('h1').text().trim();

if (!title) {
  throw new Error('Title not found in HTML');
}

// ❌ WRONG
const title = $('h1').text();  // ❌ 빈 문자열 체크 없음
```

#### MUST: Zod 스키마 검증
```typescript
// ✅ CORRECT
import { z } from 'zod';

const NewsDetailSchema = z.object({
  newsId: z.string(),
  title: z.string().min(1),
  content: z.string().min(1),
});

const validated = NewsDetailSchema.parse(data);  // 검증 및 타입 보장

// ❌ WRONG
const data = {
  newsId: newsId,
  title: title,
  content: content,
};  // ❌ 검증 없음
```

### CLI 명령어 (MUST)

#### MUST: Commander.js 옵션 정의
```typescript
// ✅ CORRECT
program
  .command('topics')
  .option('-o, --output <file>', 'Output file path', './output/topic-list.json')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    // ...
  });

// ❌ WRONG
program
  .command('topics')
  .action(async () => {
    const output = process.argv[2];  // ❌ 수동 파싱 금지
  });
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **Core 타입 정의**: [../core/CLAUDE.md](../core/CLAUDE.md)

---

*최종 업데이트: 2025-10-11 - TypeScript 단일 구현 (Python 제거)*
