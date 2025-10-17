/**
 * ESBuild configuration for newscast-latest-id
 */
import * as esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['src/index.ts'],
	bundle: true,
	format: 'esm',
	outfile: 'dist/index.js',
	platform: 'neutral',
	target: 'es2022',
	logLevel: 'info',
});

console.log('✅ Build complete: dist/index.js');
