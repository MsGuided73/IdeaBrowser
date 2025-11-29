/**
 * Shared TypeScript types and interfaces for BizWiz NeuroBoard Backend
 */

import { Request } from 'express';
import { NodeType, JobStatus } from '@prisma/client';

// ================================
// REQUEST TYPES (Express Extensions)
// ================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

// ================================
// API REQUEST/RESPONSE TYPES
// ================================

export interface CreateBoardRequest {
  title: string;
  description?: string;
}

export interface UpdateBoardRequest {
  title?: string;
  description?: string;
}

export interface CreateNodeRequest {
  type: NodeType;
  title: string;
  content?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

export interface CreateNoteRequest {
  title?: string;
  content: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  color?: string;
}

export interface CreateYouTubeNodeRequest {
  url: string;
  title?: string;
  position: { x: number; y: number };
}

export interface CreateWebUrlNodeRequest {
  url: string;
  title?: string;
  position: { x: number; y: number };
}

export interface UpdateNodePositionRequest {
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex?: number;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  color?: string;
  nodeIds: string[];
}

export interface CreateEdgeRequest {
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}

export interface ChatRequest {
  message: string;
  options?: {
    nodeIds?: string[];
    groupIds?: string[];
  };
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    nodeId: string;
    chunkIndex: number;
    relevance: number;
  }>;
}

// ================================
// SERVICE TYPES
// ================================

export interface StorageUploadResult {
  key: string;
  url: string;
  size: number;
}

export interface TextChunk {
  text: string;
  index: number;
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  index: number;
}

export interface VectorSearchResult {
  nodeId: string;
  chunkIndex: number;
  chunkText: string;
  similarity: number;
}

export interface YouTubeMetadata {
  url: string;
  title: string;
  duration?: number;
  channel?: string;
  thumbnail?: string;
}

export interface WebPageMetadata {
  url: string;
  title: string;
  description?: string;
  favicon?: string;
}

export interface DocumentMetadata {
  filename: string;
  mimeType: string;
  size: number;
  pageCount?: number;
}

// ================================
// JOB TYPES
// ================================

export interface JobData {
  nodeId: string;
  boardId: string;
  userId: string;
  metadata: Record<string, any>;
}

export interface YouTubeJobData extends JobData {
  url: string;
}

export interface WebScrapingJobData extends JobData {
  url: string;
}

export interface DocumentJobData extends JobData {
  fileStorageKey: string;
  mimeType: string;
  filename: string;
}

export interface JobProgress {
  id: string;
  status: JobStatus;
  progress: number;
  error?: string;
  result?: any;
}

// ================================
// SOCKET.IO EVENT TYPES
// ================================

export interface SocketEvents {
  // Client → Server
  join_board: (boardId: string) => void;
  leave_board: (boardId: string) => void;
  node_update: (data: NodeUpdateEvent) => void;
  node_move: (data: NodeMoveEvent) => void;
  node_delete: (data: NodeDeleteEvent) => void;
  group_create: (data: GroupCreateEvent) => void;
  edge_create: (data: EdgeCreateEvent) => void;
  cursor_move: (data: CursorMoveEvent) => void;

  // Server → Client
  'node:created': (data: NodeCreatedEvent) => void;
  'node:updated': (data: NodeUpdatedEvent) => void;
  'node:moved': (data: NodeMovedEvent) => void;
  'node:deleted': (data: NodeDeletedEvent) => void;
  'group:created': (data: GroupCreatedEvent) => void;
  'group:updated': (data: GroupUpdatedEvent) => void;
  'edge:created': (data: EdgeCreatedEvent) => void;
  'edge:deleted': (data: EdgeDeletedEvent) => void;
  'user:joined': (data: UserJoinedEvent) => void;
  'user:left': (data: UserLeftEvent) => void;
  'cursor:move': (data: CursorMoveEvent) => void;
  error: (message: string) => void;
}

export interface NodeUpdateEvent {
  nodeId: string;
  updates: Partial<CreateNodeRequest>;
}

export interface NodeMoveEvent {
  nodeId: string;
  position: { x: number; y: number; width?: number; height?: number; zIndex?: number };
}

export interface NodeDeleteEvent {
  nodeId: string;
}

export interface GroupCreateEvent {
  name: string;
  nodeIds: string[];
  color?: string;
}

export interface EdgeCreateEvent {
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}

export interface CursorMoveEvent {
  userId: string;
  userName: string;
  x: number;
  y: number;
}

export interface NodeCreatedEvent {
  node: any; // Full node object
  position: any;
}

export interface NodeUpdatedEvent {
  nodeId: string;
  updates: any;
}

export interface NodeMovedEvent {
  nodeId: string;
  position: any;
}

export interface NodeDeletedEvent {
  nodeId: string;
}

export interface GroupCreatedEvent {
  group: any;
}

export interface GroupUpdatedEvent {
  groupId: string;
  updates: any;
}

export interface EdgeCreatedEvent {
  edge: any;
}

export interface EdgeDeletedEvent {
  edgeId: string;
}

export interface UserJoinedEvent {
  userId: string;
  userName: string;
}

export interface UserLeftEvent {
  userId: string;
}

// ================================
// ERROR TYPES
// ================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}
