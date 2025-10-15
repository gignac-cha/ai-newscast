#!/usr/bin/env node

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { Command } from 'commander';
import type { GeneratedNews } from '@ai-newscast/core';
import { generateNews, formatAsMarkdown, type NewsDetail, type NewsGeneratorMetrics } from './news-generator.ts';

async function loadPrompt(): Promise<string> {
  const promptPath = join(import.meta.dirname, 'prompts', 'news-consolidation.md');
  return await readFile(promptPath, 'utf-8');
}

async function processNewsGeneration(
  inputFolder: string,
  outputFile: string,
  printFormat: string = 'text',
  printLogFile?: string,
  model?: string
): Promise<void> {
  const startTime = Date.now();

  // Extract newscastID and topicIndex from paths
  // inputFolder: output/{newscastID}/topic-{N}/news
  // outputFile: output/{newscastID}/topic-{N}/news.json
  const pathParts = inputFolder.split('/');
  const newscastID = pathParts[pathParts.length - 3]; // output/{newscastID}/topic-{N}/news -> newscastID
  const topicFolder = pathParts[pathParts.length - 2]; // topic-{N}
  const topicIndexMatch = topicFolder.match(/topic-(\d+)/);
  const topicIndex = topicIndexMatch ? parseInt(topicIndexMatch[1]) : 1;

  console.log(`[COMMAND] NewscastID: ${newscastID}, Topic Index: ${topicIndex}`);

  // Check API key
  const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_GEN_AI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Check input folder
  if (!existsSync(inputFolder)) {
    console.error(`Error: Input folder does not exist: ${inputFolder}`);
    process.exit(1);
  }

  // Read all JSON files from input folder
  const files = await readdir(inputFolder);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.error(`Error: No JSON files found in ${inputFolder}`);
    process.exit(1);
  }

  // Load news details
  const newsDetails: NewsDetail[] = [];
  for (const file of jsonFiles) {
    const filePath = join(inputFolder, file);
    const content = await readFile(filePath, 'utf-8');
    const newsDetail: NewsDetail = JSON.parse(content);
    newsDetails.push(newsDetail);
  }

  try {
    // Load prompt template
    const promptTemplate = await loadPrompt();

    // Generate news using pure function with metrics
    const result = await generateNews(newsDetails, promptTemplate, apiKey, newscastID, topicIndex, model);
    const { generatedNews, executionTime, metrics } = result;

    // Ensure output directory exists
    await mkdir(dirname(outputFile), { recursive: true });

    // Write JSON output (metrics included)
    await writeFile(outputFile, JSON.stringify(generatedNews, null, 2));

    // Write markdown output
    const markdownFile = outputFile.replace('.json', '.md');
    const markdownContent = formatAsMarkdown(generatedNews);
    await writeFile(markdownFile, markdownContent);

    const endTime = Date.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

    // Create log output
    const logOutput = {
      timestamp: new Date().toISOString(),
      'elapsed-time': `${elapsedSeconds}s`,
      'ai-processing-time': `${(executionTime / 1000).toFixed(2)}s`,
      'total-news-input': newsDetails.length,
      'total-news-generated': 1,
      'output-file': outputFile,
    };

    // Output log
    if (printFormat === 'json') {
      console.log(JSON.stringify(logOutput, null, 2));
    } else {
      console.log(`✅ Generated news content: ${outputFile}`);
      console.log(`📊 Processed ${newsDetails.length} articles in ${elapsedSeconds}s (AI: ${(executionTime / 1000).toFixed(2)}s)`);
      console.log(`📈 Metrics embedded in news.json`);
      console.log(`   - Input: ${metrics.input.totalArticles} articles, ${metrics.input.totalProviders} providers, ${metrics.input.inputDataSize} bytes`);
      console.log(`   - Output: ${metrics.output.totalOutputSize} bytes (${metrics.performance.articlesPerSecond.toFixed(2)} articles/s)`);
    }

    // Write to log file if specified
    if (printLogFile) {
      await mkdir(dirname(printLogFile), { recursive: true });
      await writeFile(printLogFile, JSON.stringify(logOutput, null, 2));
    }
  } catch (error) {
    console.error('Error generating news:', error);
    process.exit(1);
  }
}

async function main() {
  const program = new Command();

  program
    .name('news-generator')
    .description('AI-powered news content generator using Google Gemini')
    .version('1.0.0')
    .requiredOption('-i, --input-folder <path>', 'Folder containing news detail JSON files')
    .requiredOption('-o, --output-file <path>', 'Output file path for generated news')
    .option('-f, --print-format <format>', 'Output format (json|text)', 'text')
    .option('-l, --print-log-file <path>', 'File to write JSON log output')
    .option('-m, --model <model>', 'Gemini model to use (default: gemini-2.5-pro)')
    .action(async (options) => {
      const { inputFolder, outputFile, printFormat, printLogFile, model } = options;
      await processNewsGeneration(inputFolder, outputFile, printFormat, printLogFile, model);
    });

  program.parse();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}