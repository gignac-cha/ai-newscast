/**
 * ESBuild configuration for bigkinds-mock-worker
 */
import * as esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['worker.ts'],
	bundle: true,
	format: 'esm',
	outfile: 'dist/worker.js',
	platform: 'neutral',
	target: 'es2022',
	logLevel: 'info',
});

console.log('✅ Build complete: dist/worker.js');
