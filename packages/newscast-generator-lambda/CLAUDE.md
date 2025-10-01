# Newscast Generator Lambda Package - AI Development Guide

Claude에게: 이 패키지는 AWS Lambda에서 FFmpeg를 사용하여 오디오 병합을 수행합니다. 사용자 친화적 정보는 README.md를 참조하세요. 이 문서는 Lambda 아키텍처, FFmpeg 통합, 배포 전략에 집중합니다.

## 🏗️ 아키텍처 설계

**핵심 원칙:**
- **서버리스 FFmpeg**: Lambda Layer를 통한 FFmpeg 정적 바이너리 실행
- **R2 통합**: Public URL을 통한 오디오 파일 다운로드 (인증 불필요)
- **Base64 응답**: 6MB Lambda 응답 제한 내에서 오디오 전송
- **임시 스토리지**: `/tmp` 디렉터리 활용 (최대 10GB)

**Lambda 제약사항 대응:**
- 타임아웃 60초: FFmpeg concat demuxer (re-encoding 없음)
- 메모리 512MB: 순차 다운로드로 메모리 압력 최소화
- Cold Start: 정적 바이너리 + 최소 의존성

## 📁 파일 구조 및 책임

### lambda_function.py
**책임**: Lambda 핸들러 및 오케스트레이션
```python
def lambda_handler(event, context):
    # 1. API Gateway 이벤트 파싱
    body = parse_event(event)

    # 2. 파라미터 검증
    newscast_id = body['newscast_id']
    topic_index = body['topic_index']

    # 3. 워크플로우 실행
    audio_files = download_audio_files(...)
    merged_audio = merge_with_ffmpeg(...)
    audio_base64 = encode_base64(merged_audio)

    # 4. 응답 생성
    return response(audio_base64)
```

**중요 패턴:**
- API Gateway Proxy 통합: `event['body']` 파싱 필수
- 에러 핸들링: try/except + 임시 파일 정리
- 로깅: CloudWatch Logs로 디버깅 정보 전송

### deploy.sh
**책임**: Lambda 함수 및 FFmpeg 레이어 배포
```bash
#!/bin/bash
# 1. Lambda 함수 업데이트 (코드만)
aws lambda update-function-code \
  --function-name newscast-generator-lambda \
  --zip-file fileb://deployment-package.zip

# 2. FFmpeg 레이어는 별도 관리 (초기 1회만)
# aws lambda publish-layer-version \
#   --layer-name ffmpeg-layer \
#   --content S3Bucket=ai-newscast,S3Key=lambda-layers/ffmpeg-layer.zip
```

**배포 전략:**
- 함수 코드: `lambda_function.py`만 ZIP으로 패키징
- FFmpeg 레이어: S3 업로드 후 Lambda Layer로 등록 (58MB)
- 환경변수: `R2_PUBLIC_URL` 설정 (대시보드 또는 CLI)

### test_lambda.py
**책임**: 로컬 테스트 CLI (Typer)
```python
import typer

app = typer.Typer()

@app.command()
def test(
    newscast_id: str = typer.Option(..., "--newscast-id", "-n"),
    topic_index: int = typer.Option(..., "--topic-index", "-t"),
    dry_run: bool = typer.Option(True, "--dry-run/--no-dry-run"),
    output: str = typer.Option(None, "--output", "-o"),
):
    # Lambda 함수 시뮬레이션
    event = {
        "body": json.dumps({
            "newscast_id": newscast_id,
            "topic_index": topic_index,
            "dry_run": dry_run
        })
    }

    result = lambda_handler(event, None)

    # 결과 저장
    if output and not dry_run:
        save_audio(result['audio_base64'], output)
```

## 🛠️ 기술 스택 및 도구

### Python 환경
- **Python 3.13**: AWS Lambda 최신 런타임
- **UV 패키지 매니저**: 고속 의존성 관리
  ```bash
  uv venv                    # 가상환경 생성
  uv pip install -e ".[dev]" # 개발 의존성 포함 설치
  ```
