
import { GoogleGenAI, Chat, Part, FunctionDeclaration, Type } from '@google/genai';
import { BusinessIdea, WhiteboardNode } from '../types';

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

const SUPPORTED_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
  'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
  'application/pdf', 'text/plain', 'text/csv', 'text/html'
]);

const parseGeminiResponse = (text: string): Partial<BusinessIdea> => {
  // Extract JSON from code block
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
  let parsedIdea: Partial<BusinessIdea> = {};
  
  if (jsonMatch && jsonMatch[1]) {
    try {
      parsedIdea = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("JSON Parse Error from code block:", e);
    }
  } else {
     // Fallback if no code block, try parsing raw text if it looks like JSON
     try {
       parsedIdea = JSON.parse(text);
     } catch (e) {
       console.error("Failed to parse Gemini response raw", e);
     }
  }
  return parsedIdea;
};

const hydrateIdea = (parsedIdea: Partial<BusinessIdea>, sources: any[]): BusinessIdea => {
  const randomTrendBase = Math.floor(Math.random() * 100);
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    title: parsedIdea.title || 'Untitled Idea',
    tags: parsedIdea.tags || ['Analysis', 'AI Generated'],
    description: parsedIdea.description || 'No description provided.',
    priceRange: parsedIdea.priceRange || 'Variable',
    trendKeyword: parsedIdea.trendKeyword || 'Market Trend',
    trendVolume: parsedIdea.trendVolume || '5.5K',
    trendGrowth: parsedIdea.trendGrowth || '+85%',
    relatedKeywords: parsedIdea.relatedKeywords || [parsedIdea.trendKeyword || 'Startup Idea'],
    trendData: parsedIdea.trendData || [
      { date: '2022', value: randomTrendBase }, 
      { date: '2023', value: randomTrendBase + 20 }, 
      { date: '2024', value: randomTrendBase + 50 }, 
      { date: '2025', value: randomTrendBase + 80 }, 
      { date: '2026', value: randomTrendBase + 60 }
    ],
    kpi: parsedIdea.kpi || {
       opportunity: { score: 8, label: 'High' },
       problem: { score: 7, label: 'Moderate' },
       feasibility: { score: 7, label: 'Doable' },
       whyNow: { score: 9, label: 'Now' }
    },
    businessFit: parsedIdea.businessFit || {
        revenuePotential: '$$',
        revenuePotentialDescription: 'Moderate revenue potential with standard subscription models.',
        executionDifficulty: 5,
        executionDifficultyDescription: 'Standard development complexity.',
        goToMarket: 5,
        goToMarketDescription: 'Requires standard social media marketing.',
        founderFitDescription: 'Generalist founder with some industry knowledge.'
    },
    sections: parsedIdea.sections || {
        offer: [],
        whyNow: 'N/A',
        proofAndSignals: 'N/A',
        marketGap: 'N/A',
        executionPlan: 'N/A'
    },
    communitySignals: parsedIdea.communitySignals || {
        reddit: 'N/A',
        facebook: 'N/A',
        youtube: 'N/A',
        other: 'N/A'
    },
    sources: sources
  };
}

