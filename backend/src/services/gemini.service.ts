/**
 * Google Gemini AI Service
 * Handles transcription, embeddings, and chat functionality
 */

import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../config/logger';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export class GeminiService {
  /**
   * Generate text embeddings using Gemini embedding model
   * @param text Text to embed
   * @returns Embedding vector (768 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        content: text,
      });

      return response.embedding.values;
    } catch (error) {
      logger.error('Failed to generate embedding', { error });
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * @param texts Array of texts
   * @returns Array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      
      // Process in batches to avoid rate limits
      for (const text of texts) {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      }

      return embeddings;
    } catch (error) {
      logger.error('Failed to generate embeddings', { error });
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  /**
   * Transcribe audio file using Gemini multimodal capabilities
   * @param audioBase64 Base64 encoded audio data
   * @param mimeType Audio MIME type (e.g., 'audio/mp3')
   * @returns Transcript text and structured summary
   */
  async transcribeAudio(
    audioBase64: string,
    mimeType: string
  ): Promise<{ transcript: string; summary: string; metadata: any }> {
    try {
      const prompt = `
        Please transcribe this audio file completely and accurately.
        Then provide a structured summary with:
        1. Main topics discussed
        2. Key points (bullet list)
        3. Notable quotes or important statements
        4. Chapters/sections if the content has natural breaks
        
        Format your response as JSON:
        {
          "transcript": "full transcript here",
          "summary": "brief summary paragraph",
          "topics": ["topic1", "topic2"],
          "keyPoints": ["point1", "point2"],
          "chapters": [{"timestamp": "0:00", "title": "Introduction", "summary": "..."}]
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: {
          parts: [
            { inlineData: { data: audioBase64, mimeType } },
            { text: prompt }
          ],
        },
        config: {
          temperature: 0.2, // Lower temperature for accuracy
        },
      });

      const text = response.text || '';
      
      // Try to parse JSON response
      let parsedData;
      try {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          parsedData = { transcript: text, summary: text };
        }
      } catch {
        parsedData = { transcript: text, summary: text };
      }

      return {
        transcript: parsedData.transcript || text,
        summary: parsedData.summary || text.substring(0, 500),
        metadata: {
          topics: parsedData.topics || [],
          keyPoints: parsedData.keyPoints || [],
          chapters: parsedData.chapters || [],
        },
      };
    } catch (error) {
      logger.error('Failed to transcribe audio', { error });
      throw new Error(`Failed to transcribe audio: ${error}`);
    }
  }

  /**
   * Analyze an image using Gemini Vision
   * @param imageBase64 Base64 encoded image
   * @param mimeType Image MIME type
   * @param prompt Optional custom prompt
   * @returns Analysis text
   */
  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    prompt: string = 'Describe this image in detail.'
  ): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: {
          parts: [
            { inlineData: { data: imageBase64, mimeType } },
            { text: prompt }
          ],
        },
      });

      return response.text || '';
    } catch (error) {
      logger.error('Failed to analyze image', { error });
      throw new Error(`Failed to analyze image: ${error}`);
    }
  }

  /**
   * Generate a response using Gemini with context
   * @param prompt User prompt
   * @param context Additional context
   * @returns Generated text
   */
  async generateText(prompt: string, context?: string): Promise<string> {
    try {
      const fullPrompt = context
        ? `Context:\n${context}\n\nQuestion: ${prompt}\n\nAnswer based on the context above.`
        : prompt;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: fullPrompt,
        config: {
          temperature: 0.7,
        },
      });

      return response.text || '';
    } catch (error) {
      logger.error('Failed to generate text', { error });
      throw new Error(`Failed to generate text: ${error}`);
    }
  }

  /**
   * Chat with Gemini using conversation history
   * @param message User message
   * @param history Previous conversation history
   * @returns Response text
   */
  async chat(
    message: string,
    history: Array<{ role: 'user' | 'model'; text: string }> = []
  ): Promise<string> {
    try {
      // Create chat session
      const chat = ai.chats.create({
        model: 'gemini-1.5-flash',
        config: {
          temperature: 0.7,
        },
      });

      // Replay history
      for (const msg of history) {
        if (msg.role === 'user') {
          await chat.sendMessage({ message: msg.text });
        }
      }

      // Send new message
      const response = await chat.sendMessage({ message });
      return response.text || '';
    } catch (error) {
      logger.error('Failed to chat', { error });
      throw new Error(`Failed to chat: ${error}`);
    }
  }
}

export const geminiService = new GeminiService();
