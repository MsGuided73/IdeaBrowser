/**
 * Error Handling Middleware
 * Centralized error handling for Express
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { logger } from '../config/logger';
import { isDevelopment } from '../config/env';

/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle AppError (operational errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(isDevelopment && { stack: err.stack }),
    });
    return;
  }

  // Handle unknown errors (programming errors)
  res.status(500).json({
    status: 'error',
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.url} not found`,
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
