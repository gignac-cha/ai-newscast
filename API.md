# API 문서

> v3.1.0 크롤링 파이프라인 완성 버전 기준 API 사용 가이드

## 📋 개요

AI 뉴스캐스트 프로젝트에서 사용하는 외부 API들의 사용법과 실제 응답 구조를 정리한 문서입니다.

## 🕷️ BigKinds API (현재 구현됨)

### 기본 정보
- **베이스 URL**: `https://bigkinds.or.kr`
- **인증**: 불필요 (공개 API)
- **요청 제한**: 적당한 간격 권장 (서버 부하 방지)
- **응답 형식**: HTML, JSON

### 1. 트렌딩 토픽 추출

#### 엔드포인트
```
GET https://www.bigkinds.or.kr/
```

#### 설명
메인페이지에서 실시간 트렌딩 뉴스 주제를 XPath 파싱으로 추출

#### 구현 방식
- HTML 페이지에서 `//a[contains(@class, 'issupop-btn') and @data-topic]` XPath로 추출
- `data-topic`, `data-issue-name`, `data-news-ids` 속성에서 메타데이터 수집
- 중복 제거: BigKinds UI는 동일 토픽을 3개 섹션에서 표시하므로 Python `set()`으로 필터링

#### HTML 응답 구조 예시
```html
<a class="issupop-btn" 
   data-topic="이재명" 
   data-issue-name="이재명 민주당 대표 검찰 수사 기소" 
   data-news-ids="01100101-20250624104004001,01100201-20250624081258001,..."
   href="/v2/search/news?issueKeyword=%EC%9D%B4%EC%9E%AC%EB%AA%85">
  <span class="rank">1</span>
  이재명
</a>
```

### 2. 뉴스 목록 조회

#### 엔드포인트
```
POST https://bigkinds.or.kr/news/getNetworkDataAnalysis.do
```

#### 헤더
```
Referer: https://www.bigkinds.or.kr/
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
X-Requested-With: XMLHttpRequest
```

#### 요청 본문 (form-urlencoded)
```
pageInfo=newsResult
keyword=이재명
startDate=2025-06-26
endDate=2025-06-27
newsCluster=01100101-20250624104004001,01100201-20250624081258001,...
resultNo=100
```

#### 실제 BigKinds API 응답 구조
```json
{
  "newsList": [
    {
      "news_node_id": "01100101-20250624104004001",
      "title": "이재명 \"김건희 특검법 본회의 처리해달라\"",
      "provider_name": "연합뉴스",
      "byline": "김민수 기자",
      "published_date": "2025-06-24 10:40:04",
      "summary": "민주당 대표가 김건희 특검법 처리를 촉구했다...",
      "inKeyword": [
        {"label": "이재명", "weight": 0.8},
        {"label": "특검법", "weight": 0.6}
      ],
      "category": "정치",
      "url": "https://bigkinds.or.kr/news/detailView.do?docId=01100101.20250624104004001"
    }
  ],
  "newsIds": ["01100101-20250624104004001", "01100201-20250624081258001"],
  "totalCount": 97
}
```

### 3. 뉴스 상세 정보 조회

#### 엔드포인트
```
GET https://bigkinds.or.kr/news/detailView.do?docId={news_id}&returnCnt=1&sectionDiv=1000
```

#### 매개변수
- `docId`: 뉴스 ID (하이픈을 점으로 변경, 예: `01100101.20250624104004001`)
- `returnCnt`: 1 (고정값)
- `sectionDiv`: 1000 (고정값)

#### 실제 BigKinds API 응답 구조
```json
{
  "detail": {
    "NEWS_NODE_ID": "01100101-20250624104004001",
    "TITLE": "이재명 \"김건희 특검법 본회의 처리해달라\"",
    "PROVIDER_NAME": "연합뉴스",
    "BYLINE": "김민수 기자",
    "PUBLISHED_DATE": "2025-06-24 10:40:04",
    "CATEGORY": "정치",
    "CONTENT": "민주당 이재명 대표가 24일 국회에서...(전체 기사 본문)",
    "KEYWORDS": "이재명,특검법,김건희,민주당",
    "SUMMARY": "민주당 대표가 김건희 특검법 처리를 촉구했다...",
    "URL": "https://bigkinds.or.kr/news/detailView.do?docId=01100101.20250624104004001",
    "PROVIDER_CODE": "01100101",
    "SECTION_NAME": "정치",
    "WORD_COUNT": 847,
    "IMAGE_URL": "https://cdn.bigkinds.or.kr/news/images/...",
    "RELATED_NEWS": ["01100201-20250624081258001", "01100401-20250624100712001"]
  },
  "status": "success"
}
```

