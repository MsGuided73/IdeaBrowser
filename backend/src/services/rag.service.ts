/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles "chat with your board" functionality
 */

import { prisma } from '../config/database';
import { geminiService } from './gemini.service';
import { embeddingsService } from './embeddings.service';
import { ChatResponse } from '../types';
import { logger } from '../config/logger';

export class RAGService {
  /**
   * Chat with a board using RAG
   * @param boardId Board ID
   * @param message User message
   * @param options Search options (nodeIds, groupIds)
   * @returns AI response with sources
   */
  async chatWithBoard(
    boardId: string,
    message: string,
    options?: {
      nodeIds?: string[];
      groupIds?: string[];
    }
  ): Promise<ChatResponse> {
    try {
      logger.info('RAG chat request', { boardId, message: message.substring(0, 50) });

      // Step 1: Generate embedding for the user's question
      const queryEmbedding = await geminiService.generateEmbedding(message);

      // Step 2: Determine which nodes to search
      let nodeIds = options?.nodeIds;

      // If groupIds are provided, get all nodes in those groups
      if (options?.groupIds && options.groupIds.length > 0) {
        const groupMembers = await prisma.groupMember.findMany({
          where: {
            groupId: { in: options.groupIds },
          },
          select: { nodeId: true },
        });
        
        const groupNodeIds = groupMembers.map(m => m.nodeId);
        nodeIds = nodeIds ? [...nodeIds, ...groupNodeIds] : groupNodeIds;
      }

      // Step 3: Search for similar chunks using vector similarity
      const similarChunks = await embeddingsService.searchSimilar(
        queryEmbedding,
        boardId,
        10, // Top 10 results
        nodeIds
      );

      if (similarChunks.length === 0) {
        return {
          answer: "I don't have enough context from this board to answer that question. Try adding more content or rephrasing your question.",
          sources: [],
        };
      }

      // Step 4: Build context from retrieved chunks
      const context = similarChunks
        .map((chunk, idx) => `[Source ${idx + 1}]:\n${chunk.chunkText}`)
        .join('\n\n');

      // Step 5: Generate response using Gemini with context
      const prompt = `You are an AI assistant helping users understand and work with their personal knowledge base. 
The user has a whiteboard with various content (documents, notes, videos, web pages).

Context from the user's board:
${context}

User's question: ${message}

Please provide a helpful answer based on the context above. If the context doesn't contain enough information, say so politely and suggest what kind of content might help answer the question.`;

      const answer = await geminiService.generateText(prompt);

      // Step 6: Format sources
      const sources = similarChunks.map(chunk => ({
        nodeId: chunk.nodeId,
        chunkIndex: chunk.chunkIndex,
        relevance: chunk.similarity,
      }));

      logger.info('RAG chat response generated', {
        boardId,
        sourcesCount: sources.length,
      });

      return { answer, sources };
    } catch (error) {
      logger.error('Failed to chat with board', { error, boardId });
      throw error;
    }
  }

  /**
   * Get board summary
   * @param boardId Board ID
   * @returns Summary of board content
   */
  async getBoardSummary(boardId: string): Promise<string> {
    try {
      // Get all nodes with text content
      const nodes = await prisma.node.findMany({
        where: {
          boardId,
          rawText: { not: null },
        },
        select: {
          type: true,
          title: true,
          rawText: true,
        },
        take: 20, // Limit to prevent token overflow
      });

      if (nodes.length === 0) {
        return 'This board is empty or contains no text content yet.';
      }

      // Build context from nodes
      const context = nodes
        .map(node => `[${node.type}] ${node.title}: ${node.rawText?.substring(0, 200)}...`)
        .join('\n\n');

      const prompt = `Provide a concise summary of this whiteboard's content. Identify main themes, key topics, and overall purpose.

Content:
${context}`;

      const summary = await geminiService.generateText(prompt);
      return summary;
    } catch (error) {
      logger.error('Failed to generate board summary', { error, boardId });
      throw error;
    }
  }

  /**
   * Suggest connections between nodes based on semantic similarity
   * @param boardId Board ID
   * @returns Suggested node pairs to connect
   */
  async suggestConnections(boardId: string): Promise<Array<{
    sourceNodeId: string;
    targetNodeId: string;
    reason: string;
    similarity: number;
  }>> {
    try {
      // Get all nodes with embeddings
      const nodes = await prisma.node.findMany({
        where: {
          boardId,
          embeddings: {
            some: {},
          },
        },
        select: {
          id: true,
          title: true,
          embeddings: {
            take: 1, // Just get first chunk for comparison
            select: {
              id: true,
            },
          },
        },
      });

      // This is a simplified version. In production, you'd want to:
      // 1. Compare embeddings between all node pairs
      // 2. Filter by similarity threshold
      // 3. Use Gemini to explain why they're related

      // For now, return empty array with a note that this needs proper implementation
      logger.info('Connection suggestions requested', { boardId, nodeCount: nodes.length });

      return [];
    } catch (error) {
      logger.error('Failed to suggest connections', { error, boardId });
      throw error;
    }
  }
}

export const ragService = new RAGService();
