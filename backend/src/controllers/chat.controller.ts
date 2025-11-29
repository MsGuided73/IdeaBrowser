/**
 * Chat Controller
 * Handles RAG-based chat with board functionality
 */

import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, NotFoundError, ForbiddenError, ValidationError } from '../types';
import { ragService } from '../services/rag.service';
import { logger } from '../config/logger';

export class ChatController {
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
   * Chat with board using RAG
   * POST /api/boards/:boardId/chat
   */
  async chatWithBoard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const { message, options } = req.body;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    if (!message) {
      throw new ValidationError('Message is required');
    }

    // Chat with board using RAG
    const response = await ragService.chatWithBoard(boardId, message, options);

    logger.info('Chat response generated', {
      boardId,
      userId,
      sourcesCount: response.sources.length,
    });

    res.json({
      status: 'success',
      data: response,
    });
  }

  /**
   * Get board summary
   * GET /api/boards/:boardId/summary
   */
  async getBoardSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    const summary = await ragService.getBoardSummary(boardId);

    res.json({
      status: 'success',
      data: { summary },
    });
  }

  /**
   * Get suggested connections between nodes
   * GET /api/boards/:boardId/suggestions/connections
   */
  async suggestConnections(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const userId = req.user!.id;

    await this.verifyBoardAccess(boardId, userId);

    const suggestions = await ragService.suggestConnections(boardId);

    res.json({
      status: 'success',
      data: { suggestions },
    });
  }
}

export const chatController = new ChatController();
