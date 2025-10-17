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
 * @property {string} inputDir - Input directory path
 * @property {string} prefix - R2 path prefix (e.g., 'newscasts/2025-10-17T01-36-12-458Z')
 * @property {string} accountID - Cloudflare Account ID
 * @property {string} accessKeyID - R2 Access Key ID
 * @property {string} secretAccessKey - R2 Secret Access Key
 * @property {string} bucketName - R2 bucket name (default: 'ai-newscast')
 */
export interface UploadOptions {
  inputDir: string;
  prefix: string;
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
  prefix: z.string().min(1, 'R2 prefix is required'),
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
