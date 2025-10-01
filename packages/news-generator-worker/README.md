# News Generator Worker

AI 기반 뉴스 통합을 위한 Cloudflare Workers API

## 🌟 이게 뭔가요?

Google Gemini AI를 사용하여 크롤링된 뉴스 기사를 통합 스토리로 만드는 서버리스 API입니다. Cloudflare Workers에서 실행되며 R2 스토리지와 통합됩니다.

## ✨ 핵심 기능

- **AI 기반**: `@ai-newscast/news-generator` 라이브러리 + Google Gemini 2.5 Pro 사용
- **서버리스**: Cloudflare Workers에서 실행
- **R2 통합**: R2 스토리지에서 입력을 읽고 출력 저장
- **다중 형식**: JSON 또는 Markdown 응답 반환
- **토픽 기반**: 개별 토픽 처리 또는 상태 확인

## 🚀 빠른 시작

### Cloudflare에 배포

```bash
# 의존성 설치
pnpm install

# Worker 빌드
pnpm build

# Cloudflare에 배포
pnpm run deploy
```

### API 엔드포인트 테스트

```bash
# 토픽의 통합 뉴스 생성
curl -X POST "https://your-worker.workers.dev/generate?newscast-id=2025-09-17T16-50-13-648Z&topic-index=1"

# 생성 상태 확인
curl "https://your-worker.workers.dev/status?newscast-id=2025-09-17T16-50-13-648Z"
```

## 📊 동작 방식

1. **읽기**: R2에서 토픽의 모든 뉴스 기사 가져오기
2. **통합**: AI를 사용하여 통합 뉴스 스토리 생성
3. **저장**: JSON 및 Markdown 출력을 R2에 저장
4. **추적**: 메타데이터에 생성 상태 기록

## 🎯 출력 구조

```
newscasts/{newscast-id}/topic-{01-10}/
├── news.json              # 통합 뉴스 (JSON)
└── news.md                # 통합 뉴스 (Markdown)
```

## 📦 응답 예제

```json
{
  "success": true,
  "newscast_id": "2025-09-17T16-50-13-648Z",
  "topic_index": 1,
  "input_articles_count": 25,
  "sources_count": 8,
  "execution_time_ms": 15420,
  "output_files": {
    "json": "newscasts/.../news.json",
    "markdown": "newscasts/.../news.md"
  }
}
```

## 🔧 설정

`wrangler.toml`에서 설정:

```toml
[vars]
GOOGLE_GEN_AI_API_KEY = "your_gemini_api_key"

[[r2_buckets]]
binding = "AI_NEWSCAST_BUCKET"
bucket_name = "ai-newscast"
```

## 📚 더 알아보기

- **전체 문서**: [CLAUDE.md](./CLAUDE.md) 참조
- **라이브러리 문서**: `@ai-newscast/news-generator` 패키지 참조
- **프롬프트 커스터마이징**: news-generator의 `prompts/news-consolidation.md` 편집

## 🔗 관련 패키지

- **@ai-newscast/news-generator**: 핵심 라이브러리 (순수 함수)
- **@ai-newscast/core**: 공유 타입

---

Cloudflare Workers + Google Gemini 2.5 Pro로 구축
