/**
 * Document Processing Service
 * Extracts text from PDF, DOCX, and TXT files
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { storageService } from './storage.service';
import { DocumentMetadata } from '../types';
import { logger } from '../config/logger';

export class DocumentService {
  /**
   * Process a document file
   * @param buffer File buffer
   * @param filename Original filename
   * @param mimeType MIME type
   * @param boardId Board ID
   * @param nodeId Node ID
   * @returns Extracted text and metadata
   */
  async processDocument(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    boardId: string,
    nodeId: string
  ): Promise<{
    textContent: string;
    metadata: DocumentMetadata;
    storageKey: string;
  }> {
    try {
      logger.info('Processing document', { filename, mimeType });

      // Upload original file to S3
      const uploadResult = await storageService.uploadFile(
        buffer,
        filename,
        boardId,
        nodeId,
        'raw',
        mimeType
      );

      // Extract text based on file type
      let textContent = '';
      let pageCount: number | undefined;

      if (mimeType === 'application/pdf') {
        const result = await this.extractPdfText(buffer);
        textContent = result.text;
        pageCount = result.pageCount;
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        textContent = await this.extractDocxText(buffer);
      } else if (mimeType === 'text/plain') {
        textContent = buffer.toString('utf-8');
      } else {
        throw new Error(`Unsupported document type: ${mimeType}`);
      }

      logger.info('Document processed', {
        filename,
        textLength: textContent.length,
        pageCount,
      });

      return {
        textContent,
        metadata: {
          filename,
          mimeType,
          size: buffer.length,
          pageCount,
        },
        storageKey: uploadResult.key,
      };
    } catch (error) {
      logger.error('Failed to process document', { error, filename });
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   * @param buffer PDF file buffer
   * @returns Extracted text and page count
   */
  private async extractPdfText(buffer: Buffer): Promise<{
    text: string;
    pageCount: number;
  }> {
    try {
      const data = await pdfParse(buffer);
      return {
        text: data.text,
        pageCount: data.numpages,
      };
    } catch (error) {
      logger.error('Failed to extract PDF text', { error });
      throw new Error(`Failed to extract PDF text: ${error}`);
    }
  }

  /**
   * Extract text from DOCX file
   * @param buffer DOCX file buffer
   * @returns Extracted text
   */
  private async extractDocxText(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Failed to extract DOCX text', { error });
      throw new Error(`Failed to extract DOCX text: ${error}`);
    }
  }

  /**
   * Detect file type from buffer
   * @param buffer File buffer
   * @param filename Filename (fallback)
   * @returns MIME type
   */
  detectMimeType(buffer: Buffer, filename: string): string {
    // Check magic numbers
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }

    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      // ZIP-based format (DOCX, etc.)
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Fallback to extension-based detection
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc':
        return 'application/msword';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Validate file size
   * @param size File size in bytes
   * @param maxSize Maximum allowed size (default 50MB)
   * @returns true if valid
   */
  validateFileSize(size: number, maxSize: number = 50 * 1024 * 1024): boolean {
    return size <= maxSize;
  }
}

export const documentService = new DocumentService();