### 구현된 크롤러 사용법

#### 토픽 크롤링
```bash
# 기본 실행
pnpm crawl:news-topics -- --output-file "output/topics.json"

# JSON 로그 포맷으로 실행
pnpm crawl:news-topics -- --output-file "output/topics.json" --print-log-format json

# 로그 파일 분리
pnpm crawl:news-topics -- --output-file "output/topics.json" --print-log-format json --print-log-file "output/log.json"
```

#### 뉴스 리스트 크롤링
```bash
# 특정 토픽 (0번 인덱스)
pnpm crawl:news-list -- --input-file "output/topics.json" --topic-index 0 --output-file "output/topic-01/news-list.json"

# JSON 로그와 함께
pnpm crawl:news-list -- --input-file "output/topics.json" --topic-index 0 --output-file "output/topic-01/news-list.json" --print-log-format json --print-log-file "output/list-log.json"
```

#### 뉴스 상세 크롤링
```bash
# 모든 뉴스 상세 정보
pnpm crawl:news-details -- --input-file "output/topic-01/news-list.json" --output-folder "output/topic-01/news"

# JSON 로그와 함께
pnpm crawl:news-details -- --input-file "output/topic-01/news-list.json" --output-folder "output/topic-01/news" --print-log-format json --print-log-file "output/details-log.json"
```

#### 전체 파이프라인
```bash
# 원클릭 실행
./scripts/run-all.sh
```

### 출력 데이터 구조 (우리 크롤러)

#### 토픽 목록 (우리가 정리한 형태)
```json
[
  {
    "rank": 1,
    "title": "이재명",
    "issue_name": "이재명 민주당 대표 검찰 수사 기소",
    "keywords": ["이재명", "민주당", "대표", "검찰", "수사", "기소"],
    "news_count": 97,
    "news_ids": ["01100101-20250624104004001", "01100201-20250624081258001"],
    "href": "/v2/search/news?issueKeyword=%EC%9D%B4%EC%9E%AC%EB%AA%85"
  }
]
```

#### 뉴스 리스트 (우리가 정리한 형태)
```json
{
  "topic": "이재명",
  "topic_index": 0,
  "extraction_timestamp": "2025-06-27T15:52:44.934067",
  "total_news": 97,
  "news_list": [
    {
      "news_id": "01100101-20250624104004001",
      "title": "이재명 \"김건희 특검법 본회의 처리해달라\"",
      "provider_name": "연합뉴스",
      "byline": "김민수 기자",
      "published_date": "2025-06-24 10:40:04",
      "summary": "민주당 대표가 김건희 특검법 처리를 촉구했다...",
      "keywords": ["이재명", "특검법"],
      "category": "정치",
      "url": "https://bigkinds.or.kr/news/detailView.do?docId=..."
    }
  ],
  "news_ids": ["01100101-20250624104004001", "01100201-20250624081258001"]
}
```

#### 뉴스 상세 (우리가 정리한 형태)
```json
{
  "extraction_timestamp": "2025-06-27T15:52:44.934067",
  "original_news_id": "01100101-20250624104004001",
  "api_news_id": "01100101.20250624104004001",
  "news_detail": {
    "NEWS_NODE_ID": "01100101-20250624104004001",
    "TITLE": "이재명 \"김건희 특검법 본회의 처리해달라\"",
    "CONTENT": "민주당 이재명 대표가 24일 국회에서...(전체 기사 본문)",
    "PROVIDER_NAME": "연합뉴스",
    "BYLINE": "김민수 기자",
    "PUBLISHED_DATE": "2025-06-24 10:40:04",
    "CATEGORY": "정치",
    "KEYWORDS": "이재명,특검법,김건희,민주당",
    "SUMMARY": "민주당 대표가 김건희 특검법 처리를 촉구했다...",
    "URL": "https://bigkinds.or.kr/news/detailView.do?docId=..."
  },
  "content": "민주당 이재명 대표가 24일 국회에서...(전체 기사 본문)",
  "metadata": {
    "title": "이재명 \"김건희 특검법 본회의 처리해달라\"",
    "provider": "연합뉴스",
    "byline": "김민수 기자",
    "published_date": "2025-06-24 10:40:04",
    "category": "정치",
    "keywords": "이재명,특검법,김건희,민주당",
    "summary": "민주당 대표가 김건희 특검법 처리를 촉구했다...",
    "url": "https://bigkinds.or.kr/news/detailView.do?docId=..."
  }
}
```

