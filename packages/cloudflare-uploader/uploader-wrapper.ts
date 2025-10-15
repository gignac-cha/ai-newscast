/**
 * Cloudflare R2 Uploader - Convenience Wrapper
 *
 * Higher-level API with test mode support
 */

import { uploadToR2 } from './uploader.ts';
import type { UploadOptions, UploadResult } from './types.ts';

/**
 * Upload newscast files with test mode support
 *
 * @param options - Upload configuration options (without basePath)
 * @param testMode - If true, upload to 'tests/newscasts' instead of 'newscasts'
 * @returns Upload result with statistics
 *
 * @example
 * ```typescript
 * // Production upload
 * const result = await uploadNewscast({
 *   inputDir: 'output/2025-10-05T19-53-26-599Z/topic-01',
 *   newscastID: '2025-10-05T19-53-26-599Z',
 *   topicIndex: 1,
 *   accountID: process.env.CLOUDFLARE_ACCOUNT_ID!,
 *   accessKeyID: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
 *   bucketName: 'ai-newscast',
 * }, false);
 *
 * // Test upload
 * const testResult = await uploadNewscast({
 *   // ... same options
 * }, true);
 * ```
 */
export async function uploadNewscast(
  options: Omit<UploadOptions, 'basePath'>,
  testMode = false
): Promise<UploadResult> {
  const basePath = testMode ? 'tests/newscasts' : 'newscasts';

  return uploadToR2({
    ...options,
    basePath,
  });
}
