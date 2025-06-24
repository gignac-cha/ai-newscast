# 리팩토링 과정에서 발생한 이슈와 해결방법

> 2025-06-22 작성  
> AI News Cast 프로젝트의 news-crawler와 news-processor 패키지 리팩토링 과정에서 발생한 기술적 이슈들과 해결방법을 정리

## 📋 목차

1. [TypeScript Import 확장자 문제](#typescript-import-확장자-문제)
2. [Playwright Type Import 문제](#playwright-type-import-문제)
3. [모듈 해상도 문제](#모듈-해상도-문제)
4. [패키지 의존성 문제](#패키지-의존성-문제)
5. [API 키 환경변수 문제](#api-키-환경변수-문제)
6. [예방 조치 및 베스트 프랙티스](#예방-조치-및-베스트-프랙티스)

---

## TypeScript Import 확장자 문제

### 🔴 문제 상황
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 
'/mnt/d/Projects/ai-newscast/packages/news-processor/src/consolidator' 
imported from /mnt/d/Projects/ai-newscast/packages/news-processor/src/cli.ts
```

### 💡 원인 분석
- Node.js의 `--experimental-transform-types` 기능 사용 시 TypeScript 파일의 상대 import에 명시적 확장자가 필요
- ES 모듈 시스템에서는 확장자 없는 import가 허용되지 않음
- 컴파일러가 아닌 런타임에서 TypeScript를 처리할 때 발생하는 문제

### ✅ 해결방법
**1단계: import 문 수정**
```typescript
// 이전
import { NewsConsolidator } from './consolidator';
import type { NewsProcessorOptions } from './types';

// 이후
import { NewsConsolidator } from './consolidator.ts';
import type { NewsProcessorOptions } from './types/index.ts';
```

**2단계: 자동화된 수정**
```bash
# Agent 도구를 사용하여 일괄 수정
# packages/news-processor/src 내 모든 .ts 파일의 상대 import 확장자 추가
```

### 📊 수정 범위
- **news-processor**: 59개 import 문 수정
- **news-crawler**: 40개 import 문 수정
- **총 99개 import 문** 수정 완료

---

## Playwright Type Import 문제

### 🔴 문제 상황
```
SyntaxError: The requested module 'playwright' does not provide an export named 'Browser'
```

### 💡 원인 분석
- Playwright의 타입 정의가 named export가 아닌 type export로 제공됨
- TypeScript 컴파일러 없이 런타임에서 처리할 때 타입과 값의 구분이 필요

### ✅ 해결방법
```typescript
// 이전
import { chromium, Browser, Page } from 'playwright';

// 이후
import { chromium, type Browser, type Page } from 'playwright';
```

### 🔧 적용된 원칙
- 타입만 사용하는 import는 `type` 키워드 명시
- 런타임 값과 컴파일타임 타입의 명확한 구분

---

## 모듈 해상도 문제

### 🔴 문제 상황
```
SyntaxError: The requested module '@ai-newscast/core' does not provide an export named 'CrawlerConfig'
```

### 💡 원인 분석
- 모노레포 환경에서 로컬 패키지 간 의존성 문제
- 패키지가 빌드되지 않은 상태에서 import 시도
- TypeScript 모듈 해상도와 Node.js ES 모듈 해상도의 차이

### ✅ 해결방법
**1단계: 의존성 확인**
```bash
# 패키지 의존성 상태 확인
pnpm list --depth=0

# 특정 패키지 export 확인
node -e "console.log(Object.keys(require('@ai-newscast/core')))"
```

**2단계: 모듈 빌드**
```bash
# core 패키지 먼저 빌드
cd packages/core && pnpm build

# 전체 의존성 재설치
pnpm install
```

### 🔧 임시 해결책
- 실제 API 의존성이 필요한 기능은 mock으로 대체하여 구조 테스트 진행
- 패키지 구조와 import 관계 검증에 집중

---

## 패키지 의존성 문제

### 🔴 문제 상황
```bash
ERROR: command finished with error: command exited (1)
# esbuild: not found
```

### 💡 원인 분석
- 모노레포의 일부 패키지에서 빌드 도구 의존성 누락
- pnpm workspace 환경에서 의존성 호이스팅 문제

### ✅ 해결방법
**1단계: 의존성 설치**
```bash
# 전체 workspace 의존성 재설치
pnpm install

# 특정 패키지 의존성 확인
cd packages/news-crawler && pnpm install
```

**2단계: 빌드 스크립트 확인**
```json
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node ..."
  }
}
```

### 🔧 예방 조치
- package.json의 devDependencies에 빌드 도구 명시적 추가
- pnpm workspace 설정 검토

---

## API 키 환경변수 문제

### 🔴 문제 상황
```
❌ 오류 발생: GOOGLE_AI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.
```

### 💡 원인 분석
- 실제 API 키 없이 구조 및 기능 테스트 필요
- 개발/테스트 환경에서 외부 API 의존성 문제

### ✅ 해결방법
**1단계: 환경변수 Mock**
```bash
# 테스트용 더미 API 키 설정
GOOGLE_AI_API_KEY=dummy node --experimental-transform-types script.ts
```

**2단계: 기능별 분리 테스트**
```typescript
// API 의존성이 없는 구조적 테스트 수행
console.log('✅ 모듈 로딩 테스트');
console.log('✅ import 관계 검증');
console.log('✅ 클래스 구조 확인');
```

### 🔧 개선 방향
- 개발 환경용 mock AI 서비스 구현
- 환경변수 기본값 설정 로직 추가

---

## 예방 조치 및 베스트 프랙티스

### 🛡️ TypeScript ES 모듈 설정

**1. tsconfig.json 설정**
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Node16",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

**2. package.json 설정**
```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

### 📝 코딩 가이드라인

**Import 문 작성 규칙**
```typescript
// ✅ 좋은 예
import { something } from './relative-file.ts';
import { type TypeOnly } from './types.ts';
import { external } from 'external-package';

// ❌ 나쁜 예
import { something } from './relative-file';  // 확장자 없음
import { TypeOnly } from './types.ts';       // type 키워드 없음
```

**모노레포 의존성 관리**
```json
{
  "dependencies": {
    "@workspace/core": "workspace:*"
  },
  "devDependencies": {
    "esbuild": "^0.19.0",
    "typescript": "^5.0.0"
  }
}
```

### 🧪 테스트 전략

**1. 구조적 테스트 우선**
- API 의존성 없는 기본 구조 검증
- import/export 관계 테스트
- 클래스 인스턴스화 테스트

**2. 단계적 통합 테스트**
- Mock 서비스로 기능 검증
- 실제 API 연동은 별도 환경에서

**3. 자동화된 검증**
```bash
# 정적 분석
pnpm typecheck

# 구조 테스트
node --experimental-transform-types test-structure.ts

# 통합 테스트 (API 키 필요)
GOOGLE_AI_API_KEY=real_key pnpm test
```

### 📚 참고 자료

- [Node.js ES Modules Documentation](https://nodejs.org/api/esm.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [pnpm Workspace Guide](https://pnpm.io/workspaces)

---

## 💡 교훈 및 개선사항

### 주요 교훈
1. **ES 모듈 환경에서는 명시적 확장자가 필수**
2. **타입과 값의 import 구분이 중요**
3. **모노레포에서는 의존성 순서가 중요**
4. **외부 API 의존성은 개발 초기에 격리**

### 앞으로의 개선사항
1. **자동화된 import 검증 도구 도입**
2. **CI/CD 파이프라인에서 구조 테스트 추가**
3. **개발용 mock 서비스 구현**
4. **타입 안전성 강화를 위한 strict 모드 적용**

이러한 경험을 통해 더욱 견고하고 유지보수가 용이한 코드베이스를 구축할 수 있게 되었습니다.