export const generateBusinessIdea = async (): Promise<BusinessIdea> => {
  // Using gemini-3-pro-preview for deeper, world-class analysis
  const modelId = 'gemini-3-pro-preview';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `
    Act as a world-class venture capitalist, product strategist, and trend analyst.
    It is currently ${today}.
    
    Your task:
    1. Use Google Search to identify a BREAKOUT trend or rising problem in the last 24-48 hours. Focus on niche B2B SaaS, Eco-tech, or AI productivity.
    2. Synthesize a complete business idea ("The Idea of Tomorrow") that solves this new problem.
    3. Conduct a keyword analysis to find 4-6 variations of the search term (Long-tail, High Intent, Question-based).
    4. Search for community validation on Reddit, Facebook, and YouTube to populate the 'communitySignals' section.
    5. Create a detailed 5-step Value Ladder strategy.
    
    The JSON must strictly match this schema:
    {
      "title": "String (Catchy startup name)",
      "description": "String (3-4 paragraphs selling the vision, detailed and robust)",
      "tags": ["String", "String"],
      "trendKeyword": "String (The main breakout search term)",
      "relatedKeywords": ["String", "String", "String", "String", "String"],
      "trendVolume": "String (Estimate monthly search volume, e.g. '12.5K')",
      "trendGrowth": "String (Estimate YoY growth, e.g. '+150%')",
      "trendData": [{ "date": "String", "value": Number }], // 5 points representing last 5 years
      "kpi": {
        "opportunity": { "score": Number (1-10), "label": "String" },
        "problem": { "score": Number (1-10), "label": "String" },
        "feasibility": { "score": Number (1-10), "label": "String" },
        "whyNow": { "score": Number (1-10), "label": "String" }
      },
      "businessFit": {
        "revenuePotential": "String (e.g. $$$)",
        "revenuePotentialDescription": "String (1-2 sentences explaining the revenue model and scale)",
        "executionDifficulty": Number (1-10),
        "executionDifficultyDescription": "String (1-2 sentences explaining the main technical or operational hurdle)",
        "goToMarket": Number (1-10),
        "goToMarketDescription": "String (1-2 sentences explaining the key distribution channel)",
        "founderFitDescription": "String (1-2 sentences describing the ideal founder profile)"
      },
      "sections": {
        "offer": [
            { 
              "type": "String (Must be one of: Lead Magnet, Frontend Offer, Core Offer, Continuity Program, Backend Offer)", 
              "title": "String", 
              "description": "String", 
              "price": "String",
              "valueProvided": "String (The specific value to the customer)",
              "goal": "String (The strategic goal of this step)"
            }
        ],
        "whyNow": "String (Detailed analysis of timing, 3-4 sentences minimum. Why is this urgent?)",
        "proofAndSignals": "String (Specific examples of market validation and competitors, 3-4 sentences minimum)",
        "marketGap": "String (Clear explanation of the opportunity and blue ocean strategy, 3-4 sentences minimum)",
        "executionPlan": "String (Strategic overview of first steps, 3-4 sentences minimum)"
      },
      "communitySignals": {
        "reddit": "String (Mention specific subreddit names and member counts found via search)",
        "facebook": "String (Mention specific group types or names)",
        "youtube": "String (Mention channel niches or video topics)",
        "other": "String"
      }
    }
    
    Ensure 'sections.offer' has exactly 5 items corresponding to the Value Ladder steps.
    Ensure 'relatedKeywords' contains at least 4-6 distinct variations.
    **IMPORTANT**: Populate the 'sections' with robust, multi-sentence analysis. Do not use short placeholders.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const parsedIdea = parseGeminiResponse(response.text || '');
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(c => c.web?.uri && c.web?.title)
      .map(c => ({ title: c.web!.title!, uri: c.web!.uri! })) || [];

    return hydrateIdea(parsedIdea, sources);

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeUserIdea = async (userDescription: string, media?: { data: string, mimeType: string }): Promise<BusinessIdea> => {
  const modelId = 'gemini-3-pro-preview';

  const prompt = `
    Act as a world-class venture capitalist and Product UX Expert.
    
    ${media ? 'Analyze the attached image/video and the context below.' : 'Analyze the following idea description.'}
    User's Idea Concept: "${userDescription}"

    Your task:
    1. Analyze this specific idea. Use Google Search to find real-time trends, search volume data, and market signals that validate (or challenge) this specific idea.
    2. Identify 4-6 keyword variations (Long-tail, Problem-Aware, Solution-Aware) that users are actually searching for.
    3. Synthesize a complete business analysis.
    4. Create a detailed 5-step Value Ladder strategy.
    
    The JSON must strictly match this schema:
    {
      "title": "String (Refine the user's title to be catchy)",
      "description": "String (3-4 paragraphs selling the vision based on user input + market data. Make it robust.)",
      "tags": ["String", "String"],
      "trendKeyword": "String (The main search term related to this idea)",
      "relatedKeywords": ["String", "String", "String", "String", "String"],
      "trendVolume": "String (Estimate monthly search volume, e.g. '12.5K')",
      "trendGrowth": "String (Estimate YoY growth, e.g. '+150%')",
      "trendData": [{ "date": "String", "value": Number }], 
      "kpi": {
        "opportunity": { "score": Number (1-10), "label": "String" },
        "problem": { "score": Number (1-10), "label": "String" },
        "feasibility": { "score": Number (1-10), "label": "String" },
        "whyNow": { "score": Number (1-10), "label": "String" }
      },
      "businessFit": {
        "revenuePotential": "String (e.g. $$$)",
        "revenuePotentialDescription": "String (1-2 sentences explaining the revenue model and scale)",
        "executionDifficulty": Number (1-10),
        "executionDifficultyDescription": "String (1-2 sentences explaining the main technical or operational hurdle)",
        "goToMarket": Number (1-10),
        "goToMarketDescription": "String (1-2 sentences explaining the key distribution channel)",
        "founderFitDescription": "String (1-2 sentences describing the ideal founder profile)"
      },
      "sections": {
        "offer": [
            { 
              "type": "String (Must be one of: Lead Magnet, Frontend Offer, Core Offer, Continuity Program, Backend Offer)", 
              "title": "String", 
              "description": "String", 
              "price": "String",
              "valueProvided": "String (The specific value to the customer)",
              "goal": "String (The strategic goal of this step)"
            }
        ],
        "whyNow": "String (Detailed analysis of timing, 3-4 sentences. Why now?)",
        "proofAndSignals": "String (Specific examples of market validation and existing solutions, 3-4 sentences)",
        "marketGap": "String (Clear explanation of the opportunity, 3-4 sentences)",
        "executionPlan": "String (Strategic overview, 3-4 sentences)"
      },
      "communitySignals": {
        "reddit": "String (Mention specific subreddit names)",
        "facebook": "String (Mention specific group types)",
        "youtube": "String (Mention channel niches)",
        "other": "String"
      }
    }
    
    Ensure 'sections.offer' has exactly 5 items corresponding to the Value Ladder steps.
    **IMPORTANT**: Populate the 'sections' with robust, multi-sentence analysis.
  `;

  const parts: Part[] = [{ text: prompt }];
  if (media) {
      parts.unshift({ inlineData: { data: media.data, mimeType: media.mimeType }});
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const parsedIdea = parseGeminiResponse(response.text || '');
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(c => c.web?.uri && c.web?.title)
      .map(c => ({ title: c.web!.title!, uri: c.web!.uri! })) || [];

    return hydrateIdea(parsedIdea, sources);

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const createIdeaChatSession = (idea: BusinessIdea): Chat => {
  const modelId = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    You are an expert Business Consultant and Market Analyst.
    You are currently discussing a specific startup idea called "${idea.title}".

    Here is the full context and research data for this idea:
    ${JSON.stringify(idea, null, 2)}

    Your goal is to help the user understand this business opportunity.
    
    **CRITICAL GUIDELINES for UI/UX & HUMAN-CENTRIC DESIGN:**
    1. If the user asks about product features, ALWAYS prioritize "Cognitive Load Reduction". Suggest interfaces that are calm, clear, and avoid overwhelming the user.
    2. Suggest "Progressive Disclosure" of complex features.
    3. Focus on "Positive Feedback Loops" - how does the app reward the user for taking action?
    4. Use the provided data (Trend Data, KPIs, Business Fit) to back up your answers.
  `;

  return ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
      tools: [{ googleSearch: {} }]
    }
  });
};

