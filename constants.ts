
import { BusinessIdea, MarketTrend, DraftIdea } from './types';

export const INITIAL_IDEA: BusinessIdea = {
  id: '1',
  title: 'Automated Nutrient Management Platform for Hydroponic Farms',
  date: 'Nov 19, 2025',
  tags: ['Massive Market', 'Perfect Timing', '10x Better', '+17 More'],
  description: 'Hydroponic growers waste hours each week on manual testing, adjusting nutrients, and dealing with unreliable sensors. One incorrect nutrient mix risks killing an entire crop. HydroSense combines precision sensors with machine learning to automatically balance nutrient solutions, learn your specific crops, detect problems early, and alert you only when intervention is necessary.\n\nPriced at $150-$500 monthly per greenhouse based on size and complexity, the platform integrates with existing systems and provides a real-time dashboard of your crop conditions. No daily manual testing, no questioning sensor accuracy, no stressing about nutrient levels.',
  priceRange: '$150-$500/mo',
  trendKeyword: 'Hydroponic nutrient solution',
  trendVolume: '6.6K',
  trendGrowth: '+128%',
  relatedKeywords: [
    'Hydroponic nutrient solution',
    'Hydroponic nutrients',
    'Hydroponic fertilizer',
    'Hygen nutrients',
    'Hydroponic plant food',
    'Hydroponic nft system',
    'Liquid plant food for hydroponics'
  ],
  trendData: [
    { date: '2022', value: 20 },
    { date: '2023', value: 35 },
    { date: '2024', value: 30 },
    { date: '2025', value: 85 },
    { date: '2026', value: 60 },
  ],
  kpi: {
    opportunity: { score: 9, label: 'Exceptional' },
    problem: { score: 9, label: 'Severe Pain' },
    feasibility: { score: 6, label: 'Challenging' },
    whyNow: { score: 9, label: 'Perfect Timing' },
  },
  businessFit: {
    revenuePotential: '$$$',
    revenuePotentialDescription: '$1M-$10M ARR potential with current market growth',
    executionDifficulty: 8,
    executionDifficultyDescription: 'Complex IoT system for agriculture environments',
    goToMarket: 8,
    goToMarketDescription: 'Strong market signals with clear channels',
    founderFitDescription: 'Ideal for founders with IoT and Agritech experience',
  },
  sections: {
    offer: [
      { 
        type: 'LEAD MAGNET',
        title: 'Hydroponics Nutrient Savings Calculator', 
        description: 'An online tool that calculates potential nutrient savings and yield improvements using AI predictions.', 
        price: 'Free',
        valueProvided: 'Quick insights into cost savings and efficiency gains, demonstrating AI value immediately.',
        goal: 'Generate leads and build trust with free resources.'
      },
      { 
        type: 'FRONTEND OFFER',
        title: 'AI-driven Nutrient Monitoring Starter Kit', 
        description: 'Basic sensor set with limited access to the AI dashboard for real-time monitoring of specific crops.', 
        price: '$199 flat fee',
        valueProvided: 'Hands-on trial of AI capability, reducing manual testing by showing immediate benefits on select crops.',
        goal: 'Convert leads to customers and validate technology.'
      },
      { 
        type: 'CORE OFFER',
        title: 'Full AI Nutrient Monitoring Dashboard Subscription', 
        description: 'Comprehensive subscription service with full nutrient prediction, monitoring, and adjustment capabilities.', 
        price: '$200-$500/month depending on farm size',
        valueProvided: '75% reduction in manual interventions, increased precision in nutrient management across various crops.',
        goal: 'Core product offering for recurring revenue.'
      },
      { 
        type: 'CONTINUITY PROGRAM',
        title: 'Advanced Pest & Disease Prediction Add-On', 
        description: 'Optional service predicting pest and disease risks using climate and sensor data.', 
        price: '$150/month',
        valueProvided: 'Proactive management of additional agricultural challenges, enhancing crop yield and health.',
        goal: 'Expand revenue through ongoing enhancements.'
      },
      { 
        type: 'BACKEND OFFER',
        title: 'Custom AI Model Licensing and Integration Service', 
        description: 'Exclusive development and integration of tailored AI models for unique crops or specific farm needs.', 
        price: '$15,000+ per project',
        valueProvided: 'Tailored AI solutions that address specific requirements, boosting farm efficiency and outputs for large-scale operations.',
        goal: 'Capture high-value clients seeking custom solutions.'
      }
    ],
    whyNow: 'The AI Nutrient Monitoring Dashboard is launching amidst a surging hydroponics market valued at $17.16 billion in 2024, projected to hit $61.26 billion by 2035, driven by rapid urban farming adoption and a shift towards precision agriculture.',
    proofAndSignals: 'The AI Nutrient Monitoring Dashboard for Hydroponics addresses significant pain points in the hydroponics industry, with strong market timing and community engagement. Rapid urban farming growth and demand for precision agriculture drive its relevance.',
    marketGap: 'The biggest market gap lies in mid-sized commercial hydroponic farms lacking tailored nutrient monitoring solutions. Addressing this can transform efficiency and yield, tapping into a growing market poised to expand significantly by 2035.',
    executionPlan: 'Introduce a groundbreaking MVP with automated nutrient monitoring and predictive insights tailored to specific crops, targeting urban and commercial hydroponic farms. Integrate an online nutrient calculator and drive engagement via LinkedIn and YouTube, then expand to APAC markets.',
  },
  communitySignals: {
    reddit: '12.3K subreddits - 2.6M+ members - 8/10',
    facebook: '5 groups - 150K+ members - 7/10',
    youtube: '13 channels - views - 7/10',
    other: '3 segments - 5 priorities - 8/10',
  },
};

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
