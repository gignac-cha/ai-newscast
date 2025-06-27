# AI Newscast

> 🤖 AI-powered automated news casting system - **v3.1.0 Crawling Pipeline Complete** 

[![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)](https://github.com/your-repo/ai-newscast)
[![Pipeline](https://img.shields.io/badge/pipeline-3/7%20steps-orange.svg)](PIPELINE_PLAN.md)
[![Crawling](https://img.shields.io/badge/status-crawling%20complete-brightgreen.svg)](CLAUDE.md)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/node.js-24+-green.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.12.2-yellow.svg)](https://pnpm.io)

## 🚀 Features (v3.1.0 - Current Implementation)

- **🕷️ Complete News Crawling**: ✅ 3-stage pipeline (topics → lists → details) with deduplication
- **📊 Smart Data Processing**: ✅ 10 trending topics, up to 100 news per topic, full article extraction
- **🔧 JSON Logging System**: ✅ Clean metadata extraction with jq parsing
- **🤖 AI Script Generation**: 🚧 Planned - Google Gemini-powered newscast script creation
- **🎵 Multi-voice TTS**: 🚧 Planned - Google Cloud TTS Chirp HD (8 premium models)
- **🎛️ Audio Processing**: 🚧 Planned - FFmpeg-based professional audio mixing
- **⚡ High Performance**: ✅ UV + Turbo monorepo for fast development
- **🏗️ Clean Architecture**: ✅ 1/10 packages fully implemented, 3/7 pipeline steps complete
- **📋 Systematic Development**: ✅ PIPELINE_PLAN.md-based step-by-step implementation

## 📦 Architecture

### Package Structure (v3.1.0 Crawling Complete)
```
packages/
├── news-crawler/         # ✅ Complete 3-stage pipeline (Python + UV)
│   ├── news-topics       # ✅ Trending topics extraction (10 unique topics)
│   ├── news-list         # ✅ News lists per topic (up to 100 articles each)
│   └── news-details      # ✅ Full article content extraction
├── core/                 # 🚧 Planned - Common types, utilities, configurations
├── news-processor/       # 🚧 Planned - News data processing and consolidation  
├── script-generator/     # 🚧 Planned - AI-powered newscast script generation
├── audio-generator/      # 🚧 Planned - TTS and audio generation
├── audio-processor/      # 🚧 Planned - Audio mixing and post-processing
├── newscast-generator/   # 🚧 Planned - Script/audio/merge integration
├── api-server/           # 🚧 Planned - Cloudflare Workers API
├── cli/                  # 🚧 Planned - Unified CLI interface
└── web/                  # 🚧 Planned - Newscast player web interface
```

### Technology Stack
- **🐍 Python**: UV package manager, requests, lxml (currently implemented)
- **📘 TypeScript**: Node.js 24+, ESNext/NodeNext (planned)
- **🏗️ Build Tools**: Turbo monorepo, pnpm@10.12.2 workspaces
- **🤖 AI Services**: Google Gemini API (planned), Google Cloud TTS (planned)
- **☁️ Deployment**: Cloudflare Workers (planned)
- **📊 Data**: JSON output with timestamp-based organization

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
# Full newscast generation (10 topics, with audio)
pnpm pipeline:full

# Fast test (3 topics, skip audio)
pnpm pipeline:fast

# Single topic test
pnpm pipeline:test
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

## 📊 Current Status (v3.1.0)

### ✅ Completed Features
- **News Crawling**: 100% - 3-stage pipeline with deduplication (topics → lists → details)
- **Data Processing**: 100% - BigKinds real-time trending topics extraction
- **JSON Output**: 100% - Clean metadata with jq-compatible parsing
- **Pipeline Automation**: 100% - Full workflow automation with scripts/run-all.sh
- **Monorepo Setup**: 100% - Turbo + pnpm workspace integration

### 🚧 Next Implementation Priority
- **AI Processing**: Planned - Google Gemini-based news consolidation
- **Script Generation**: Planned - Newscast script creation
- **TTS Generation**: Planned - Google Cloud TTS integration
- **Audio Processing**: Planned - FFmpeg mixing optimization
- **Web Interface**: Planned - Newscast player implementation

### Package Implementation
```
✅ @ai-newscast/news-crawler   (100%) - 3-stage crawling pipeline
🚧 @ai-newscast/core           (Planned) - Types, utilities
🚧 @ai-newscast/news-processor (Planned) - AI news consolidation
🚧 @ai-newscast/script-generator (Planned) - Newscast script generation
🚧 @ai-newscast/audio-generator (Planned) - TTS voice generation
🚧 @ai-newscast/audio-processor (Planned) - Audio mixing/processing
🚧 @ai-newscast/api-server     (Planned) - Cloudflare Workers API
🚧 @ai-newscast/cli            (Planned) - Unified CLI
🚧 @ai-newscast/web            (Planned) - Newscast player
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

## 🎯 Performance Metrics (v3.1.0)

- **News Topics**: 0.38s (10 unique topics extracted)
- **News Lists**: ~15s per topic (up to 100 articles)
- **News Details**: ~2-3min per topic (full article extraction)
- **Deduplication**: 100% accuracy (30 → 10 unique topics)
- **Pipeline Automation**: Single command execution
- **JSON Output**: Clean jq-compatible format

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

**Version**: v3.1.0 (2025-06-27)  
**Development Team**: AI Newscast Team