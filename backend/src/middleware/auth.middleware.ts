/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, UnauthorizedError } from '../types';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface JWTPayload {
  id: string;
  email: string;
  name: string;
}

/**
 * Verify JWT token and attach user to request
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't fail if missing
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
      };
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    logger.warn('Optional auth failed', { error });
    next();
  }
}

/**
 * Generate JWT token for a user
 * @param user User data
 * @param expiresIn Token expiration (default: 7 days)
 */
export function generateToken(
  user: { id: string; email: string; name: string },
  expiresIn: string = '7d'
): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    env.JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Middleware for stubbed authentication (development only)
 * Creates a fake user for testing without auth
 */
export function stubAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // IMPORTANT: Only use this in development!
  // In production, use authenticateToken instead
  
  req.user = {
    id: 'dev-user-id',
    email: 'dev@example.com',
    name: 'Development User',
  };

  next();
}
