# Vite 의존성 캐시 최적화

## 현재 설정된 캐싱 전략

### 1. 의존성 Pre-bundling (`optimizeDeps`)
- 모든 주요 라이브러리를 미리 번들링하여 캐시
- 개발 시 첫 로딩 후 의존성 변경 시에만 재빌드

### 2. 청크 분할 (`manualChunks`)
- `react-vendor`: React 코어 라이브러리
- `radix-vendor`: Radix UI 컴포넌트들
- `emotion-vendor`: CSS-in-JS 라이브러리
- `tanstack-vendor`: React Query

### 3. 캐시 유지 방법
```bash
# 의존성 캐시만 클리어
npm run dev -- --force

# 전체 빌드 캐시 클리어
rm -rf node_modules/.vite
rm -rf dist
```

### 4. 브라우저 캐싱 최적화
- 벤더 청크는 해시 기반으로 브라우저에 장기 캐시됨
- 앱 코드만 변경되면 벤더 청크는 캐시 재사용