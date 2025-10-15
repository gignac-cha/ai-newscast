# Cloudflare R2 Uploader Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. 뉴스캐스트 파일을 Cloudflare R2 스토리지에 업로드
2. S3-compatible API를 사용한 파일 전송
3. TypeScript 강타입 인터페이스 제공
4. Zod 런타임 검증을 통한 안전성 보장
5. Commander.js 기반 CLI 인터페이스

### 구현 상태
- ✅ **완성** - TypeScript 타입 정의 및 CLI 구조
- ✅ **완성** - S3Client 통합 로직 (cloud-architect 구현 완료)

---

## 🏗️ 파일 구조 및 역할

### 핵심 파일
```
packages/cloudflare-uploader/
├── command.ts              # CLI 엔트리포인트 (Commander.js)
├── uploader.ts             # 핵심 업로드 로직 (S3Client)
├── types.ts                # TypeScript 인터페이스 및 Zod 스키마
├── package.json            # 의존성 및 스크립트
├── tsconfig.json           # TypeScript 설정
├── CLAUDE.md               # 패키지 문서 (이 파일)
└── README.md               # 사용자 문서
```

---

## 🔧 API 및 함수 시그니처

### 핵심 인터페이스

#### UploadOptions
```typescript
export interface UploadOptions {
  inputDir: string;           // 입력 디렉터리 (e.g., output/{newscastID}/topic-{N}/)
  newscastID: string;         // 뉴스캐스트 ID (ISO timestamp)
  topicIndex: number;         // 토픽 인덱스 (1-10)
  basePath: string;           // R2 기본 경로 ('newscasts' or 'tests/newscasts')
  accountID: string;          // Cloudflare Account ID
  accessKeyID: string;        // R2 Access Key ID
  secretAccessKey: string;    // R2 Secret Access Key
  bucketName: string;         // R2 버킷 이름 (기본: 'ai-newscast')
}
```

#### UploadResult
```typescript
export interface UploadResult {
  filesUploaded: number;      // 업로드된 파일 개수
  totalBytes: number;         // 총 업로드 바이트 수
  duration: number;           // 업로드 소요 시간 (milliseconds)
  uploadedFiles: string[];    // 업로드된 파일의 R2 키 목록
}
```

### 핵심 함수

#### uploadToR2()
```typescript
export async function uploadToR2(
  options: UploadOptions
): Promise<UploadResult>
```

**역할**: 뉴스캐스트 파일을 R2에 업로드

**검증**: Zod 스키마를 사용한 옵션 검증

**에러 처리**:
- 옵션 검증 실패 시 ZodError 발생
- S3 API 에러 시 적절한 메시지와 함께 실패

#### uploadNewscast()
```typescript
export async function uploadNewscast(
  options: Omit<UploadOptions, 'basePath'>,
  testMode: boolean = false
): Promise<UploadResult>
```

**역할**: 테스트 모드를 지원하는 업로드 래퍼

**basePath 자동 설정**:
- `testMode === false`: `'newscasts'`
- `testMode === true`: `'tests/newscasts'`

### Zod 검증 함수

#### validateUploadOptions()
```typescript
export function validateUploadOptions(options: unknown): UploadOptions
```

**역할**: 런타임 옵션 검증

**에러**: 검증 실패 시 `z.ZodError` 발생

#### isValidUploadOptions()
```typescript
export function isValidUploadOptions(options: unknown): options is UploadOptions
```

**역할**: 타입 가드 함수 (불리언 반환)

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)

#### 1. camelCase 네이밍
- **약어는 모두 대문자**: `ID`, `URL`, `API`, `JSON`, `HTML`
- **전체 단어 사용**: `maximum`, `minimum`, `average` (not `max`, `min`, `avg`)

```typescript
// ✅ CORRECT
interface UploadOptions {
  newscastID: string;       // ID 대문자
  accountID: string;        // ID 대문자
  accessKeyID: string;      // ID 대문자
  bucketName: string;       // 전체 단어
}

// ❌ WRONG
interface UploadOptions {
  newscastId: string;       // ❌ Id 소문자
  accountId: string;        // ❌ Id 소문자
}
```

#### 2. 시간 단위 규칙
- **밀리세컨드는 단위 생략** (기본 시간 단위)
- **다른 단위는 명시** (`durationSeconds`, `durationMinutes`)

```typescript
// ✅ CORRECT
interface UploadResult {
  duration: number;          // 밀리세컨드 (단위 생략)
}

// ❌ WRONG
interface UploadResult {
  durationMS: number;        // ❌ MS 붙이지 말 것
  durationMilliseconds: number;  // ❌ Milliseconds 붙이지 말 것
}
```

#### 3. Nullish Coalescing 사용
- **`??` 사용** (nullish coalescing)
- **`||` 사용 금지** (falsy 값 처리 오류)

```typescript
// ✅ CORRECT
const accountID = cmdOptions.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
const bucketName = cmdOptions.bucketName ?? 'ai-newscast';

// ❌ WRONG
const accountID = cmdOptions.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;  // ❌ 빈 문자열도 falsy
```

