#!/usr/bin/env node

import { Command } from 'commander';
import { join } from 'path';
import {
  CrawlerConfig,
  OutputConfig,
  Logger,
  FileUtils,
  DateUtils,
} from '@ai-newscast/core';
import { BigKindsCrawler } from './crawler.ts';

const program = new Command();

program
  .name('ai-newscast-crawler')
  .description('BigKinds news crawler for AI News Cast')
  .version('1.0.0');

program
  .command('topics')
  .description('Crawl topic list from BigKinds')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--no-html', 'Skip saving HTML files')
  .option('--no-json', 'Skip saving JSON files')
  .option('--no-timestamp', 'Do not create timestamp folder')
  .action(async (options) => {
    try {
      const outputConfig: Partial<OutputConfig> = {
        outputDir: options.output,
        saveHtml: options.html !== false,
        saveJson: options.json !== false,
        createTimestampFolder: options.timestamp !== false,
      };

      const crawler = new BigKindsCrawler({}, outputConfig);
      
      await crawler.initialize();
      const result = await crawler.crawlTopicList();
      await crawler.close();

      console.log(`\n✅ Topic list crawling completed!`);
      console.log(`📁 Output: ${result.outputPath}`);
      console.log(`📊 Topics found: ${result.data.topics.length}`);
      
      // Show top 5 topics
      console.log(`\n🔥 Top 5 topics:`);
      result.data.topics.slice(0, 5).forEach((topic, index) => {
        console.log(`  ${index + 1}. ${topic.topic} (${topic.news_count} news)`);
      });
      
    } catch (error) {
      Logger.error('Failed to crawl topics', error as Error);
      process.exit(1);
    }
  });

program
  .command('news')
  .description('Crawl news list for topics')
  .argument('<data-path>', 'Path to topic list data folder')
  .option('-t, --topics <ranks>', 'Topic ranks to process (comma-separated)', '1,2,3')
  .option('-d, --days <days>', 'Number of days to look back', '1')
  .action(async (dataPath, options) => {
    try {
      // Validate data path
      if (!(await FileUtils.pathExists(dataPath))) {
        throw new Error(`Data path does not exist: ${dataPath}`);
      }

      // Load topic list
      const topicListPath = join(dataPath, 'topic-list.json');
      if (!(await FileUtils.pathExists(topicListPath))) {
        throw new Error(`Topic list not found: ${topicListPath}`);
      }

      const topicList = await FileUtils.loadJson<any>(topicListPath);
      const topicRanks = options.topics.split(',').map((r: string) => parseInt(r.trim()));
      const dateRange = DateUtils.getDateRange(parseInt(options.days));

      const crawler = new BigKindsCrawler({}, { outputDir: dataPath, createTimestampFolder: false });
      
      await crawler.initialize();

      for (const rank of topicRanks) {
        const topic = topicList.topics.find((t: any) => t.rank === rank);
        if (!topic) {
          Logger.warn(`Topic with rank ${rank} not found`);
          continue;
        }

        console.log(`\n📰 Processing topic ${rank}: ${topic.topic}`);
        
        const result = await crawler.crawlNewsListForTopic(
          topic.topic,
          topic.news_ids,
          dataPath,
          rank,
          dateRange
        );

        console.log(`✅ Found ${result.data.news_list.length} news items`);
      }

      await crawler.close();
      console.log(`\n🎉 News crawling completed!`);
      
    } catch (error) {
      Logger.error('Failed to crawl news', error as Error);
      process.exit(1);
    }
  });

program
  .command('details')
  .description('Crawl detailed content for news items')
  .argument('<topic-path>', 'Path to topic folder containing news-list.json')
  .action(async (topicPath) => {
    try {
      // Validate topic path
      if (!(await FileUtils.pathExists(topicPath))) {
        throw new Error(`Topic path does not exist: ${topicPath}`);
      }

      // Load news list
      const newsListPath = join(topicPath, 'news-list.json');
      if (!(await FileUtils.pathExists(newsListPath))) {
        throw new Error(`News list not found: ${newsListPath}`);
      }

      const newsList = await FileUtils.loadJson<any>(newsListPath);

      console.log(`\n🔍 Processing ${newsList.news_list.length} news items for details...`);
      console.log(`📁 Topic: ${newsList.topic}`);

      const crawler = new BigKindsCrawler({}, { outputDir: topicPath, createTimestampFolder: false });
      
      await crawler.initialize();
      const result = await crawler.crawlNewsDetails(newsList, topicPath);
      await crawler.close();

      console.log(`\n✅ News details crawling completed!`);
      console.log(`📊 Success: ${result.successCount}, Errors: ${result.errorCount}`);
      console.log(`📁 Output: ${result.outputPath}`);
      
    } catch (error) {
      Logger.error('Failed to crawl news details', error as Error);
      process.exit(1);
    }
  });

program
  .command('pipeline')
  .description('Run full crawling pipeline')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-t, --max-topics <number>', 'Maximum number of topics to process', '10')
  .option('--include-details', 'Include detailed content crawling for first topic')
  .action(async (options) => {
    try {
      const outputConfig: Partial<OutputConfig> = {
        outputDir: options.output,
        saveHtml: true,
        saveJson: true,
        createTimestampFolder: true,
      };

      const maxTopics = parseInt(options.maxTopics);
      const includeDetails = options.includeDetails;

      console.log(`🚀 Starting full crawling pipeline...`);
      console.log(`📊 Max topics: ${maxTopics}`);
      console.log(`🔍 Include details: ${includeDetails ? 'Yes' : 'No'}`);

      const crawler = new BigKindsCrawler({}, outputConfig);
      
      await crawler.initialize();
      const result = await crawler.crawlFullPipeline(maxTopics);

      // Optionally crawl details for first topic
      if (includeDetails && result.topicList.topics.length > 0) {
        console.log(`\n🔍 Crawling details for first topic...`);
        
        const firstTopic = result.topicList.topics[0];
        const topicPath = join(result.outputPath, `topic-01`);
        
        if (await FileUtils.pathExists(join(topicPath, 'news-list.json'))) {
          const newsList = await FileUtils.loadJson<any>(join(topicPath, 'news-list.json'));
          const detailsResult = await crawler.crawlNewsDetails(newsList, topicPath);
          
          console.log(`✅ Details crawling completed!`);
          console.log(`📊 Success: ${detailsResult.successCount}, Errors: ${detailsResult.errorCount}`);
        }
      }

      await crawler.close();

      console.log(`\n🎉 Full pipeline completed!`);
      console.log(`📁 Output: ${result.outputPath}`);
      console.log(`📊 Total topics: ${result.topicList.topics.length}`);
      
    } catch (error) {
      Logger.error('Pipeline failed', error as Error);
      process.exit(1);
    }
  });

program.parse();