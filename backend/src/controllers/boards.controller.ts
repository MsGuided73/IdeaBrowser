/**
 * Boards Controller
 * Handles board CRUD operations
 */

import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, NotFoundError, ForbiddenError } from '../types';
import { logger } from '../config/logger';

export class BoardsController {
  /**
   * Create a new board
   * POST /api/boards
   */
  async createBoard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { title, description } = req.body;
    const userId = req.user!.id;

    const board = await prisma.board.create({
      data: {
        title,
        description,
        ownerId: userId,
      },
    });

    logger.info('Board created', { boardId: board.id, userId });

    res.status(201).json({
      status: 'success',
      data: { board },
    });
  }

  /**
   * Get all boards for the authenticated user
   * GET /api/boards
   */
  async getBoards(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;

    const boards = await prisma.board.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            nodes: true,
            groups: true,
          },
        },
      },
    });

    res.json({
      status: 'success',
      data: { boards },
    });
  }

  /**
   * Get a specific board
   * GET /api/boards/:boardId
   */
  async getBoard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const userId = req.user!.id;

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        _count: {
          select: {
            nodes: true,
            groups: true,
            edges: true,
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundError('Board');
    }

    // Check ownership
    if (board.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this board');
    }

    res.json({
      status: 'success',
      data: { board },
    });
  }

  /**
   * Get full board state (nodes, positions, groups, edges)
   * GET /api/boards/:boardId/state
   */
  async getBoardState(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const userId = req.user!.id;

    // Verify board access
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Board');
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this board');
    }

    // Get all board data
    const [nodes, positions, groups, edges] = await Promise.all([
      prisma.node.findMany({
        where: { boardId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.nodePosition.findMany({
        where: { boardId },
      }),
      prisma.nodeGroup.findMany({
        where: { boardId },
        include: {
          members: {
            include: {
              node: {
                select: { id: true, title: true },
              },
            },
          },
        },
      }),
      prisma.edge.findMany({
        where: { boardId },
      }),
    ]);

    res.json({
      status: 'success',
      data: {
        board,
        nodes,
        positions,
        groups,
        edges,
      },
    });
  }

  /**
   * Update a board
   * PATCH /api/boards/:boardId
   */
  async updateBoard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const { title, description } = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Board');
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this board');
    }

    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
      },
    });

    logger.info('Board updated', { boardId, userId });

    res.json({
      status: 'success',
      data: { board: updatedBoard },
    });
  }

  /**
   * Delete a board
   * DELETE /api/boards/:boardId
   */
  async deleteBoard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Board');
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this board');
    }

    // Delete board (cascade will handle related data)
    await prisma.board.delete({
      where: { id: boardId },
    });

    logger.info('Board deleted', { boardId, userId });

    res.json({
      status: 'success',
      message: 'Board deleted successfully',
    });
  }

  /**
   * Create a board snapshot
   * POST /api/boards/:boardId/snapshot
   */
  async createSnapshot(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { boardId } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundError('Board');
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this board');
    }

    // Get full board state
    const [nodes, positions, groups, edges] = await Promise.all([
      prisma.node.findMany({ where: { boardId } }),
      prisma.nodePosition.findMany({ where: { boardId } }),
      prisma.nodeGroup.findMany({ where: { boardId }, include: { members: true } }),
      prisma.edge.findMany({ where: { boardId } }),
    ]);

    // Create snapshot
    const snapshot = await prisma.boardSnapshot.create({
      data: {
        boardId,
        createdByUserId: userId,
        snapshotJson: {
          nodes,
          positions,
          groups,
          edges,
        },
      },
    });

    logger.info('Board snapshot created', { boardId, snapshotId: snapshot.id });

    res.status(201).json({
      status: 'success',
      data: { snapshot },
    });
  }
}

export const boardsController = new BoardsController();
