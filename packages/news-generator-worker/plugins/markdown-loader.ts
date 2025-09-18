import type { PluginBuild } from 'esbuild';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const markdownLoaderPlugin = {
  name: 'markdown-loader',
  setup(build: PluginBuild) {
    build.onResolve({ filter: /\.md$/ }, (args) => {
      // Handle @ai-newscast/news-generator paths
      if (args.path.startsWith('@ai-newscast/news-generator/')) {
        const subPath = args.path.replace('@ai-newscast/news-generator/', '');
        const absolutePath = resolve(__dirname, '../../news-generator', subPath);
        return {
          path: absolutePath,
          namespace: 'markdown',
        };
      }

      return {
        path: resolve(args.resolveDir, args.path),
        namespace: 'markdown',
      };
    });

    build.onLoad({ filter: /.*/, namespace: 'markdown' }, async (args) => {
      const text = await readFile(args.path, 'utf8');
      return {
        contents: `export default ${JSON.stringify(text)};`,
        loader: 'js',
      };
    });
  },
};