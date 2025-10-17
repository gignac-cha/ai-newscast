/**
 * Cloudflare R2 Uploader - Core Upload Logic
 *
 * Uploads newscast files to Cloudflare R2 using S3-compatible API
 */

import { S3Client, PutObjectCommand, type PutObjectCommandInput } from '@aws-sdk/client-s3';
import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import type { UploadOptions, UploadResult, FileUploadMetadata } from './types.ts';
import { validateUploadOptions } from './types.ts';

/**
 * Upload newscast files to Cloudflare R2 storage
 *
 * @param options - Upload configuration options
 * @returns Upload result with statistics
 *
 * @example
 * ```typescript
 * const result = await uploadToR2({
 *   inputDir: 'output/2025-10-05T19-53-26-599Z/topic-01',
 *   newscastID: '2025-10-05T19-53-26-599Z',
 *   topicIndex: 1,
 *   basePath: 'newscasts',
 *   accountID: process.env.CLOUDFLARE_ACCOUNT_ID!,
 *   accessKeyID: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
 *   bucketName: 'ai-newscast',
 * });
 *
 * console.log(`Uploaded ${result.filesUploaded} files (${result.totalBytes} bytes)`);
 * ```
 */
export async function uploadToR2(options: UploadOptions): Promise<UploadResult> {
  // Validate options using Zod
  const validatedOptions = validateUploadOptions(options);

  const startTime = Date.now();

  console.log('Starting R2 upload...');
  console.log(`  Input: ${validatedOptions.inputDir}`);
  console.log(`  Prefix: ${validatedOptions.prefix}`);
  console.log(`  Bucket: ${validatedOptions.bucketName}`);

  // Create S3 client configured for Cloudflare R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${validatedOptions.accountID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: validatedOptions.accessKeyID,
      secretAccessKey: validatedOptions.secretAccessKey,
    },
  });

  // Collect all files to upload
  console.log(`\n📁 Collecting files from: ${validatedOptions.inputDir}`);
  const filesToUpload = await collectFiles(validatedOptions.inputDir);

  if (filesToUpload.length === 0) {
    throw new Error(`No files found in directory: ${options.inputDir}`);
  }

  console.log(`📊 Found ${filesToUpload.length} files to upload`);

  let filesUploaded = 0;
  let totalBytes = 0;
  const uploadedFiles: string[] = [];

  // Upload files sequentially to avoid overwhelming the connection
  for (const filePath of filesToUpload) {
    const relativePath = relative(validatedOptions.inputDir, filePath);

    // Construct R2 key: {prefix}/{relativePath}
    const r2Key = `${validatedOptions.prefix}/${relativePath}`;

    try {
      // Read file content
      const fileContent = await readFile(filePath);
      const fileStat = await stat(filePath);
      const fileSize = fileStat.size;

      // Infer Content-Type from file extension
      const contentType = inferContentType(filePath);

      // Prepare S3 upload parameters
      const uploadParams: PutObjectCommandInput = {
        Bucket: validatedOptions.bucketName,
        Key: r2Key,
        Body: fileContent,
        ContentType: contentType,
        ContentLength: fileSize,
      };

      // Upload to R2
      await s3Client.send(new PutObjectCommand(uploadParams));

      filesUploaded++;
      totalBytes += fileSize;
      uploadedFiles.push(r2Key);

      const fileSizeKB = (fileSize / 1024).toFixed(2);
      console.log(`   ✓ Uploaded: ${r2Key} (${fileSizeKB} KB, ${contentType})`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ✗ Failed to upload ${r2Key}: ${errorMessage}`);
      throw new Error(`Upload failed for ${relativePath}: ${errorMessage}`);
    }
  }

  const duration = Date.now() - startTime;

  return {
    filesUploaded,
    totalBytes,
    duration,
    uploadedFiles,
  };
}

/**
 * Recursively collect all files from a directory
 * @param dirPath Directory path to scan
 * @returns Array of absolute file paths
 */
async function collectFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively collect files from subdirectories
        const subFiles = await collectFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read directory ${dirPath}: ${errorMessage}`);
  }

  // Sort files for consistent upload order
  return files.sort();
}

/**
 * Infer Content-Type from file extension
 * @param filePath File path to analyze
 * @returns MIME type string
 */
function inferContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case '.json':
      return 'application/json';
    case '.md':
    case '.markdown':
      return 'text/markdown';
    case '.mp3':
      return 'audio/mpeg';
    case '.html':
    case '.htm':
      return 'text/html';
    case '.txt':
      return 'text/plain';
    case '.xml':
      return 'application/xml';
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/javascript';
    case '.ts':
      return 'text/typescript';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}