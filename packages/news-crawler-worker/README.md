# News Crawler Worker

빅카인드 뉴스 자동 크롤링을 위한 Cloudflare Workers API 서비스

## 🌟 이게 뭔가요?

빅카인드(bigkinds.or.kr)에서 트렌딩 뉴스를 자동으로 크롤링하여 R2 스토리지에 저장하는 서버리스 API입니다. Cloudflare Workers에서 자동 스케줄링으로 실행됩니다.

## ✨ 핵심 기능

- **자동 크롤링**: 매일 오전 9시 KST 스케줄 실행
- **큐 기반 처리**: 배치 처리 (한 번에 40개 아이템)
- **서버리스 아키텍처**: Cloudflare Workers + R2 + KV 스토리지
- **REST API**: 수동 트리거용 HTTP 엔드포인트

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
# 트렌딩 토픽 수집
curl "https://your-worker.workers.dev/topics?save=true"

# 뉴스 상세정보 처리 (배치 처리)
curl "https://your-worker.workers.dev/news-details?newscast-id=2025-09-17T16-50-13-648Z"
```

## 📊 동작 방식

1. **토픽 수집** (오전 9:05): 빅카인드에서 트렌딩 토픽 10개 추출
2. **배치 처리** (오전 9:10-9:40): 뉴스 상세정보를 40개씩 배치 처리
3. **R2 저장**: 구조화된 데이터를 Cloudflare R2 버킷에 저장
4. **KV 상태 관리**: 큐 인덱스로 처리 진행상황 추적

## 🎯 출력 구조

```
newscasts/{newscast-id}/
├── topics.json              # 10개 트렌딩 토픽
├── news-list.json           # 모든 뉴스의 플랫한 목록
└── topic-{01-10}/
    ├── news-list.json       # 토픽별 뉴스 목록
    └── news/
        └── {news-id}.json   # 개별 뉴스 상세정보
```

## 📚 더 알아보기

- **전체 문서**: [CLAUDE.md](./CLAUDE.md) 참조
- **API 참조**: `/` 엔드포인트에서 사용 가능한 모든 엔드포인트 확인
- **스케줄링**: `wrangler.toml`에 설정

## 🔗 관련 패키지

- **@ai-newscast/news-crawler**: 이 워커가 사용하는 핵심 크롤링 함수
- **@ai-newscast/core**: 공유 타입 및 유틸리티

---

Cloudflare Workers + TypeScript + R2 + KV로 구축
