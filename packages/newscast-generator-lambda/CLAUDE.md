# Newscast Generator Lambda Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. Cloudflare R2에서 개별 TTS 오디오 파일 다운로드
2. FFmpeg로 오디오 파일들을 단일 뉴스캐스트 MP3로 병합
3. Base64로 인코딩하여 API Gateway를 통해 응답
4. 서버리스 환경에서 자동 스케일링

### 구현 상태
- ✅ **완성** - Python 3.13 Lambda 함수
- ✅ FFmpeg 정적 바이너리 Lambda Layer 통합
- ✅ R2 Public URL을 통한 파일 다운로드
- ✅ API Gateway Proxy 통합
- ✅ Base64 응답 형식

---

## 🏗️ 파일 구조 및 역할

```
packages/newscast-generator-lambda/
├── lambda_function.py         # Lambda 핸들러 및 메인 로직
├── audio_downloader.py        # R2에서 오디오 파일 다운로드
├── audio_processor.py         # FFmpeg 오디오 병합
├── deploy.sh                  # Lambda 함수 및 Layer 배포 스크립트
├── pyproject.toml             # Python 프로젝트 설정 (UV)
├── requirements.txt           # Lambda 런타임 의존성 (비어 있음)
└── test-payload.json          # 테스트용 이벤트 페이로드
```

---

## 🔧 API 및 함수 시그니처

### lambda_handler() (lambda_function.py)

```python
def lambda_handler(event: dict, context: Any) -> dict:
    """
    Lambda 메인 핸들러

    Args:
        event: API Gateway Proxy 이벤트
            {
                "body": "{\"newscast_id\":\"...\",\"topic_index\":1,\"dry_run\":false}"
            }
        context: Lambda 컨텍스트 (미사용)

    Returns:
        {
            "statusCode": 200,
            "newscast_id": "...",
            "topic_index": 1,
            "input_files": 19,
            "output_file_size": 819020,
            "audio_base64": "SUQzBA...",
            "message": "Audio files merged successfully"
        }
    """
```

### download_audio_files() (audio_downloader.py)

```python
def download_audio_files(
    r2_public_url: str,
    newscast_id: str,
    topic_index: int
) -> tuple[list[dict], str]:
    """
    R2에서 오디오 파일 다운로드

    Returns:
        (downloaded_files, temp_dir)
        downloaded_files: [{"filename": "001-music.mp3", "size": 12345}, ...]
        temp_dir: /tmp/newscast-{newscast_id}-{topic_index}
    """
```

### merge_audio_files() (audio_processor.py)

```python
def merge_audio_files(
    audio_files: list[dict],
    temp_dir: str,
    ffmpeg_path: str = '/opt/bin/ffmpeg'
) -> bytes:
    """
    FFmpeg로 오디오 파일 병합

    Returns:
        병합된 MP3 파일의 바이트 데이터
    """
```

---

## 🎨 코딩 규칙 (패키지 특화)

### Python 특화 규칙

#### MUST: snake_case 네이밍 (Python 표준)
```python
# ✅ CORRECT
def lambda_handler(event, context):
    newscast_id = body['newscast_id']     # snake_case
    topic_index = body['topic_index']     # snake_case
    dry_run = body.get('dry_run', False)  # snake_case

# ❌ WRONG
def lambdaHandler(event, context):       # ❌ camelCase in Python
    newscastId = body['newscastId']      # ❌ camelCase
```

#### MUST: API Gateway 이벤트 파싱
```python
# ✅ CORRECT
def lambda_handler(event, context):
    # API Gateway Proxy 통합에서 body는 JSON 문자열
    if 'body' in event:
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
    else:
        body = event  # 직접 Lambda 호출

    newscast_id = body['newscast_id']

# ❌ WRONG
def lambda_handler(event, context):
    newscast_id = event['newscast_id']   # ❌ API Gateway에서 오면 KeyError
```

