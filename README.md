# AI Newscast

> 🤖 AI-powered automated news casting system - **v3.6.0 Web Player Complete** 

[![Version](https://img.shields.io/badge/version-3.6.0-blue.svg)](https://github.com/your-repo/ai-newscast)
[![Pipeline](https://img.shields.io/badge/pipeline-7/7%20steps-brightgreen.svg)](PIPELINE_PLAN.md)
[![AI](https://img.shields.io/badge/status-automation%20+%20web%20player-brightgreen.svg)](CLAUDE.md)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/node.js-24+-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.12.2-yellow.svg)](https://pnpm.io)

## 🚀 Features (v3.6.0 - Web Player Complete)

- **🕷️ Complete News Crawling**: ✅ 3-stage pipeline (topics → lists → details) with deduplication
- **🤖 AI News Generation**: ✅ Google Gemini 2.5 Pro integration for intelligent news consolidation
- **🎙️ AI Newscast Script Generation**: ✅ Two-host dialogue format with random TTS voice selection
- **🎵 AI Audio Generation**: ✅ Google Cloud TTS Chirp HD with MP3 file generation (193 files tested)
- **⚡ Parallel Processing**: ✅ GNU Parallel integration with auto-concurrency and rate limiting
- **🎯 Modern CLI Experience**: ✅ Typer (Python) + Commander.js (TypeScript) with consistent UX
- **🔧 Turbo + UV Integration**: ✅ Complete virtual environment automation with Turbo build system
- **📊 Smart Data Processing**: ✅ 10 trending topics, up to 100 news per topic, full article extraction
- **🔧 JSON Logging System**: ✅ Clean metadata extraction with jq parsing + dual output formats
- **⚙️ Advanced Pipeline Control**: ✅ Skip functionality + resume capability for all 7 steps
- **🎵 Multi-voice TTS**: ✅ Google Cloud TTS Chirp HD integration (8 premium Korean voices)
- **🎛️ Audio Processing**: ✅ FFmpeg-based audio merging with @ffmpeg-installer integration
- **⚡ High Performance**: ✅ UV + Turbo monorepo + TypeScript experimental stripping
- **🌐 React Web Player**: ✅ TypeScript + React 19 + Radix UI newscast player with real-time API integration
- **🏗️ Clean Architecture**: ✅ 5/10 packages fully implemented, 7/7 pipeline steps + web player complete
- **📋 Systematic Development**: ✅ PIPELINE_PLAN.md-based step-by-step implementation

## 📦 Architecture

### Package Structure (v3.6.0 Web Player Complete)
```
packages/
├── news-crawler/         # ✅ Complete 3-stage pipeline (Python + UV)
│   ├── news-topics       # ✅ Trending topics extraction (10 unique topics)
│   ├── news-list         # ✅ News lists per topic (up to 100 articles each)
│   └── news-details      # ✅ Full article content extraction
├── news-generator/       # ✅ Complete AI news consolidation (TypeScript + Google Gemini)
├── newscast-generator/   # ✅ Complete AI script + TTS audio + FFmpeg merging (modularized)
├── newscast-latest-id/   # ✅ Complete Cloudflare Workers API (TypeScript + KV storage)
├── newscast-web/         # ✅ Complete React web player (TypeScript + React 19 + Radix UI)
├── core/                 # 🚧 Planned - Common types, utilities, configurations
├── audio-processor/      # 🚧 Planned - Audio mixing and post-processing
├── api-server/           # 🚧 Planned - Extended Cloudflare Workers API
└── cli/                  # 🚧 Planned - Unified CLI interface
```

### Technology Stack
- **🐍 Python**: UV package manager, Typer CLI, requests, lxml (crawling pipeline)
- **📘 TypeScript**: Node.js 24+, Commander.js CLI, experimental type stripping (AI generation)
- **🏗️ Build Tools**: Turbo monorepo, pnpm@10.12.2 workspaces
- **🤖 AI Services**: Google Gemini 2.5 Pro (implemented), Google Cloud TTS (planned)
- **☁️ Deployment**: Cloudflare Workers (planned)
- **📊 Data**: JSON/TXT dual output with timestamp-based organization

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
# Edit .env with your Google Gemini API key
echo "GOOGLE_GEN_AI_API_KEY=your_api_key_here" >> .env
```

### Usage

#### 🚀 Complete Pipeline (All-in-One)
```bash
# Full 4-stage pipeline with parallel processing (auto-concurrency)
./scripts/run-all.sh

# Parallel processing with custom concurrency
./scripts/run-all.sh --max-concurrency 4

# Sequential processing (disable parallel)
./scripts/run-all.sh --no-parallel

# Dry-run mode (test without API calls)
./scripts/run-all.sh --dry-run --max-concurrency 8

# Skip specific stages for debugging
./scripts/run-all.sh --skip-topics --skip-lists   # Only details + generation
./scripts/run-all.sh --skip-generation            # Only crawling pipeline

# Resume from existing output directory
./scripts/run-all.sh --output-dir output/2025-06-27T15-52-44-934067
```

#### 📊 Step-by-Step Pipeline
```bash
# 1. Crawl news topics (10 unique topics from BigKinds)
pnpm run:crawler:news-topics --output-file ./output/topic-list.json

# 2. Crawl news lists for each topic (up to 100 articles per topic)
pnpm run:crawler:news-list --input-file ./output/topic-list.json --topic-index 0 --output-file ./output/topic-01/news-list.json

# 3. Extract detailed news content
pnpm run:crawler:news-details --input-file ./output/topic-01/news-list.json --output-folder ./output/topic-01/news

# 4. Generate AI-consolidated news (Commander.js CLI)
pnpm run:generator:news --input-folder ./output/topic-01/news --output-file ./output/topic-01/news.json
# Or with short options
pnpm run:generator:news -i ./output/topic-01/news -o ./output/topic-01/news.json

# 5. Generate newscast script (Planned)
pnpm script:generate ./output/topic-01/news.json

# 6. Generate TTS audio (Planned)
pnpm audio:generate ./output/topic-01/newscast-script.json

# 7. Mix final audio (Planned)
pnpm audio:process ./output/topic-01/
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

## 📊 Current Status (v3.2.0)

### ✅ Completed Features
- **News Crawling**: 100% - 3-stage pipeline with deduplication (topics → lists → details)
- **AI News Generation**: 100% - Google Gemini 2.5 Pro consolidation (details → unified news)
- **Data Processing**: 100% - BigKinds real-time trending topics extraction
- **JSON Output**: 100% - Clean metadata with jq-compatible parsing + TXT format
- **Pipeline Automation**: 100% - 4-stage workflow with skip/resume functionality
- **Monorepo Setup**: 100% - Turbo + pnpm workspace integration

### 🚧 Next Implementation Priority
- **Script Generation**: Planned - AI-powered newscast script creation
- **TTS Generation**: Planned - Google Cloud TTS integration
- **Audio Processing**: Planned - FFmpeg mixing optimization
- **Web Interface**: Planned - Newscast player implementation
- **API Server**: Planned - Cloudflare Workers deployment

### Package Implementation
```
✅ @ai-newscast/news-crawler   (100%) - 3-stage crawling pipeline
✅ @ai-newscast/news-generator (100%) - AI news consolidation with Google Gemini
🚧 @ai-newscast/core           (Planned) - Types, utilities
🚧 @ai-newscast/script-generator (Planned) - Newscast script generation
🚧 @ai-newscast/audio-generator (Planned) - TTS voice generation
🚧 @ai-newscast/audio-processor (Planned) - Audio mixing/processing
🚧 @ai-newscast/api-server     (Planned) - Cloudflare Workers API
🚧 @ai-newscast/cli            (Planned) - Unified CLI
🚧 @ai-newscast/web            (Planned) - Newscast player
```

## 📁 Output Structure

```
output/2025-06-27T18-41-56-330937/
├── topic-list.json                 # Trending topics list (10 unique topics)
├── topic-01/                       # Rank #1 topic
│   ├── news-list.json             # News articles list (up to 100 articles)
│   ├── news/                      # Individual article details
│   │   ├── 01100101-*.json        # Article ID-based files
│   │   └── ...
│   ├── news.json                  # 🆕 AI-consolidated news (v3.2.0)
│   ├── news.txt                   # 🆕 Human-readable consolidated text
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

## 🎯 Performance Metrics (v3.2.4)

- **News Topics**: 0.41s (10 unique topics extracted, Turbo integrated)
- **News Lists**: ~15s per topic (up to 100 articles)
- **News Details**: ~2-3min per topic (full article extraction)
- **AI News Generation**: ~45-50s per topic (Google Gemini 2.5 Pro)
- **Parallel Processing**: 10 topics in ~120s (vs 450s sequential) with 4-8 cores
- **Deduplication**: 100% accuracy (30 → 10 unique topics)
- **Pipeline Automation**: Single command execution with skip/resume
- **JSON Output**: Clean jq-compatible format + human-readable TXT

## 🔧 Troubleshooting

### Common Issues
```bash
# UV installation check
which uv  # Should show /home/user/.local/bin/uv

# TypeScript import errors - always include .ts extension
import { something } from './file.ts';  # ✅ Correct

# API key verification
echo $GOOGLE_GEN_AI_API_KEY  # Should show your key

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

**Version**: v3.2.1 (2025-06-28)  
**Development Team**: AI Newscast Team