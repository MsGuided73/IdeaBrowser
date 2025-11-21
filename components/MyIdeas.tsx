import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, PlusCircle, Sparkles, X, Loader2, Image as ImageIcon, Video, Paperclip } from 'lucide-react';
import { BusinessIdea } from '../types';
import { TrendChart } from './TrendChart';
import { MOCK_DRAFTS } from '../constants';
import { analyzeUserIdea } from '../services/geminiService';

interface MyIdeasProps {
  onNavigateHome: () => void;
  onSelectIdea: (idea: BusinessIdea) => void;
  ideas: BusinessIdea[];
  onAddIdea: (idea: BusinessIdea) => void;
}

export const MyIdeas: React.FC<MyIdeasProps> = ({ onNavigateHome, onSelectIdea, ideas, onAddIdea }) => {
  const [view, setView] = useState<'list' | 'new'>('list');
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{file: File, preview: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToGenerativePart = async (file: File): Promise<{data: string, mimeType: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data url prefix
            const base64Data = base64String.split(',')[1];
            resolve({
                data: base64Data,
                mimeType: file.type
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      setSelectedFile({ file, preview });
    }
  };

  const handleAnalyze = async () => {
     if (!input.trim() && !selectedFile) return;
     
     setIsAnalyzing(true);
     try {
        let mediaPart;
        if (selectedFile) {
            mediaPart = await fileToGenerativePart(selectedFile.file);
        }
        const idea = await analyzeUserIdea(input, mediaPart);
        onAddIdea(idea);
        setView('list');
        setInput('');
        setSelectedFile(null);
     } catch (e) {
        console.error(e);
        alert("Failed to analyze idea. Please check your API key or try again.");
     } finally {
        setIsAnalyzing(false);
     }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  if (view === 'new') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 relative">
          <button 
            onClick={() => setView('list')} 
            className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 transition-colors"
          >
              <ArrowLeft size={24} />
          </button>

          <div className="text-center mb-8 animate-fade-in">
             <h1 className="text-4xl font-serif text-slate-800 mb-3">Describe Your Idea</h1>
             <p className="text-slate-500 text-sm max-w-md mx-auto">
                Type your idea or upload a photo/video of a problem you see. Gemini will analyze it.
             </p>
          </div>

          <div className="w-full max-w-2xl relative animate-slide-up">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-200 to-yellow-200 rounded-2xl blur opacity-30 pointer-events-none"></div>
             <div className="relative bg-slate-100 rounded-2xl border border-slate-200 shadow-sm p-2">
                 <div className="relative">
                    <textarea 
                        className="w-full h-48 bg-slate-100 rounded-xl p-4 pr-12 text-slate-700 placeholder-slate-400 resize-none focus:outline-none text-lg disabled:opacity-50"
                        placeholder="Describe the problem or idea..."
                        autoFocus
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isAnalyzing}
                    />
                    
                    {/* File Preview */}
                    {selectedFile && (
                        <div className="absolute bottom-4 left-4 bg-white p-1 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
                            <div className="w-10 h-10 bg-slate-100 rounded overflow-hidden relative">
                                {selectedFile.file.type.startsWith('image') ? (
                                    <img src={selectedFile.preview} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Video size={16} className="text-slate-400"/></div>
                                )}
                            </div>
                            <div className="text-xs">
                                <p className="text-slate-700 font-medium max-w-[100px] truncate">{selectedFile.file.name}</p>
                                <p className="text-slate-400 text-[10px]">Ready to analyze</p>
                            </div>
                            <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400"><X size={12}/></button>
                        </div>
                    )}

                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                         {/* File Input Trigger */}
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzing}
                            className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Upload Image or Video"
                        >
                            <Paperclip size={16} />
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*,video/*" 
                            onChange={handleFileSelect}
                        />

                        <button 
                            onClick={handleAnalyze}
                            disabled={(!input.trim() && !selectedFile) || isAnalyzing}
                            className={`p-2 bg-blue-600 rounded-full shadow-sm text-white transition-colors ${
                                (!input.trim() && !selectedFile) || isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 cursor-pointer'
                            }`}
                        >
                            {isAnalyzing ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <ArrowRight size={16} />
                            )}
                        </button>
                    </div>
                 </div>
                 
                 <div className="mt-2 px-4 pb-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
                     <Sparkles size={12} className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 fill-current" /> 
                     <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                         {isAnalyzing ? 'Gemini is analyzing...' : 'Powered by Gemini 3 Pro Preview'}
                     </span>
                 </div>
             </div>
          </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
       <div className="flex items-center justify-between mb-12">
           <div className="flex items-center gap-4">
               <button onClick={onNavigateHome} className="text-slate-400 hover:text-slate-600 transition-colors">
                   <ArrowLeft size={20} />
               </button>
               <div>
                   <h1 className="text-4xl font-serif text-slate-900">My Ideas</h1>
                   <p className="text-slate-500 text-sm mt-1">Manage and track your business ideas</p>
               </div>
           </div>
           <button 
              onClick={() => setView('new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
            >
               <PlusCircle size={16} /> New Idea
           </button>
       </div>

       {/* Researched Ideas Section */}
       <div className="mb-16">
           <h2 className="text-xl font-serif text-slate-800 mb-6">Researched Ideas</h2>
           
           <div className="space-y-6">
           {ideas.map((idea) => (
             <div key={idea.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 max-w-4xl">
                <div className="flex flex-col lg:flex-row gap-8">
                   <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-bold text-slate-800">{idea.title}</h3>
                             <div className="flex gap-2">
                                 <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded-sm">Perfect Timing</span>
                                 <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-sm">10x Better</span>
                             </div>
                        </div>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-2xl font-bold text-slate-900">33.1K</span>
                            <span className="text-red-500 text-xs font-bold">-6%</span>
                        </div>

                        <div className="h-32 w-full mb-6 -ml-2">
                             <TrendChart data={idea.trendData} showHeader={false} height={120} />
                        </div>
                   </div>

                   <div className="w-px bg-slate-100 hidden lg:block"></div>

                   <div className="lg:w-72 flex-shrink-0">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-500 font-medium mb-1">Opportunity <span className="text-slate-300">ⓘ</span></div>
                                <div className="text-lg font-bold text-green-600">{idea.kpi.opportunity.score} <span className="text-[10px] font-normal text-slate-400">/ 10</span></div>
                                <div className="text-[10px] text-slate-400">{idea.kpi.opportunity.label}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-500 font-medium mb-1">Problem <span className="text-slate-300">ⓘ</span></div>
                                <div className="text-lg font-bold text-red-500">{idea.kpi.problem.score} <span className="text-[10px] font-normal text-slate-400">/ 10</span></div>
                                <div className="text-[10px] text-slate-400">{idea.kpi.problem.label}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-500 font-medium mb-1">Feasibility <span className="text-slate-300">ⓘ</span></div>
                                <div className="text-lg font-bold text-blue-600">{idea.kpi.feasibility.score} <span className="text-[10px] font-normal text-slate-400">/ 10</span></div>
                                <div className="text-[10px] text-slate-400">{idea.kpi.feasibility.label}</div>
                            </div>
                             <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-[10px] text-slate-500 font-medium mb-1">Why Now <span className="text-slate-300">ⓘ</span></div>
                                <div className="text-lg font-bold text-amber-500">{idea.kpi.whyNow.score} <span className="text-[10px] font-normal text-slate-400">/ 10</span></div>
                                <div className="text-[10px] text-slate-400">{idea.kpi.whyNow.label}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Business Fit</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Revenue Potential</span>
                                <span className="text-blue-600 font-bold">{idea.businessFit.revenuePotential}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Execution Difficulty</span>
                                <span className="text-blue-600 font-bold">{idea.businessFit.executionDifficulty}/10</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Go-To-Market</span>
                                <span className="text-blue-600 font-bold">{idea.businessFit.goToMarket}/10</span>
                            </div>
                        </div>
                   </div>
               </div>

               <div className="mt-6 pt-6 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm mb-2">{idea.title}</h4>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{idea.description}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{idea.date}</span>
                        <button 
                           onClick={() => onSelectIdea(idea)}
                           className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            View Research <ArrowRight size={14} />
                        </button>
                    </div>
               </div>
           </div>
           ))}
           </div>
       </div>

       {/* Other Ideas Section */}
       <div>
           <h2 className="text-xl font-serif text-slate-800 mb-6">Other Ideas</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {MOCK_DRAFTS.map((draft) => (
                   <div key={draft.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5">
                       <div className="flex items-start gap-4 mb-4">
                           <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-blue-500">
                               <Sparkles size={18} />
                           </div>
                           <div className="flex-1">
                               <h3 className="text-sm font-bold text-slate-800 leading-tight mb-2">{draft.title}</h3>
                               <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                                   draft.status === 'Research queued' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                               }`}>
                                   {draft.status}
                               </span>
                           </div>
                       </div>
                       <div className="text-xs text-slate-400">{draft.createdAt}</div>
                   </div>
               ))}
           </div>
       </div>
    </div>
  );
};