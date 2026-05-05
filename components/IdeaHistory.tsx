import React from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Clock, Trash2 } from 'lucide-react';
import { BusinessIdea } from '../types';

interface IdeaHistoryProps {
  onNavigateHome: () => void;
  onSelectIdea: (idea: BusinessIdea) => void;
  history: BusinessIdea[];
  onClearHistory: () => void;
}

export const IdeaHistory: React.FC<IdeaHistoryProps> = ({ onNavigateHome, onSelectIdea, history, onClearHistory }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
       <div className="flex items-center justify-between mb-12">
           <div className="flex items-center gap-4">
               <button onClick={onNavigateHome} className="text-slate-400 hover:text-slate-600 transition-colors">
                   <ArrowLeft size={20} />
               </button>
               <div>
                   <h1 className="text-4xl font-serif text-slate-900 flex items-center gap-3">
                       <Clock size={32} className="text-blue-500" />
                       Generation History
                   </h1>
                   <p className="text-slate-500 text-sm mt-1">Every idea you've generated, in chronological order.</p>
               </div>
           </div>
           {history.length > 0 && (
               <button 
                  onClick={() => {
                      if(window.confirm('Are you sure you want to clear your entire generation history?')) {
                          onClearHistory();
                      }
                  }}
                  className="text-slate-400 hover:text-red-500 text-sm font-medium flex items-center gap-2 transition-colors"
               >
                   <Trash2 size={16} /> Clear History
               </button>
           )}
       </div>

       {history.length === 0 ? (
           <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
               <Sparkles size={48} className="mx-auto text-slate-300 mb-4" />
               <h3 className="text-xl font-bold text-slate-700 mb-2">No history yet</h3>
               <p className="text-slate-500 max-w-md mx-auto">
                   Ideas you generate using the "Generate Tomorrow's Idea" button will automatically appear here.
               </p>
           </div>
       ) : (
           <div className="space-y-4">
               {history.map((idea, index) => (
                   <div key={`${idea.id}-${index}`} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                       <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 mb-1">
                               <h3 className="text-lg font-bold text-slate-900 truncate">{idea.title}</h3>
                               <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-sm whitespace-nowrap">
                                   {idea.date || new Date().toLocaleDateString()}
                               </span>
                           </div>
                           <p className="text-sm text-slate-500 line-clamp-2">{idea.description}</p>
                           <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                               <span className="flex items-center gap-1">
                                   <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                   Opportunity: {idea.kpi?.opportunity?.score || 'N/A'}/10
                               </span>
                               <span className="flex items-center gap-1">
                                   <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                   Trend: {idea.trendKeyword}
                               </span>
                           </div>
                       </div>
                       <button 
                           onClick={() => onSelectIdea(idea)}
                           className="flex-shrink-0 bg-slate-50 hover:bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-slate-100 hover:border-blue-100"
                       >
                           View Report <ArrowRight size={16} />
                       </button>
                   </div>
               ))}
           </div>
       )}
    </div>
  );
};