- **pyproject.toml**: 프로젝트 메타데이터 및 의존성
  ```toml
  [project]
  name = "newscast-generator-lambda"
  dependencies = []  # Lambda 런타임에 기본 포함된 라이브러리만 사용

  [project.optional-dependencies]
  dev = ["typer", "rich", "boto3", "pytest"]
  ```

### FFmpeg 통합
- **정적 바이너리**: johnvansickle.com에서 다운로드
  ```bash
  wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  tar -xf ffmpeg-release-amd64-static.tar.xz
  cp ffmpeg-*-amd64-static/ffmpeg ./ffmpeg-layer/bin/
  ```
- **Lambda Layer 구조**:
  ```
  ffmpeg-layer.zip
  └── bin/
      └── ffmpeg  # 실행 권한 755
  ```
- **Layer 경로**: `/opt/bin/ffmpeg` (Lambda 환경)

### AWS 리소스
- **Lambda 함수**: 512MB 메모리, 60초 타임아웃
- **API Gateway**: REST API `/prod/newscast` 엔드포인트
- **CloudWatch Logs**: `/aws/lambda/newscast-generator-lambda`
- **IAM 역할**: 로그 쓰기 권한만 필요

## 🚀 배포 프로세스

### 1단계: FFmpeg 레이어 준비 (초기 1회)
```bash
# 1. FFmpeg 다운로드 및 압축
mkdir -p ffmpeg-layer/bin
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
cp ffmpeg-*-amd64-static/ffmpeg ffmpeg-layer/bin/
chmod +x ffmpeg-layer/bin/ffmpeg
cd ffmpeg-layer && zip -r ../ffmpeg-layer.zip . && cd ..

# 2. S3 버킷 생성 (ZIP 파일이 50MB 초과)
aws s3 mb s3://ai-newscast --region ap-northeast-2

# 3. S3 업로드
aws s3 cp ffmpeg-layer.zip s3://ai-newscast/lambda-layers/ffmpeg-layer.zip

# 4. Lambda Layer 발행
aws lambda publish-layer-version \
  --layer-name ffmpeg-layer \
  --description "FFmpeg 7.0.2 static binary" \
  --content S3Bucket=ai-newscast,S3Key=lambda-layers/ffmpeg-layer.zip \
  --compatible-runtimes python3.13 \
  --compatible-architectures x86_64 \
  --region ap-northeast-2

# 5. Layer ARN 저장
# arn:aws:lambda:ap-northeast-2:ACCOUNT_ID:layer:ffmpeg-layer:1
```

### 2단계: Lambda 함수 배포
```bash
# 1. 코드 패키징
zip deployment-package.zip lambda_function.py

# 2. Lambda 함수 업데이트
aws lambda update-function-code \
  --function-name newscast-generator-lambda \
  --zip-file fileb://deployment-package.zip \
  --region ap-northeast-2

# 3. 환경변수 설정
aws lambda update-function-configuration \
  --function-name newscast-generator-lambda \
  --environment Variables="{R2_PUBLIC_URL=https://pub-xxx.r2.dev}" \
  --region ap-northeast-2

# 4. Layer 연결 (초기 1회 또는 Layer 업데이트 시)
aws lambda update-function-configuration \
  --function-name newscast-generator-lambda \
  --layers arn:aws:lambda:ap-northeast-2:ACCOUNT_ID:layer:ffmpeg-layer:1 \
  --region ap-northeast-2
```

### 3단계: API Gateway 연동
```bash
# 1. REST API 생성
aws apigatewayv2 create-api \
  --name ai-newscast-api \
  --protocol-type HTTP \
  --region ap-northeast-2

# 2. Lambda 통합 설정
aws apigatewayv2 create-integration \
  --api-id <API_ID> \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:ap-northeast-2:ACCOUNT_ID:function:newscast-generator-lambda \
  --payload-format-version 2.0

# 3. Route 생성
aws apigatewayv2 create-route \
  --api-id <API_ID> \
  --route-key "POST /newscast"

# 4. Stage 배포
aws apigatewayv2 create-stage \
  --api-id <API_ID> \
  --stage-name prod \
  --auto-deploy
```

## 📋 API 사양

