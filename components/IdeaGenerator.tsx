
import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, Zap, Search, Globe } from 'lucide-react';
import { generateBusinessIdea, analyzeUserIdea } from '../services/geminiService';
import { BusinessIdea } from '../types';

interface IdeaGeneratorProps {
  onIdeaGenerated: (idea: BusinessIdea) => void;
}

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ onIdeaGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<'trend' | 'topic' | null>(null);
  const [topicInput, setTopicInput] = useState('');

  const handleTrendGenerate = async () => {
    setLoading(true);
    setLoadingStatus("Initializing Advanced Trend Analysis Module...");
    setMode('trend');
    try {
      const idea = await generateBusinessIdea((status) => setLoadingStatus(status));
      onIdeaGenerated(idea);
    } catch (e) {
      console.error(e);
      alert("Something went wrong generating the idea. Please try again.");
      setLoading(false);
      setLoadingStatus(null);
      setMode(null);
    }
  };

  const handleTopicGenerate = async () => {
    if (!topicInput.trim()) return;
    setLoading(true);
    setMode('topic');
    try {
      const idea = await analyzeUserIdea(topicInput);
      onIdeaGenerated(idea);
    } catch (e) {
      console.error(e);
      alert("Something went wrong analyzing your topic. Please try again.");
      setLoading(false);
      setMode(null);
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
             <div className="relative mb-8">
                 <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                 <div className="relative bg-white p-4 rounded-full shadow-xl border border-blue-50">
                    <Loader2 size={48} className="text-blue-600 animate-spin" />
                 </div>
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">
                 {mode === 'trend' ? (loadingStatus || 'Scanning Global Market Trends...') : 'Analyzing Your Concept...'}
             </h2>
             <p className="text-slate-500 max-w-md animate-pulse">
                 Our AI agents are searching live sources, identifying gaps, and validating opportunities.
             </p>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
                The Idea Generator
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Generate a fully researched, validated business concept in seconds. 
                Choose your path below.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Option 1: Trend Based */}
            <button 
                onClick={handleTrendGenerate}
                className="group relative bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all text-left flex flex-col items-start overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-3 bg-blue-50 rounded-bl-2xl">
                    <Globe size={24} className="text-blue-600" />
                </div>
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Sparkles size={28} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Surprise Me</h3>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Let AI find a breakout trend from the last 24h and build a business around it.
                </p>
                <div className="mt-auto flex items-center gap-2 text-blue-600 font-bold group-hover:gap-4 transition-all">
                    Generate from Trends <ArrowRight size={20} />
                </div>
            </button>

            {/* Option 2: Topic Based */}
            <div className="relative bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-purple-500 shadow-sm hover:shadow-xl transition-all flex flex-col items-start group">
                <div className="absolute top-0 right-0 p-3 bg-purple-50 rounded-bl-2xl">
                    <Search size={24} className="text-purple-600" />
                </div>
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap size={28} className="text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Targeted Generator</h3>
                <p className="text-slate-500 mb-6 leading-relaxed">
                    Have a niche or industry in mind? We'll find the best opportunity within it.
                </p>
                <div className="w-full mt-auto">
                    <input 
                        type="text"
                        placeholder="e.g. Sustainable Fashion, Pet Tech..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTopicGenerate()}
                    />
                    <button 
                        onClick={handleTopicGenerate}
                        disabled={!topicInput.trim()}
                        className="w-full bg-purple-600 text-white rounded-xl py-3 font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        Validate Topic <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
