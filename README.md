# AI Newscast

> 🤖 AI-powered automated news casting system with modern TypeScript/Python architecture

[![Version](https://img.shields.io/badge/version-2.1.3-blue.svg)](https://github.com/your-repo/ai-newscast)
[![Pipeline](https://img.shields.io/badge/pipeline-100%25%20complete-brightgreen.svg)](docs/2025-06-23-full-pipeline-implementation.md)
[![Refactored](https://img.shields.io/badge/refactored-67%E2%80%9370%25%20smaller-green.svg)](docs/refactoring-issues-and-solutions.md)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/node.js-24+-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.12.2-yellow.svg)](https://pnpm.io)

## 🚀 Features

- **🕷️ Intelligent News Crawling**: BigKinds JSON/HTML auto-detection parsing
- **🤖 AI Script Generation**: Google Gemini-powered newscast script creation
- **🎵 Multi-voice TTS**: Google Cloud TTS Chirp HD (8 premium models)
- **🎛️ Audio Processing**: FFmpeg-based professional audio mixing (optimized 0.2s gaps)
- **⚡ High Performance**: UV + ESBuild for 10-100x faster development
- **🏗️ Modular Architecture**: 90% complete monorepo (9/10 packages implemented + API deployed)
- **🚀 Complete Automation**: 65 news → 3min 20sec complete newscast in 2min 31sec

## 📦 Architecture

### Package Structure
```
packages/
├── core/                 # ✅ Common types, utilities, configurations
├── news-crawler/         # ✅ TypeScript crawler (Playwright-based)
├── news-crawler-py/      # ✅ Production Python crawler (UV + requests)
├── news-processor/       # ✅ News data processing and consolidation
├── script-generator/     # ✅ AI-powered newscast script generation
├── api-server/           # ✅ Cloudflare Workers API (deployed)
├── audio-generator/      # ✅ TTS and audio generation
├── audio-processor/      # ✅ Audio mixing and post-processing
├── cli/                  # ✅ Unified CLI interface
└── web/                  # 🚧 Newscast player web interface
```

### Technology Stack
- **🐍 Python**: UV package manager, Pydantic, requests, Click CLI
- **📘 TypeScript**: Node.js 24+, ESNext/NodeNext, ESBuild, Playwright
- **🏗️ Build Tools**: Turbo monorepo, pnpm@10.12.2 workspaces
- **🤖 AI Services**: Google Gemini API, Google Cloud TTS Chirp HD
- **☁️ Deployment**: Cloudflare Workers (API server), KV storage
- **📊 Data**: Structured JSON output, type-safe validation

## 🚀 Quick Start

### Prerequisites
```bash
# Install Node.js 24+ and pnpm
npm install -g pnpm@10.12.2

# Install UV (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Install FFmpeg (for audio processing)
# Ubuntu/Debian: apt install ffmpeg
# macOS: brew install ffmpeg  
# Windows: winget install ffmpeg
```

### Setup
```bash
# Clone and install dependencies
git clone <repository-url> ai-newscast
cd ai-newscast
pnpm install && pnpm build

# Set up environment variables
cp .env.example .env
# Edit .env with your Google AI API key
```

### Usage

#### 🚀 Complete Pipeline (All-in-One)
```bash
# Full newscast generation (latest data)
pnpm pipeline:full --max-topics 3

# Test with existing data
pnpm demo:quick
```

#### 📊 Step-by-Step Pipeline
```bash
# 1. Crawl news topics and articles
pnpm crawl:pipeline --max-topics 5

# 2. Process with AI
pnpm news:process ./output/latest/topic-01

# 3. Generate newscast script
pnpm script:generate ./output/latest/topic-01

# 4. Generate TTS audio
pnpm audio:generate ./output/latest/topic-01

# 5. Mix final audio
pnpm audio:process ./output/latest/topic-01
```

#### 🛠️ Development Commands
```bash
# Build all packages
pnpm build

# Development mode (watch)
pnpm dev

# Type checking
pnpm typecheck

# Environment setup validation
pnpm env:setup
```

## 📊 Current Status (v2.1.3)

### ✅ Completed Features
- **News Crawling**: 100% - BigKinds real-time trending topics
- **AI Processing**: 100% - Gemini-based consolidation & script generation
- **TTS Generation**: 100% - Google Cloud TTS Chirp HD (8 models)
- **Audio Processing**: 100% - FFmpeg mixing optimization
- **API Server**: 100% - Cloudflare Workers deployment
- **CLI Tools**: 100% - ai-newscast binary
- **Developer Tools**: 100% - Documentation, build system

### 🚧 In Progress
- **Web Interface**: 80% - Newscast player implementation needed

### Package Implementation
```
✅ @ai-newscast/core           (100%) - Types, utilities
✅ @ai-newscast/news-crawler-py (100%) - Python main crawler  
✅ @ai-newscast/news-crawler   (100%) - TypeScript alt crawler
✅ @ai-newscast/news-processor (100%) - AI news consolidation
✅ @ai-newscast/script-generator (100%) - Newscast script generation
✅ @ai-newscast/api-server     (100%) - Cloudflare Workers API
✅ @ai-newscast/audio-generator (100%) - TTS voice generation
✅ @ai-newscast/audio-processor (100%) - Audio mixing/processing
✅ @ai-newscast/cli            (100%) - Unified CLI
🚧 @ai-newscast/web            (80%) - Newscast player
```

## 📁 Output Structure

```
output/2025-06-24T12-30-45-123456/
├── topic-list.json                 # Trending topics list
├── topic-01/                       # Rank #1 topic
│   ├── news-list.json             # News articles list
│   ├── news/                      # Individual article details
│   │   ├── 01100101-*.json        # Article ID-based files
│   │   └── ...
│   ├── news.json                  # AI-consolidated news
│   ├── news.txt                   # Human-readable text
│   ├── newscast-script.json       # Structured newscast script
│   ├── newscast-script.txt        # Human-readable script
│   ├── audio/                     # TTS-generated audio files
│   │   ├── 001-김민준.mp3         # Individual dialogue lines
│   │   ├── 002-이서연.mp3         # Speaker-specific TTS
│   │   └── audio-files.json      # Audio metadata
│   ├── newscast-final.mp3         # Complete newscast audio
│   └── newscast-audio-info.json   # Final audio metadata
├── topic-02/                       # Rank #2 topic (same structure)
└── ...                             # Additional topics
```

## 🎯 Performance Metrics (v2.1.3)

- **Build Time**: 5.7s (Turbo parallel)
- **Crawling Speed**: ~2min per topic average
- **AI Processing**: ~30s per 10 articles
- **TTS Generation**: ~45s per 1min script
- **Complete Pipeline**: ~5min per topic

## 🔧 Troubleshooting

### Common Issues
```bash
# UV installation check
which uv  # Should show /home/user/.local/bin/uv

# TypeScript import errors - always include .ts extension
import { something } from './file.ts';  # ✅ Correct

# API key verification
echo $GOOGLE_AI_API_KEY  # Should show your key

# FFmpeg for audio processing
sudo apt install ffmpeg  # Ubuntu
brew install ffmpeg      # macOS
```

### Performance Optimization
- **Memory**: Large datasets use streaming processing
- **Parallel**: 3 concurrent API calls + 1s intervals (rate limit compliance)
- **Caching**: TTS results cached, AI response deduplication
- **Build**: Turbo parallel builds complete in <6 seconds

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [BigKinds](https://bigkinds.or.kr) - News data source
- [Google AI](https://ai.google.dev/) - Gemini API
- [Google Cloud](https://cloud.google.com/text-to-speech) - TTS API
- [Cloudflare](https://workers.cloudflare.com/) - Workers platform

---

**Version**: v2.1.3 (2025-06-24)  
**Development Team**: AI Newscast Team