# Newscast Generator Lambda Package

AWS Lambda 기반 뉴스캐스트 오디오 병합 서비스 (FFmpeg)

## 📋 개요

이 패키지는 AWS Lambda 환경에서 실행되는 뉴스캐스트 오디오 병합 함수입니다. Cloudflare R2에 저장된 개별 TTS 오디오 파일들을 FFmpeg를 사용하여 최종 뉴스캐스트 오디오로 병합합니다.

**핵심 기능:**
- Cloudflare R2에서 개별 오디오 파일 다운로드
- FFmpeg concat demuxer를 사용한 고속 병합 (re-encoding 없음)
- Base64 인코딩된 최종 오디오 반환
- API Gateway를 통한 RESTful 인터페이스

## 🏗️ 아키텍처

### Lambda Function
- **Runtime**: Python 3.13
- **메모리**: 512MB (FFmpeg 실행 및 오디오 처리)
- **타임아웃**: 60초
- **레이어**: FFmpeg 7.0.2 static binary (x86_64)

### 외부 의존성
- **Cloudflare R2**: 오디오 파일 스토리지 (Public URL 접근)
- **API Gateway**: REST API 엔드포인트 (`/prod/newscast`)

### 실행 흐름
```
API Gateway Request
  ↓
Lambda Function
  ↓
1. Parse event (newscast_id, topic_index)
  ↓
2. Fetch audio-files.json from R2
  ↓
3. Download audio files from R2
  ↓
4. Merge with FFmpeg (concat demuxer)
  ↓
5. Base64 encode output
  ↓
6. Return JSON response
```

## 🛠️ 기술 스택

### Python 패키지 관리
- **UV**: 고속 Python 패키지 매니저
- **venv**: 로컬 가상 환경 (`.venv/`)
- **타입 체크**: Python 3.13+ type hints

### 핵심 라이브러리
- **requests**: HTTP 클라이언트 (R2 다운로드)
- **typer**: CLI 프레임워크 (로컬 테스트용)
- **rich**: 터미널 출력 포매팅

### 개발 도구
- **boto3**: AWS SDK (로컬 테스트용)
- **pytest**: 단위 테스트
- **pytest-cov**: 코드 커버리지

## 🚀 배포 및 설정

### 로컬 환경 설정
```bash
# UV 설치 (https://astral.sh/uv)
curl -LsSf https://astral.sh/uv/install.sh | sh

# UV venv 생성 및 패키지 설치
uv venv
source .venv/bin/activate  # Linux/Mac
uv pip install -e ".[dev]"

# 환경변수 설정
export R2_PUBLIC_URL="https://pub-xxx.r2.dev"
export FFMPEG_PATH="/opt/bin/ffmpeg"  # Lambda 환경
```

### Lambda 배포
```bash
# 전체 배포 (함수 + 레이어)
pnpm run deploy

# 함수만 업데이트
bash deploy.sh
```

### FFmpeg 레이어 구성
```
ffmpeg-layer/
└── bin/
    └── ffmpeg  # Static binary from johnvansickle.com
```

**레이어 정보:**
- 이름: `ffmpeg-layer`
- 버전: 7.0.2
- 아키텍처: x86_64
- 크기: ~58MB (S3 업로드 필요)

## 📋 API 사양

### POST /prod/newscast
```bash
curl -X POST https://mjo3i4woz9.execute-api.ap-northeast-2.amazonaws.com/prod/newscast \
  -H "Content-Type: application/json" \
  -d '{
    "newscast_id": "2025-09-29T09-05-22-132Z",
    "topic_index": 1,
    "dry_run": false
  }'
```

**요청 파라미터:**
- `newscast_id` (string, 필수): 뉴스캐스트 타임스탬프 ID
- `topic_index` (integer, 필수): 토픽 인덱스 (1-10)
- `dry_run` (boolean, 선택): 테스트 모드 (기본값: false)

**응답 예시:**
```json
{
  "statusCode": 200,
  "newscast_id": "2025-09-29T09-05-22-132Z",
  "topic_index": 1,
  "title": "AI 뉴스캐스트",
  "input_files": 19,
  "output_file_size": 819020,
  "audio_base64": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYxLjEuMTAwAAAAAAA...",
  "message": "Audio files merged successfully"
}
```

## 🔧 로컬 테스트

### CLI 테스트 도구
```bash
# 기본 테스트 (dry_run=true)
python test_lambda.py

# 실제 실행
python test_lambda.py --no-dry-run

# 특정 뉴스캐스트 테스트
python test_lambda.py \
  --newscast-id "2025-09-29T09-05-22-132Z" \
  --topic-index 1 \
  --no-dry-run

# 결과를 파일로 저장
python test_lambda.py --output ./test-output.mp3
```

**환경변수:**
- `R2_PUBLIC_URL`: Cloudflare R2 Public URL
- `FFMPEG_PATH`: FFmpeg 바이너리 경로 (선택)

### 테스트 시나리오
1. **Dry Run**: 파일 존재 확인만 수행
2. **실제 병합**: FFmpeg로 오디오 병합 + Base64 인코딩
3. **출력 저장**: MP3 파일로 로컬 저장

## 📁 파일 구조

```
packages/newscast-generator-lambda/
├── lambda_function.py       # Lambda 핸들러 (메인)
├── audio_downloader.py      # R2 파일 다운로드
├── audio_processor.py       # FFmpeg 병합 로직
├── utils.py                 # 공통 유틸리티
├── test_lambda.py           # 로컬 테스트 CLI
├── deploy.sh                # 배포 스크립트
├── pyproject.toml           # Python 프로젝트 설정
├── uv.lock                  # UV 의존성 락 파일
├── .python-version          # Python 버전 (3.13)
├── .gitignore               # Git 제외 파일
└── README.md                # 사용자 문서
```

