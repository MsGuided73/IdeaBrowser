/**
 * Authentication Controller
 * Handles user registration, login, password reset, and email verification
 */

import { Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError
} from '../types';
import { generateToken } from '../middleware/auth.middleware';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';

export class AuthController {

  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      throw new BadRequestError('Email, password, and name are required');
    }

    if (password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        authProvider: 'email',
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      }
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      logger.error('Failed to send verification email', { error, userId: user.id });
      // Don't fail registration if email fails
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user,
        token,
      },
    });
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.password) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
        },
        token,
      },
    });
  }

  /**
   * Verify email address
   * POST /api/auth/verify-email
   */
  async verifyEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { token } = req.body;

    if (!token) {
      throw new BadRequestError('Verification token is required');
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      }
    });

    res.json({
      status: 'success',
      message: 'Email verified successfully',
    });
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  async resendVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError('Email is required');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.emailVerified) {
      throw new BadRequestError('Email is already verified');
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken);

    res.json({
      status: 'success',
      message: 'Verification email sent successfully',
    });
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError('Email is required');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal if user exists for security
      res.json({
        status: 'success',
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      }
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken);

    res.json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new BadRequestError('Token and new password are required');
    }

    if (newPassword.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      }
    });

    res.json({
      status: 'success',
      message: 'Password reset successfully',
    });
  }

  /**
   * Change password (authenticated user)
   * POST /api/auth/change-password
   */
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }

    if (newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long');
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.password) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({
      status: 'success',
      message: 'Password changed successfully',
    });
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            boards: true,
            businessIdeas: true,
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      status: 'success',
      data: { user },
    });
  }

  /**
   * Update user profile
   * PATCH /api/auth/profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { name, email } = req.body;

    if (!name && !email) {
      throw new BadRequestError('Name or email is required');
    }

    const updateData: any = {};

    if (name) {
      updateData.name = name.trim();
    }

    if (email) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: userId }
        }
      });

      if (existingUser) {
        throw new ConflictError('Email is already in use');
      }

      updateData.email = email.toLowerCase();
      updateData.emailVerified = false; // Require re-verification for email change
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        updatedAt: true,
      }
    });

    // Generate new token if email changed
    const token = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });

    res.json({
      status: 'success',
      data: {
        user: updatedUser,
        token: email ? token : undefined, // Only return new token if email changed
      },
    });
  }

  /**
   * Logout (client-side token removal)
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    // In a JWT system, logout is typically handled client-side by removing the token
    // For server-side logout, you might want to implement a token blacklist
    res.json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }
}

export const authController = new AuthController();
