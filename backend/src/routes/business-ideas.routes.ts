/**
 * Business Ideas Routes
 * API routes for business ideas management
 */

import { Router } from 'express';
import { businessIdeasController } from '../controllers/business-ideas.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/business-ideas
 * Get all business ideas for the authenticated user
 */
router.get('/', asyncHandler(businessIdeasController.getUserIdeas.bind(businessIdeasController)));

/**
 * POST /api/business-ideas
 * Create a new business idea
 */
router.post('/', asyncHandler(businessIdeasController.createIdea.bind(businessIdeasController)));

/**
 * GET /api/business-ideas/:id
 * Get a specific business idea
 */
router.get('/:id', asyncHandler(businessIdeasController.getIdea.bind(businessIdeasController)));

/**
 * PATCH /api/business-ideas/:id
 * Update a business idea
 */
router.patch('/:id', asyncHandler(businessIdeasController.updateIdea.bind(businessIdeasController)));

/**
 * DELETE /api/business-ideas/:id
 * Delete a business idea
 */
router.delete('/:id', asyncHandler(businessIdeasController.deleteIdea.bind(businessIdeasController)));

/**
 * GET /api/business-ideas/collections
 * Get user's idea collections
 */
router.get('/collections', asyncHandler(businessIdeasController.getCollections.bind(businessIdeasController)));

/**
 * POST /api/business-ideas/collections
 * Create a new collection
 */
router.post('/collections', asyncHandler(businessIdeasController.createCollection.bind(businessIdeasController)));

/**
 * POST /api/business-ideas/collections/:collectionId/ideas/:ideaId
 * Add idea to collection
 */
router.post('/collections/:collectionId/ideas/:ideaId', asyncHandler(businessIdeasController.addIdeaToCollection.bind(businessIdeasController)));

export default router;