export const generateArtifact = async (idea: BusinessIdea, type: string): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  let prompt = '';

  // Human-Centric Prompt Engineering
  const designPhilosophy = `
    **Design Philosophy:**
    - **Human-Centric:** Prioritize the emotional state of the user. The tool should feel helpful, not demanding.
    - **Zero Cognitive Overload:** Break complex tasks into small, digestible steps.
    - **Calm UI:** suggest clean whitespace, clear typography, and vibrant but not shouting accent colors.
    - **Accessibility First:** Ensure high contrast and screen reader friendliness.
  `;

  switch(type) {
    case 'founder-fit':
      prompt = `Analyze the "Founder Fit" for: "${idea.title}". 
      Execution Difficulty: ${idea.businessFit.executionDifficulty}/10
      
      Task:
      1. Critical Hard Skills (Top 3)
      2. Critical Soft Skills (Top 3 - Focus on resilience and empathy)
      3. Weekly Time Commitment (Realistic estimate for solo founder)
      4. Risk Profile Analysis
      
      Format as Markdown.`;
      break;

    case 'ad-creatives':
      prompt = `Generate 3 Human-Centric Ad Creatives for: "${idea.title}".
      Target Audience: People searching for ${idea.relatedKeywords?.join(', ') || idea.trendKeyword}.
      
      ${designPhilosophy}

      Task:
      For each ad, focus on the *emotional relief* the solution provides, not just features.
      1. **Headline**: (Punchy, under 40 chars)
      2. **Primary Text**: (Empathy-driven, focusing on the pain point "${idea.kpi.problem.label}")
      3. **Visual Description**: (Describe an image/video that feels authentic, not stock-photo-like)
      
      Format as Markdown.`;
      break;

    case 'brand-package':
      prompt = `Create a Modern Brand Identity Package for: "${idea.title}".
      
      ${designPhilosophy}

      Task:
      1. **Brand Personality**: (e.g., "The Empathetic Expert", "The Cheerful Helper")
      2. **Color Palette**: (3 hex codes. Focus on colors that reduce eye strain while maintaining vibrancy)
      3. **Typography**: Suggest font pairings that are highly legible.
      4. **Voice & Tone**: How to speak to the user without sounding robotic.
      
      Format as Markdown.`;
      break;

    case 'landing-page':
      prompt = `Write the Landing Page Copy for: "${idea.title}".
      
      ${designPhilosophy}

      Task:
      1. **Hero Headline**: Focus on the transformation/benefit, not the tool.
      2. **Subheadline**: clear, jargon-free explanation.
      3. **Benefit Bullets**: 3 key benefits that reduce user anxiety or effort.
      4. **Social Proof Section**: Placeholder text for trust signals.
      5. **CTA**: Low-friction text (e.g., "Start for free" instead of "Register now").
      
      Format as Markdown.`;
      break;

    case 'coding-prompts':
      prompt = `Act as a Senior Product Designer & Principal Software Architect.
      Create a comprehensive "Master System Prompt" to build the MVP for: "${idea.title}".
      
      **CRITICAL GOAL**: The resulting app must be a masterpiece of Human-Centric Design.
      
      Context:
      Description: ${idea.description}
      Value Ladder: ${JSON.stringify(idea.sections.offer)}
      
      Your Output must be a single, massive Markdown code block.
      
      The System Prompt inside the code block should include:
      1. **Role Definition**: "Act as a Senior React Developer with a specialization in Accessibility (a11y) and UX..."
      2. **Tech Stack**: Next.js 14, TailwindCSS, Lucide React, Supabase.
      3. **UX/UI Guidelines (Mandatory)**:
         - **Cognitive Load**: "Do not overwhelm the user. Use progressive disclosure for advanced features."
         - **Visual Hierarchy**: "Use whitespace effectively to guide the eye. Avoid clutter."
         - **Feedback**: "Every user action (click, save, error) must have immediate visual feedback (toast, spinner, transition)."
         - **Empty States**: "Design helpful empty states that teach the user what to do next."
      4. **Step-by-Step Implementation**:
         - Phase 1: Scaffolding & Design System (Fonts, Colors, Reusable Components).
         - Phase 2: Core Features (Focusing on the 'Core Offer' functionality).
         - Phase 3: Polish & Micro-interactions (Framer Motion for smooth transitions).
      5. **Project Structure**: Clean folder structure.
      
      Wrap the ENTIRE prompt in a single code block.`;
      break;
      
    default:
      const humanReadableType = type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      prompt = `Act as a world-class consultant. Create a "${humanReadableType}" for: "${idea.title}".
      
      ${designPhilosophy}
      
      Task:
      Generate a comprehensive, professional, and actionable ${humanReadableType}.
      Ensure the tone is encouraging and the advice reduces the founder's cognitive load by providing clear, step-by-step instructions.
      `;
      break;
  }

  try {
    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
    });
    return response.text || "Analysis failed.";
  } catch (e) {
    console.error("Artifact generation error", e);
    return "Sorry, I couldn't generate that right now.";
  }
};

