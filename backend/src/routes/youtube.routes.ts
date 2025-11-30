/**
 * YouTube Routes
 * API routes for YouTube operations that don't require board context
 */

import { Router } from 'express';
import { youtubeService } from '../services/youtube.service';
import { geminiService } from '../services/gemini.service';
import { asyncHandler } from '../middleware/error.middleware';
import { stubAuth } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(stubAuth);

/**
 * Get YouTube video metadata
 * POST /api/youtube/metadata
 */
router.post('/metadata', asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'URL is required',
    });
  }

  const metadata = await youtubeService.getVideoMetadata(url);

  res.json({
    status: 'success',
    data: metadata,
  });
}));

/**
 * Analyze YouTube transcript content
 * POST /api/youtube/analyze-transcript
 */
router.post('/analyze-transcript', asyncHandler(async (req, res) => {
  const { transcript, prompt } = req.body;

  if (!transcript) {
    return res.status(400).json({
      status: 'error',
      message: 'Transcript is required',
    });
  }

  // Use Gemini to analyze the transcript
  const analysis = await geminiService.generateText(
    `Please analyze the following YouTube video transcript:\n\n${transcript}`,
    prompt
  );

  res.json({
    status: 'success',
    data: { analysis },
  });
}));

export default router;
