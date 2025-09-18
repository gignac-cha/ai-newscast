import { context, type PluginBuild, type BuildResult } from 'esbuild';
import { markdownLoaderPlugin } from './plugins/markdown-loader.ts';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['worker.ts'],
  bundle: true,
  outfile: 'dist/worker.js',
  format: 'esm' as const,
  platform: 'browser' as const,
  target: 'es2022',
  external: ['node:*'],
  minify: true,
  sourcemap: true,
  logLevel: 'info' as const,
  mainFields: ['browser', 'module', 'main'],
  conditions: ['worker', 'browser'],
  plugins: [
    markdownLoaderPlugin,
    {
      name: 'rebuild-notify',
      setup(build: PluginBuild) {
        build.onEnd((result: BuildResult) => {
          if (result.errors.length > 0) {
            console.error(`❌ Build failed with ${result.errors.length} errors`);
            result.errors.forEach((error: any) => console.error(error));
          } else {
            console.log('✅ Build succeeded');
          }
        });
      },
    }
  ],
};

if (isWatch) {
  try {
    const ctx = await context(buildOptions);

    await ctx.watch();
    console.log('👀 Watching for changes...');

    // Handle graceful shutdown
    const cleanup = async () => {
      console.log('\n🛑 Stopping watch mode...');
      await ctx.dispose();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep the process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Failed to start watch mode:', error);
    process.exit(1);
  }
} else {
  try {
    const ctx = await context(buildOptions);
    await ctx.rebuild();
    await ctx.dispose();
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}