export const generateSectionDeepDive = async (
  idea: BusinessIdea,
  section: 'whyNow' | 'proofAndSignals' | 'marketGap' | 'executionPlan' | 'revenuePotential' | 'executionDifficulty' | 'goToMarket' | 'communitySignals'
): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  let prompt = '';

  switch(section) {
    case 'whyNow':
      prompt = `Analyze "Why Now" for: "${idea.title}".
      Trend: ${idea.trendKeyword}
      Task: Analyze market events, tech shifts, and cultural changes. Explain the "Cost of Inaction".`;
      break;

    case 'proofAndSignals':
      prompt = `Provide detailed "Proof & Signals" validation for: "${idea.title}".
      Task:
      1. Use Google Search to find **real** existing competitors. List 3 specific names and their weaknesses.
      2. Find **real** Reddit threads or forum discussions asking for this solution. Quote them if possible.
      3. Identify proxy metrics (e.g. "Search volume for X has doubled").`;
      break;

    case 'marketGap':
      prompt = `Analyze the "Market Gap" for: "${idea.title}".
      Task: Map the competitive landscape (Low End vs High End). Define the Blue Ocean. Explain the Unfair Advantage.`;
      break;

    case 'executionPlan':
      prompt = `Create a "30-60-90 Day Execution Plan" for: "${idea.title}".
      Focus on a "Low Stress, High Impact" approach to avoid founder burnout.
      Task:
      1. Days 1-30: Validation (No code).
      2. Days 31-60: MVP (Core feature only).
      3. Days 61-90: First 10 customers.`;
      break;

    case 'revenuePotential':
      prompt = `Analyze "Revenue Potential" for: "${idea.title}".
      Task: Estimate TAM/SAM. Propose 3 monetization models. Calculate Unit Economics.`;
      break;

    case 'executionDifficulty':
      prompt = `Analyze "Execution Difficulty" for: "${idea.title}".
      Task: Identify Technical Bottlenecks and Operational Challenges. Suggest tools to automate simpler tasks.`;
      break;

    case 'goToMarket':
      prompt = `Create a "Go-To-Market Strategy" for: "${idea.title}".
      Task: Identify the path of least resistance. Suggest a "Trojan Horse" strategy. List 3 specific content hooks.`;
      break;

    case 'communitySignals':
      prompt = `Provide a detailed "Community Signals & Social Listening" breakdown for: "${idea.title}".
      
      Trend Keyword: ${idea.trendKeyword}
      Related Keywords: ${idea.relatedKeywords?.join(', ')}
      
      Task:
      1. **Reddit**: Search for subreddits like r/SaaS, r/Entrepreneur, or niche specific ones. Summarize ACTUAL sentiment. Are people complaining? Asking for help?
      2. **Facebook/Meta**: Identify active groups where the target persona hangs out.
      3. **YouTube**: Find channels covering this topic. What are the top comments saying?
      4. **Validation Score**: Rate the "Desperation Level" of the market from 1-10 based on these signals.
      
      Format as a structured Markdown report.`;
      break;
  }

  try {
    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }], // Enable search for up-to-date signals
        }
    });
    return response.text || "Analysis failed.";
  } catch (e) {
    console.error("Deep dive generation error", e);
    return "Sorry, I couldn't generate that analysis right now.";
  }
};

