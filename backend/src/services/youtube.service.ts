/**
 * YouTube Service
 * Handles YouTube video downloads and audio extraction using yt-dlp
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { storageService } from './storage.service';
import { geminiService } from './gemini.service';
import { YouTubeMetadata } from '../types';
import { logger } from '../config/logger';

const execAsync = promisify(exec);

export class YouTubeService {
  private tempDir = path.join(process.cwd(), 'temp');

  constructor() {
    // Ensure temp directory exists
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', { error });
    }
  }

  /**
   * Extract YouTube video ID from various URL formats
   * @param url YouTube URL
   * @returns Video ID or null
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Get video metadata using yt-dlp
   * @param url YouTube URL
   * @returns Video metadata
   */
  async getVideoMetadata(url: string): Promise<YouTubeMetadata> {
    try {
      const command = `${env.YT_DLP_PATH} --dump-json --no-warnings "${url}"`;
      const { stdout } = await execAsync(command);
      
      const metadata = JSON.parse(stdout);

      return {
        url,
        title: metadata.title || 'Unknown',
        duration: metadata.duration,
        channel: metadata.uploader || metadata.channel,
        thumbnail: metadata.thumbnail,
      };
    } catch (error) {
      logger.error('Failed to get YouTube metadata', { error, url });
      throw new Error(`Failed to get video metadata: ${error}`);
    }
  }

  /**
   * Download audio from YouTube video
   * @param url YouTube URL
   * @param nodeId Node ID for file naming
   * @returns Local file path to downloaded audio
   */
  async downloadAudio(url: string, nodeId: string): Promise<string> {
    try {
      const outputPath = path.join(this.tempDir, `${nodeId}.m4a`);

      // Download audio using yt-dlp
      // -x: extract audio
      // --audio-format m4a: output format
      // -o: output template
      const command = `${env.YT_DLP_PATH} -x --audio-format m4a -o "${outputPath}" --no-warnings "${url}"`;
      
      logger.info('Downloading YouTube audio', { url, nodeId });
      await execAsync(command, { maxBuffer: 1024 * 1024 * 100 }); // 100MB buffer

      // Verify file exists
      await fs.access(outputPath);
      
      logger.info('YouTube audio downloaded', { path: outputPath });
      return outputPath;
    } catch (error) {
      logger.error('Failed to download YouTube audio', { error, url });
      throw new Error(`Failed to download audio: ${error}`);
    }
  }

  /**
   * Process YouTube video: download audio, transcribe, upload to S3
   * @param url YouTube URL
   * @param boardId Board ID
   * @param nodeId Node ID
   * @returns Transcription data and S3 keys
   */
  async processVideo(
    url: string,
    boardId: string,
    nodeId: string
  ): Promise<{
    metadata: YouTubeMetadata;
    transcript: string;
    summary: string;
    transcriptMetadata: any;
    audioStorageKey: string;
  }> {
    try {
      // Step 1: Get video metadata
      const metadata = await this.getVideoMetadata(url);
      logger.info('Got YouTube metadata', { title: metadata.title });

      // Step 2: Download audio
      const audioPath = await this.downloadAudio(url, nodeId);

      // Step 3: Read audio file as base64
      const audioBuffer = await fs.readFile(audioPath);
      const audioBase64 = audioBuffer.toString('base64');

      // Step 4: Upload audio to S3
      const audioUploadResult = await storageService.uploadFile(
        audioBuffer,
        `${nodeId}.m4a`,
        boardId,
        nodeId,
        'audio',
        'audio/mp4'
      );

      logger.info('Audio uploaded to S3', { key: audioUploadResult.key });

      // Step 5: Transcribe audio using Gemini
      logger.info('Starting transcription', { nodeId });
      const transcriptionResult = await geminiService.transcribeAudio(
        audioBase64,
        'audio/mp4'
      );

      // Step 6: Clean up temp file
      await fs.unlink(audioPath).catch(err => 
        logger.warn('Failed to delete temp file', { path: audioPath, error: err })
      );

      return {
        metadata,
        transcript: transcriptionResult.transcript,
        summary: transcriptionResult.summary,
        transcriptMetadata: transcriptionResult.metadata,
        audioStorageKey: audioUploadResult.key,
      };
    } catch (error) {
      logger.error('Failed to process YouTube video', { error, url });
      throw error;
    }
  }

  /**
   * Check if yt-dlp is installed and accessible
   * @returns true if yt-dlp is available
   */
  async checkYtDlpAvailable(): Promise<boolean> {
    try {
      await execAsync(`${env.YT_DLP_PATH} --version`);
      return true;
    } catch (error) {
      logger.error('yt-dlp is not available', { error });
      return false;
    }
  }
}

export const youtubeService = new YouTubeService();
