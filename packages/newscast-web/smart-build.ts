#!/usr/bin/env node
/**
 * 스마트 빌드: 변경된 파일만 다시 빌드하는 증분 빌드 시스템
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('🧠 스마트 빌드 시작...\n');

interface BuildCache {
  lastBuild: number;
  fileHashes: Record<string, string>;
  vendorHash: string;
}

const CACHE_FILE = '.build-cache.json';
const startTime = Date.now();

// 파일 해시 계산
function getFileHash(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return '';
  }
}

// 캐시 로드
function loadCache(): BuildCache {
  try {
    const cacheData = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(cacheData);
  } catch {
    return {
      lastBuild: 0,
      fileHashes: {},
      vendorHash: ''
    };
  }
}

// 캐시 저장
function saveCache(cache: BuildCache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// 변경된 파일 감지
function detectChanges(): boolean {
  const cache = loadCache();
  const srcFiles = [
    'src/**/*.tsx',
    'src/**/*.ts',
    'src/**/*.css',
    'src/**/*.scss',
    'package.json',
    'vite.config.ts'
  ];

  console.log('📁 파일 변경 감지 중...');
  
  // package.json 의존성 변경 확인 (vendor 재빌드 필요)
  const packageJsonHash = getFileHash('package.json');
  const viteConfigHash = getFileHash('vite.config.ts');
  const vendorHash = packageJsonHash + viteConfigHash;
  
  if (cache.vendorHash !== vendorHash) {
    console.log('📦 의존성 변경 감지됨 - 전체 재빌드 필요');
    return true;
  }

  // 소스 파일 변경 확인
  const currentHashes: Record<string, string> = {};
  let hasChanges = false;

  // src 폴더의 모든 파일 확인
  function checkDir(dir: string) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkDir(filePath);
        } else if (file.match(/\.(ts|tsx|css|scss)$/)) {
          const hash = getFileHash(filePath);
          currentHashes[filePath] = hash;
          
          if (cache.fileHashes[filePath] !== hash) {
            console.log(`🔄 변경됨: ${filePath}`);
            hasChanges = true;
          }
        }
      }
    } catch (error) {
      console.log(`❌ 디렉터리 읽기 실패: ${dir}`);
    }
  }

  checkDir('src');
  
  // 새 파일 감지
  for (const filePath of Object.keys(currentHashes)) {
    if (!(filePath in cache.fileHashes)) {
      console.log(`➕ 새 파일: ${filePath}`);
      hasChanges = true;
    }
  }

  // 삭제된 파일 감지
  for (const filePath of Object.keys(cache.fileHashes)) {
    if (!(filePath in currentHashes)) {
      console.log(`➖ 삭제된 파일: ${filePath}`);
      hasChanges = true;
    }
  }

  // 캐시 업데이트
  const newCache: BuildCache = {
    lastBuild: Date.now(),
    fileHashes: currentHashes,
    vendorHash
  };
  
  saveCache(newCache);
  
  return hasChanges;
}

// 메인 빌드 로직
async function smartBuild() {
  const hasChanges = detectChanges();
  
  if (!hasChanges && fs.existsSync('dist/index.html')) {
    console.log('✅ 변경사항 없음 - 기존 빌드 재사용');
    console.log(`⏱️  캐시 활용으로 빌드 시간 절약: ${(Date.now() - startTime) / 1000}초`);
    return;
  }

  console.log('🔨 빌드 실행 중...');
  
  // Vite 빌드 실행
  const buildProcess = spawn('vite', ['build'], {
    stdio: 'inherit',
    shell: true
  });

  return new Promise<void>((resolve, reject) => {
    buildProcess.on('close', (code) => {
      const duration = (Date.now() - startTime) / 1000;
      
      if (code === 0) {
        console.log(`\n✅ 빌드 완료 (${duration.toFixed(2)}초)`);
        resolve();
      } else {
        console.log(`\n❌ 빌드 실패 (코드: ${code})`);
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    buildProcess.on('error', (error) => {
      console.error('❌ 빌드 프로세스 에러:', error);
      reject(error);
    });
  });
}

// 실행
smartBuild().catch(console.error);