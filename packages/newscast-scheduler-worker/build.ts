/**
 * ESBuild configuration for newscast-scheduler-worker
 */
import * as esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['worker.ts'],
	bundle: true,
	format: 'esm',
	outfile: 'dist/worker.js',
	platform: 'neutral',
	target: 'esnext',
	external: ['cloudflare:*'],
	logLevel: 'info',
});

console.log('✅ Build complete: dist/worker.js');
