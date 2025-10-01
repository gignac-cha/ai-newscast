# Newscast Generator Lambda

AWS Lambda 기반 뉴스캐스트 오디오 병합 서비스

## 🌟 이게 뭔가요?

Cloudflare R2에 저장된 개별 TTS 오디오 파일들을 FFmpeg로 병합하여 최종 뉴스캐스트 MP3를 생성하는 서버리스 함수입니다. API Gateway를 통해 호출되며 Base64로 인코딩된 오디오를 반환합니다.

## ✨ 핵심 기능

- **FFmpeg 오디오 병합**: 개별 MP3 파일을 단일 뉴스캐스트로 병합
- **R2 통합**: Cloudflare R2에서 오디오 파일 다운로드
- **고속 처리**: Re-encoding 없이 concat demuxer 사용
- **Base64 반환**: API 응답으로 인코딩된 오디오 전송
- **서버리스**: AWS Lambda 환경에서 자동 스케일링

## 🚀 빠른 시작

### 배포

```bash
# 배포 스크립트 실행 (함수 + FFmpeg 레이어)
pnpm run deploy

# 또는 직접 배포
bash deploy.sh
```

### 로컬 테스트

```bash
# UV 가상환경 활성화
uv venv && source .venv/bin/activate

# CLI로 테스트
python test_lambda.py \
  --newscast-id "2025-09-29T09-05-22-132Z" \
  --topic-index 1 \
  --no-dry-run
```

### API 호출

```bash
curl -X POST https://your-api-gateway-url/prod/newscast \
  -H "Content-Type: application/json" \
  -d '{
    "newscast_id": "2025-09-29T09-05-22-132Z",
    "topic_index": 1,
    "dry_run": false
  }'
```

## 📊 동작 방식

1. **다운로드**: R2에서 `audio-files.json` 및 MP3 파일들 가져오기
2. **병합**: FFmpeg concat demuxer로 단일 MP3 생성
3. **인코딩**: Base64로 인코딩
4. **반환**: JSON 응답으로 전송

## 🎯 응답 예제

```json
{
  "statusCode": 200,
  "newscast_id": "2025-09-29T09-05-22-132Z",
  "topic_index": 1,
  "title": "AI 뉴스캐스트",
  "input_files": 19,
  "output_file_size": 819020,
  "audio_base64": "SUQzBAAAAAAAI1RTU0U...",
  "message": "Audio files merged successfully"
}
```

## 🔧 기술 스택

- **Python 3.13**: AWS Lambda 런타임
- **FFmpeg 7.0.2**: 정적 바이너리 (Lambda Layer)
- **UV**: Python 패키지 관리
- **Typer**: CLI 프레임워크 (로컬 테스트)

## 📚 더 알아보기

- **전체 문서**: [CLAUDE.md](./CLAUDE.md) 참조
- **배포 가이드**: CLAUDE.md의 "배포 및 설정" 섹션
- **API 사양**: CLAUDE.md의 "API 사양" 섹션
- **문제 해결**: CLAUDE.md의 "문제 해결" 섹션

## 🔗 관련 패키지

- **@ai-newscast/newscast-generator**: 오디오 생성 (TTS)
- **@ai-newscast/newscast-generator-worker**: Worker API (Lambda 호출)

---

AWS Lambda + FFmpeg + Python 3.13 + UV로 구축
