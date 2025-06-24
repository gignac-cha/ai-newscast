# BigKinds News Crawler (Python) v2.0

> 🐍 Production-ready Python news crawler with UV package management

고성능 Python 기반 BigKinds 뉴스 크롤러입니다.

## 특징

- **모듈화된 아키텍처**: 클라이언트, 파서, 크롤러로 분리
- **타입 안전성**: Pydantic 모델을 활용한 데이터 검증
- **에러 처리**: 재시도 로직과 상세한 로깅
- **CLI 인터페이스**: Click 기반 사용하기 쉬운 명령줄 도구
- **설정 가능**: 유연한 크롤러 및 출력 설정

## 설치

```bash
# 패키지 의존성 설치
pnpm --filter @ai-newscast/news-crawler-py install-deps

# 개발 의존성 포함 설치
pnpm --filter @ai-newscast/news-crawler-py dev-install
```

## 사용법

### 주제 목록 크롤링
```bash
pnpm crawl:topics
# 또는
pnpm --filter @ai-newscast/news-crawler-py crawl:topics
```

### 뉴스 목록 크롤링
```bash
# 특정 데이터 폴더에서 1,2,3 순위 주제의 뉴스 목록 크롤링
pnpm --filter @ai-newscast/news-crawler-py crawl:news ./output/2025-06-21T12-34-56 --topics 1,2,3
```

### 뉴스 상세 크롤링
```bash
# 특정 주제 폴더의 뉴스 상세 내용 크롤링
pnpm --filter @ai-newscast/news-crawler-py crawl:details ./output/2025-06-21T12-34-56/topic-01
```

### 전체 파이프라인 실행
```bash
# 상위 10개 주제의 뉴스 목록까지 크롤링
pnpm crawl:pipeline

# 첫 번째 주제의 상세 내용까지 포함
pnpm --filter @ai-newscast/news-crawler-py crawl:pipeline --max-topics 5 --include-details
```

## 출력 구조

```
output/
└── 2025-06-21T12-34-56-789/
    ├── topic-list.html
    ├── topic-list.json
    ├── topic-01/
    │   ├── news-list.json
    │   └── news/
    │       ├── 01100101-20250620110824001.json
    │       └── ...
    ├── topic-02/
    └── ...
```

## 개발

```bash
# 코드 포맷팅
pnpm --filter @ai-newscast/news-crawler-py format

# 린팅
pnpm --filter @ai-newscast/news-crawler-py lint

# 타입 체크
pnpm --filter @ai-newscast/news-crawler-py typecheck

# 테스트
pnpm --filter @ai-newscast/news-crawler-py test
```