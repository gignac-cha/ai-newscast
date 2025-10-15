/**
 * Cloudflare R2 Uploader - Type Definitions
 *
 * Strong TypeScript interfaces for R2 upload operations
 */

import { z } from 'zod';

/**
 * Upload options for R2 uploader
 *
 * @interface UploadOptions
 * @property {string} inputDir - Input directory path (e.g., output/{newscastID}/topic-{N}/)
 * @property {string} newscastID - Newscast identifier (ISO timestamp)
 * @property {number} topicIndex - Topic index (1-10)
 * @property {string} basePath - Base path in R2 bucket ('newscasts' or 'tests/newscasts')
 * @property {string} accountID - Cloudflare Account ID
 * @property {string} accessKeyID - R2 Access Key ID
 * @property {string} secretAccessKey - R2 Secret Access Key
 * @property {string} bucketName - R2 bucket name (default: 'ai-newscast')
 */
export interface UploadOptions {
  inputDir: string;
  newscastID: string;
  topicIndex: number;
  basePath: string;
  accountID: string;
  accessKeyID: string;
  secretAccessKey: string;
  bucketName: string;
}

/**
 * Result of upload operation
 *
 * @interface UploadResult
 * @property {number} filesUploaded - Number of files successfully uploaded
 * @property {number} totalBytes - Total bytes uploaded
 * @property {number} duration - Upload duration in milliseconds (no unit suffix)
 * @property {string[]} uploadedFiles - List of R2 keys for uploaded files
 */
export interface UploadResult {
  filesUploaded: number;
  totalBytes: number;
  duration: number;  // milliseconds (default time unit, no suffix)
  uploadedFiles: string[];
}

/**
 * File upload metadata
 *
 * @interface FileUploadMetadata
 * @property {string} localPath - Local file path
 * @property {string} r2Key - R2 object key
 * @property {number} size - File size in bytes
 * @property {string} contentType - MIME type
 */
export interface FileUploadMetadata {
  localPath: string;
  r2Key: string;
  size: number;
  contentType: string;
}

/**
 * Zod schema for UploadOptions validation
 */
export const UploadOptionsSchema = z.object({
  inputDir: z.string().min(1, 'Input directory is required'),
  newscastID: z.string().min(1, 'Newscast ID is required'),
  topicIndex: z.number().int().min(1).max(10, 'Topic index must be between 1 and 10'),
  basePath: z.string().min(1, 'Base path is required'),
  accountID: z.string().min(1, 'Cloudflare Account ID is required'),
  accessKeyID: z.string().min(1, 'R2 Access Key ID is required'),
  secretAccessKey: z.string().min(1, 'R2 Secret Access Key is required'),
  bucketName: z.string().min(1, 'Bucket name is required'),
});

/**
 * Zod schema for UploadResult validation
 */
export const UploadResultSchema = z.object({
  filesUploaded: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  duration: z.number().nonnegative(),
  uploadedFiles: z.array(z.string()),
});

/**
 * Type guard for UploadOptions
 */
export function isValidUploadOptions(options: unknown): options is UploadOptions {
  return UploadOptionsSchema.safeParse(options).success;
}

/**
 * Validate and parse UploadOptions
 * @throws {z.ZodError} If validation fails
 */
export function validateUploadOptions(options: unknown): UploadOptions {
  return UploadOptionsSchema.parse(options);
}