## 🤖 Google Gemini API (계획됨)

### 기본 정보
- **베이스 URL**: `https://generativelanguage.googleapis.com`
- **인증**: API 키 필요 (`GOOGLE_AI_API_KEY`)
- **모델**: Gemini 2.0 Flash, Gemini 1.5 Pro
- **요청 제한**: 분당 60회, 일일 1500회 (무료 tier)

### 사용 예정 기능

#### 1. 뉴스 통합 및 요약 (packages/news-processor)
```typescript
const response = await fetch(`${GEMINI_BASE_URL}/v1/models/gemini-2.0-flash:generateContent`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': process.env.GOOGLE_AI_API_KEY
  },
  body: JSON.stringify({
    contents: [{
      parts: [{
        text: `다음 뉴스들을 통합하여 요약해주세요: ${newsContent}`
      }]
    }]
  })
});
```

#### 2. 뉴스캐스트 스크립트 생성 (packages/script-generator)
```typescript
const response = await fetch(`${GEMINI_BASE_URL}/v1/models/gemini-1.5-pro:generateContent`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': process.env.GOOGLE_AI_API_KEY
  },
  body: JSON.stringify({
    contents: [{
      parts: [{
        text: `다음 뉴스를 대화형 뉴스캐스트 스크립트로 만들어주세요: ${consolidatedNews}`
      }]
    }]
  })
});
```

### 설정 방법
```bash
# 환경변수 설정
export GOOGLE_AI_API_KEY="your_google_ai_api_key"

# .env 파일에 추가
echo "GOOGLE_AI_API_KEY=your_google_ai_api_key" >> .env
```

## 🎵 Google Cloud TTS API (계획됨)

### 기본 정보
- **베이스 URL**: `https://texttospeech.googleapis.com`
- **인증**: 서비스 계정 키 파일 필요
- **음성 모델**: Chirp HD (8개 프리미엄 모델)
- **요청 제한**: 분당 300회, 월 100만 문자 (무료 tier)

### 사용 예정 기능

#### TTS 음성 생성 (packages/audio-generator)
```typescript
const response = await fetch(`${TTS_BASE_URL}/v1/text:synthesize`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    input: { text: scriptLine },
    voice: { 
      languageCode: 'ko-KR', 
      name: 'ko-KR-Wavenet-D',
      ssmlGender: 'FEMALE'
    },
    audioConfig: { 
      audioEncoding: 'MP3',
      sampleRateHertz: 24000
    }
  })
});
```

### 설정 방법
```bash
# 서비스 계정 키 설정
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

## 🛠️ 개발 및 테스트

### 검증 명령어
```bash
# JSON 구조 검증
jq . output/latest/topic-list.json
jq '.news_list | length' output/latest/topic-01/news-list.json

# 뉴스 상세 파일 개수 확인
find output/latest/topic-01/news -name "*.json" | wc -l

# BigKinds API 연결 테스트
curl -I https://bigkinds.or.kr
```

## 🔍 트러블슈팅

### BigKinds API 관련
```bash
# 연결 테스트
curl -I https://bigkinds.or.kr

# POST 요청 테스트 (실제 형태)
curl -X POST https://bigkinds.or.kr/news/getNetworkDataAnalysis.do \
  -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d "pageInfo=newsResult&keyword=테스트&startDate=2025-06-26&endDate=2025-06-27&resultNo=10"
```

### 성능 최적화
- **요청 간격**: 서버 부하 방지를 위해 적절한 간격 유지
- **에러 처리**: requests.exceptions.RequestException 처리
- **인코딩**: `response.apparent_encoding` 사용으로 한글 깨짐 방지
- **타임아웃**: 30초 타임아웃 설정

---

**최종 업데이트**: v3.1.0 (2025-06-27) - BigKinds API 실제 응답 구조 문서화 완료