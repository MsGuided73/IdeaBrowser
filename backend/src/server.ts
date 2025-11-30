/**
 * BizWiz NeuroBoard Backend Server
 * Express app with Socket.IO for real-time collaboration
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env, isDevelopment } from './config/env';
import { connectDatabase, initializeVectorExtension } from './config/database';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Import routes
import boardsRoutes from './routes/boards.routes';
import nodesRoutes from './routes/nodes.routes';
import chatRoutes from './routes/chat.routes';
import youtubeRoutes from './routes/youtube.routes';
import businessIdeasRoutes from './routes/business-ideas.routes';
import authRoutes from './routes/auth.routes';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: isDevelopment ? '*' : ['http://localhost:3000'], // Configure for production
    methods: ['GET', 'POST'],
  },
});

// ================================
// MIDDLEWARE
// ================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: isDevelopment ? '*' : ['http://localhost:3000'],
  credentials: true,
}));

// Request logging
app.use(morgan(isDevelopment ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ================================
// ROUTES
// ================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/boards/:boardId/nodes', nodesRoutes);
app.use('/api/boards/:boardId/chat', chatRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/business-ideas', businessIdeasRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'BizWiz NeuroBoard API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      boards: '/api/boards',
      nodes: '/api/boards/:boardId/nodes',
      chat: '/api/boards/:boardId/chat',
    },
  });
});

// ================================
// WEBSOCKET HANDLERS
// ================================

io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });

  // Join board room
  socket.on('join_board', (boardId: string) => {
    socket.join(`board:${boardId}`);
    logger.info('Client joined board', { socketId: socket.id, boardId });

    // Notify others in the room
    socket.to(`board:${boardId}`).emit('user:joined', {
      userId: socket.id,
      userName: 'User', // TODO: Get from auth
    });
  });

  // Leave board room
  socket.on('leave_board', (boardId: string) => {
    socket.leave(`board:${boardId}`);
    logger.info('Client left board', { socketId: socket.id, boardId });

    socket.to(`board:${boardId}`).emit('user:left', {
      userId: socket.id,
    });
  });

  // Node updates
  socket.on('node:update', (data) => {
    const { boardId, nodeId, updates } = data;
    socket.to(`board:${boardId}`).emit('node:updated', {
      nodeId,
      updates,
    });
  });

  // Node movement
  socket.on('node:move', (data) => {
    const { boardId, nodeId, position } = data;
    socket.to(`board:${boardId}`).emit('node:moved', {
      nodeId,
      position,
    });
  });

  // Cursor movement (optional)
  socket.on('cursor:move', (data) => {
    const { boardId, x, y } = data;
    socket.to(`board:${boardId}`).emit('cursor:move', {
      userId: socket.id,
      userName: 'User',
      x,
      y,
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });
});

// ================================
// ERROR HANDLING
// ================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ================================
// SERVER STARTUP
// ================================

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize pgvector extension
    await initializeVectorExtension();

    // Start server
    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔌 WebSocket server ready`);
      logger.info(`💾 Database connected`);
      logger.info(`📡 API: http://localhost:${env.PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export { app, io };
