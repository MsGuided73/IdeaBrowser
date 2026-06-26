import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MarketTrend } from "../types";

const initGenAI = () => {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return null;
};
  
const CACHE_KEY = "daily_business_trends_cache";

export const getDailyTrends = async (forceRefresh = false): Promise<MarketTrend[]> => {
    if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const today = new Date().toDateString();
                if (parsed.date === today && parsed.trends?.length > 0) {
                    return parsed.trends;
                }
            } catch (e) {
                console.error("Cache parsing error", e);
            }
        }
    }

    const ai = initGenAI();
    if (!ai) throw new Error("Gemini API key is required to fetch trends");

    const prompt = `
      Act as an advanced trend analysis module.
      Search the web, news, and social media for emerging business opportunities, breakout consumer trends, or rising market problems in the last 24-72 hours.
      Synthesize exactly 4 distinct emerging opportunities.
      For each trend, provide:
      1. title: A catchy short title for the trend.
      2. volume: An estimate of search/social volume (e.g., "120K Vol", "Rising Activity").
      3. growth: An estimate of recent growth (e.g., "+450%").
      4. description: A 2-3 sentence description of the trend, the problem, and why it's a good business opportunity.
      5. data: Generate an array of 6 data points simulating an upward or hockey-stick trend line over the past 6 months to visualize the growth pattern. Each point should have a 'date' (like "Jan", "Feb", etc.) and a 'value' (number).

      Output MUST be valid JSON adhering exactly to this structure:
      {
        "trends": [
          {
             "title": "String",
             "volume": "String",
             "growth": "String",
             "description": "String",
             "data": [{ "date": "String", "value": Number }]
          }
        ]
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.7,
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");

        const data = JSON.parse(text);
        
        if (data.trends && data.trends.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                date: new Date().toDateString(),
                trends: data.trends
            }));
            return data.trends;
        } else {
             throw new Error("Invalid response format from AI");
        }
    } catch (e) {
        console.error("Error fetching daily trends", e);
        throw e;
    }
};
