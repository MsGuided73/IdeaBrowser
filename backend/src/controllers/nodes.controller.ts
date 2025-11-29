/**
 * Nodes Controller
 * Handles node operations (create, update, delete)
 */

import { Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/database';
import { AuthenticatedRequest, NotFoundError, ForbiddenError, ValidationError } from '../types';
import { embeddingsService } from '../services/embeddings.service';
import { documentService } from '../services/document.service';
import { logger } from '../config/logger';
import { NodeType } from '@prisma/client';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export class NodesController {
  // Multer middleware for file uploads
  uploadMiddleware = upload.single('file');

  /**
   * Helper: Verify board access
   */
  private async verifyBoardAccess(boardId: string, userId: string): Promise<void> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Board');
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this board');
    }
  }

  /**
   * Create a text note
   * POST /api/boards/:boardId/nodes/note
   */
  async createNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const { title, content, position, width, height, color } = req.body;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    if (!content) {
      throw new ValidationError('Content is required');
    }

    // Create node
    const node = await prisma.node.create({
      data: {
        boardId,
        ownerId: userId,
        type: NodeType.NOTE,
        title: title || 'Note',
        rawText: content,
        metadata: { color },
      },
    });

    // Create position
    await prisma.nodePosition.create({
      data: {
        nodeId: node.id,
        boardId,
        x: position?.x || 0,
        y: position?.y || 0,
        width: width || 300,
        height: height || 200,
        color,
      },
    });

    // Generate embeddings in background (async, don't wait)
    embeddingsService.generateAndStoreEmbeddings(node.id, content).catch(err =>
      logger.error('Failed to generate embeddings', { error: err, nodeId: node.id })
    );

    logger.info('Note created', { nodeId: node.id, boardId });

    res.status(201).json({
      status: 'success',
      data: { node },
    });
  }

  /**
   * Upload and process a document
   * POST /api/boards/:boardId/nodes/document
   */
  async uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const { title, position } = req.body;
    const userId = req.user!.id;
    const file = req.file;

    await this.verifyBoardAccess(boardId, userId);

    if (!file) {
      throw new ValidationError('File is required');
    }

    // Validate file size
    if (!documentService.validateFileSize(file.size)) {
      throw new ValidationError('File size exceeds 50MB limit');
    }

    // Create node first
    const node = await prisma.node.create({
      data: {
        boardId,
        ownerId: userId,
        type: NodeType.DOCUMENT,
        title: title || file.originalname,
        metadata: {
          status: 'processing',
          filename: file.originalname,
          size: file.size,
        },
      },
    });

    // Create position
    await prisma.nodePosition.create({
      data: {
        nodeId: node.id,
        boardId,
        x: position?.x || 0,
        y: position?.y || 0,
        width: 320,
        height: 300,
      },
    });

    // Process document in background
    // In production, this would be a job queue
    documentService
      .processDocument(file.buffer, file.originalname, file.mimetype, boardId, node.id)
      .then(async result => {
        // Update node with extracted text
        await prisma.node.update({
          where: { id: node.id },
          data: {
            rawText: result.textContent,
            fileStorageKey: result.storageKey,
            metadata: {
              ...result.metadata,
              status: 'completed',
            },
          },
        });

        // Generate embeddings
        await embeddingsService.generateAndStoreEmbeddings(node.id, result.textContent);

        logger.info('Document processed', { nodeId: node.id });
      })
      .catch(err => {
        logger.error('Document processing failed', { error: err, nodeId: node.id });
        prisma.node.update({
          where: { id: node.id },
          data: {
            metadata: { status: 'failed', error: err.message },
          },
        }).catch(() => {});
      });

    res.status(201).json({
      status: 'success',
      data: { node },
      message: 'Document is being processed',
    });
  }

  /**
   * Add YouTube video (enqueue processing job)
   * POST /api/boards/:boardId/nodes/youtube
   */
  async addYouTubeVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const { url, title, position } = req.body;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    if (!url) {
      throw new ValidationError('URL is required');
    }

    // Create node with processing status
    const node = await prisma.node.create({
      data: {
        boardId,
        ownerId: userId,
        type: NodeType.YOUTUBE_VIDEO,
        title: title || 'YouTube Video',
        metadata: {
          url,
          status: 'processing',
        },
      },
    });

    // Create position
    await prisma.nodePosition.create({
      data: {
        nodeId: node.id,
        boardId,
        x: position?.x || 0,
        y: position?.y || 0,
        width: 400,
        height: 300,
      },
    });

    // TODO: Enqueue job for YouTube processing
    // For now, we'll note this needs a job queue implementation
    logger.info('YouTube video node created (processing not implemented)', { nodeId: node.id, url });

    res.status(201).json({
      status: 'success',
      data: { node },
      message: 'YouTube video is being processed (job queue not yet implemented)',
    });
  }

  /**
   * Add web URL (enqueue scraping job)
   * POST /api/boards/:boardId/nodes/url
   */
  async addWebUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const { url, title, position } = req.body;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    if (!url) {
      throw new ValidationError('URL is required');
    }

    // Create node with processing status
    const node = await prisma.node.create({
      data: {
        boardId,
        ownerId: userId,
        type: NodeType.WEB_URL,
        title: title || 'Web Page',
        metadata: {
          url,
          status: 'processing',
        },
      },
    });

    // Create position
    await prisma.nodePosition.create({
      data: {
        nodeId: node.id,
        boardId,
        x: position?.x || 0,
        y: position?.y || 0,
        width: 320,
        height: 300,
      },
    });

    // TODO: Enqueue job for web scraping
    logger.info('Web URL node created (scraping not implemented)', { nodeId: node.id, url });

    res.status(201).json({
      status: 'success',
      data: { node },
      message: 'Web page is being scraped (job queue not yet implemented)',
    });
  }

  /**
   * Get a node
   * GET /api/boards/:boardId/nodes/:nodeId
   */
  async getNode(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId, nodeId } = req.params;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        position: true,
      },
    });

    if (!node || node.boardId !== boardId) {
      throw new NotFoundError('Node');
    }

    res.json({
      status: 'success',
      data: { node },
    });
  }

  /**
   * Update a node
   * PATCH /api/boards/:boardId/nodes/:nodeId
   */
  async updateNode(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId, nodeId } = req.params;
    const { title, rawText } = req.body;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node || node.boardId !== boardId) {
      throw new NotFoundError('Node');
    }

    const updatedNode = await prisma.node.update({
      where: { id: nodeId },
      data: {
        ...(title && { title }),
        ...(rawText !== undefined && { rawText }),
      },
    });

    // If rawText changed, update embeddings
    if (rawText !== undefined && rawText) {
      embeddingsService.updateEmbeddings(nodeId, rawText).catch(err =>
        logger.error('Failed to update embeddings', { error: err, nodeId })
      );
    }

    logger.info('Node updated', { nodeId, boardId });

    res.json({
      status: 'success',
      data: { node: updatedNode },
    });
  }

  /**
   * Update node position
   * PATCH /api/boards/:boardId/nodes/:nodeId/position
   */
  async updatePosition(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId, nodeId } = req.params;
    const { x, y, width, height, zIndex } = req.body;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    const position = await prisma.nodePosition.findUnique({
      where: { nodeId },
    });

    if (!position || position.boardId !== boardId) {
      throw new NotFoundError('Node position');
    }

    const updatedPosition = await prisma.nodePosition.update({
      where: { nodeId },
      data: {
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(zIndex !== undefined && { zIndex }),
      },
    });

    res.json({
      status: 'success',
      data: { position: updatedPosition },
    });
  }

  /**
   * Delete a node
   * DELETE /api/boards/:boardId/nodes/:nodeId
   */
  async deleteNode(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId, nodeId } = req.params;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node || node.boardId !== boardId) {
      throw new NotFoundError('Node');
    }

    // Delete node (cascade will handle embeddings, position, etc.)
    await prisma.node.delete({
      where: { id: nodeId },
    });

    logger.info('Node deleted', { nodeId, boardId });

    res.json({
      status: 'success',
      message: 'Node deleted successfully',
    });
  }
}

export const nodesController = new NodesController();