### 요청 형식
```json
{
  "newscast_id": "2025-09-29T09-05-22-132Z",
  "topic_index": 1,
  "dry_run": false
}
```

**파라미터:**
- `newscast_id` (string, 필수): ISO 8601 타임스탬프 형식
- `topic_index` (integer, 필수): 1-10 범위
- `dry_run` (boolean, 선택): true면 파일 확인만 수행

### 응답 형식
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

**필드 설명:**
- `input_files`: 병합된 오디오 파일 수
- `output_file_size`: 최종 MP3 파일 크기 (bytes)
- `audio_base64`: Base64로 인코딩된 오디오 데이터
- `message`: 처리 상태 메시지

### 에러 응답
```json
{
  "statusCode": 500,
  "error": "Failed to merge audio files with FFmpeg",
  "details": "FFmpeg exit code: 1"
}
```

## 🔧 FFmpeg 병합 로직

### Concat Demuxer 사용
```python
def merge_audio_files(audio_files, temp_dir, ffmpeg_path='/opt/bin/ffmpeg'):
    # 1. filelist.txt 생성
    filelist_path = os.path.join(temp_dir, 'filelist.txt')
    with open(filelist_path, 'w') as f:
        for audio_file in audio_files:
            filename = audio_file['filename']
            filepath = os.path.join(temp_dir, filename)
            f.write(f"file '{filepath}'\n")

    # 2. FFmpeg 실행 (concat demuxer)
    output_path = os.path.join(temp_dir, 'newscast.mp3')
    cmd = [
        ffmpeg_path,
        '-f', 'concat',           # concat demuxer
        '-safe', '0',             # 절대 경로 허용
        '-i', filelist_path,      # 입력 파일 목록
        '-c', 'copy',             # codec copy (re-encoding 없음)
        '-y',                     # 덮어쓰기
        output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

    # 3. 결과 읽기
    with open(output_path, 'rb') as f:
        return f.read()
```

**최적화 포인트:**
- `-c copy`: 오디오 재인코딩 없이 스트림만 복사 (초고속)
- `-safe 0`: 절대 경로 사용 가능
- `concat demuxer`: 메타데이터 손실 없이 병합

### R2 다운로드 최적화
```python
def download_audio_files(r2_public_url, newscast_id, topic_index):
    # 1. audio-files.json 다운로드
    topic_padded = f"{topic_index:02d}"
    base_url = f"{r2_public_url}/newscasts/{newscast_id}/topic-{topic_padded}/audio"

    audio_files_url = f"{base_url}/audio-files.json"
    response = requests.get(audio_files_url, timeout=10)
    audio_files = response.json()['files']

    # 2. 임시 디렉터리 생성
    temp_dir = f"/tmp/newscast-{newscast_id}-{topic_index}"
    os.makedirs(temp_dir, exist_ok=True)

    # 3. 개별 파일 다운로드 (순차 처리)
    downloaded_files = []
    for filename in audio_files:
        file_url = f"{base_url}/{filename}"
        file_path = os.path.join(temp_dir, filename)

        response = requests.get(file_url, timeout=30)
        with open(file_path, 'wb') as f:
            f.write(response.content)

        downloaded_files.append({
            'filename': filename,
            'size': len(response.content)
        })

    return downloaded_files, temp_dir
```

## 🚨 문제 해결

### 문제 1: FFmpeg not found
**증상**: `FileNotFoundError: [Errno 2] No such file or directory: '/opt/bin/ffmpeg'`

**원인**: Lambda Layer가 연결되지 않음

**해결**:
```bash
# Layer 연결 상태 확인
aws lambda get-function-configuration \
  --function-name newscast-generator-lambda \
  --query 'Layers[*].Arn'

# Layer 재연결
aws lambda update-function-configuration \
  --function-name newscast-generator-lambda \
  --layers arn:aws:lambda:ap-northeast-2:ACCOUNT_ID:layer:ffmpeg-layer:1
```

### 문제 2: API Gateway 파싱 에러
**증상**: `KeyError: 'newscast_id'`

**원인**: API Gateway Proxy 통합에서 `event['body']`가 JSON 문자열

