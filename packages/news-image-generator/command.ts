import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { Command } from 'commander';
import { generateImage, type GenerateImageOptions } from './news-image-generator.ts';

async function loadPromptTemplate(): Promise<string> {
  const promptPath = join(import.meta.dirname, 'prompts', 'image-generation.md');
  return await readFile(promptPath, 'utf-8');
}

async function processImageGeneration(
  newsFile: string,
  outputFile: string,
  model?: string,
  aspectRatio?: string
): Promise<void> {
  const absoluteNewsFile = resolve(newsFile);
  const absoluteOutputFile = resolve(outputFile);
  const absoluteOutputDir = dirname(absoluteOutputFile);

  const startTime = Date.now();

  const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_GEN_AI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Extract newscastID and topicIndex from newsFile path
  // e.g., output/{newscastID}/topic-{N}/news.json
  const pathParts = newsFile.split('/');
  const newscastID = pathParts[pathParts.length - 3];
  const topicFolder = pathParts[pathParts.length - 2];
  const topicIndexMatch = topicFolder.match(/topic-(\d+)/);
  const topicIndex = topicIndexMatch ? parseInt(topicIndexMatch[1], 10) : 0;

  try {
    // Load the prompt template
    const promptTemplate = await loadPromptTemplate();

    // Load the news.json file
    const newsContent = await readFile(absoluteNewsFile, 'utf-8');
    const newsData = JSON.parse(newsContent);
    const articleContent = newsData.content;

    // Create the final prompt
    const prompt = promptTemplate.replace('{{ARTICLE_CONTENT}}', articleContent);

    const options: GenerateImageOptions = {
      prompt,
      apiKey,
      newscastID,
      topicIndex,
      model,
      aspectRatio,
    };

    const { imageData, imageInfo } = await generateImage(options);

    // Ensure output directory exists
    await mkdir(absoluteOutputDir, { recursive: true });

    // Write image file
    await writeFile(absoluteOutputFile, imageData);
    console.log(`✅ Image saved to ${absoluteOutputFile}`);

    // Write metadata file
    const infoFile = absoluteOutputFile.replace(/\.(png|jpg|jpeg)$/, '-info.json');
    await writeFile(infoFile, JSON.stringify(imageInfo, null, 2));
    console.log(`✅ Image metadata saved to ${infoFile}`);
    
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n📊 Generation complete in ${elapsedSeconds}s`);
    console.log(`   - Model: ${imageInfo.model}`);
    console.log(`   - Cost: $${imageInfo.cost.totalCost.toFixed(5)}`);

  } catch (error) {
    console.error('Error generating image:', error);
    process.exit(1);
  }
}

async function main() {
  const program = new Command();

  program
    .name('news-image-generator')
    .description('AI-powered news image generator using Google Gemini')
    .version('1.0.0')
    .requiredOption('-n, --news-file <path>', 'File containing the news.json data')
    .requiredOption('-o, --output-file <path>', 'Output path for the generated image (e.g., image.png)')
    .option('-m, --model <model>', 'Gemini model to use', 'gemini-2.5-flash-image')
    .option('-a, --aspect-ratio <ratio>', 'Image aspect ratio', '16:9')
    .action(async (options) => {
      const { newsFile, outputFile, model, aspectRatio } = options;
      await processImageGeneration(newsFile, outputFile, model, aspectRatio);
    });

  program.parse();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
