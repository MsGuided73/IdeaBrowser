/**
 * Business Ideas Controller
 * Handles CRUD operations for business ideas
 */

import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { NotFoundError, ValidationError } from '../types';

export class BusinessIdeasController {

  /**
   * Create a new business idea
   * POST /api/business-ideas
   */
  async createIdea(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const ideaData = req.body;

    // Validate required fields
    if (!ideaData.title || !ideaData.description) {
      throw new ValidationError('Title and description are required');
    }

    // Start a transaction to create the idea and all related data
    const result = await prisma.$transaction(async (tx) => {
      // Create the main business idea
      const idea = await tx.businessIdea.create({
        data: {
          userId,
          title: ideaData.title,
          date: new Date(ideaData.date || new Date()),
          tags: ideaData.tags || [],
          description: ideaData.description,
          priceRange: ideaData.priceRange || 'Variable',
          trendKeyword: ideaData.trendKeyword || '',
          trendVolume: ideaData.trendVolume,
          trendGrowth: ideaData.trendGrowth,
          relatedKeywords: ideaData.relatedKeywords || [],
        },
      });

      // Create trend data points
      if (ideaData.trendData && Array.isArray(ideaData.trendData)) {
        await tx.trendDataPoint.createMany({
          data: ideaData.trendData.map((point: any) => ({
            businessIdeaId: idea.id,
            date: point.date,
            value: point.value,
          })),
        });
      }

      // Create KPI data
      if (ideaData.kpi) {
        await tx.businessIdeaKPI.create({
          data: {
            businessIdeaId: idea.id,
            opportunityScore: ideaData.kpi.opportunity?.score || 0,
            opportunityLabel: ideaData.kpi.opportunity?.label || '',
            problemScore: ideaData.kpi.problem?.score || 0,
            problemLabel: ideaData.kpi.problem?.label || '',
            feasibilityScore: ideaData.kpi.feasibility?.score || 0,
            feasibilityLabel: ideaData.kpi.feasibility?.label || '',
            whyNowScore: ideaData.kpi.whyNow?.score || 0,
            whyNowLabel: ideaData.kpi.whyNow?.label || '',
          },
        });
      }

      // Create business fit data
      if (ideaData.businessFit) {
        await tx.businessIdeaFit.create({
          data: {
            businessIdeaId: idea.id,
            revenuePotential: ideaData.businessFit.revenuePotential || '',
            revenuePotentialDescription: ideaData.businessFit.revenuePotentialDescription,
            executionDifficulty: ideaData.businessFit.executionDifficulty || 5,
            executionDifficultyDescription: ideaData.businessFit.executionDifficultyDescription,
            goToMarket: ideaData.businessFit.goToMarket || 5,
            goToMarketDescription: ideaData.businessFit.goToMarketDescription,
            founderFitDescription: ideaData.businessFit.founderFitDescription,
          },
        });
      }

      // Create sections data
      if (ideaData.sections) {
        await tx.businessIdeaSections.create({
          data: {
            businessIdeaId: idea.id,
            whyNow: ideaData.sections.whyNow || '',
            proofAndSignals: ideaData.sections.proofAndSignals || '',
            marketGap: ideaData.sections.marketGap || '',
            executionPlan: ideaData.sections.executionPlan || '',
          },
        });
      }

      // Create community signals
      if (ideaData.communitySignals) {
        await tx.businessIdeaCommunitySignals.create({
          data: {
            businessIdeaId: idea.id,
            reddit: ideaData.communitySignals.reddit,
            facebook: ideaData.communitySignals.facebook,
            youtube: ideaData.communitySignals.youtube,
            other: ideaData.communitySignals.other,
          },
        });
      }

      // Create value ladder steps
      if (ideaData.sections?.offer && Array.isArray(ideaData.sections.offer)) {
        await tx.valueLadderStep.createMany({
          data: ideaData.sections.offer.map((step: any, index: number) => ({
            businessIdeaId: idea.id,
            type: step.type || '',
            title: step.title || '',
            description: step.description || '',
            price: step.price || '',
            valueProvided: step.valueProvided || '',
            goal: step.goal || '',
            order: index,
          })),
        });
      }

      // Create sources
      if (ideaData.sources && Array.isArray(ideaData.sources)) {
        await tx.businessIdeaSource.createMany({
          data: ideaData.sources.map((source: any) => ({
            businessIdeaId: idea.id,
            title: source.title || '',
            uri: source.uri || '',
          })),
        });
      }

      return idea;
    });

    res.status(201).json({
      status: 'success',
      data: { idea: result },
    });
  }

