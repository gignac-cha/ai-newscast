#!/usr/bin/env node

import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { generateNewscastScript } from './generate-newscast-script.ts';
import { loadPrompt, loadTTSHosts } from './utils.ts';
import type { GeneratedNews } from './types.ts';

interface ScriptCommandOptions {
  inputFile: string;
  outputFile: string;
  printFormat?: 'json' | 'text';
  printLogFile?: string;
}

async function generateScriptToFiles({
  inputFile,
  outputFile,
  printFormat = 'text',
  printLogFile,
}: ScriptCommandOptions) {
  const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_GEN_AI_API_KEY environment variable is required');
  }

  const [newsContent, promptTemplate, voices] = await Promise.all([
    readFile(inputFile, 'utf-8'),
    loadPrompt(),
    loadTTSHosts(),
  ]);

  const newsData = JSON.parse(newsContent) as GeneratedNews;
  const result = await generateNewscastScript({
    news: newsData,
    promptTemplate,
    voices,
    apiKey,
  });

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(result.output, null, 2), 'utf-8');

  const markdownFile = outputFile.endsWith('.json')
    ? outputFile.replace(/\.json$/i, '.md')
    : `${outputFile}.md`;
  await writeFile(markdownFile, result.markdown, 'utf-8');

  const logPayload = {
    timestamp: result.stats.completedAt,
    started_at: result.stats.startedAt,
    elapsed_ms: result.stats.elapsedMs,
    script_lines: result.stats.scriptLines,
    hosts: `${result.stats.hosts.host1}, ${result.stats.hosts.host2}`,
    input_file: inputFile,
    output_file: outputFile,
    markdown_file: markdownFile,
  };

  if (printFormat === 'json') {
    console.log(JSON.stringify(logPayload, null, 2));
  } else {
    console.log(`✅ Generated newscast script: ${outputFile}`);
    console.log(`📝 Script lines: ${result.stats.scriptLines}`);
    console.log(`🎙️ Hosts: ${result.stats.hosts.host1}, ${result.stats.hosts.host2}`);
    console.log(`⏱️ Elapsed: ${(result.stats.elapsedMs / 1000).toFixed(2)}s`);
  }

  if (printLogFile) {
    await mkdir(dirname(printLogFile), { recursive: true });
    await writeFile(printLogFile, JSON.stringify(logPayload, null, 2), 'utf-8');
  }

  return { markdownFile };
}

const program = new Command();

program
  .name('newscast-generator')
  .description('AI-powered newscast script and audio generator with Google TTS integration')
  .version('1.0.0');

// Script Generation Command
program
  .command('script')
  .description('Generate newscast script from consolidated news')
  .requiredOption('-i, --input-file <path>', 'Input JSON file containing consolidated news')
  .requiredOption('-o, --output-file <path>', 'Output file path for generated script')
  .option('-f, --print-format <format>', 'Output format (json|text)', 'text')
  .option('-l, --print-log-file <path>', 'File to write JSON log output')
  .action(async (options) => {
    try {
      const { inputFile, outputFile, printFormat, printLogFile } = options;
      await generateScriptToFiles({ inputFile, outputFile, printFormat, printLogFile });
    } catch (error) {
      console.error('❌ Error generating script:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
