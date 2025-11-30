/**
 * Authentication Routes
 * API routes for user authentication and account management
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', asyncHandler(authController.register.bind(authController)));

/**
 * POST /api/auth/login
 * Login with existing credentials
 */
router.post('/login', asyncHandler(authController.login.bind(authController)));

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', authenticateToken, asyncHandler(authController.logout.bind(authController)));

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', asyncHandler(authController.verifyEmail.bind(authController)));

/**
 * POST /api/auth/resend-verification
 * Resend email verification
 */
router.post('/resend-verification', asyncHandler(authController.resendVerification.bind(authController)));

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', asyncHandler(authController.forgotPassword.bind(authController)));

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', asyncHandler(authController.resetPassword.bind(authController)));

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, asyncHandler(authController.getProfile.bind(authController)));

/**
 * PATCH /api/auth/profile
 * Update user profile
 */
router.patch('/profile', authenticateToken, asyncHandler(authController.updateProfile.bind(authController)));

/**
 * POST /api/auth/change-password
 * Change password (authenticated user)
 */
router.post('/change-password', authenticateToken, asyncHandler(authController.changePassword.bind(authController)));

export default router;
