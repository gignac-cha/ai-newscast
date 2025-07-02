import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // 번들 분석 시에만 visualizer 활성화
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  server: {
    port: 3000,
    host: true,
    watch: {
      usePolling: true,
      interval: 300
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    reportCompressedSize: false, // 압축 사이즈 분석 비활성화로 빌드 속도 향상
    chunkSizeWarningLimit: 1000,
    // 증분 빌드 및 캐싱 최적화
    emptyOutDir: false, // dist 폴더를 완전히 비우지 않음
    write: true,
    watch: {
      include: ['src/**'],
      exclude: ['node_modules/**', 'dist/**'],
      chokidar: {
        usePolling: true,
        interval: 300
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'radix-vendor': ['@radix-ui/themes', '@radix-ui/react-collapsible', '@radix-ui/react-icons'],
          'emotion-vendor': ['@emotion/react'],
          'tanstack-vendor': ['@tanstack/react-query']
        },
        // 파일명에 해시 사용하여 캐시 최적화
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // 더 공격적인 최적화
      treeshake: {
        preset: 'smallest',
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    },
    // CSS 최적화
    cssCodeSplit: true,
    cssMinify: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@radix-ui/themes',
      '@radix-ui/react-collapsible', 
      '@radix-ui/react-icons',
      '@emotion/react',
      '@tanstack/react-query',
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/react-fontawesome'
    ],
    exclude: []
  },
  // CSS 트리 셰이킹 및 최적화
  css: {
    devSourcemap: false,
    preprocessorOptions: {
      scss: {
        charset: false
      }
    }
  },
  define: {
    'process.env': {}
  },
  // 빌드 성능 디버깅 설정
  logLevel: 'info',
  esbuild: {
    logLevel: 'info'
  }
}))