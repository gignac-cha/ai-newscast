#!/usr/bin/env node

/**
 * AI News Cast - 환경변수 자동 설정 스크립트 (Node.js 버전)
 * 사용법: node scripts/setup-env.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const ENV_FILE = join(PROJECT_ROOT, '.env');

console.log('🔧 AI News Cast 환경 설정');
console.log('================================================');

// .env 파일 확인 및 로드
if (existsSync(ENV_FILE)) {
    console.log(`✅ 환경변수 파일 찾음: ${ENV_FILE}`);
    
    const envContent = readFileSync(ENV_FILE, 'utf-8');
    const envLines = envContent.split('\\n').filter(line => 
        line.trim() && !line.trim().startsWith('#')
    );
    
    envLines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('='); // = 문자가 포함된 값 처리
            process.env[key.trim()] = value.trim();
        }
    });
    
    console.log('✅ 환경변수 로드 완료');
} else {
    console.log(`⚠️  환경변수 파일이 없습니다: ${ENV_FILE}`);
    console.log('📝 .env.example 파일을 .env로 복사하고 실제 값으로 변경해주세요:');
    console.log('');
    console.log('cp .env.example .env');
    console.log('# 그 후 .env 파일을 편집하여 API 키를 입력하세요');
    console.log('');
    process.exit(1);
}

// API 키 검증
if (process.env.GOOGLE_AI_API_KEY) {
    const apiKeyPreview = process.env.GOOGLE_AI_API_KEY.substring(0, 10) + '***';
    console.log(`🔑 Google AI API Key: ${apiKeyPreview}`);
} else {
    console.log('❌ GOOGLE_AI_API_KEY가 설정되지 않았습니다');
    process.exit(1);
}

// TTS 인증 정보 확인
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        const filename = process.env.GOOGLE_APPLICATION_CREDENTIALS.split('/').pop();
        console.log(`🎤 Google Cloud TTS 인증: ✅ ${filename}`);
    } else {
        console.log(`🎤 Google Cloud TTS 인증: ⚠️  파일 없음 (${process.env.GOOGLE_APPLICATION_CREDENTIALS})`);
    }
} else {
    console.log('🎤 Google Cloud TTS 인증: ⚠️  설정되지 않음 (API 키로 시도)');
}

// 필수 도구 확인
console.log('');
console.log('🛠️ 도구 확인:');

function checkCommand(command, errorMsg, installMsg) {
    try {
        const version = execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
        console.log(`✅ ${version}`);
        return true;
    } catch (error) {
        console.log(`❌ ${errorMsg}`);
        if (installMsg) console.log(`설치: ${installMsg}`);
        return false;
    }
}

const nodeVersion = process.version;
console.log(`✅ Node.js: ${nodeVersion}`);

const pnpmOk = checkCommand('pnpm --version', 'pnpm이 설치되지 않았습니다', 'npm install -g pnpm');
const uvOk = checkCommand('uv --version', 'UV가 설치되지 않았습니다', 'curl -LsSf https://astral.sh/uv/install.sh | sh');

// FFmpeg (선택사항)
try {
    const ffmpegVersion = execSync('ffmpeg -version 2>&1 | head -1', { 
        encoding: 'utf-8', 
        stdio: 'pipe',
        shell: true 
    }).split(' ')[2];
    console.log(`✅ FFmpeg: ${ffmpegVersion}`);
} catch (error) {
    console.log('⚠️  FFmpeg가 설치되지 않았습니다 (오디오 병합용)');
}

if (!pnpmOk || !uvOk) {
    console.log('');
    console.log('❌ 필수 도구가 누락되었습니다. 위의 설치 명령어를 실행해주세요.');
    process.exit(1);
}

console.log('');
console.log('🎉 환경 설정 완료!');
console.log('이제 루트 폴더에서 다음 명령어를 사용할 수 있습니다:');
console.log('');
console.log('  pnpm env:check          # 환경변수 확인');
console.log('  pnpm demo:quick         # 빠른 데모');
console.log('  pnpm demo:audio         # 오디오 생성 데모');
console.log('  pnpm pipeline:test      # 테스트 파이프라인');
console.log('');

// 환경변수를 .env 형식으로 출력 (다른 터미널에서 사용할 수 있도록)
console.log('💡 다른 터미널에서 사용하려면:');
console.log(`export GOOGLE_AI_API_KEY="${process.env.GOOGLE_AI_API_KEY}"`);
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`export GOOGLE_APPLICATION_CREDENTIALS="${process.env.GOOGLE_APPLICATION_CREDENTIALS}"`);
}
console.log('');
console.log('또는 간단히: source scripts/setup-env.sh');
console.log('');
console.log('⚠️  보안 주의: .env 파일은 절대 Git에 커밋하지 마세요!');
console.log('');