## 🔍 코드 구조

### lambda_function.py
**책임**: Lambda 이벤트 처리 및 오케스트레이션
- API Gateway 이벤트 파싱 (`event.body` 처리)
- 파라미터 검증 (`newscast_id`, `topic_index`)
- 워크플로우 조율 (다운로드 → 병합 → 인코딩)
- 에러 핸들링 및 응답 생성

### audio_downloader.py
**책임**: R2에서 오디오 파일 다운로드
- `audio-files.json` 메타데이터 로드
- 개별 오디오 파일 HTTP 다운로드
- 임시 디렉터리 관리 (`/tmp/newscast-{id}`)

**핵심 함수:**
```python
def download_audio_files(
    r2_public_url: str,
    newscast_id: str,
    topic_index: int
) -> tuple[list[dict], str]:
    """
    Returns:
        (audio_files_list, temp_dir_path)
    """
```

### audio_processor.py
**책임**: FFmpeg를 사용한 오디오 병합
- 파일 리스트 생성 (`filelist.txt`)
- FFmpeg concat demuxer 실행
- 병합된 파일 Base64 인코딩

**핵심 함수:**
```python
def merge_audio_files(
    audio_files: list[dict],
    temp_dir: str,
    ffmpeg_path: str = '/opt/bin/ffmpeg'
) -> bytes:
    """
    Returns:
        Merged audio data (bytes)
    """
```

### utils.py
**책임**: 공통 유틸리티 함수
- 파일 크기 포매팅
- 에러 로깅
- 임시 파일 정리

## 🚨 운영 고려사항

### Lambda 제한사항
- **타임아웃**: 60초 (긴 오디오 처리 시 주의)
- **메모리**: 512MB (여러 파일 동시 처리 시)
- **임시 스토리지**: 512MB (`/tmp/`)
- **동시 실행**: 계정당 1000 (기본값)

### FFmpeg 최적화
- **Concat Demuxer**: Re-encoding 없이 고속 병합
- **Copy Codec**: 원본 품질 유지
- **Static Binary**: 외부 의존성 없음

### 에러 처리
```python
try:
    # 파일 다운로드
    audio_files, temp_dir = download_audio_files(...)

    # FFmpeg 병합
    merged_audio = merge_audio_files(...)

    # Base64 인코딩
    audio_base64 = base64.b64encode(merged_audio).decode('utf-8')

except Exception as e:
    # 에러 로깅
    print(f"[ERROR] {str(e)}")

    # 정리 작업
    cleanup_temp_files(temp_dir)

    # 에러 응답
    return {
        'statusCode': 500,
        'body': json.dumps({'error': str(e)})
    }
```

## 📊 모니터링 및 디버깅

### CloudWatch Logs
```bash
# 최근 로그 확인
aws logs tail /aws/lambda/newscast-generator-lambda --follow

# 특정 기간 로그 검색
aws logs filter-log-events \
  --log-group-name /aws/lambda/newscast-generator-lambda \
  --start-time $(date -d '1 hour ago' +%s)000
```

### Lambda Insights (선택)
- 메모리 사용량 추적
- CPU 사용률 모니터링
- Cold Start 시간 분석

### 성능 최적화
- **Cold Start**: ~1-2초 (FFmpeg 레이어 로드)
- **실행 시간**: ~3-5초 (20개 파일 병합 기준)
- **메모리 사용**: ~200-300MB

## 🔄 개발 워크플로우

### 1. 로컬 개발
```bash
# 코드 수정
vim lambda_function.py

# 로컬 테스트
python test_lambda.py --no-dry-run

# 타입 체크
python -m py_compile *.py
```

### 2. 배포
```bash
# 코드 배포
pnpm run deploy

# 함수 테스트
aws lambda invoke \
  --function-name newscast-generator-lambda \
  --payload '{"newscast_id":"2025-09-29T09-05-22-132Z","topic_index":1}' \
  response.json

# 결과 확인
cat response.json | jq .
```

### 3. API Gateway 테스트
```bash
# REST API 호출
curl -X POST https://mjo3i4woz9.execute-api.ap-northeast-2.amazonaws.com/prod/newscast \
  -H "Content-Type: application/json" \
  -d '{"newscast_id":"2025-09-29T09-05-22-132Z","topic_index":1}'
```

## 🔐 보안 고려사항

### IAM 권한
Lambda 함수에 필요한 권한:
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`

### API Gateway 보안
- HTTPS 강제
- CORS 설정 (필요시)
- Rate Limiting (필요시)

### R2 Public URL
- 읽기 전용 Public URL 사용
- 쓰기 권한 없음 (안전)

## 📝 향후 개발 계획

### Phase 1: 기능 완성
- [x] FFmpeg 병합 구현
- [x] Base64 인코딩 반환
- [x] API Gateway 연동
- [x] 로컬 테스트 CLI

### Phase 2: 성능 최적화
- [ ] 병렬 다운로드 (asyncio)
- [ ] 캐싱 전략 (EFS 또는 S3)
- [ ] Cold Start 최적화

### Phase 3: 고급 기능
- [ ] 오디오 정규화 (볼륨 조정)
- [ ] 메타데이터 임베딩 (ID3 태그)
- [ ] 스트리밍 응답 (대용량 파일)

---
*최종 업데이트: 2025-09-30 - Lambda 배포 및 API Gateway 연동 완성*