  /**
   * Get all business ideas for the user
   * GET /api/business-ideas
   */
  async getUserIdeas(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { page = 1, limit = 20, search, tags } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };

    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { trendKeyword: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Add tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = { hasSome: tagArray as string[] };
    }

    const ideas = await prisma.businessIdea.findMany({
      where,
      include: {
        trendData: true,
        kpi: true,
        businessFit: true,
        sections: true,
        communitySignals: true,
        sources: true,
        valueLadder: {
          orderBy: { order: 'asc' }
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });

    const total = await prisma.businessIdea.count({ where });

    res.json({
      status: 'success',
      data: {
        ideas,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  }

  /**
   * Get a specific business idea
   * GET /api/business-ideas/:id
   */
  async getIdea(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id } = req.params;

    const idea = await prisma.businessIdea.findFirst({
      where: {
        id,
        userId, // Ensure user owns the idea
      },
      include: {
        trendData: true,
        kpi: true,
        businessFit: true,
        sections: true,
        communitySignals: true,
        sources: true,
        valueLadder: {
          orderBy: { order: 'asc' }
        },
      },
    });

    if (!idea) {
      throw new NotFoundError('Business Idea');
    }

    res.json({
      status: 'success',
      data: { idea },
    });
  }

  /**
   * Update a business idea
   * PATCH /api/business-ideas/:id
   */
  async updateIdea(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id } = req.params;
    const updateData = req.body;

    // Verify ownership
    const existingIdea = await prisma.businessIdea.findFirst({
      where: { id, userId },
    });

    if (!existingIdea) {
      throw new NotFoundError('Business Idea');
    }

    // Update in transaction to handle all related data
    const result = await prisma.$transaction(async (tx) => {
      // Update main idea
      const updatedIdea = await tx.businessIdea.update({
        where: { id },
        data: {
          title: updateData.title,
          tags: updateData.tags,
          description: updateData.description,
          priceRange: updateData.priceRange,
          trendKeyword: updateData.trendKeyword,
          trendVolume: updateData.trendVolume,
          trendGrowth: updateData.trendGrowth,
          relatedKeywords: updateData.relatedKeywords,
          updatedAt: new Date(),
        },
      });

      // Update trend data if provided
      if (updateData.trendData) {
        await tx.trendDataPoint.deleteMany({ where: { businessIdeaId: id } });
        if (Array.isArray(updateData.trendData)) {
          await tx.trendDataPoint.createMany({
            data: updateData.trendData.map((point: any) => ({
              businessIdeaId: id,
              date: point.date,
              value: point.value,
            })),
          });
        }
      }

      // Update other related data similarly...

      return updatedIdea;
    });

    res.json({
      status: 'success',
      data: { idea: result },
    });
  }

  /**
   * Delete a business idea
   * DELETE /api/business-ideas/:id
   */
  async deleteIdea(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verify ownership
    const idea = await prisma.businessIdea.findFirst({
      where: { id, userId },
    });

    if (!idea) {
      throw new NotFoundError('Business Idea');
    }

    // Delete (cascade will handle related data)
    await prisma.businessIdea.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Business idea deleted successfully',
    });
  }

  /**
   * Get user's idea collections
   * GET /api/business-ideas/collections
   */
  async getCollections(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;

    const collections = await prisma.ideaCollection.findMany({
      where: { userId },
      include: {
        ideas: {
          include: {
            businessIdea: {
              select: {
                id: true,
                title: true,
                tags: true,
                createdAt: true,
              },
            },
          },
        },
        _count: {
          select: { ideas: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: { collections },
    });
  }

  /**
   * Create a new collection
   * POST /api/business-ideas/collections
   */
  async createCollection(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { name, description, tags, isPublic } = req.body;

    if (!name) {
      throw new ValidationError('Collection name is required');
    }

    const collection = await prisma.ideaCollection.create({
      data: {
        userId,
        name,
        description,
        tags: tags || [],
        isPublic: isPublic || false,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { collection },
    });
  }

  /**
   * Add idea to collection
   * POST /api/business-ideas/collections/:collectionId/ideas/:ideaId
   */
  async addIdeaToCollection(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { collectionId, ideaId } = req.params;

    // Verify ownership of both collection and idea
    const collection = await prisma.ideaCollection.findFirst({
      where: { id: collectionId, userId },
    });

    const idea = await prisma.businessIdea.findFirst({
      where: { id: ideaId, userId },
    });

    if (!collection || !idea) {
      throw new NotFoundError('Collection or Idea');
    }

    const collectionIdea = await prisma.collectionIdea.create({
      data: {
        collectionId,
        businessIdeaId: ideaId,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { collectionIdea },
    });
  }
}

export const businessIdeasController = new BusinessIdeasController();