export const generateFullAnalysis = async (idea: BusinessIdea): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  const prompt = `
    Act as a world-class Venture Capital Analyst.
    Create a comprehensive Investment Memo and Deep Dive Report for: "${idea.title}".

    Context:
    ${idea.description}
    Trend Data: ${idea.trendKeyword}
    KPIs: ${JSON.stringify(idea.kpi)}
    Value Ladder: ${JSON.stringify(idea.sections.offer)}
    
    Your report should be detailed, professional, and formatted in Markdown.
    Include: Executive Summary, Market Analysis, Competitive Landscape, Product Strategy, GTM, Risk Factors, Financial Outlook, Conclusion.
  `;

  try {
    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
    });
    return response.text || "Analysis failed.";
  } catch (e) {
    console.error("Full analysis generation error", e);
    return "Sorry, I couldn't generate the full analysis right now.";
  }
};

// Define tool for creating notes on the whiteboard
const createNotesTool: FunctionDeclaration = {
  name: 'create_notes',
  description: 'Create sticky notes or text cards on the whiteboard to organize thoughts or break down tasks.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      notes: {
        type: Type.ARRAY,
        description: 'List of notes to create',
        items: {
          type: Type.OBJECT,
          properties: {
             title: { type: Type.STRING, description: 'Title of the note (optional)' },
             content: { type: Type.STRING, description: 'The body text of the note' },
             color: { type: Type.STRING, description: 'Color hex code (e.g. #fef3c7 for yellow, #dbeafe for blue)' }
          },
          required: ['content']
        }
      }
    },
    required: ['notes']
  }
};

