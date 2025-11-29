/**
 * Environment configuration and validation
 * Loads and validates all required environment variables
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface EnvConfig {
  // Database
  DATABASE_URL: string;

  // S3 Storage
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  S3_FORCE_PATH_STYLE: boolean;

  // AI
  GEMINI_API_KEY: string;

  // Redis
  REDIS_URL: string;

  // Server
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';

  // Auth
  JWT_SECRET: string;

  // YouTube
  YT_DLP_PATH: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export const env: EnvConfig = {
  // Database
  DATABASE_URL: getEnv('DATABASE_URL'),

  // S3 Storage
  S3_ENDPOINT: getEnv('S3_ENDPOINT', 'http://localhost:9000'),
  S3_REGION: getEnv('S3_REGION', 'us-east-1'),
  S3_ACCESS_KEY_ID: getEnv('S3_ACCESS_KEY_ID'),
  S3_SECRET_ACCESS_KEY: getEnv('S3_SECRET_ACCESS_KEY'),
  S3_BUCKET: getEnv('S3_BUCKET', 'bizwiz-neuroboard'),
  S3_FORCE_PATH_STYLE: getEnvBoolean('S3_FORCE_PATH_STYLE', true),

  // AI
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY'),

  // Redis
  REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),

  // Server
  PORT: getEnvNumber('PORT', 3001),
  NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',

  // Auth
  JWT_SECRET: getEnv('JWT_SECRET', 'your_jwt_secret_change_in_production'),

  // YouTube
  YT_DLP_PATH: getEnv('YT_DLP_PATH', 'yt-dlp'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
