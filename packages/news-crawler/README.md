# News Crawler

빅카인드(bigkinds.or.kr)에서 실시간 뉴스를 수집하는 다중 언어 크롤링 패키지

## ✨ 주요 기능

- 🔥 **트렌딩 토픽**: 실시간 인기 토픽 10개 추출 (중복 제거)
- 📰 **뉴스 수집**: 토픽별 최대 100개 뉴스 자동 수집
- 📝 **상세 정보**: 제목, 본문, 요약, 언론사, 기자명 등 완전한 메타데이터
- 🌐 **듀얼 구현**: Python (Typer) + TypeScript (Commander.js) 지원

## 🚀 빠른 시작

### 1. 설치
```bash
pnpm install
```

### 2. 실행
```bash
# Python으로 전체 크롤링 (토픽 → 뉴스 목록 → 상세정보)
pnpm run crawl:news-topics
pnpm run crawl:news-list
pnpm run crawl:news-details

# TypeScript로 전체 파이프라인 한 번에
pnpm run crawl:ts-full
```

### 3. 결과 확인
```bash
output/2025-09-30T10-00-00-000Z/
├── topic-list.json              # 10개 토픽
├── topic-01/
│   ├── news-list.json          # 최대 100개 뉴스 목록
│   └── news/
│       ├── 01100201.json       # 개별 뉴스 상세정보
│       └── ...
└── topic-{N}/
```

## 📖 출력 예시

### 토픽 목록
```json
{
  "topics": [
    {
      "rank": 1,
      "title": "이종섭 전 장관과 한학자 총재 조사",
      "keywords": ["한학자", "통일교", "김건희"],
      "news_count": 59
    }
  ]
}
```

### 뉴스 상세정보
```json
{
  "newsId": "02100701.20250917164815001",
  "title": "뉴스 제목",
  "content": "뉴스 본문...",
  "category": "정치",
  "media": "연합뉴스",
  "publishedAt": "2025-09-17T16:48:15.000Z"
}
```

## 🛠️ 기술 스택

- **Python**: 3.11+ (UV 패키지 매니저)
- **TypeScript**: Node.js 24+ (experimental type stripping)
- **크롤링**: requests + lxml (Python), fetch + Cheerio (TypeScript)

## 📚 더 알아보기

- **상세 가이드**: [CLAUDE.md](./CLAUDE.md) - 전체 API, 개발 규칙, 코딩 컨벤션
- **프로젝트 문서**: [../../CLAUDE.md](../../CLAUDE.md)

## ⚠️ 참고사항

- BigKinds의 공개 API를 사용하며, 1초 간격으로 크롤링합니다
- 출력 파일은 `output/{ISO_TIMESTAMP}/` 구조로 자동 저장됩니다

---

*AI 뉴스캐스트 프로젝트의 일부입니다*