// Tool for moving/organizing existing nodes
const organizeLayoutTool: FunctionDeclaration = {
  name: 'organize_layout',
  description: 'Move existing nodes on the whiteboard to new coordinates. Use this to cluster related items, stack cards, tidy up the board, or organize ideas spatially.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      moves: {
        type: Type.ARRAY,
        description: 'List of nodes to move',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: 'The ID of the node to move' },
            x: { type: Type.NUMBER, description: 'New X coordinate' },
            y: { type: Type.NUMBER, description: 'New Y coordinate' }
          },
          required: ['id', 'x', 'y']
        }
      }
    },
    required: ['moves']
  }
};

// Tool for connecting nodes
const connectNodesTool: FunctionDeclaration = {
  name: 'connect_nodes',
  description: 'Create connection lines between existing nodes to show relationships, workflows, flow, or hierarchy.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      connections: {
        type: Type.ARRAY,
        description: 'List of connections to create',
        items: {
          type: Type.OBJECT,
          properties: {
            fromId: { type: Type.STRING, description: 'ID of the source node' },
            toId: { type: Type.STRING, description: 'ID of the target node' }
          },
          required: ['fromId', 'toId']
        }
      }
    },
    required: ['connections']
  }
};

// Tool for deleting nodes
const deleteNodesTool: FunctionDeclaration = {
  name: 'delete_nodes',
  description: 'Remove nodes from the whiteboard. Use this to delete duplicate information, irrelevant notes, or clean up the board.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      nodeIds: {
        type: Type.ARRAY,
        description: 'List of node IDs to delete',
        items: { type: Type.STRING }
      }
    },
    required: ['nodeIds']
  }
};

