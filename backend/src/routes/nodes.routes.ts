/**
 * Nodes Routes
 * API routes for node operations
 */

import { Router } from 'express';
import { nodesController } from '../controllers/nodes.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { stubAuth } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true }); // Merge params from parent router (boardId)

// Apply authentication to all routes
router.use(stubAuth);

/**
 * Node creation endpoints (by type)
 */
router.post('/note', asyncHandler(nodesController.createNote.bind(nodesController)));

router.post(
  '/document',
  nodesController.uploadMiddleware,
  asyncHandler(nodesController.uploadDocument.bind(nodesController))
);

router.post('/youtube', asyncHandler(nodesController.addYouTubeVideo.bind(nodesController)));

router.post('/url', asyncHandler(nodesController.addWebUrl.bind(nodesController)));

/**
 * Node CRUD operations
 */
router.get('/:nodeId', asyncHandler(nodesController.getNode.bind(nodesController)));
router.patch('/:nodeId', asyncHandler(nodesController.updateNode.bind(nodesController)));
router.patch('/:nodeId/position', asyncHandler(nodesController.updatePosition.bind(nodesController)));
router.delete('/:nodeId', asyncHandler(nodesController.deleteNode.bind(nodesController)));

export default router;
