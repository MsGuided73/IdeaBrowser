/**
 * S3 Storage Service
 * Handles file uploads, downloads, and management in S3-compatible storage
 */

import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET, generateS3Key } from '../config/storage';
import { StorageUploadResult } from '../types';
import { logger } from '../config/logger';

export class StorageService {
  /**
   * Upload a file to S3
   * @param buffer File buffer
   * @param filename Original filename
   * @param boardId Board ID
   * @param nodeId Node ID
   * @param prefix Storage prefix (raw, preview, audio, screenshot)
   * @param contentType MIME type
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    boardId: string,
    nodeId: string,
    prefix: 'raw' | 'preview' | 'audio' | 'screenshot' = 'raw',
    contentType?: string
  ): Promise<StorageUploadResult> {
    try {
      const key = generateS3Key(boardId, nodeId, filename, prefix);

      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await s3Client.send(command);

      logger.info(`File uploaded to S3`, { key, size: buffer.length });

      return {
        key,
        url: await this.getSignedUrl(key),
        size: buffer.length,
      };
    } catch (error) {
      logger.error('Failed to upload file to S3', { error, filename });
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Get a signed URL for accessing a file (valid for 1 hour)
   * @param key S3 object key
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL', { error, key });
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  /**
   * Download a file from S3
   * @param key S3 object key
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Failed to download file from S3', { error, key });
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  /**
   * Delete a file from S3
   * @param key S3 object key
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      await s3Client.send(command);
      logger.info(`File deleted from S3`, { key });
    } catch (error) {
      logger.error('Failed to delete file from S3', { error, key });
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Upload base64 encoded data
   * @param base64Data Base64 string
   * @param filename Filename
   * @param boardId Board ID
   * @param nodeId Node ID
   * @param prefix Storage prefix
   * @param contentType MIME type
   */
  async uploadBase64(
    base64Data: string,
    filename: string,
    boardId: string,
    nodeId: string,
    prefix: 'raw' | 'preview' | 'audio' | 'screenshot' = 'raw',
    contentType?: string
  ): Promise<StorageUploadResult> {
    const buffer = Buffer.from(base64Data, 'base64');
    return this.uploadFile(buffer, filename, boardId, nodeId, prefix, contentType);
  }
}

export const storageService = new StorageService();