// Tool for grouping nodes
const groupNodesTool: FunctionDeclaration = {
  name: 'group_nodes',
  description: 'Group multiple nodes together so they move and behave as a single unit. Use this to combine a video with its notes, or bundle related ideas.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      nodeIds: {
        type: Type.ARRAY,
        description: 'List of node IDs to group together',
        items: { type: Type.STRING }
      }
    },
    required: ['nodeIds']
  }
};

// Tool for ungrouping nodes
const ungroupNodesTool: FunctionDeclaration = {
  name: 'ungroup_nodes',
  description: 'Ungroup nodes that were previously grouped together.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      nodeIds: {
        type: Type.ARRAY,
        description: 'List of node IDs to ungroup',
        items: { type: Type.STRING }
      }
    },
    required: ['nodeIds']
  }
};

export const createWhiteboardChatSession = (nodes: WhiteboardNode[]): Chat => {
  // Upgraded to gemini-3-pro-preview to resolve "Tool use with function calling is unsupported" error
  const modelId = 'gemini-3-pro-preview';

  const systemInstruction = `
    You are an advanced AI Creative Assistant integrated into a Whiteboard environment.
    
    **Your Capabilities:**
    1. **Multimodal Vision**: You can "see" images and "watch" videos uploaded to the board. 
       - **YouTube**: If a YouTube URL is present, you can use Google Search to find its transcript, summary, or context to analyze it.
    2. **Spatial Awareness**: You know the exact (x, y) coordinates and dimensions (w, h) of every node. 
       - If items are far apart, they might be unrelated. 
       - If items are overlapping, they are messy.
    3. **Actionable Tools**: 
       - **CREATE**: Use 'create_notes' to add new ideas.
       - **MOVE**: Use 'organize_layout' to cluster related ideas or stack cards.
       - **CONNECT**: Use 'connect_nodes' to draw lines for workflows.
       - **GROUP**: Use 'group_nodes' to bundle items together (e.g. a Video + a Summary Note) so they stay together.
       - **DELETE**: Use 'delete_nodes' to remove duplicates.
    
    **Context - Current Board State:**
    ${nodes.map(n => `- ID: ${n.id} | Group: ${n.groupId || 'None'} | Type: ${n.type} | Pos: (${Math.round(n.position.x)}, ${Math.round(n.position.y)}) | Content: "${n.title || n.content.substring(0, 50)}..."`).join('\n')}
    
    **Your Goal:**
    Help the user brainstorm, organize, and structure their thoughts. 
    If the user says "Analyze this video", find the YouTube node, search for its content, and create a summary note next to it, then GROUP them.
  `;

  return ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
      tools: [
        { googleSearch: {} },
        { functionDeclarations: [createNotesTool, organizeLayoutTool, connectNodesTool, deleteNodesTool, groupNodesTool, ungroupNodesTool] }
      ]
    }
  });
};

export const convertNodesToParts = (nodes: WhiteboardNode[]): Part[] => {
  const parts: Part[] = [];
  
  nodes.forEach(node => {
    // Include Position, Dimensions, and GroupID in the context text
    parts.push({ text: `\n[Node ID: ${node.id} | Type: ${node.type} | Group: ${node.groupId || 'None'} | Bounds: x=${Math.round(node.position.x)}, y=${Math.round(node.position.y)}, w=${node.width || 280}, h=${node.height || 200} | Title: ${node.title}]\n` });

    if (node.type === 'text' || node.type === 'link' || node.type === 'youtube') {
      parts.push({ text: node.content });
    } else if (['image', 'video', 'audio', 'pdf'].includes(node.type) && node.content && node.mimeType) {
        if (SUPPORTED_MIME_TYPES.has(node.mimeType)) {
            parts.push({ 
                inlineData: {
                    data: node.content,
                    mimeType: node.mimeType
                }
            });
        } else {
             parts.push({ text: `[Attached file: ${node.fileName || 'Unknown'}. Type ${node.mimeType} is not supported for visual analysis, but exists in context.]` });
        }
    }
  });

  return parts;
};