### R2 업로드 특화 규칙

#### MUST: R2 키 경로 규칙
```typescript
// ✅ CORRECT
// R2 키 형식: {basePath}/{newscastID}/topic-{topicIndex}/{relativePath}
const r2Key = `${basePath}/${newscastID}/topic-${String(topicIndex).padStart(2, '0')}/${relativePath}`;

// 예시:
// - newscasts/2025-10-05T19-53-26-599Z/topic-01/newscast.mp3
// - newscasts/2025-10-05T19-53-26-599Z/topic-01/audio/001-music.mp3
// - tests/newscasts/2025-10-05T19-53-26-599Z/topic-01/newscast.mp3

// ❌ WRONG
const r2Key = `${newscastID}/${relativePath}`;  // ❌ basePath 누락
const r2Key = `${basePath}/${newscastID}/topic${topicIndex}/${relativePath}`;  // ❌ 하이픈 누락
```

#### MUST: MIME 타입 설정
```typescript
// ✅ CORRECT
const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.xml': 'application/xml',
};

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

// ❌ WRONG
function getMimeType(filePath: string): string {
  return 'application/octet-stream';  // ❌ 항상 기본값
}
```

#### MUST: 재귀 디렉터리 스캔
```typescript
// ✅ CORRECT
async function scanDirectory(
  directory: string,
  basePath: string,
  newscastID: string,
  topicIndex: number
): Promise<FileUploadMetadata[]> {
  const files: FileUploadMetadata[] = [];

  // 1. 디렉터리 읽기
  const entries = await readdir(directory, { withFileTypes: true });

  // 2. 재귀적으로 파일 탐색
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      // 하위 디렉터리 재귀 호출
      const subFiles = await scanDirectory(fullPath, basePath, newscastID, topicIndex);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      // 파일 메타데이터 생성
      const stats = await stat(fullPath);
      const relativePath = fullPath.replace(`${directory}/`, '');
      const r2Key = `${basePath}/${newscastID}/topic-${String(topicIndex).padStart(2, '0')}/${relativePath}`;

      files.push({
        localPath: fullPath,
        r2Key: r2Key,
        size: stats.size,
        contentType: getMimeType(fullPath),
      });
    }
  }

  return files;
}

// ❌ WRONG
async function scanDirectory(directory: string): Promise<FileUploadMetadata[]> {
  const entries = await readdir(directory);
  return entries.map(entry => ({ /* ... */ }));  // ❌ 재귀 없음, 하위 디렉터리 무시
}
```

#### MUST: Zod 검증
```typescript
// ✅ CORRECT
export async function uploadToR2(options: UploadOptions): Promise<UploadResult> {
  // Zod 검증
  const validatedOptions = validateUploadOptions(options);

  // 검증된 옵션 사용
  console.log(`Uploading to ${validatedOptions.bucketName}...`);

  // ...
}

// ❌ WRONG
export async function uploadToR2(options: UploadOptions): Promise<UploadResult> {
  // Zod 검증 없이 바로 사용
  console.log(`Uploading to ${options.bucketName}...`);  // ❌ 검증 누락
}
```

---

## 🚨 에러 처리 방식

### Zod 검증 에러

```typescript
// ✅ CORRECT
try {
  const validatedOptions = validateUploadOptions(options);
  // ...
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation error:', error.errors);
    throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
  }
  throw error;
}
```

### S3 API 에러

```typescript
// ✅ CORRECT
try {
  await client.send(command);
} catch (error) {
  if (error instanceof Error) {
    if (error.name === 'NoSuchBucket') {
      throw new Error(`Bucket '${bucketName}' does not exist`);
    } else if (error.name === 'InvalidAccessKeyId') {
      throw new Error('Invalid R2 credentials - check your Access Key ID');
    } else if (error.name === 'SignatureDoesNotMatch') {
      throw new Error('Invalid R2 credentials - check your Secret Access Key');
    }
  }
  throw error;
}
```

### 환경 변수 누락 에러

```typescript
// ✅ CORRECT
if (!accountID) {
  console.error('Error: Cloudflare Account ID is required (--account-id or CLOUDFLARE_ACCOUNT_ID env var)');
  process.exit(1);
}

if (!accessKeyID) {
  console.error('Error: R2 Access Key ID is required (--access-key-id or CLOUDFLARE_ACCESS_KEY_ID env var)');
  process.exit(1);
}

if (!secretAccessKey) {
  console.error('Error: R2 Secret Access Key is required (--secret-access-key or CLOUDFLARE_SECRET_ACCESS_KEY env var)');
  process.exit(1);
}
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **core**: 공통 타입 정의 import (현재는 사용 안 함, 향후 확장 예정)
- **newscast-generator**: 이 패키지가 newscast-generator의 출력을 업로드
- **GitHub Actions**: 이 패키지를 CI/CD 파이프라인에서 사용

### Export (다른 패키지/스크립트에서 사용)

```typescript
// GitHub Actions workflow에서 사용 예시
import { uploadNewscast } from '@ai-newscast/cloudflare-uploader';