**해결**:
```python
def lambda_handler(event, context):
    # API Gateway에서 온 요청 파싱
    if 'body' in event:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
    else:
        body = event  # 직접 호출

    newscast_id = body['newscast_id']
```

### 문제 3: 타임아웃 발생
**증상**: Lambda 실행이 60초에 타임아웃

**원인**: 많은 오디오 파일 또는 느린 R2 다운로드

**해결**:
```bash
# 타임아웃 증가
aws lambda update-function-configuration \
  --function-name newscast-generator-lambda \
  --timeout 120

# 또는 메모리 증가 (CPU도 비례 증가)
aws lambda update-function-configuration \
  --function-name newscast-generator-lambda \
  --memory-size 1024
```

### 문제 4: Base64 응답이 너무 큼
**증상**: Lambda 응답 크기 제한 (6MB) 초과

**원인**: 긴 뉴스캐스트 오디오 (>4.5MB MP3)

**해결**: S3 업로드 후 presigned URL 반환으로 변경 (향후 개선)

## 📊 모니터링 및 로깅

### CloudWatch Logs 패턴
```python
# 중요 로그 메시지
print(f"[INFO] Downloading audio files from R2: {newscast_id}")
print(f"[INFO] Downloaded {len(audio_files)} files ({total_size} bytes)")
print(f"[INFO] Merging audio with FFmpeg...")
print(f"[INFO] Merged audio size: {len(merged_audio)} bytes")
print(f"[ERROR] FFmpeg failed with exit code {exit_code}")
```

### 로그 검색 쿼리
```bash
# 에러 로그만 필터링
aws logs filter-log-events \
  --log-group-name /aws/lambda/newscast-generator-lambda \
  --filter-pattern "[ERROR]"

# 특정 newscast_id 검색
aws logs filter-log-events \
  --log-group-name /aws/lambda/newscast-generator-lambda \
  --filter-pattern "2025-09-29T09-05-22-132Z"
```

### 성능 메트릭
- **Cold Start**: ~1-2초 (FFmpeg Layer 로드)
- **다운로드**: ~2-3초 (20개 파일 기준)
- **FFmpeg 병합**: ~1-2초 (concat demuxer)
- **Base64 인코딩**: ~0.5초
- **총 실행 시간**: ~5-8초

## 🔐 보안 고려사항

### IAM 역할 최소 권한
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-northeast-2:ACCOUNT_ID:log-group:/aws/lambda/newscast-generator-lambda:*"
    }
  ]
}
```

### R2 Public URL 보안
- **읽기 전용**: Public URL은 읽기만 가능
- **쓰기 불가**: Lambda에서 R2에 쓰기 작업 없음
- **인증 불필요**: Public URL 사용으로 간소화

### API Gateway 보안 (선택)
```bash
# API Key 필수화
aws apigatewayv2 update-route \
  --api-id <API_ID> \
  --route-id <ROUTE_ID> \
  --api-key-required

# Usage Plan 생성 (Rate Limiting)
aws apigatewayv2 create-usage-plan \
  --name ai-newscast-plan \
  --throttle burstLimit=10,rateLimit=5
```

## 🔄 개발 워크플로우

### 로컬 개발 → 테스트 → 배포
```bash
# 1. 코드 수정
vim lambda_function.py

# 2. 로컬 테스트
python test_lambda.py --newscast-id "2025-09-29T09-05-22-132Z" --topic-index 1

# 3. 배포
pnpm run deploy

# 4. Lambda 테스트
aws lambda invoke \
  --function-name newscast-generator-lambda \
  --payload '{"newscast_id":"2025-09-29T09-05-22-132Z","topic_index":1}' \
  response.json

# 5. API Gateway 테스트
curl -X POST https://mjo3i4woz9.execute-api.ap-northeast-2.amazonaws.com/prod/newscast \
  -H "Content-Type: application/json" \
  -d '{"newscast_id":"2025-09-29T09-05-22-132Z","topic_index":1}'
```

---
*최종 업데이트: 2025-09-30 - Lambda + FFmpeg 아키텍처 완성*
