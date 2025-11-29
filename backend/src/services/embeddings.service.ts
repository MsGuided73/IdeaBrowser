/**
 * Embeddings Service
 * Handles text chunking and embedding generation for RAG
 */

import { prisma } from '../config/database';
import { geminiService } from './gemini.service';
import { TextChunk, EmbeddingResult } from '../types';
import { logger } from '../config/logger';

export class EmbeddingsService {
  /**
   * Chunk text into smaller segments for embedding
   * @param text Full text to chunk
   * @param chunkSize Maximum characters per chunk
   * @param overlap Overlap between chunks
   * @returns Array of text chunks
   */
  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): TextChunk[] {
    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.slice(start, end);
      
      chunks.push({
        text: chunkText,
        index,
      });

      start += chunkSize - overlap;
      index++;
    }

    return chunks;
  }

  /**
   * Generate and store embeddings for a node
   * @param nodeId Node ID
   * @param text Text content to embed
   */
  async generateAndStoreEmbeddings(nodeId: string, text: string): Promise<void> {
    try {
      // Chunk the text
      const chunks = this.chunkText(text);
      logger.info(`Chunking text into ${chunks.length} chunks`, { nodeId });

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embedding = await geminiService.generateEmbedding(chunk.text);

        // Store in database
        await prisma.nodeEmbedding.create({
          data: {
            nodeId,
            chunkIndex: chunk.index,
            chunkText: chunk.text,
            embedding: `[${embedding.join(',')}]`, // Store as string representation
          },
        });
      }

      logger.info(`Generated and stored ${chunks.length} embeddings`, { nodeId });
    } catch (error) {
      logger.error('Failed to generate and store embeddings', { error, nodeId });
      throw error;
    }
  }

  /**
   * Update embeddings for a node (delete old, create new)
   * @param nodeId Node ID
   * @param text New text content
   */
  async updateEmbeddings(nodeId: string, text: string): Promise<void> {
    try {
      // Delete existing embeddings
      await prisma.nodeEmbedding.deleteMany({
        where: { nodeId },
      });

      // Generate new embeddings
      await this.generateAndStoreEmbeddings(nodeId, text);
    } catch (error) {
      logger.error('Failed to update embeddings', { error, nodeId });
      throw error;
    }
  }

  /**
   * Delete embeddings for a node
   * @param nodeId Node ID
   */
  async deleteEmbeddings(nodeId: string): Promise<void> {
    try {
      await prisma.nodeEmbedding.deleteMany({
        where: { nodeId },
      });
      logger.info(`Deleted embeddings for node`, { nodeId });
    } catch (error) {
      logger.error('Failed to delete embeddings', { error, nodeId });
      throw error;
    }
  }

  /**
   * Search for similar content using vector similarity
   * Uses pgvector's cosine distance operator
   * @param queryEmbedding Query embedding vector
   * @param boardId Board ID to scope search
   * @param limit Maximum results to return
   * @param nodeIds Optional: specific node IDs to search within
   * @returns Array of similar chunks with similarity scores
   */
  async searchSimilar(
    queryEmbedding: number[],
    boardId: string,
    limit: number = 10,
    nodeIds?: string[]
  ): Promise<Array<{
    nodeId: string;
    chunkIndex: number;
    chunkText: string;
    similarity: number;
  }>> {
    try {
      const embeddingVector = `[${queryEmbedding.join(',')}]`;

      // Build WHERE clause for node filtering
      let nodeFilter = '';
      if (nodeIds && nodeIds.length > 0) {
        const nodeIdList = nodeIds.map(id => `'${id}'`).join(',');
        nodeFilter = `AND n.id IN (${nodeIdList})`;
      }

      // Raw SQL query using pgvector's cosine distance
      // Note: <=> is the cosine distance operator in pgvector
      // We calculate similarity as 1 - distance
      const results = await prisma.$queryRawUnsafe<Array<{
        node_id: string;
        chunk_index: number;
        chunk_text: string;
        similarity: number;
      }>>(`
        SELECT 
          ne.node_id,
          ne.chunk_index,
          ne.chunk_text,
          1 - (ne.embedding <=> $1::vector) AS similarity
        FROM node_embeddings ne
        JOIN nodes n ON n.id = ne.node_id
        WHERE n.board_id = $2
        ${nodeFilter}
        ORDER BY ne.embedding <=> $1::vector
        LIMIT $3
      `, embeddingVector, boardId, limit);

      return results.map(r => ({
        nodeId: r.node_id,
        chunkIndex: r.chunk_index,
        chunkText: r.chunk_text,
        similarity: r.similarity,
      }));
    } catch (error) {
      logger.error('Failed to search similar embeddings', { error, boardId });
      throw error;
    }
  }

  /**
   * Get all embeddings for a specific node
   * @param nodeId Node ID
   * @returns Array of embeddings
   */
  async getNodeEmbeddings(nodeId: string): Promise<Array<{
    id: string;
    chunkIndex: number;
    chunkText: string;
  }>> {
    try {
      const embeddings = await prisma.nodeEmbedding.findMany({
        where: { nodeId },
        select: {
          id: true,
          chunkIndex: true,
          chunkText: true,
        },
        orderBy: { chunkIndex: 'asc' },
      });

      return embeddings;
    } catch (error) {
      logger.error('Failed to get node embeddings', { error, nodeId });
      throw error;
    }
  }
}

export const embeddingsService = new EmbeddingsService();
