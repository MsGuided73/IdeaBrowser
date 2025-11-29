/**
 * Chat Routes
 * API routes for RAG-based chat functionality
 */

import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { stubAuth } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });

// Apply authentication to all routes
router.use(stubAuth);

/**
 * RAG Chat endpoints
 */
router.post('/', asyncHandler(chatController.chatWithBoard.bind(chatController)));
router.get('/summary', asyncHandler(chatController.getBoardSummary.bind(chatController)));
router.get('/suggestions/connections', asyncHandler(chatController.suggestConnections.bind(chatController)));

export default router;
