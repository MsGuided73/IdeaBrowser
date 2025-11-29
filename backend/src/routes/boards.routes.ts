/**
 * Boards Routes
 * API routes for board operations
 */

import { Router } from 'express';
import { boardsController } from '../controllers/boards.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { stubAuth } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
// TODO: Replace stubAuth with authenticateToken in production
router.use(stubAuth);

/**
 * Board CRUD operations
 */
router.post('/', asyncHandler(boardsController.createBoard.bind(boardsController)));
router.get('/', asyncHandler(boardsController.getBoards.bind(boardsController)));
router.get('/:boardId', asyncHandler(boardsController.getBoard.bind(boardsController)));
router.get('/:boardId/state', asyncHandler(boardsController.getBoardState.bind(boardsController)));
router.patch('/:boardId', asyncHandler(boardsController.updateBoard.bind(boardsController)));
router.delete('/:boardId', asyncHandler(boardsController.deleteBoard.bind(boardsController)));

/**
 * Board snapshots
 */
router.post('/:boardId/snapshot', asyncHandler(boardsController.createSnapshot.bind(boardsController)));

export default router;
