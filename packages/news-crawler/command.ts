#!/usr/bin/env node

import { Command } from 'commander';
import { crawlNewsTopics } from './crawl-news-topics.ts';
import { crawlNewsDetail, crawlNewsDetailsBatch } from './crawl-news-detail.ts';
import path from 'node:path';
import fs from 'node:fs/promises';

const program = new Command();

program
  .name('news-crawler')
  .description('TypeScript News Crawler CLI for BigKinds')
  .version('1.0.0');

// News Topics Command
program
  .command('topics')
  .description('Crawl news topics from BigKinds')
  .option('-o, --output <dir>', 'Output directory (saves HTML and JSON files)')
  .action(async (options) => {
    try {
      console.log('🔍 Crawling news topics...');

      const includeHTML = Boolean(options.output);
      const result = await crawlNewsTopics({ includeHTML });

      if (options.output) {
        // Use newscastID from metrics as folder name
        const newscastID = result.metrics?.newscastID ?? new Date().toISOString().replace(/[:.]/g, '-');
        const outputDirectory = path.join(options.output, newscastID);

        // Create output directory
        await fs.mkdir(outputDirectory, { recursive: true });

        // Save HTML file
        if (result.html) {
          const htmlPath = path.join(outputDirectory, 'topics.html');
          await fs.writeFile(htmlPath, result.html, 'utf-8');
          console.log(`💾 Saved HTML to: ${htmlPath}`);
        }

        // Save JSON file (without HTML)
        const jsonPath = path.join(outputDirectory, 'topics.json');
        const jsonData = {
          timestamp: result.metrics?.timing.startedAt ?? new Date().toISOString(),
          count: result.topics.length,
          topics: result.topics,
          metrics: result.metrics
        };
        await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(`💾 Saved JSON to: ${jsonPath}`);

        // Create topic-{index} folders and save news-list.json for each topic
        console.log(`📁 Creating ${result.topics.length} topic folders...`);
        for (let i = 0; i < result.topics.length; i++) {
          const topic = result.topics[i];
          const topicIndex = (i + 1).toString().padStart(2, '0');
          const topicDirectory = path.join(outputDirectory, `topic-${topicIndex}`);

          // Create topic directory
          await fs.mkdir(topicDirectory, { recursive: true });

          // Save news-list.json
          const newsListPath = path.join(topicDirectory, 'news-list.json');
          const newsListData = {
            topicIndex: i + 1,
            newsIDs: topic.news_ids,
            count: topic.news_ids.length,
            timestamp: result.metrics?.timing.startedAt ?? new Date().toISOString()
          };
          await fs.writeFile(newsListPath, JSON.stringify(newsListData, null, 2), 'utf-8');
        }
        console.log(`✅ Created ${result.topics.length} topic folders with news lists`);

        console.log(`✅ Found ${result.topics.length} topics and saved to ${outputDirectory}`);
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
  .requiredOption('-o, --output <path>', 'Output directory')
  .option('-t, --topic-index <index>', 'Topic index', '1')
  .action(async (options) => {
    try {
      console.log(`🔍 Crawling news detail for: ${options.newsId}`);
      const result = await crawlNewsDetail(options.newsId);

      // Extract newscastID from output path
      const outputDirectory = options.output;
      const newscastID = path.basename(outputDirectory);

      const topicIndex = parseInt(options.topicIndex);
      const topicIndexStr = topicIndex.toString().padStart(2, '0');
      const topicDirectory = path.join(outputDirectory, `topic-${topicIndexStr}`, 'news');

      // Create news directory
      await fs.mkdir(topicDirectory, { recursive: true });

      // Save news detail file
      const newsFilePath = path.join(topicDirectory, `${result.originalNewsID}.json`);
      await fs.writeFile(newsFilePath, JSON.stringify(result, null, 2), 'utf-8');

      console.log(`✅ Saved news detail to ${newsFilePath}`);
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
  .requiredOption('-o, --output <path>', 'Output directory')
  .option('-t, --topic-index <index>', 'Topic index', '1')
  .action(async (options) => {
    try {
      const newsIDs = options.newsIds.split(',').map((id: string) => id.trim());
      console.log(`🔍 Crawling details for ${newsIDs.length} news items...`);

      // Extract newscastID from output path (parent of topic directory)
      const outputDirectory = options.output;
      const newscastID = path.basename(path.dirname(outputDirectory));

      const topicIndex = parseInt(options.topicIndex);
      const result = await crawlNewsDetailsBatch(newsIDs, newscastID, topicIndex);

      const topicIndexStr = topicIndex.toString().padStart(2, '0');
      const topicDirectory = path.join(outputDirectory, 'news');

      // Create news directory
      await fs.mkdir(topicDirectory, { recursive: true });

      // Save individual news detail files
      for (const newsResult of result.results) {
        const newsFilePath = path.join(topicDirectory, `${newsResult.originalNewsID}.json`);
        await fs.writeFile(newsFilePath, JSON.stringify(newsResult, null, 2), 'utf-8');
      }

      // Save metrics
      const metricsPath = path.join(outputDirectory, 'news-details.json');
      await fs.writeFile(metricsPath, JSON.stringify(result.metrics, null, 2), 'utf-8');

      console.log(`✅ Saved ${result.successCount} news details to ${topicDirectory}`);
      console.log(`✅ Saved metrics to ${metricsPath}`);
      console.log(`✅ Completed: ${result.successCount} success, ${result.errorCount} errors`);
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
      const newscastID = result.metrics?.newscastID ?? new Date().toISOString();
      console.log(`✅ Found ${topics.length} topics`);

      const selectedTopics = topics.slice(0, limitTopics);
      console.log(`📌 Processing first ${selectedTopics.length} topics`);

      // Step 2: Get details for selected news from each topic
      for (let i = 0; i < selectedTopics.length; i++) {
        const topic = selectedTopics[i];
        const topicIndex = i + 1;
        console.log(`\n🔍 Step 2.${topicIndex}: Crawling details for "${topic.title}"`);

        try {
          // Get limited number of news IDs directly from topic
          const selectedNewsIDs = topic.news_ids.slice(0, limitNews);
          console.log(`📋 Processing ${selectedNewsIDs.length} news items`);

          if (selectedNewsIDs.length > 0) {
            const details = await crawlNewsDetailsBatch(selectedNewsIDs, newscastID, topicIndex);
            console.log(`✅ Details: ${details.successCount} success, ${details.errorCount} errors`);
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