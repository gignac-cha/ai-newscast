#!/usr/bin/env node

import { Command } from 'commander';
import { crawlNewsTopics } from './crawl-news-topics.ts';
import { crawlNewsDetail, crawlNewsDetailsBatch } from './crawl-news-detail.ts';

const program = new Command();

program
  .name('news-crawler')
  .description('TypeScript News Crawler CLI for BigKinds')
  .version('1.0.0');

// News Topics Command
program
  .command('topics')
  .description('Crawl news topics from BigKinds')
  .option('--save', 'Save HTML and JSON files to ai-newscast bucket structure')
  .action(async (options) => {
    try {
      console.log('🔍 Crawling news topics...');

      const includeHtml = Boolean(options.save);
      const result = await crawlNewsTopics({ includeHtml });

      if (options.save) {
        // Generate timestamp for folder structure
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = path.join('ai-newscast', 'newscasts', timestamp);

        // Create output directory
        await fs.mkdir(outputDir, { recursive: true });

        // Save HTML file
        if (result.html) {
          const htmlPath = path.join(outputDir, 'topics.html');
          await fs.writeFile(htmlPath, result.html, 'utf-8');
          console.log(`💾 Saved HTML to: ${htmlPath}`);
        }

        // Save JSON file (without HTML)
        const jsonPath = path.join(outputDir, 'topics.json');
        const jsonData = {
          timestamp: new Date().toISOString(),
          count: result.topics.length,
          topics: result.topics
        };
        await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(`💾 Saved JSON to: ${jsonPath}`);

        console.log(`✅ Found ${result.topics.length} topics and saved to ${outputDir}`);
      } else {
        console.log(`✅ Found ${result.topics.length} topics:`);
        console.log(JSON.stringify(result.topics, null, 2));
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });


// News Detail Command (single)
program
  .command('detail')
  .description('Crawl detail for a specific news item')
  .requiredOption('-n, --news-id <id>', 'News ID')
  .action(async (options) => {
    try {
      console.log(`🔍 Crawling news detail for: ${options.newsId}`);
      const result = await crawlNewsDetail(options.newsId);
      
      console.log('✅ News detail extracted:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// News Details Command (batch)
program
  .command('details')
  .description('Crawl details for multiple news items')
  .requiredOption('-i, --news-ids <ids>', 'Comma-separated news IDs')
  .action(async (options) => {
    try {
      const newsIds = options.newsIds.split(',').map((id: string) => id.trim());
      console.log(`🔍 Crawling details for ${newsIds.length} news items...`);
      
      const result = await crawlNewsDetailsBatch(newsIds);
      
      console.log(`✅ Completed: ${result.success_count} success, ${result.error_count} errors`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Combined workflow command
program
  .command('full-crawl')
  .description('Run full crawling workflow: topics -> lists -> details')
  .option('-l, --limit-topics <count>', 'Limit number of topics to process', '3')
  .option('-n, --limit-news <count>', 'Limit number of news per topic', '10')
  .action(async (options) => {
    try {
      const limitTopics = parseInt(options.limitTopics);
      const limitNews = parseInt(options.limitNews);
      
      console.log('🚀 Starting full crawling workflow...');
      
      // Step 1: Get topics
      console.log('\n📋 Step 1: Crawling topics...');
      const result = await crawlNewsTopics();
      const topics = result.topics;
      console.log(`✅ Found ${topics.length} topics`);
      
      const selectedTopics = topics.slice(0, limitTopics);
      console.log(`📌 Processing first ${selectedTopics.length} topics`);
      
      // Step 2: Get details for selected news from each topic
      for (let i = 0; i < selectedTopics.length; i++) {
        const topic = selectedTopics[i];
        console.log(`\n🔍 Step 2.${i + 1}: Crawling details for "${topic.title}"`);

        try {
          // Get limited number of news IDs directly from topic
          const selectedNewsIds = topic.news_ids.slice(0, limitNews);
          console.log(`📋 Processing ${selectedNewsIds.length} news items`);

          if (selectedNewsIds.length > 0) {
            const details = await crawlNewsDetailsBatch(selectedNewsIds);
            console.log(`✅ Details: ${details.success_count} success, ${details.error_count} errors`);
          }
        } catch (error) {
          console.error(`❌ Error processing topic "${topic.title}":`, error instanceof Error ? error.message : error);
        }
      }
      
      console.log('\n🎉 Full crawling workflow completed!');
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();