#### MUST: 임시 파일 정리
```python
# ✅ CORRECT
def lambda_handler(event, context):
    temp_dir = None
    try:
        downloaded_files, temp_dir = download_audio_files(...)
        merged_audio = merge_audio_files(...)
        return success_response(merged_audio)
    except Exception as e:
        return error_response(str(e))
    finally:
        # 임시 파일 정리
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

# ❌ WRONG
def lambda_handler(event, context):
    downloaded_files, temp_dir = download_audio_files(...)
    merged_audio = merge_audio_files(...)
    return success_response(merged_audio)  # ❌ 임시 파일 남음
```

### FFmpeg 사용 규칙

#### MUST: Concat Demuxer 사용 (re-encoding 금지)
```python
# ✅ CORRECT
def merge_audio_files(audio_files, temp_dir, ffmpeg_path='/opt/bin/ffmpeg'):
    # filelist.txt 생성
    filelist_path = os.path.join(temp_dir, 'filelist.txt')
    with open(filelist_path, 'w') as f:
        for audio_file in audio_files:
            filepath = os.path.join(temp_dir, audio_file['filename'])
            f.write(f"file '{filepath}'\n")

    # FFmpeg concat demuxer
    output_path = os.path.join(temp_dir, 'newscast.mp3')
    cmd = [
        ffmpeg_path,
        '-f', 'concat',      # concat demuxer
        '-safe', '0',        # 절대 경로 허용
        '-i', filelist_path,
        '-c', 'copy',        # codec copy (re-encoding 없음)
        '-y',
        output_path
    ]

    subprocess.run(cmd, check=True, capture_output=True)

# ❌ WRONG
cmd = [
    ffmpeg_path,
    '-i', 'concat:file1.mp3|file2.mp3',  # ❌ concat protocol (비권장)
    output_path
]
```

#### MUST: FFmpeg 에러 처리
```python
# ✅ CORRECT
try:
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
except subprocess.CalledProcessError as e:
    print(f"[ERROR] FFmpeg failed with exit code {e.returncode}")
    print(f"[ERROR] stderr: {e.stderr}")
    raise Exception(f"FFmpeg error: {e.stderr}")

# ❌ WRONG
subprocess.run(cmd)  # ❌ 에러 체크 없음
```

### R2 다운로드 규칙

#### MUST: Public URL 사용
```python
# ✅ CORRECT
r2_public_url = os.environ['R2_PUBLIC_URL']  # https://pub-xxx.r2.dev
topic_padded = f"{topic_index:02d}"          # 01, 02, ..., 10

base_url = f"{r2_public_url}/newscasts/{newscast_id}/topic-{topic_padded}/audio"
audio_files_url = f"{base_url}/audio-files.json"

response = requests.get(audio_files_url, timeout=10)
audio_files = response.json()

# ❌ WRONG
base_url = f"https://r2.cloudflarestorage.com/..."  # ❌ Private endpoint (인증 필요)
```

#### MUST: 타임아웃 설정
```python
# ✅ CORRECT
response = requests.get(file_url, timeout=30)  # 30초 타임아웃

# ❌ WRONG
response = requests.get(file_url)  # ❌ 타임아웃 없음 (무한 대기)
```

---

## 🚨 에러 처리 방식

### Lambda 표준 에러 응답

```python
# ✅ CORRECT
def lambda_handler(event, context):
    try:
        # 메인 로직
        body = parse_event(event)
        validate_params(body)
        result = process(body)
        return {
            'statusCode': 200,
            **result
        }
    except KeyError as e:
        return {
            'statusCode': 400,
            'error': 'Missing required parameter',
            'details': str(e)
        }
    except subprocess.CalledProcessError as e:
        return {
            'statusCode': 500,
            'error': 'FFmpeg processing failed',
            'details': e.stderr
        }
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return {
            'statusCode': 500,
            'error': 'Internal server error',
            'details': str(e)
        }
```

### 로깅 패턴