const result = await uploadNewscast({
  inputDir: 'output/2025-10-05T19-53-26-599Z/topic-01',
  newscastID: '2025-10-05T19-53-26-599Z',
  topicIndex: 1,
  accountID: process.env.CLOUDFLARE_ACCOUNT_ID!,
  accessKeyID: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  bucketName: 'ai-newscast',
}, false);

console.log(`Uploaded ${result.filesUploaded} files`);
```

---

## 📖 CLI 사용 예시

### 기본 업로드
```bash
cloudflare-uploader upload \
  -i output/2025-10-05T19-53-26-599Z/topic-01 \
  -n 2025-10-05T19-53-26-599Z \
  -t 1
```

### 테스트 모드 업로드
```bash
cloudflare-uploader upload \
  -i output/2025-10-05T19-53-26-599Z/topic-01 \
  -n 2025-10-05T19-53-26-599Z \
  -t 1 \
  --test
```

### 환경 변수 대신 명령줄 옵션 사용
```bash
cloudflare-uploader upload \
  -i output/2025-10-05T19-53-26-599Z/topic-01 \
  -n 2025-10-05T19-53-26-599Z \
  -t 1 \
  --account-id YOUR_ACCOUNT_ID \
  --access-key-id YOUR_ACCESS_KEY_ID \
  --secret-access-key YOUR_SECRET_ACCESS_KEY
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### 환경 변수 (MUST)

#### MUST: 환경 변수 우선순위
```typescript
// ✅ CORRECT
// 1. 명령줄 옵션 우선
// 2. 환경 변수 사용
// 3. 둘 다 없으면 에러

const accountID = cmdOptions.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;

if (!accountID) {
  console.error('Error: Cloudflare Account ID is required');
  process.exit(1);
}

// ❌ WRONG
const accountID = process.env.CLOUDFLARE_ACCOUNT_ID;  // ❌ 명령줄 옵션 무시
```

### R2 경로 규칙 (MUST)

#### MUST: 프로덕션/테스트 경로 분리
```typescript
// ✅ CORRECT
// 프로덕션: newscasts/{newscastID}/topic-{N}/
// 테스트: tests/newscasts/{newscastID}/topic-{N}/

const basePath = testMode ? 'tests/newscasts' : 'newscasts';

// ❌ WRONG
const basePath = 'newscasts';  // ❌ 테스트 모드 무시
```

#### NEVER: 토픽 인덱스 패딩 생략
```typescript
// ✅ CORRECT
const topicDir = `topic-${String(topicIndex).padStart(2, '0')}`;
// 결과: topic-01, topic-02, ..., topic-10

// ❌ WRONG
const topicDir = `topic-${topicIndex}`;
// 결과: topic-1, topic-2, ..., topic-10 (정렬 오류)
```

### 타입 안전성 (MUST)

#### MUST: Zod 검증 필수
```typescript
// ✅ CORRECT
export async function uploadToR2(options: UploadOptions): Promise<UploadResult> {
  const validatedOptions = validateUploadOptions(options);
  // 검증된 옵션 사용
}

// ❌ WRONG
export async function uploadToR2(options: UploadOptions): Promise<UploadResult> {
  // 검증 없이 바로 사용
}
```

#### MUST: 타입 가드 사용
```typescript
// ✅ CORRECT
if (isValidUploadOptions(options)) {
  // TypeScript가 options를 UploadOptions로 인식
  console.log(options.newscastID);
}

// ❌ WRONG
console.log((options as UploadOptions).newscastID);  // ❌ 런타임 검증 없음
```

---

## ✅ 구현 완료 (Cloud-Architect)

### 1. S3Client 생성
- ✅ Cloudflare R2 엔드포인트 설정 (`https://{accountID}.r2.cloudflarestorage.com`)
- ✅ Region 'auto' 설정
- ✅ 인증 정보 설정 (accessKeyId, secretAccessKey)

### 2. collectFiles()
- ✅ 재귀적 디렉터리 스캔
- ✅ 하위 디렉터리 포함 파일 수집
- ✅ 파일 경로 정렬

### 3. inferContentType()
- ✅ 파일 확장자별 MIME 타입 매핑
- ✅ 기본값 'application/octet-stream' 처리

### 4. uploadToR2()
- ✅ 전체 업로드 로직 구현
- ✅ R2 키 형식: `{basePath}/{newscastID}/topic-{topicIndex}/{relativePath}`
- ✅ 순차 업로드로 안정성 보장
- ✅ 진행 상황 로깅 및 통계 수집

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **Core 타입 정의**: [../core/CLAUDE.md](../core/CLAUDE.md)
- **GitHub Actions 마이그레이션 PRD**: [../../GITHUB-ACTIONS-MIGRATION-PRD.md](../../GITHUB-ACTIONS-MIGRATION-PRD.md)
- **AWS SDK for JavaScript v3 - S3**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
- **Cloudflare R2 Documentation**: https://developers.cloudflare.com/r2/

---

*최종 업데이트: 2025-10-14 v1.1.0 - S3Client 통합 구현 완료 (cloud-architect)*
