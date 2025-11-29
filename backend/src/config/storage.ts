/**
 * S3-compatible storage configuration (AWS S3 or MinIO)
 */

import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

// Create S3 client instance
export const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: env.S3_FORCE_PATH_STYLE, // Required for MinIO
});

export const S3_BUCKET = env.S3_BUCKET;

/**
 * Generate S3 object key for a file
 * @param boardId Board ID
 * @param nodeId Node ID
 * @param filename Original filename
 * @returns S3 object key path
 */
export function generateS3Key(
  boardId: string,
  nodeId: string,
  filename: string,
  prefix: 'raw' | 'preview' | 'audio' | 'screenshot' = 'raw'
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `boards/${boardId}/${prefix}/${nodeId}/${timestamp}-${sanitizedFilename}`;
}