```python
# ✅ CORRECT
print(f"[INFO] Processing newscast: {newscast_id}, topic: {topic_index}")
print(f"[INFO] Downloaded {len(audio_files)} files ({total_size} bytes)")
print(f"[INFO] FFmpeg merging started...")
print(f"[INFO] Merged audio size: {len(merged_audio)} bytes")
print(f"[ERROR] Failed to download: {file_url}")

# ❌ WRONG
print("Processing...")  # ❌ 구체적 정보 없음
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **newscast-generator**: 이 Lambda가 병합할 오디오 파일을 생성
- **newscast-generator-worker**: 이 Lambda API를 호출하는 Worker
- **newscast-scheduler-worker**: 전체 파이프라인에서 이 Lambda 호출

### API 호출 예시 (TypeScript → Lambda)

```typescript
// newscast-generator에서 호출
const response = await fetch(lambdaURL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    newscast_id: newscastID,     // snake_case
    topic_index: topicIndex,     // snake_case
    dry_run: false               // snake_case
  })
});

const result = await response.json();
const audioBuffer = Buffer.from(result.audio_base64, 'base64');
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### Lambda 제약사항 (MUST)

#### MUST: /tmp 디렉터리 사용
```python
# ✅ CORRECT
temp_dir = f"/tmp/newscast-{newscast_id}-{topic_index}"
os.makedirs(temp_dir, exist_ok=True)

# ❌ WRONG
temp_dir = f"/home/lambda/newscast-{newscast_id}"  # ❌ 쓰기 권한 없음
```

#### MUST: 임시 파일 정리 (디스크 공간 절약)
```python
# ✅ CORRECT
finally:
    if temp_dir and os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)

# ❌ WRONG
# 정리 안 함 (다음 invocation에 영향)
```

#### MUST: FFmpeg Layer 경로
```python
# ✅ CORRECT
ffmpeg_path = '/opt/bin/ffmpeg'  # Lambda Layer 경로

# ❌ WRONG
ffmpeg_path = 'ffmpeg'  # ❌ PATH에 없음
```

### API Gateway 통합 (MUST)

#### MUST: body 파싱
```python
# ✅ CORRECT
if 'body' in event:
    body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
else:
    body = event

# ❌ WRONG
body = event['body']  # ❌ 문자열일 수 있음
```

#### MUST: CORS 헤더 (API Gateway에서 설정 권장)
```python
# ✅ CORRECT (Lambda에서 직접 설정 시)
return {
    'statusCode': 200,
    'headers': {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    },
    'body': json.dumps(result)
}
```

### Base64 응답 (MUST)

#### MUST: 크기 제한 체크 (6MB)
```python
# ✅ CORRECT
audio_base64 = base64.b64encode(merged_audio).decode('utf-8')

# Base64는 원본 대비 1.33배 증가
if len(audio_base64) > 6 * 1024 * 1024:
    raise Exception(f"Audio too large: {len(audio_base64)} bytes (max 6MB)")

# ❌ WRONG
return {'audio_base64': audio_base64}  # ❌ 크기 체크 없음
```

### 배포 (MUST)

#### MUST: deployment-package.zip 최소화
```bash
# ✅ CORRECT
zip deployment-package.zip lambda_function.py audio_downloader.py audio_processor.py

# ❌ WRONG
zip -r deployment-package.zip .  # ❌ .venv, __pycache__ 포함
```

#### MUST: FFmpeg Layer 별도 관리
```bash
# ✅ CORRECT
# Layer는 S3 업로드 후 Lambda Layer로 등록 (58MB)
aws s3 cp ffmpeg-layer.zip s3://ai-newscast/lambda-layers/
aws lambda publish-layer-version \
  --layer-name ffmpeg-layer \
  --content S3Bucket=ai-newscast,S3Key=lambda-layers/ffmpeg-layer.zip

# ❌ WRONG
# FFmpeg를 deployment-package.zip에 포함 (크기 초과)
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md) (TypeScript 규칙은 Python에 적용 안 함)
- **배포 스크립트**: [deploy.sh](deploy.sh)
- **Lambda 런타임**: Python 3.13 공식 문서

---

*최종 업데이트: 2025-10-11 - Python Lambda 함수 (FFmpeg 오디오 병합)*
