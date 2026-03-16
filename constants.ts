
import { BusinessIdea, MarketTrend, DraftIdea } from './types';

export const GOLF_IDEA: BusinessIdea = {
  id: 'golf-1',
  title: 'Streamlined Golf Tee Time Booking App',
  date: '4/24/2025',
  tags: ['Niche Market', 'Consumer App'],
  description: 'This business idea focuses on creating a user-friendly app that simplifies the process of booking and managing golf tee times by aggregating real-time reservations and exclusive deals, empowering tech-savvy golfers with convenience while boosting course management efficiency and revenue.',
  priceRange: 'Freemium',
  trendKeyword: 'Golf Tee Time Booking',
  trendVolume: '12.5K',
  trendGrowth: '+45%',
  relatedKeywords: ['Tee time booking', 'Golf reservations', 'Golf course management'],
  trendData: [
    { date: 'Jan', value: 30 },
    { date: 'Feb', value: 35 },
    { date: 'Mar', value: 50 },
    { date: 'Apr', value: 80 },
    { date: 'May', value: 65 },
  ],
  kpi: {
    opportunity: { score: 9.0, label: 'High' },
    problem: { score: 8.0, label: 'Moderate' },
    feasibility: { score: 7.0, label: 'Doable' },
    whyNow: { score: 8.0, label: 'Good Timing' },
  },
  businessFit: {
    revenuePotential: '$$$',
    revenuePotentialDescription: 'Significant revenue from booking fees and premium subscriptions.',
    executionDifficulty: 8,
    executionDifficultyDescription: 'Requires integration with legacy golf course software.',
    goToMarket: 8,
    goToMarketDescription: 'Partner with courses and influencers.',
    founderFitDescription: 'Best for founders with golf industry connections.',
  },
  sections: {
    offer: [
      { type: 'LEAD MAGNET', title: 'Free Swing Analysis Tool', description: 'AI-lite swing analysis from a single video upload.', price: 'Free', valueProvided: 'Instant value to golfer, identifying bad habits.', goal: 'User acquisition' },
      { type: 'FRONTEND OFFER', title: 'Priority Tee Time Alerts', description: 'Get notified of last minute cancellations at top courses.', price: '$9/mo', valueProvided: 'Access to exclusive inventory.', goal: 'Recurring micro-transaction' },
      { type: 'CORE OFFER', title: 'Premium Booking & Handicap Manager', description: 'Full booking platform with integrated handicap tracking and social features.', price: '$29/mo', valueProvided: 'All-in-one golf management.', goal: 'Main revenue stream' }
    ],
    whyNow: '',
    proofAndSignals: '',
    marketGap: '',
    executionPlan: '',
  },
  communitySignals: {
    reddit: '',
    facebook: '',
    youtube: '',
    other: '',
  },
};

export const MOCK_DRAFTS: DraftIdea[] = [
  {
    id: 'd1',
    title: 'Stump Grinding Subcontracting Service',
    status: 'Research queued',
    createdAt: 'Created on 4/28/2025'
  },
  {
    id: 'd2',
    title: 'Horseback Riding Barn Finder Platform',
    status: 'Not started',
    createdAt: 'Created on 4/24/2025'
  },
  {
    id: 'd3',
    title: 'Dirty Jobber Community Platform',
    status: 'Not started',
    createdAt: 'Created on 4/24/2025'
  }
];

export const MOCK_TRENDS: MarketTrend[] = [
  {
    title: 'Retail Artificial Intelligence',
    volume: '12.3K',
    growth: '+311%',
    description: 'Retail artificial intelligence refers to the application of AI technologies to...',
    data: [{date:'1', value:10}, {date:'2', value:20}, {date:'3', value:45}, {date:'4', value:80}],
  },
  {
    title: 'The Podcast Studio',
    volume: '1.3K',
    growth: '+941%',
    description: 'The podcast studio refers to a dedicated space designed for the...',
    data: [{date:'1', value:5}, {date:'2', value:15}, {date:'3', value:30}, {date:'4', value:90}],
  },
  {
    title: 'Mens Mental Health Month',
    volume: '110.0K',
    growth: '+115336%',
    description: "Men's Mental Health Month refers to a designated period aimed at raisin...",
    data: [{date:'1', value:10}, {date:'2', value:12}, {date:'3', value:15}, {date:'4', value:100}],
  },
  {
    title: 'Brand Marketing Firms',
    volume: '2.4K',
    growth: '+514%',
    description: 'Brand marketing firms refer to specialized agencies that focus on...',
    data: [{date:'1', value:30}, {date:'2', value:40}, {date:'3', value:35}, {date:'4', value:60}],
  },
];
