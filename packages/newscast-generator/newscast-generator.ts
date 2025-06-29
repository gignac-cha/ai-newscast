#!/usr/bin/env node

import { Command } from 'commander';
import { generateScript } from './generate-newscast-script.ts';
import { generateAudio } from './generate-newscast-audio.ts';
import { generateNewscast } from './generate-newscast.ts';

async function main() {
  const program = new Command();

  program
    .name('newscast-generator')
    .description('AI-powered newscast script and audio generator with TTS voice selection')
    .version('1.0.0');

  program
    .command('script')
    .description('Generate newscast script from consolidated news')
    .requiredOption('-i, --input-file <path>', 'Input JSON file containing consolidated news')
    .requiredOption('-o, --output-file <path>', 'Output file path for generated script')
    .option('-f, --print-format <format>', 'Output format (json|text)', 'text')
    .option('-l, --print-log-file <path>', 'File to write JSON log output')
    .action(async (options) => {
      const { inputFile, outputFile, printFormat, printLogFile } = options;
      await generateScript(inputFile, outputFile, printFormat, printLogFile);
    });

  program
    .command('audio')
    .description('Generate audio from newscast script (TTS)')
    .requiredOption('-i, --input-file <path>', 'Input newscast script JSON file')
    .requiredOption('-o, --output-dir <path>', 'Output directory for audio files')
    .option('-f, --print-format <format>', 'Output format (json|text)', 'text')
    .option('-l, --print-log-file <path>', 'File to write JSON log output')
    .action(async (options) => {
      const { inputFile, outputDir, printFormat, printLogFile } = options;
      await generateAudio(inputFile, outputDir, printFormat, printLogFile);
    });

  program
    .command('newscast')
    .description('Merge audio files into final newscast')
    .requiredOption('-i, --input-dir <path>', 'Input topic directory containing audio files')
    .action(async (options) => {
      const { inputDir } = options;
      await generateNewscast(inputDir);
    });

  program.parse();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}