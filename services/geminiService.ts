
import { GoogleGenAI, Chat, Part } from '@google/genai';
import { BusinessIdea, WhiteboardNode } from '../types';

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

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
  return {
    id: Math.random().toString(36).substr(2, 9),
    date: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    title: parsedIdea.title || 'Untitled Idea',
    tags: parsedIdea.tags || ['Analysis', 'AI Generated'],
    description: parsedIdea.description || 'No description provided.',
    priceRange: parsedIdea.priceRange || 'Variable',
    trendKeyword: parsedIdea.trendKeyword || 'Market Trend',
    trendData: parsedIdea.trendData || [
      { date: '2022', value: 20 }, 
      { date: '2023', value: 40 }, 
      { date: '2024', value: 80 }, 
      { date: '2025', value: 100 }, 
      { date: '2026', value: 90 }
    ],
    kpi: parsedIdea.kpi || {
       opportunity: { score: 8, label: 'High' },
       problem: { score: 7, label: 'Moderate' },
       feasibility: { score: 7, label: 'Doable' },
       whyNow: { score: 9, label: 'Now' }
    },
    businessFit: parsedIdea.businessFit || {
        revenuePotential: '$$',
        executionDifficulty: 5,
        goToMarket: 5
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
  const modelId = 'gemini-2.5-flash';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `
    Act as a world-class venture capitalist and trend analyst.
    It is currently ${today}.
    
    Your task:
    1. Use Google Search to identify a BREAKOUT trend or rising problem in the last 24-48 hours. Focus on niche B2B SaaS, Eco-tech, or AI productivity.
    2. Synthesize a complete business idea ("The Idea of Tomorrow") that solves this new problem.
    3. Create a detailed 5-step Value Ladder strategy for this business.
    4. Return the result as a valid JSON object wrapped in a markdown code block.
    
    The JSON must strictly match this schema:
    {
      "title": "String (Catchy startup name)",
      "description": "String (2 paragraphs selling the vision)",
      "tags": ["String", "String"],
      "trendKeyword": "String (The main search term)",
      "trendData": [{ "date": "String", "value": Number }], // 5 points representing last 5 years
      "kpi": {
        "opportunity": { "score": Number (1-10), "label": "String" },
        "problem": { "score": Number (1-10), "label": "String" },
        "feasibility": { "score": Number (1-10), "label": "String" },
        "whyNow": { "score": Number (1-10), "label": "String" }
      },
      "businessFit": {
        "revenuePotential": "String (e.g. $$$)",
        "executionDifficulty": Number (1-10),
        "goToMarket": Number (1-10)
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
        "whyNow": "String",
        "proofAndSignals": "String",
        "marketGap": "String",
        "executionPlan": "String"
      },
      "communitySignals": {
        "reddit": "String",
        "facebook": "String",
        "youtube": "String",
        "other": "String"
      }
    }
    
    Ensure 'sections.offer' has exactly 5 items corresponding to the Value Ladder steps: Lead Magnet, Frontend Offer, Core Offer, Continuity Program, Backend Offer.
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
  // Use gemini-3-pro-preview if media is present for better multimodal understanding, or generally for complex analysis
  const modelId = 'gemini-3-pro-preview';

  const prompt = `
    Act as a world-class venture capitalist and trend analyst.
    
    ${media ? 'Analyze the attached image/video and the context below.' : 'Analyze the following idea description.'}
    User's Idea Concept: "${userDescription}"

    Your task:
    1. Analyze this specific idea. Use Google Search to find real-time trends, search volume data, and market signals that validate (or challenge) this specific idea.
    2. Synthesize a complete business analysis for this idea.
    3. Create a detailed 5-step Value Ladder strategy for this business.
    4. Return the result as a valid JSON object wrapped in a markdown code block.
    
    The JSON must strictly match this schema:
    {
      "title": "String (Refine the user's title to be catchy)",
      "description": "String (2 paragraphs selling the vision based on user input + market data)",
      "tags": ["String", "String"],
      "trendKeyword": "String (The main search term related to this idea)",
      "trendData": [{ "date": "String", "value": Number }], // 5 points representing last 5 years of the related trend
      "kpi": {
        "opportunity": { "score": Number (1-10), "label": "String" },
        "problem": { "score": Number (1-10), "label": "String" },
        "feasibility": { "score": Number (1-10), "label": "String" },
        "whyNow": { "score": Number (1-10), "label": "String" }
      },
      "businessFit": {
        "revenuePotential": "String (e.g. $$$)",
        "executionDifficulty": Number (1-10),
        "goToMarket": Number (1-10)
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
        "whyNow": "String",
        "proofAndSignals": "String",
        "marketGap": "String",
        "executionPlan": "String"
      },
      "communitySignals": {
        "reddit": "String",
        "facebook": "String",
        "youtube": "String",
        "other": "String"
      }
    }
    
    Ensure 'sections.offer' has exactly 5 items corresponding to the Value Ladder steps: Lead Magnet, Frontend Offer, Core Offer, Continuity Program, Backend Offer.
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

/**
 * Creates a chat session specific to a Business Idea.
 * The AI is primed with the full context of the idea to answer questions.
 */
export const createIdeaChatSession = (idea: BusinessIdea): Chat => {
  const modelId = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    You are an expert Business Consultant and Market Analyst.
    You are currently discussing a specific startup idea called "${idea.title}".

    Here is the full context and research data for this idea:
    ${JSON.stringify(idea, null, 2)}

    Your goal is to help the user understand this business opportunity, answer questions about execution, competitors, market size, or risks.
    
    Guidelines:
    1. Be encouraging but realistic.
    2. Use the provided data (Trend Data, KPIs, Business Fit) to back up your answers.
    3. If the user asks for something not in the data (like specific competitor names not listed), use your general knowledge to provide examples.
    4. Keep answers concise and actionable.
    5. If asked about "Founder Fit", analyze the skills needed based on the 'executionDifficulty'.
  `;

  return ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    }
  });
};

/**
 * Generates specific assets or analysis for an idea (Founder Fit, Ad Creatives, etc.)
 */
export const generateArtifact = async (idea: BusinessIdea, type: 'founder-fit' | 'ad-creative' | 'brand-package' | 'landing-page'): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  let prompt = '';

  switch(type) {
    case 'founder-fit':
      prompt = `Analyze the "Founder Fit" (Right for You analysis) for the following business idea: "${idea.title}". 
      
      Execution Difficulty: ${idea.businessFit.executionDifficulty}/10
      Description: ${idea.description}
      Execution Plan: ${idea.sections.executionPlan}

      Task:
      1. Identify the top 3 critical hard skills required (e.g., Sales, Coding, Logistics).
      2. Identify the top 3 soft skills required (e.g., Patience, Networking, Leadership).
      3. Estimate the weekly time commitment for a solo founder in the first 3 months.
      4. Assess the risk profile (Financial risk vs Time risk).
      
      Format the output as a clean Markdown summary with bold headings.`;
      break;

    case 'ad-creative':
      prompt = `Generate 3 high-converting Facebook/Instagram ad creatives for: "${idea.title}".
      
      Target Audience: People interested in ${idea.trendKeyword}.
      Value Prop: ${idea.description}

      Task:
      For each ad, provide:
      - **Headline**: (Punchy, under 40 chars)
      - **Primary Text**: (Persuasive, focusing on the pain point "${idea.kpi.problem.label}")
      - **Visual Description**: (What should the image/video show?)
      
      Format as a numbered list in Markdown.`;
      break;

    case 'brand-package':
      prompt = `Create a Mini Brand Identity Package for: "${idea.title}".
      
      Context: ${idea.description}

      Task:
      1. **Brand Personality**: (3 adjectives)
      2. **Color Palette**: (3 hex codes with reasoning)
      3. **Taglines**: (3 options: Descriptive, Emotional, Short)
      4. **Logo Concept**: (Description of a simple, memorable logo)
      
      Format as Markdown.`;
      break;

    case 'landing-page':
      prompt = `Write the Hero Section copy for a landing page for: "${idea.title}".
      
      Context: ${idea.description}

      Task:
      Provide:
      1. **H1 Headline**: (Value driven, clear)
      2. **Subheadline**: (Explains how it works + benefit)
      3. **Call to Action (CTA)**: (Low friction button text)
      4. **Social Proof Line**: (e.g. "Join X waiting list")
      
      Format as Markdown.`;
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

/**
 * Generates a deep dive analysis for specific sections of the business idea.
 */
export const generateSectionDeepDive = async (
  idea: BusinessIdea, 
  section: 'whyNow' | 'proofAndSignals' | 'marketGap' | 'executionPlan' | 'revenuePotential' | 'executionDifficulty' | 'goToMarket'
): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  let prompt = '';

  switch(section) {
    case 'whyNow':
      prompt = `Provide a deep dive analysis on "Why Now" for the business idea: "${idea.title}".
      
      Initial Context: ${idea.sections.whyNow}
      Trend Keyword: ${idea.trendKeyword}

      Task:
      1. Analyze specific market events, technological shifts, or cultural changes in the last 6-12 months.
      2. Explain the "Cost of Inaction" for potential customers.
      3. Identify any regulatory or economic tailwinds.
      
      Format as a structured Markdown report.`;
      break;

    case 'proofAndSignals':
      prompt = `Provide detailed "Proof & Signals" validation for: "${idea.title}".
      
      Initial Context: ${idea.sections.proofAndSignals}
      
      Task:
      1. Simulate a search for competitors and list 3 similar existing solutions and their weaknesses.
      2. Identify specific online communities (subreddits, forums) where this problem is discussed.
      3. List 3 "Proxy Metrics" that prove demand.
      
      Format as a structured Markdown report.`;
      break;

    case 'marketGap':
      prompt = `Analyze the "Market Gap" and Blue Ocean strategy for: "${idea.title}".
      
      Initial Context: ${idea.sections.marketGap}
      
      Task:
      1. Map the current competitive landscape (Low End vs High End).
      2. Define exactly where this idea sits in the gap.
      3. Explain the "Unfair Advantage" this specific approach offers.
      
      Format as a structured Markdown report.`;
      break;

    case 'executionPlan':
      prompt = `Create a detailed "30-60-90 Day Execution Plan" for: "${idea.title}".
      
      Initial Context: ${idea.sections.executionPlan}
      Difficulty: ${idea.businessFit.executionDifficulty}/10
      
      Task:
      1. **Days 1-30 (Validation)**: Steps to validate without code.
      2. **Days 31-60 (MVP)**: Minimum feature set required to sell.
      3. **Days 61-90 (Growth)**: Primary acquisition channel focus.
      
      Format as a structured Markdown report.`;
      break;

    case 'revenuePotential':
      prompt = `Analyze the "Revenue Potential" for: "${idea.title}".
      
      Rated Potential: ${idea.businessFit.revenuePotential}
      Price Range: ${idea.priceRange}
      
      Task:
      1. Estimate the TAM (Total Addressable Market) and SAM (Serviceable Addressable Market) based on current trends.
      2. Propose 3 specific monetization models (e.g. Subscription, Transactional, Licensing) suitable for this idea.
      3. Calculate a hypothetical "Unit Economics" breakdown for one customer.
      
      Format as a structured Markdown report.`;
      break;

    case 'executionDifficulty':
      prompt = `Analyze the "Execution Difficulty" for: "${idea.title}".
      
      Difficulty Score: ${idea.businessFit.executionDifficulty}/10
      Description: ${idea.description}
      
      Task:
      1. Identify the biggest Technical Bottlenecks.
      2. Identify the biggest Operational Challenges (Logistics, Staffing, Legal).
      3. Suggest 3 specific tools or no-code platforms to lower this difficulty score in the MVP phase.
      
      Format as a structured Markdown report.`;
      break;

    case 'goToMarket':
      prompt = `Create a "Go-To-Market (GTM) Strategy" for: "${idea.title}".
      
      GTM Score: ${idea.businessFit.goToMarket}/10
      Community Signals: ${JSON.stringify(idea.communitySignals)}
      
      Task:
      1. Identify the path of least resistance for acquiring the first 100 customers.
      2. Suggest a "Trojan Horse" marketing strategy (offering value upfront).
      3. List 3 specific content marketing angles/hooks based on the trend "${idea.trendKeyword}".
      
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
    Create a comprehensive Investment Memo and Deep Dive Report for the startup idea: "${idea.title}".

    Context:
    ${idea.description}
    
    Trend Data: ${idea.trendKeyword}
    KPIs: ${JSON.stringify(idea.kpi)}
    Value Ladder: ${JSON.stringify(idea.sections.offer)}
    
    Your report should be detailed, professional, and formatted in Markdown.
    Include the following sections:
    1. **Executive Summary**: High-level thesis.
    2. **Market Analysis**: Trends, why now, market size estimation.
    3. **Competitive Landscape**: Who are the incumbents and what is the gap?
    4. **Product Strategy & Value Ladder**: detailed breakdown.
    5. **Go-To-Market Strategy**: Detailed acquisition channels.
    6. **Risk Factors & Mitigation**: Honest assessment.
    7. **Financial Outlook**: Revenue models and projections.
    8. **Conclusion**: Final verdict.
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

/**
 * Creates a Chat session for the Whiteboard that is context-aware of all nodes.
 */
export const createWhiteboardChatSession = (nodes: WhiteboardNode[]): Chat => {
  const modelId = 'gemini-2.5-flash';

  const systemInstruction = `
    You are an advanced AI Creative Assistant integrated into a Whiteboard environment.
    The user has placed several items (Context Nodes) on the board, including text, images, audio recordings, videos, or links (including TikTok/Instagram).

    Your goal is to assist with Creative Workflows such as:
    1. **Viral Content Creation**: Writing scripts for TikTok/Reels based on the user's notes or video inputs.
    2. **Content Repurposing**: Summarizing long Youtube videos or PDF documents into blog posts or tweets.
    3. **Brainstorming**: Connecting ideas between different nodes to find new angles.
    4. **Analysis**: Answering questions about the uploaded images or audio.

    Always reference the specific nodes you are using in your answer (e.g., "Based on the audio clip 'Voice Memo 1'...").
    Be creative, practical, and concise. If the user asks to write a script, use a proper script format.
  `;
  
  return ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.8, // Slightly higher for creativity
    }
  });
};

/**
 * Helper to convert whiteboard nodes into parts for a prompt.
 */
export const convertNodesToParts = (nodes: WhiteboardNode[]): Part[] => {
    const parts: Part[] = [];
    
    // Add a text summary of what is on the board first
    const manifest = nodes.map((n, i) => `Node ${i+1} [${n.type}]: ${n.title || 'Untitled'}`).join('\n');
    parts.push({ text: `Current Whiteboard Context (Manifest):\n${manifest}\n\nContent Details:` });

    for (const node of nodes) {
        if (node.type === 'text' || node.type === 'link' || node.type === 'youtube') {
            parts.push({ text: `\n--- Start Node (${node.type}): ${node.title} ---\n${node.content}\n--- End Node ---\n` });
        } else if (node.type === 'image' || node.type === 'video' || node.type === 'audio' || node.type === 'pdf') {
            if (node.content && node.mimeType) {
                parts.push({ text: `\n--- Start Node (${node.type}): ${node.title} ---` });
                parts.push({ inlineData: { mimeType: node.mimeType, data: node.content } });
                parts.push({ text: `--- End Node ---\n` });
            }
        }
    }
    return parts;
};
