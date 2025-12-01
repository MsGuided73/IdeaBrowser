import React, { useState } from 'react';
import { Sparkles, Lightbulb, Target, Loader2, X, Zap } from 'lucide-react';
import { analyzeUserIdea, generateBusinessIdea } from '../../services/geminiService';
import { BusinessIdea } from '../../types';

interface IdeaGeneratorProps {
  onIdeaGenerated: (idea: BusinessIdea) => void;
  onClose?: () => void;
}

type GenerationMode = 'random' | 'custom';

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ onIdeaGenerated, onClose }) => {
  const [mode, setMode] = useState<GenerationMode>('random');
  const [userDescription, setUserDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateRandom = async () => {
    if (!process.env.API_KEY) {
      alert("Please set your Gemini API Key in the environment variables to use this feature.");
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const newIdea = await generateBusinessIdea();
      onIdeaGenerated(newIdea);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate idea. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCustom = async () => {
    if (!userDescription.trim()) {
      setError('Please describe your idea first.');
      return;
    }

    if (!process.env.API_KEY) {
      alert("Please set your Gemini API Key in the environment variables to use this feature.");
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const analyzedIdea = await analyzeUserIdea(userDescription.trim());
      onIdeaGenerated(analyzedIdea);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to analyze your idea. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Generate Business Ideas</h2>
              <p className="text-slate-600">Choose how you'd like to generate your next big idea</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setMode('random')}
              className={`p-4 rounded-xl border-2 transition-all ${
                mode === 'random'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  mode === 'random' ? 'bg-blue-600' : 'bg-slate-400'
                }`}>
                  <Sparkles size={16} className="text-white" />
                </div>
                <h3 className="font-semibold text-slate-900">Discover New Ideas</h3>
              </div>
              <p className="text-sm text-slate-600 text-left">
                Let AI find the next breakout trend and generate a complete business idea from scratch.
              </p>
            </button>

            <button
              onClick={() => setMode('custom')}
              className={`p-4 rounded-xl border-2 transition-all ${
                mode === 'custom'
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  mode === 'custom' ? 'bg-green-600' : 'bg-slate-400'
                }`}>
                  <Lightbulb size={16} className="text-white" />
                </div>
                <h3 className="font-semibold text-slate-900">Analyze My Idea</h3>
              </div>
              <p className="text-sm text-slate-600 text-left">
                Describe your business concept and get a comprehensive analysis with market research.
              </p>
            </button>
          </div>

          {/* Custom Idea Input */}
          {mode === 'custom' && (
            <div className="mb-6">
              <label htmlFor="idea-description" className="block text-sm font-medium text-slate-700 mb-3">
                Describe Your Business Idea
              </label>
              <textarea
                id="idea-description"
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder="Tell me about your business idea... What problem does it solve? Who is your target customer? What's your unique approach?"
                className="w-full h-32 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-slate-500 mt-2">
                The more detail you provide, the better the analysis will be. Include the problem, solution, and target market.
              </p>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={mode === 'random' ? handleGenerateRandom : handleGenerateCustom}
              disabled={isGenerating || (mode === 'custom' && !userDescription.trim())}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  {mode === 'random' ? 'Discovering Trends...' : 'Analyzing Your Idea...'}
                </>
              ) : (
                <>
                  <Zap size={24} />
                  {mode === 'random' ? 'Generate Tomorrow\'s Idea' : 'Analyze My Idea'}
                </>
              )}
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Target size={18} />
              What You'll Get
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <h5 className="font-medium text-slate-900">Complete Market Analysis</h5>
                  <p className="text-sm text-slate-600">Trend data, competitor analysis, and market timing</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h5 className="font-medium text-slate-900">Business Model</h5>
                  <p className="text-sm text-slate-600">Revenue potential, pricing strategy, and go-to-market plan</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <h5 className="font-medium text-slate-900">Value Ladder Strategy</h5>
                  <p className="text-sm text-slate-600">5-step customer journey from free to premium</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div>
                  <h5 className="font-medium text-slate-900">90-Day Execution Plan</h5>
                  <p className="text-sm text-slate-600">Step-by-step roadmap to launch</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
