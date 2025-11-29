/**
 * Database connection and Prisma client configuration
 */

import { PrismaClient } from '@prisma/client';
import { env, isDevelopment } from './env';

// Prisma Client singleton pattern
// Prevents multiple instances in development due to hot reloading
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });

if (isDevelopment) {
  global.prisma = prisma;
}

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from the database (graceful shutdown)
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

/**
 * Initialize pgvector extension
 * This should be run after the first migration
 */
export async function initializeVectorExtension(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ pgvector extension initialized');
  } catch (error) {
    console.error('❌ Failed to initialize pgvector extension:', error);
    // Don't throw - extension might already exist
  }
}
