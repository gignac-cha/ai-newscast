# AI Newscast Web Player

React 19 기반 AI 뉴스캐스트 웹 플레이어 - 실시간 뉴스 데이터 시각화 및 오디오 재생 지원

## ✅ 구현 완료 기능

- **실시간 API 연동**: Cloudflare Workers API를 통한 최신 뉴스캐스트 자동 로딩
- **토픽 네비게이션**: 스크롤 기반 활성 토픽 감지 및 자동 하이라이트
- **인터랙티브 카드**: 토픽별 확장/축소 토글 기능
- **성능 최적화 완료**: React.memo + useCallback + useMemo 전면 메모이제이션 (v3.7.1)
- **오디오 플레이어**: HTML5 Audio API 기반 MP3 재생, 진행률 컨트롤, 하단 고정 플레이어
- **타입 안전성**: 실제 데이터 구조 기반 TypeScript 타입 정의
- **반응형 디자인**: Radix UI 기반 모던 인터페이스
- **에러 처리**: API 실패 및 데이터 누락 상황 완전 대응

## 🚧 개발 예정 기능

- **접근성 개선**: ARIA 속성, 키보드 네비게이션 지원
- **고급 재생 기능**: 속도 조절, 토픽 간 이동, 재생 기록

## 🛠️ 기술 스택

- **React 19** - 최신 React 기능 활용
- **TypeScript** - strict 모드 완전 준수
- **Vite** - 최적화된 개발 환경 및 빌드
- **Radix UI** - 접근성 우선 컴포넌트 + 테마
- **TanStack Query** - 서버 상태 관리 및 캐싱
- **Emotion** - CSS-in-JS 스타일링

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Local Testing

For local development, the app expects newscast files to be available at `/output/{newscast-id}/`. You can:

1. Run the AI newscast generation pipeline to create output files
2. Serve the output directory using a local server
3. Update the API base URL in `src/utils/api.ts` if needed

## API Integration

The app integrates with:

- **Cloudflare Workers API**: Fetches the latest newscast ID
- **Local File System**: Reads newscast data from output directory
- **Cloudflare R2** (future): Will read files from object storage

## File Structure

```
output/{newscast-id}/
├── topic-list.json           # List of topics
├── topic-01/
│   ├── news.json            # AI-consolidated news
│   ├── newscast-script.json # TTS script
│   └── newscast.mp3         # Audio file
├── topic-02/
│   └── ...
└── topic-N/
```

## Environment Variables

- `VITE_WORKER_API_URL` - Cloudflare Workers API URL (optional)
- `VITE_R2_BASE_URL` - Cloudflare R2 base URL (for production)

## Deployment

Optimized for Cloudflare Pages with:

- Static asset optimization
- Service worker caching
- Progressive enhancement
- Mobile-first responsive design

## Browser Support

- Modern browsers with ES2022 support
- Audio API support required
- WebAssembly support recommended