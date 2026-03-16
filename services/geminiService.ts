
// Fix: Use the correct imports and follow SDK guidelines for model selection and initialization.
import { GoogleGenAI, Chat, Part, FunctionDeclaration, Type, Schema, GenerateContentResponse } from '@google/genai';
import { BusinessIdea } from '../types';

// Fix: Always use process.env.API_KEY directly in the initialization.
// Recommendation: Avoid global instances if multiple keys might be used, but for basic usage this is standard.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Retry logic helper for 503/Timeout errors
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      // Check for 503 Service Unavailable, 504 Gateway Timeout, or "Deadline expired" message
      const isRetryable = 
        e.status === 503 || 
        e.status === 504 || 
        (e.message && e.message.includes('Deadline expired'));

      if (!isRetryable) {
        throw e;
      }
      
      console.warn(`Gemini API Attempt ${i + 1} failed with transient error. Retrying in ${baseDelay * Math.pow(2, i)}ms...`);
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
    }
  }
  throw lastError;
};

// Define the schema for the Business Idea to ensure structured JSON output
const businessIdeaSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A unique, creative, and catchy startup name (e.g., 'HydroSense', 'VeloCity'). Do NOT use generic names." },
    description: { type: Type.STRING, description: "A detailed 3-4 paragraph description of the business idea." },
    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4-5 relevant tags." },
    trendKeyword: { type: Type.STRING, description: "The main market trend keyword." },
    trendVolume: { type: Type.STRING, description: "Search volume for the trend (e.g., '12.5K')." },
    trendGrowth: { type: Type.STRING, description: "Growth percentage (e.g., '+150%')." },
    relatedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    trendData: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          value: { type: Type.NUMBER }
        }
      }
    },
    kpi: {
      type: Type.OBJECT,
      properties: {
        opportunity: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING } } },
        problem: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING } } },
        feasibility: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING } } },
        whyNow: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, label: { type: Type.STRING } } }
      },
      required: ["opportunity", "problem", "feasibility", "whyNow"]
    },
    businessFit: {
      type: Type.OBJECT,
      properties: {
        revenuePotential: { type: Type.STRING },
        revenuePotentialDescription: { type: Type.STRING },
        executionDifficulty: { type: Type.NUMBER },
        executionDifficultyDescription: { type: Type.STRING },
        goToMarket: { type: Type.NUMBER },
        goToMarketDescription: { type: Type.STRING },
        founderFitDescription: { type: Type.STRING }
      },
      required: ["revenuePotential", "revenuePotentialDescription", "executionDifficulty", "executionDifficultyDescription", "goToMarket", "goToMarketDescription", "founderFitDescription"]
    },
    sections: {
      type: Type.OBJECT,
      properties: {
        offer: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    price: { type: Type.STRING },
                    valueProvided: { type: Type.STRING },
                    goal: { type: Type.STRING }
                },
                required: ["type", "title", "description", "price", "valueProvided", "goal"]
            }
        },
        whyNow: { type: Type.STRING },
        proofAndSignals: { type: Type.STRING },
        marketGap: { type: Type.STRING },
        executionPlan: { type: Type.STRING }
      },
      required: ["offer", "whyNow", "proofAndSignals", "marketGap", "executionPlan"]
    },
    communitySignals: {
        type: Type.OBJECT,
        properties: {
            reddit: { type: Type.STRING },
            facebook: { type: Type.STRING },
            youtube: { type: Type.STRING },
            other: { type: Type.STRING }
        },
        required: ["reddit", "facebook", "youtube", "other"]
    }
  },
  required: ["title", "description", "tags", "trendKeyword", "trendVolume", "trendGrowth", "relatedKeywords", "trendData", "kpi", "businessFit", "sections", "communitySignals"]
};


const parseGeminiResponse = (text: string): Partial<BusinessIdea> => {
  // If responseMimeType is application/json, text should be valid JSON.
  // We still handle code blocks just in case, but usually it's raw JSON.
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
  let parsedIdea: Partial<BusinessIdea> = {};
  
  if (jsonMatch && jsonMatch[1]) {
    try {
      parsedIdea = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("JSON Parse Error (Match):", e);
    }
  } else {
     try {
       parsedIdea = JSON.parse(text);
     } catch (e) {
       console.error("Failed to parse Gemini response raw:", text.substring(0, 100) + "...", e);
     }
  }
  return parsedIdea;
};

