#!/usr/bin/env node

console.log('🚀 Vite 빌드 성능 분석 시작...\n');

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// 빌드 시간 측정
const startTime = Date.now();

// 빌드 실행
const buildProcess = spawn('pnpm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_ANALYZE: '1'
  }
});

buildProcess.on('close', (code) => {
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`\n📊 빌드 완료!`);
  console.log(`⏱️  소요 시간: ${duration.toFixed(2)}초`);
  
  if (code === 0) {
    console.log('✅ 빌드 성공');
    
    // 빌드 결과 분석
    const distPath = path.join(process.cwd(), 'dist');
    
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      const cssFiles = files.filter(f => f.endsWith('.css'));
      
      console.log(`\n📦 생성된 파일:`);
      console.log(`   JS 파일: ${jsFiles.length}개`);
      console.log(`   CSS 파일: ${cssFiles.length}개`);
      
      // 파일 크기 분석
      let totalSize = 0;
      files.forEach(file => {
        const filePath = path.join(distPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
          if (stats.size > 100000) { // 100KB 이상
            console.log(`   📄 ${file}: ${(stats.size / 1024).toFixed(1)}KB`);
          }
        }
      });
      
      console.log(`\n📏 총 번들 크기: ${(totalSize / 1024).toFixed(1)}KB`);
    }
  } else {
    console.log('❌ 빌드 실패');
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ 빌드 프로세스 에러:', error);
});