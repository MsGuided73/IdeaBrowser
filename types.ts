
import React from 'react';

export interface TrendPoint {
  date: string;
  value: number;
}

export interface ValueLadderStep {
  type: string; // e.g., 'Lead Magnet', 'Frontend Offer'
  title: string;
  description: string;
  price: string;
  valueProvided: string;
  goal: string;
}

export interface BusinessIdea {
  id: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
  priceRange: string;
  trendKeyword: string;
  trendVolume?: string;
  trendGrowth?: string;
  relatedKeywords?: string[];
  trendData: TrendPoint[];
  kpi: {
    opportunity: { score: number; label: string };
    problem: { score: number; label: string };
    feasibility: { score: number; label: string };
    whyNow: { score: number; label: string };
  };
  businessFit: {
    revenuePotential: string;
    revenuePotentialDescription?: string;
    executionDifficulty: number; // 1-10
    executionDifficultyDescription?: string;
    goToMarket: number; // 1-10
    goToMarketDescription?: string;
    founderFitDescription?: string;
  };
  sections: {
    offer: ValueLadderStep[];
    whyNow: string;
    proofAndSignals: string;
    marketGap: string;
    executionPlan: string;
  };
  communitySignals: {
    reddit: string;
    facebook: string;
    youtube: string;
    other: string;
  };
  sources?: { title: string; uri: string }[]; // For AI grounding sources
}

export interface MarketTrend {
  title: string;
  volume: string;
  growth: string;
  description: string;
  data: TrendPoint[];
}

export interface DraftIdea {
  id: string;
  title: string;
  status: 'Not started' | 'Research queued' | 'Researched';
  createdAt: string;
  icon?: React.ReactNode;
}

export type ViewState = 'home' | 'my-ideas' | 'generator';

export interface WhiteboardNode {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'link' | 'youtube' | 'ai-partner';
  content: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  title?: string;
  color?: string;
  groupId?: string;
  mimeType?: string;
  fileName?: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}
