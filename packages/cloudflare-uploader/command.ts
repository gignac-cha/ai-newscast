#!/usr/bin/env node

/**
 * Cloudflare R2 Uploader - CLI Interface
 *
 * Command-line interface for uploading newscast files to R2
 */

import { Command } from 'commander';
import { uploadNewscast } from './uploader-wrapper.ts';
import type { UploadOptions } from './types.ts';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env
config();

const program = new Command();

program
  .name('cloudflare-uploader')
  .description('Upload newscast files to Cloudflare R2 storage')
  .version('1.0.0');

program
  .command('upload')
  .description('Upload newscast files to R2')
  .requiredOption('-i, --input-dir <path>', 'Input directory containing newscast files')
  .requiredOption('-n, --newscast-id <id>', 'Newscast ID (ISO timestamp)')
  .requiredOption('-t, --topic-index <index>', 'Topic index (1-10)', parseInt)
  .option('--test', 'Upload to tests/newscasts instead of newscasts', false)
  .option('--account-id <id>', 'Cloudflare Account ID (or use CLOUDFLARE_ACCOUNT_ID env var)')
  .option('--access-key-id <key>', 'R2 Access Key ID (or use CLOUDFLARE_ACCESS_KEY_ID env var)')
  .option('--secret-access-key <key>', 'R2 Secret Access Key (or use CLOUDFLARE_SECRET_ACCESS_KEY env var)')
  .option('--bucket-name <name>', 'R2 bucket name', 'ai-newscast')
  .action(async (options) => {
    try {
      // Resolve input directory to absolute path
      const inputDir = resolve(options.inputDir);

      // Validate input directory exists
      if (!existsSync(inputDir)) {
        throw new Error(`Input directory does not exist: ${inputDir}`);
      }

      // Validate topic index
      const topicIndex = options.topicIndex;
      if (isNaN(topicIndex) || topicIndex < 1 || topicIndex > 10) {
        throw new Error(`Topic index must be a number between 1 and 10, got: ${options.topicIndex}`);
      }

      // Get credentials from options or environment variables
      const accountID = options.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
      const accessKeyID = options.accessKeyId ?? process.env.CLOUDFLARE_ACCESS_KEY_ID;
      const secretAccessKey = options.secretAccessKey ?? process.env.CLOUDFLARE_SECRET_ACCESS_KEY;

      // Validate credentials
      if (!accountID) {
        throw new Error('Cloudflare Account ID is required. Provide --account-id or set CLOUDFLARE_ACCOUNT_ID environment variable');
      }
      if (!accessKeyID) {
        throw new Error('R2 Access Key ID is required. Provide --access-key-id or set CLOUDFLARE_ACCESS_KEY_ID environment variable');
      }
      if (!secretAccessKey) {
        throw new Error('R2 Secret Access Key is required. Provide --secret-access-key or set CLOUDFLARE_SECRET_ACCESS_KEY environment variable');
      }

      // Prepare upload options (without basePath - handled by uploadNewscast)
      const uploadOptions: Omit<UploadOptions, 'basePath'> = {
        inputDir,
        newscastID: options.newscastId,
        topicIndex,
        accountID,
        accessKeyID,
        secretAccessKey,
        bucketName: options.bucketName,
      };

      // Determine base path based on test flag
      const basePath = options.test ? 'tests/newscasts' : 'newscasts';

      // Display upload information
      console.log(`\n📤 Uploading newscast files to Cloudflare R2...`);
      console.log(`   Newscast ID: ${uploadOptions.newscastID}`);
      console.log(`   Topic Index: ${uploadOptions.topicIndex}`);
      console.log(`   Input Directory: ${uploadOptions.inputDir}`);
      console.log(`   Bucket: ${uploadOptions.bucketName}`);
      console.log(`   Base Path: ${basePath}`);
      console.log(`   Account ID: ${uploadOptions.accountID.substring(0, 8)}...`);
      console.log('');

      // Perform upload
      const result = await uploadNewscast(uploadOptions, options.test);

      // Calculate statistics
      const totalSizeMB = (result.totalBytes / 1024 / 1024).toFixed(2);
      const averageSizeKB = result.filesUploaded > 0
        ? ((result.totalBytes / result.filesUploaded) / 1024).toFixed(2)
        : '0.00';
      const uploadSpeed = result.duration > 0
        ? ((result.totalBytes / 1024 / 1024) / (result.duration / 1000)).toFixed(2)
        : '0.00';

      // Display results
      console.log(`\n✅ Upload completed successfully!`);
      console.log(`   Files uploaded: ${result.filesUploaded}`);
      console.log(`   Total size: ${totalSizeMB} MB`);
      console.log(`   Average file size: ${averageSizeKB} KB`);
      console.log(`   Duration: ${formatDuration(result.duration)}`);
      console.log(`   Upload speed: ${uploadSpeed} MB/s`);
      console.log(`\n📍 Files available at:`);
      console.log(`   https://ai-newscast.r2.dev/${basePath}/${uploadOptions.newscastID}/`);
      console.log('\nUploaded files:');
      result.uploadedFiles.forEach(file => {
        console.log(`  - ${file}`);
      });

      // Exit successfully
      process.exit(0);

    } catch (error) {
      if (error instanceof Error) {
        console.error(`\nError: ${error.message}`);

        // Provide helpful error messages
        if (error.message.includes('validation')) {
          console.error('\nValidation failed. Please check your input parameters.');
        } else if (error.message.includes('not implemented')) {
          console.error('\nThis functionality is not yet implemented.');
        } else if (error.message.includes('credentials') || error.message.includes('Account ID') || error.message.includes('Access Key')) {
          console.error('\nCredentials validation failed. Check your environment variables:');
          console.error('  - CLOUDFLARE_ACCOUNT_ID');
          console.error('  - CLOUDFLARE_ACCESS_KEY_ID');
          console.error('  - CLOUDFLARE_SECRET_ACCESS_KEY');
        }

        if (error.stack && process.env.DEBUG) {
          console.error('\nStack trace:');
          console.error(error.stack);
        }
      } else {
        console.error('\nAn unexpected error occurred:', error);
      }

      process.exit(1);
    }
  });

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(2)} ${units[index]}`;
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(duration: number): string {
  if (duration < 1000) {
    return `${duration.toFixed(0)}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format upload speed
 */
function formatSpeed(bytes: number, duration: number): string {
  if (duration === 0) return 'N/A';

  const bytesPerSecond = (bytes / duration) * 1000;
  return `${formatBytes(bytesPerSecond)}/s`;
}

// Parse command-line arguments
program.parse();