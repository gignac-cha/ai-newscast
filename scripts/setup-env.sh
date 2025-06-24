#!/bin/bash

# AI News Cast - 환경변수 자동 설정 스크립트
# 사용법: source scripts/setup-env.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/tests/claude-code/.env"

echo "🔧 AI News Cast 환경 설정"
echo "================================================"

# .env 파일 확인
if [[ -f "$ENV_FILE" ]]; then
    echo "✅ 환경변수 파일 찾음: $ENV_FILE"
    
    # 환경변수 로드
    while IFS= read -r line || [[ -n "$line" ]]; do
        # 주석과 빈 줄 제외
        if [[ ! "$line" =~ ^[[:space:]]*# ]] && [[ -n "${line// }" ]]; then
            export "$line"
        fi
    done < "$ENV_FILE"
    
    echo "✅ 환경변수 로드 완료"
else
    echo "⚠️  환경변수 파일이 없습니다: $ENV_FILE"
    echo "📝 다음 내용으로 파일을 생성해주세요:"
    echo ""
    echo "GOOGLE_AI_API_KEY=your_api_key_here"
    echo "GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json"
    echo ""
    exit 1
fi

# API 키 검증
if [[ -n "$GOOGLE_AI_API_KEY" ]]; then
    API_KEY_PREVIEW="${GOOGLE_AI_API_KEY:0:10}***"
    echo "🔑 Google AI API Key: $API_KEY_PREVIEW"
else
    echo "❌ GOOGLE_AI_API_KEY가 설정되지 않았습니다"
    exit 1
fi

# TTS 인증 정보 확인 (선택사항)
if [[ -n "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
    if [[ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
        echo "🎤 Google Cloud TTS 인증: ✅ $(basename "$GOOGLE_APPLICATION_CREDENTIALS")"
    else
        echo "🎤 Google Cloud TTS 인증: ⚠️  파일 없음 ($GOOGLE_APPLICATION_CREDENTIALS)"
    fi
else
    echo "🎤 Google Cloud TTS 인증: ⚠️  설정되지 않음 (API 키로 시도)"
fi

# 필수 도구 확인
echo ""
echo "🛠️ 도구 확인:"

# Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js가 설치되지 않았습니다"
    exit 1
fi

# pnpm
if command -v pnpm >/dev/null 2>&1; then
    PNPM_VERSION=$(pnpm --version)
    echo "✅ pnpm: v$PNPM_VERSION"
else
    echo "❌ pnpm이 설치되지 않았습니다"
    echo "설치: npm install -g pnpm"
    exit 1
fi

# UV (Python)
if command -v uv >/dev/null 2>&1; then
    UV_VERSION=$(uv --version | head -1)
    echo "✅ UV: $UV_VERSION"
else
    echo "❌ UV가 설치되지 않았습니다"
    echo "설치: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# FFmpeg (선택사항)
if command -v ffmpeg >/dev/null 2>&1; then
    FFMPEG_VERSION=$(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f3)
    echo "✅ FFmpeg: $FFMPEG_VERSION"
else
    echo "⚠️  FFmpeg가 설치되지 않았습니다 (오디오 병합용)"
fi

echo ""
echo "🎉 환경 설정 완료!"
echo "이제 루트 폴더에서 다음 명령어를 사용할 수 있습니다:"
echo ""
echo "  pnpm env:check          # 환경변수 확인"
echo "  pnpm demo:quick         # 빠른 데모"
echo "  pnpm demo:audio         # 오디오 생성 데모"
echo "  pnpm pipeline:test      # 테스트 파이프라인"
echo ""