const hydrateIdea = (parsedIdea: Partial<BusinessIdea>, sources: any[]): BusinessIdea => {
  const randomTrendBase = Math.floor(Math.random() * 100);
  
  // Robust fallback for deeply nested objects to prevent "N/A"
  const defaultKpi = {
       opportunity: { score: 8, label: 'High' },
       problem: { score: 7, label: 'Moderate' },
       feasibility: { score: 7, label: 'Doable' },
       whyNow: { score: 9, label: 'Now' }
  };
  
  const defaultBusinessFit = {
        revenuePotential: '$$',
        revenuePotentialDescription: 'Moderate revenue potential with standard subscription models.',
        executionDifficulty: 5,
        executionDifficultyDescription: 'Standard development complexity.',
        goToMarket: 5,
        goToMarketDescription: 'Requires standard social media marketing.',
        founderFitDescription: 'Generalist founder with some industry knowledge.'
  };

  const defaultSections = {
        offer: [],
        whyNow: 'Research data unavailable. Try regenerating.',
        proofAndSignals: 'Research data unavailable.',
        marketGap: 'Research data unavailable.',
        executionPlan: 'Research data unavailable.'
  };

  const defaultCommunity = {
        reddit: 'N/A',
        facebook: 'N/A',
        youtube: 'N/A',
        other: 'N/A'
  };

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
    kpi: parsedIdea.kpi ? { ...defaultKpi, ...parsedIdea.kpi } : defaultKpi,
    businessFit: parsedIdea.businessFit ? { ...defaultBusinessFit, ...parsedIdea.businessFit } : defaultBusinessFit,
    sections: parsedIdea.sections ? { ...defaultSections, ...parsedIdea.sections } : defaultSections,
    communitySignals: parsedIdea.communitySignals ? { ...defaultCommunity, ...parsedIdea.communitySignals } : defaultCommunity,
    sources: sources
  };
}

export const analyzeEmergingTrends = async (onProgress?: (status: string) => void): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  
  if (onProgress) onProgress("Scanning global data sources (Trends, News, Social)...");

  const prompt = `
    Act as an advanced trend analysis module.
    Search the web (including news sites, Reddit, and social media discussions) for emerging business opportunities, breakout trends, or rising problems in the last 24-48 hours.
    Pull data from multiple perspectives:
    1. Search Trends (What are people suddenly searching for?)
    2. Social Media & Forums (What is trending on Reddit/Twitter/LinkedIn?)
    3. News APIs/Sources (What are the latest tech/business news catalysts?)

    Synthesize a comprehensive "Trend Intelligence Report" detailing 3 distinct emerging opportunities. Include data points, search volume estimates, and the core problem for each.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    }));
    return response.text || "No trends found.";
  } catch (error) {
    console.error("Trend Analysis Error:", error);
    throw error;
  }
};

export const generateBusinessIdea = async (onProgress?: (status: string) => void): Promise<BusinessIdea> => {
  const modelId = 'gemini-3-flash-preview';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Step 1: Advanced Trend Analysis
  const trendReport = await analyzeEmergingTrends(onProgress);

  if (onProgress) onProgress("Synthesizing data-driven business idea...");

  const prompt = `
    Act as a world-class venture capitalist and trend analyst. Today is ${today}.
    
    Here is the latest Trend Intelligence Report pulled from multiple sources (Search, Social, News):
    ${trendReport}
    
    1. Select the most promising breakout business trend or rising problem from the report above.
    2. Synthesize a complete, robust business idea ("The Idea of Tomorrow") that solves this problem.
    3. **CRITICAL:** Create a UNIQUE, CREATIVE, and CATCHY one-word or two-word brand name for this startup. Do not use generic descriptive names.
    4. Conduct a keyword analysis for related search terms.
    5. Provide community validation signals based on the report.
    
    Output MUST be valid JSON adhering to the provided schema.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: businessIdeaSchema,
        temperature: 0.8, 
      },
    }));

    const parsedIdea = parseGeminiResponse(response.text || '');
    
    // Extract sources
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ title: c.web!.title!, uri: c.web!.uri! })) || [];

    return hydrateIdea(parsedIdea, sources);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeUserIdea = async (userDescription: string, media?: { data: string, mimeType: string }): Promise<BusinessIdea> => {
  const modelId = 'gemini-3-flash-preview';

  const prompt = `
    Act as a VC expert. Analyze the following idea concept: "${userDescription}"
    ${media ? 'Also analyze the provided media for additional context.' : ''}

    1. Search for real-time market data to validate this idea.
    2. **CRITICAL:** Create a UNIQUE, CREATIVE, and CATCHY name for this startup if one isn't provided.
    3. Provide a robust, detailed analysis including a 5-step Value Ladder.
    
    Output MUST be valid JSON adhering to the provided schema.
  `;

  const parts: Part[] = [{ text: prompt }];
  if (media) {
      parts.unshift({ inlineData: { data: media.data, mimeType: media.mimeType }});
  }

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: businessIdeaSchema,
        temperature: 0.7,
      },
    }));

    const parsedIdea = parseGeminiResponse(response.text || '');
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ title: c.web!.title!, uri: c.web!.uri! })) || [];

    return hydrateIdea(parsedIdea, sources);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const createIdeaChatSession = (idea: BusinessIdea): Chat => {
  const modelId = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are an expert Business Consultant. You are discussing "${idea.title}".
    Context: ${JSON.stringify(idea, null, 2)}
    Focus on human-centric design and cognitive load reduction in your advice.
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

export const forkIdea = async (originalIdea: BusinessIdea, chatHistory: {role: string, text: string}[]): Promise<BusinessIdea> => {
  const modelId = 'gemini-3-flash-preview';

  const historyText = chatHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n\n');

  const prompt = `
    Act as a world-class venture capitalist and trend analyst. 
    The user has been discussing a business idea called "${originalIdea.title}" and wants to pivot or "fork" this idea into a specific niche based on the following conversation:
    
    ORIGINAL IDEA:
    ${originalIdea.description}
    
    CONVERSATION HISTORY:
    ${historyText}
    
    Based on the conversation, generate a NEW, distinct business idea that focuses on the niche or pivot discussed. 
    1. Create a UNIQUE, CREATIVE, and CATCHY brand name for this new niche startup.
    2. Provide a complete analysis for this new niche idea.
    
    Output MUST be valid JSON adhering to the provided schema.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: businessIdeaSchema,
        temperature: 0.8, 
      },
    }));

    const parsedIdea = parseGeminiResponse(response.text || '');
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ title: c.web!.title!, uri: c.web!.uri! })) || [];

    return hydrateIdea(parsedIdea, sources);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateArtifact = async (idea: BusinessIdea, type: string): Promise<string> => {
  const modelId = 'gemini-3-flash-preview';
  let prompt = `Generate a robust ${type} for the business idea "${idea.title}".
  
Business Description:
${idea.description}

Target Audience / Tags: ${idea.tags.join(', ')}

Focus on high-quality, actionable advice that is specifically tailored to this exact business concept. Do not make generic assumptions.`;

  if (type === 'coding-prompts') {
    prompt += `\n\nSpecifically, create a comprehensive "Master System Prompt" and coding agent prompts (for tools like Cursor, Windsurf, or Bolt) that a developer can use to build this exact application. Include architecture, tech stack recommendations, and step-by-step implementation prompts.`;
  }

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: modelId,
        contents: prompt,
    }));
    return response.text || "Analysis failed.";
  } catch (e) {
    console.error("Artifact generation error", e);
    return "Sorry, I couldn't generate that right now.";
  }
};

export const generateSectionDeepDive = async (idea: BusinessIdea, section: string): Promise<string> => {
  const modelId = 'gemini-3-flash-preview';
  const prompt = `Provide a detailed deep dive analysis for the "${section}" of the business idea "${idea.title}".
  
Business Description:
${idea.description}

Use Google Search for the latest signals to validate and expand upon this specific business concept.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    }));
    return response.text || "Analysis failed.";
  } catch (e) {
    console.error("Deep dive generation error", e);
    return "Sorry, I couldn't generate that analysis right now.";
  }
};

