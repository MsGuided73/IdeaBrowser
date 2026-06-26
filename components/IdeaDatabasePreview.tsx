import React from 'react';
import { Sparkles, TrendingUp, Search, Lock, Database } from 'lucide-react';

const FEATURED_DB_IDEAS = [
    { title: "B2B SaaS for Local Plumbers", metric: "34K Vol", tag: "High Margin", color: "text-blue-600", bg: "bg-blue-50" },
    { title: "AI-Powered Course Creator", metric: "112K Vol", tag: "Trending", color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Local Service Arbitrage", metric: "Low Comp", tag: "Cash Flow", color: "text-green-600", bg: "bg-green-50" },
    { title: "Niche Job Board / Talent Network", metric: "12K Vol", tag: "Community", color: "text-amber-600", bg: "bg-amber-50" }
];

interface IdeaDatabasePreviewProps {
    onBrowseMore: () => void;
    onSelectIdea?: (title: string) => void;
}

export const IdeaDatabasePreview: React.FC<IdeaDatabasePreviewProps> = ({ onBrowseMore, onSelectIdea }) => {
    return (
        <section className="py-20 bg-slate-50/50 border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                             <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                 <Database size={24} />
                             </div>
                             <h2 className="text-3xl sm:text-4xl font-serif text-slate-900">The Idea Database</h2>
                        </div>
                        <p className="text-slate-500 max-w-2xl text-lg">Dive into complete financial models, marketing plans, and market gaps for 700+ validated business opportunities.</p>
                    </div>
                    
                    <div className="mt-6 md:mt-0 relative max-w-sm w-full">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search industries or keywords..." 
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
                            readOnly
                            onClick={() => alert("Search is available in the full database.")}
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative">
                    {FEATURED_DB_IDEAS.map((idea, i) => (
                        <div 
                            key={i} 
                            onClick={() => onSelectIdea && onSelectIdea(idea.title)}
                            className="h-56 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 duration-300"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-xl ${idea.bg} ${idea.color}`}>
                                    <Sparkles size={18} />
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${idea.bg} ${idea.color}`}>
                                    {idea.tag}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg leading-snug mb-auto">{idea.title}</h3>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                    <TrendingUp size={14} className="text-green-500" />
                                    <span className="font-bold text-slate-700">{idea.metric}</span>
                                </div>
                                <span className="text-blue-600 text-xs font-bold hover:underline">View Memo &rarr;</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="text-center mt-12">
                    <button onClick={onBrowseMore} className="bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 px-8 py-3 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all">
                        Browse all 700+ ideas
                    </button>
                </div>
            </div>
        </section>
    );
};
