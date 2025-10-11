# Newscast Generator Lambda

AWS Lambda 기반 뉴스캐스트 오디오 병합 서비스 (Python)

## 개요

Cloudflare R2에 저장된 개별 TTS 오디오 파일들을 FFmpeg로 병합하여 최종 뉴스캐스트 MP3를 생성하는 서버리스 함수입니다.

## 주요 기능

- **FFmpeg 오디오 병합**: 개별 MP3 파일을 단일 뉴스캐스트로 병합
- **R2 통합**: Cloudflare R2에서 오디오 파일 자동 다운로드
- **고속 처리**: Re-encoding 없이 concat demuxer 사용
- **Base64 응답**: API 응답으로 인코딩된 오디오 전송
- **서버리스**: AWS Lambda 환경에서 자동 스케일링

## 빠른 시작

### 배포

```bash
# 배포 스크립트 실행 (함수 + FFmpeg 레이어)
bash deploy.sh
```

### 로컬 테스트

```bash
# UV 가상환경 활성화
uv venv && source .venv/bin/activate

# 의존성 설치
uv pip install -e ".[dev]"

# CLI로 테스트 (test_lambda.py 사용 시)
python -c "import lambda_function; lambda_function.lambda_handler({...}, None)"
```

### API 호출

```bash
curl -X POST https://your-api-gateway-url/prod/newscast \
  -H "Content-Type: application/json" \
  -d '{
    "newscast_id": "2025-10-05T19-53-26-599Z",
    "topic_index": 1,
    "dry_run": false
  }'
```

## 출력 예시

### 성공 응답

```json
{
  "statusCode": 200,
  "newscast_id": "2025-10-05T19-53-26-599Z",
  "topic_index": 1,
  "title": "AI 뉴스캐스트",
  "input_files": 19,
  "output_file_size": 819020,
  "audio_base64": "SUQzBAAAAAAAI1RTU0U...",
  "message": "Audio files merged successfully"
}
```

### 에러 응답

```json
{
  "statusCode": 500,
  "error": "Failed to merge audio files with FFmpeg",
  "details": "FFmpeg exit code: 1"
}
```

## 기술 스택

- **Python 3.13**: AWS Lambda 런타임
- **FFmpeg 7.0.2**: 정적 바이너리 (Lambda Layer)
- **UV**: Python 패키지 관리
- **boto3**: AWS SDK (Lambda 런타임 포함)

## 동작 방식

1. **다운로드**: R2에서 `audio-files.json` 및 MP3 파일들 가져오기
2. **병합**: FFmpeg concat demuxer로 단일 MP3 생성
3. **인코딩**: Base64로 인코딩
4. **반환**: JSON 응답으로 전송

## 환경 변수

```bash
# Lambda 함수 설정에 추가
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

## 개발 가이드

상세한 Lambda 아키텍처, FFmpeg 통합, 배포 전략은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 관련 패키지

- **@ai-newscast/newscast-generator**: 오디오 생성 (TTS)
- **@ai-newscast/newscast-generator-worker**: Worker API (Lambda 호출)

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