export const generateFullAnalysis = async (idea: BusinessIdea): Promise<string> => {
  const modelId = 'gemini-3-flash-preview';
  const prompt = `Create a comprehensive Investment Memo and Deep Dive Report for the business idea: "${idea.title}".
  
Business Description:
${idea.description}

Use search for validation and provide specific, relevant insights for this exact concept.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    }));
    return response.text || "Analysis failed.";
  } catch (e) {
    console.error("Full analysis generation error", e);
    return "Sorry, I couldn't generate the full analysis right now.";
  }
};

export const createWhiteboardChatSession = (nodes: any[]): Chat => {
  const modelId = 'gemini-3-flash-preview';

  const systemInstruction = `
    You are an AI Creative Partner on a digital whiteboard.
    Current context: ${nodes.length} nodes on board.
    Help the user brainstorm, organize, and connect ideas.
  `;
  
  const tools: FunctionDeclaration[] = [
    {
      name: 'create_notes',
      description: 'Create new sticky notes',
      parameters: {
        type: Type.OBJECT,
        properties: {
          notes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                color: { type: Type.STRING }
              },
              required: ['content']
            }
          }
        },
        required: ['notes']
      }
    },
    {
      name: 'organize_layout',
      description: 'Re-arrange node positions',
      parameters: {
        type: Type.OBJECT,
        properties: {
          moves: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER }
              },
              required: ['id', 'x', 'y']
            }
          }
        },
        required: ['moves']
      }
    },
    {
        name: 'connect_nodes',
        description: 'Connect two nodes with a line',
        parameters: {
            type: Type.OBJECT,
            properties: {
                connections: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            fromId: { type: Type.STRING },
                            toId: { type: Type.STRING }
                        },
                        required: ['fromId', 'toId']
                    }
                }
            },
            required: ['connections']
        }
    },
    {
        name: 'delete_nodes',
        description: 'Delete nodes from the board',
        parameters: {
            type: Type.OBJECT,
            properties: {
                nodeIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ['nodeIds']
        }
    },
    {
        name: 'group_nodes',
        description: 'Group multiple nodes together',
        parameters: {
            type: Type.OBJECT,
            properties: {
                nodeIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ['nodeIds']
        }
    },
    {
        name: 'ungroup_nodes',
        description: 'Ungroup nodes',
        parameters: {
            type: Type.OBJECT,
            properties: {
                nodeIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ['nodeIds']
        }
    }
  ];

  return ai.chats.create({
    model: modelId,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: tools }]
    }
  });
};
