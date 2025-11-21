import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Zap, TrendingUp, AlertTriangle, Clock, Target, Share2, Bookmark, Hammer, ExternalLink, MessageSquare, Download, Flag, ChevronDown, Send, X, Loader2, Sparkles, Copy, BarChart3, Twitter, Linkedin, Link as LinkIcon, Maximize2 } from 'lucide-react';
import { BusinessIdea } from '../types';
import { TrendChart } from './TrendChart';
import { Chat } from '@google/genai';
import { createIdeaChatSession, generateArtifact, generateSectionDeepDive, generateFullAnalysis } from '../services/geminiService';

interface IdeaDetailProps {
  idea: BusinessIdea;
  loading: boolean;
  onSaveIdea?: (idea: BusinessIdea) => void;
  isSaved?: boolean;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const KPICard = ({ label, score, subLabel, theme }: { label: string; score: number; subLabel: string; theme: 'green' | 'red' | 'blue' | 'orange' }) => {
  
  const themeConfig = {
    green: { bg: 'bg-green-50', text: 'text-slate-800', bar: 'bg-green-500' },
    red: { bg: 'bg-red-50', text: 'text-slate-800', bar: 'bg-red-500' },
    blue: { bg: 'bg-blue-50', text: 'text-slate-800', bar: 'bg-blue-500' },
    orange: { bg: 'bg-orange-50', text: 'text-slate-800', bar: 'bg-orange-500' },
  };

  const t = themeConfig[theme];

  return (
    <div className={`p-5 rounded-xl ${t.bg} flex flex-col justify-between h-full min-h-[120px]`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium text-slate-600">{label} <span className="text-slate-400 text-xs font-normal ml-0.5">ⓘ</span></span>
      </div>
      <div>
        <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-3xl font-medium ${t.text}`}>{score}</span>
            <span className="text-sm text-slate-500 font-normal">{subLabel}</span>
        </div>
        <div className="w-full bg-slate-200/50 h-1 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${score * 10}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export const IdeaDetail: React.FC<IdeaDetailProps> = ({ idea, loading, onSaveIdea, isSaved = false }) => {
  const [showActions, setShowActions] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Content/Artifact Modal State
  const [contentModal, setContentModal] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    loading: boolean;
  }>({ isOpen: false, title: '', content: '', loading: false });

  // Value Ladder Modal State
  const [isValueLadderOpen, setIsValueLadderOpen] = useState(false);
  const [ladderCopied, setLadderCopied] = useState(false);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatOpen]);

  // Click outside handler for share menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenChat = () => {
    setShowActions(false);
    setIsChatOpen(true);
    if (!chatSessionRef.current) {
      chatSessionRef.current = createIdeaChatSession(idea);
      setChatHistory([{
        role: 'model', 
        text: `Hi there! I'm your AI analyst for "${idea.title}". Ask me anything about the market, execution plan, or potential risks.`
      }]);
    }
  };

  const handleDownload = () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(idea, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${idea.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    link.click();
    setShowActions(false);
  };

  const handleGenerateArtifact = async (type: 'founder-fit' | 'ad-creative' | 'brand-package' | 'landing-page', title: string) => {
    setShowActions(false);
    setContentModal({ isOpen: true, title, content: '', loading: true });
    try {
        const content = await generateArtifact(idea, type);
        setContentModal({ isOpen: true, title, content, loading: false });
    } catch (e) {
        setContentModal({ isOpen: true, title, content: 'Error generating content.', loading: false });
    }
  };

  const handleDeepDive = async (section: 'whyNow' | 'proofAndSignals' | 'marketGap' | 'executionPlan' | 'revenuePotential' | 'executionDifficulty' | 'goToMarket', title: string) => {
      setContentModal({ isOpen: true, title, content: '', loading: true });
      try {
          const content = await generateSectionDeepDive(idea, section);
          setContentModal({ isOpen: true, title, content, loading: false });
      } catch (e) {
          setContentModal({ isOpen: true, title, content: 'Error generating analysis.', loading: false });
      }
  };

  const handleFullAnalysis = async () => {
      setContentModal({ isOpen: true, title: `Full Investment Memo: ${idea.title}`, content: '', loading: true });
      try {
          const content = await generateFullAnalysis(idea);
          setContentModal({ isOpen: true, title: `Full Investment Memo: ${idea.title}`, content, loading: false });
      } catch (e) {
          setContentModal({ isOpen: true, title: `Full Investment Memo: ${idea.title}`, content: 'Error generating analysis.', loading: false });
      }
  };

  const handleModalShare = async () => {
     if (navigator.share) {
        try {
            await navigator.share({
                title: `Investment Memo: ${idea.title}`,
                text: contentModal.content,
            });
        } catch (err) {
            console.log('Share canceled');
        }
     } else {
         // Fallback to copy
         navigator.clipboard.writeText(contentModal.content);
         alert("Share not supported on this device. Content copied to clipboard.");
     }
  };

  const handleCopyValueLadder = () => {
    const text = idea.sections.offer.map(o => 
      `[${o.type}] ${o.title} (${o.price})\n${o.description}\nValue: ${o.valueProvided}\nGoal: ${o.goal}`
    ).join('\n\n');
    
    const header = `Value Ladder Strategy for ${idea.title}\n\n`;
    navigator.clipboard.writeText(header + text);
    setLadderCopied(true);
    setTimeout(() => setLadderCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    if (!inputMsg.trim() || !chatSessionRef.current) return;

    const userText = inputMsg;
    setInputMsg('');
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setIsChatLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: userText });
      setChatHistory(prev => [...prev, { role: 'model', text: result.text || "I couldn't generate a response." }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error connecting to the database." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleShare = (platform: 'twitter' | 'linkedin' | 'copy') => {
      const url = window.location.href;
      const text = `Check out this business idea: ${idea.title} - ${idea.description.substring(0, 100)}...`;
      
      if (platform === 'twitter') {
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
      } else if (platform === 'linkedin') {
          // Use a feed share intent as fallback for non-public URLs
          window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
      } else if (platform === 'copy') {
          navigator.clipboard.writeText(`${idea.title}\n${url}`);
          alert("Link copied to clipboard!");
      }
      setShareOpen(false);
  }

  if (loading) {
    return (
        <div className="max-w-5xl mx-auto py-20 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-serif text-slate-800 animate-pulse">Consulting the Oracle...</h2>
            <p className="text-slate-500 mt-2">Analyzing global search trends and synthesizing tomorrow's big idea.</p>
        </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
      {/* Hero Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-serif text-blue-500 mb-4">Idea of the Day</h1>
        <div className="flex items-center justify-center gap-6 text-slate-500 text-sm">
           <button className="hover:text-blue-600 flex items-center gap-1 transition-colors"><ArrowLeft size={14}/> Previous</button>
           <div className="flex items-center gap-2 font-medium">
             <Clock size={14} /> {idea.date}
           </div>
           <button className="hover:text-blue-600 flex items-center gap-1 transition-colors">Next Idea <ArrowRight size={14}/></button>
        </div>
      </div>

      {/* Top Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div className="flex gap-2 items-center relative z-10">
            <div className="relative">
                <button 
                    onClick={() => setShowActions(!showActions)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 flex items-center gap-1 shadow-sm hover:bg-slate-50 transition-all"
                >
                    <Zap size={12} className="text-yellow-500" /> 
                    Idea Actions
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showActions ? 'rotate-180' : ''}`} />
                </button>

                {showActions && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                            <button 
                              onClick={handleOpenChat}
                              className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                            >
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                                    <MessageSquare size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">Get Instant Answers</div>
                                    <div className="text-xs text-slate-500">AI Chat with this idea</div>
                                </div>
                            </button>
                            
                            <button 
                                onClick={handleDownload}
                                className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                            >
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                                    <Download size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">Download Data</div>
                                    <div className="text-xs text-slate-500">Export all research & analysis</div>
                                </div>
                            </button>

                            <button 
                                onClick={() => handleGenerateArtifact('founder-fit', 'Founder Fit Analysis')}
                                className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                            >
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                                    <Target size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">Founder Fit</div>
                                    <div className="text-xs text-slate-500">Is this idea right for you?</div>
                                </div>
                            </button>

                            <button className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors text-left group">
                                <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600 group-hover:bg-yellow-100 transition-colors">
                                    <Flag size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">Claim Idea</div>
                                    <div className="text-xs text-slate-500">Make this idea yours</div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {idea.sources && idea.sources.length > 0 && (
                 <div className="flex -space-x-2 overflow-hidden">
                    {idea.sources.slice(0,3).map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" title={s.title} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 hover:bg-slate-200">
                             <ExternalLink size={10} />
                        </a>
                    ))}
                 </div>
            )}
         </div>
         <div className="flex gap-3">
            <button 
                onClick={() => onSaveIdea && onSaveIdea(idea)}
                disabled={isSaved}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all border ${
                    isSaved 
                    ? 'bg-green-50 text-green-700 border-green-200 cursor-default' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'
                }`}
            >
                {isSaved ? <CheckCircle size={16} /> : <Bookmark size={16} />}
                {isSaved ? 'Saved' : 'Save to My Ideas'}
            </button>

            {/* Share Button */}
            <div className="relative" ref={shareRef}>
                <button 
                    onClick={() => setShareOpen(!shareOpen)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-slate-50 hover:text-slate-900 text-slate-600 transition-all"
                >
                    <Share2 size={16} /> Share
                </button>
                
                {shareOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg text-left">
                            <LinkIcon size={14} className="text-slate-400"/> Copy Link
                        </button>
                        <button onClick={() => handleShare('twitter')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg text-left">
                            <Twitter size={14} className="text-blue-400"/> Twitter
                        </button>
                        <button onClick={() => handleShare('linkedin')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg text-left">
                            <Linkedin size={14} className="text-blue-700"/> LinkedIn
                        </button>
                    </div>
                )}
            </div>

            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg shadow-purple-200 transition-all">
                <Hammer size={16} /> Build This Idea
            </button>
         </div>
      </div>

      {/* Idea Title & Desc */}
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-medium text-slate-900 mb-4">{idea.title}</h2>
        <div className="flex flex-wrap gap-2 mb-6">
            {idea.tags.map((tag, i) => (
                <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 
                    ${i === 0 ? 'bg-green-100 text-green-700' : 
                      i === 1 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-600'}`}>
                    {i === 0 && <CheckCircle size={12} />}
                    {i === 1 && <Clock size={12} />}
                    {tag}
                </span>
            ))}
        </div>
        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
             {idea.description.split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
        </div>
      </div>

      {/* Charts & KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
         <div className="lg:col-span-8">
            <TrendChart 
              data={idea.trendData} 
              keyword={idea.trendKeyword} 
              relatedKeywords={idea.relatedKeywords}
            />
         </div>
         <div className="lg:col-span-4 flex flex-col gap-6">
             <div className="grid grid-cols-2 gap-4">
                 <KPICard label="Opportunity" score={idea.kpi.opportunity.score} subLabel={idea.kpi.opportunity.label} theme="green" />
                 <KPICard label="Problem" score={idea.kpi.problem.score} subLabel={idea.kpi.problem.label} theme="red" />
                 <KPICard label="Feasibility" score={idea.kpi.feasibility.score} subLabel={idea.kpi.feasibility.label} theme="blue" />
                 <KPICard label="Why Now" score={idea.kpi.whyNow.score} subLabel={idea.kpi.whyNow.label} theme="orange" />
             </div>
             
             {/* Business Fit Card */}
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-slate-900 text-lg">Business Fit</h3>
                   <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">Click to Analyze</span>
                </div>
                
                <div className="space-y-4">
                    {/* Revenue Potential */}
                    <div 
                        onClick={() => handleDeepDive('revenuePotential', 'Revenue Potential Analysis')}
                        className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-all group relative"
                    >
                         <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600 flex-shrink-0 group-hover:bg-yellow-200 transition-colors"><Target size={18}/></div>
                         <div className="flex-1">
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-sm font-semibold text-slate-800">Revenue Potential</span>
                                 <span className="text-sm font-bold text-blue-600">{idea.businessFit.revenuePotential}</span>
                             </div>
                             <p className="text-xs text-slate-500 leading-tight group-hover:text-slate-700">$1M-$10M ARR potential with current market growth</p>
                         </div>
                         <Maximize2 size={14} className="absolute top-3 right-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Execution Difficulty */}
                    <div 
                        onClick={() => handleDeepDive('executionDifficulty', 'Execution Difficulty Analysis')}
                        className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-all group relative"
                    >
                         <div className="bg-slate-100 p-2 rounded-lg text-slate-500 flex-shrink-0 group-hover:bg-slate-200 transition-colors"><Hammer size={18}/></div>
                         <div className="flex-1">
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-sm font-semibold text-slate-800">Execution Difficulty</span>
                                 <span className="text-sm font-bold text-blue-600">{idea.businessFit.executionDifficulty}/10</span>
                             </div>
                             <p className="text-xs text-slate-500 leading-tight group-hover:text-slate-700">Complex IoT system for agriculture environments</p>
                         </div>
                         <Maximize2 size={14} className="absolute top-3 right-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Go-To-Market */}
                    <div 
                        onClick={() => handleDeepDive('goToMarket', 'Go-To-Market Strategy')}
                        className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-all group relative"
                    >
                         <div className="bg-red-100 p-2 rounded-lg text-red-500 flex-shrink-0 group-hover:bg-red-200 transition-colors"><Zap size={18}/></div>
                         <div className="flex-1">
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-sm font-semibold text-slate-800">Go-To-Market</span>
                                 <span className="text-sm font-bold text-blue-600">{idea.businessFit.goToMarket}/10</span>
                             </div>
                             <p className="text-xs text-slate-500 leading-tight group-hover:text-slate-700">Strong market signals with clear channels</p>
                         </div>
                         <Maximize2 size={14} className="absolute top-3 right-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Right for You */}
                    <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                         <div className="bg-pink-100 p-2 rounded-lg text-pink-500 flex-shrink-0"><Target size={18}/></div>
                         <div className="flex-1">
                             <div className="text-sm font-semibold text-slate-800">Right for You?</div>
                             <div className="text-xs text-slate-500">Ideal for founders with IoT...</div>
                         </div>
                         <button 
                            onClick={() => handleGenerateArtifact('founder-fit', 'Founder Fit Analysis')}
                            className="text-blue-600 text-sm font-medium whitespace-nowrap flex items-center gap-1 hover:gap-2 transition-all hover:bg-blue-50 px-2 py-1 rounded"
                        >
                             Find Out <ArrowRight size={14} />
                         </button>
                    </div>
                </div>
             </div>
         </div>
      </div>

      {/* Two Column Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-12">
            
            {/* Offer Section */}
            <section>
                <h3 className="text-xl font-bold text-slate-900 mb-6">Offer</h3>
                <div className="space-y-6">
                    {idea.sections.offer.slice(0, 3).map((offer, index) => (
                        <div key={index} className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                {index + 1}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{offer.title} <span className="text-slate-400 font-normal text-sm ml-1">({offer.price})</span></h4>
                                <p className="text-slate-600 text-sm mt-1">{offer.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button 
                    onClick={() => setIsValueLadderOpen(true)}
                    className="mt-4 text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                >
                    View full value ladder <ArrowRight size={12}/>
                </button>
            </section>

            {/* Why Now */}
            <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Why Now?</h3>
                <p className="text-slate-600 leading-relaxed">{idea.sections.whyNow}</p>
                <button 
                    onClick={() => handleDeepDive('whyNow', 'Why Now: Market Timing Analysis')}
                    className="mt-3 text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                >
                    See why this opportunity matters now <ArrowRight size={12}/>
                </button>
            </section>

            {/* Proof & Signals */}
            <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Proof & Signals</h3>
                <p className="text-slate-600 leading-relaxed">{idea.sections.proofAndSignals}</p>
                <button 
                    onClick={() => handleDeepDive('proofAndSignals', 'Proof & Signals Validation')}
                    className="mt-3 text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                >
                    Explore proof & signals <ArrowRight size={12}/>
                </button>
            </section>

             {/* Market Gap */}
             <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4">The Market Gap</h3>
                <p className="text-slate-600 leading-relaxed">{idea.sections.marketGap}</p>
                <button 
                    onClick={() => handleDeepDive('marketGap', 'Market Gap Analysis')}
                    className="mt-3 text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                >
                    Understand the market opportunity <ArrowRight size={12}/>
                </button>
            </section>

             {/* Execution Plan */}
             <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Execution Plan</h3>
                <p className="text-slate-600 leading-relaxed italic">"{idea.sections.executionPlan}"</p>
                <button 
                    onClick={() => handleDeepDive('executionPlan', 'Detailed Execution Strategy')}
                    className="mt-4 text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                >
                    View detailed execution strategy <ArrowRight size={12}/>
                </button>
            </section>

        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
            
            {/* Start Building */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                     <div className="bg-purple-600 p-1.5 rounded text-white"><Zap size={16}/></div>
                     <h3 className="font-bold text-slate-900">Start Building in 1-click</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">Turn this idea into your business with pre-built prompts</p>
                
                <div className="space-y-2">
                    <button 
                        onClick={() => handleGenerateArtifact('ad-creative', 'Ad Creatives')}
                        className="w-full text-left px-4 py-2.5 rounded-lg border border-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-50 flex justify-between group transition-colors"
                    >
                        <div>
                            <div className="font-bold">Ad Creatives</div>
                            <div className="text-[10px] text-slate-400 font-normal">Generate assets instantly</div>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500"/>
                    </button>

                    <button 
                         onClick={() => handleGenerateArtifact('brand-package', 'Brand Identity Package')}
                         className="w-full text-left px-4 py-2.5 rounded-lg border border-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-50 flex justify-between group transition-colors"
                    >
                        <div>
                            <div className="font-bold">Brand Package</div>
                            <div className="text-[10px] text-slate-400 font-normal">Colors, fonts & logos</div>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500"/>
                    </button>

                    <button 
                         onClick={() => handleGenerateArtifact('landing-page', 'Landing Page Copy')}
                         className="w-full text-left px-4 py-2.5 rounded-lg border border-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-50 flex justify-between group transition-colors"
                    >
                        <div>
                            <div className="font-bold">Landing Page</div>
                            <div className="text-[10px] text-slate-400 font-normal">Hero section copy</div>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500"/>
                    </button>
                </div>
            </div>

            {/* Community Signals */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Community Signals</h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="bg-orange-100 p-1.5 rounded-full text-orange-600"><TrendingUp size={14}/></div>
                        <div className="flex-1">
                            <div className="flex justify-between text-xs font-medium text-slate-900">
                                <span>Reddit</span>
                                <span className="text-blue-600">8 / 10</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{idea.communitySignals.reddit}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-1.5 rounded-full text-blue-600"><Share2 size={14}/></div>
                        <div className="flex-1">
                            <div className="flex justify-between text-xs font-medium text-slate-900">
                                <span>Facebook</span>
                                <span className="text-blue-600">7 / 10</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{idea.communitySignals.facebook}</p>
                        </div>
                    </div>
                </div>
                <button className="mt-4 text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">View detailed breakdown <ArrowRight size={10}/></button>
            </div>

        </div>
      </div>
      
      {/* Sources Section (If AI Generated) */}
      {idea.sources && idea.sources.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Grounding Sources</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {idea.sources.map((s, i) => (
                      <li key={i}>
                          <a href={s.uri} target="_blank" rel="noreferrer" className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors group">
                             <ExternalLink size={16} className="text-slate-400 group-hover:text-blue-500 mt-0.5 flex-shrink-0" />
                             <span className="text-sm text-slate-600 group-hover:text-blue-700 font-medium line-clamp-2">{s.title}</span>
                          </a>
                      </li>
                  ))}
              </ul>
          </div>
      )}

      {/* Full Analysis Button Section */}
      <div className="mt-12 bg-slate-900 rounded-2xl p-8 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-purple-900 opacity-50"></div>
            <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shine" />
            <div className="relative z-10">
                <h3 className="text-2xl font-serif text-white mb-4">Ready for the deep dive?</h3>
                <p className="text-blue-200 mb-8 max-w-xl mx-auto">Get a comprehensive Venture Capitalist grade investment memo covering market analysis, financial projections, and risk assessment.</p>
                <button 
                    onClick={handleFullAnalysis}
                    className="bg-white text-slate-900 hover:bg-blue-50 px-8 py-3 rounded-full font-bold shadow-lg shadow-blue-900/50 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto"
                >
                    <Sparkles size={18} className="text-blue-600" /> See full analysis
                </button>
            </div>
      </div>

      {/* Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
                {/* Chat Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white">
                            <Sparkles size={16} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Instant Answers</h3>
                            <p className="text-xs text-slate-500">Ask about {idea.title}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsChatOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/50 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                    {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-slate-100 text-slate-700 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                        <div className="flex justify-start">
                             <div className="bg-slate-50 text-slate-500 p-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Thinking...
                             </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="relative flex items-center">
                        <input 
                            type="text" 
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about revenue, competitors, risks..."
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            autoFocus
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!inputMsg.trim() || isChatLoading}
                            className={`absolute right-2 p-1.5 rounded-full transition-colors ${
                                !inputMsg.trim() || isChatLoading 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-slate-400">AI can make mistakes. Review generated info.</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Value Ladder Modal */}
      {isValueLadderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                 <div className="bg-white border-b border-slate-100 p-6 flex justify-between items-start sticky top-0 z-10">
                     <div>
                         <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-serif text-slate-900">Value Ladder Strategy</h2>
                         </div>
                         <p className="text-slate-500">A strategic progression of offers that build trust and maximize customer lifetime value.</p>
                     </div>
                     <div className="flex gap-2">
                        <button 
                            onClick={handleCopyValueLadder}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-2"
                            title="Copy Strategy"
                        >
                            {ladderCopied ? <CheckCircle size={20} className="text-green-600" /> : <Copy size={20} />}
                        </button>
                        <button 
                            onClick={() => setIsValueLadderOpen(false)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                     </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         <div className="lg:col-span-2 space-y-6">
                             {idea.sections.offer.map((offer, index) => (
                                 <div key={index} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                     <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{offer.type || `Step ${index + 1}`}</div>
                                     
                                     <div className="flex justify-between items-start gap-4 mb-4">
                                         <h3 className="text-xl font-bold text-slate-800">{offer.title}</h3>
                                         <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-sm rounded-full whitespace-nowrap">{offer.price}</span>
                                     </div>
                                     
                                     <p className="text-slate-600 mb-6 leading-relaxed">{offer.description}</p>
                                     
                                     {(offer.valueProvided || offer.goal) && (
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                             {offer.valueProvided && (
                                                 <div>
                                                     <div className="text-xs font-bold text-slate-900 mb-1">Value Provided</div>
                                                     <p className="text-xs text-slate-500">{offer.valueProvided}</p>
                                                 </div>
                                             )}
                                             {offer.goal && (
                                                 <div>
                                                     <div className="text-xs font-bold text-slate-900 mb-1">Goal</div>
                                                     <p className="text-xs text-slate-500">{offer.goal}</p>
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>

                         <div className="space-y-6">
                             <div className="bg-white border border-slate-100 rounded-xl p-6">
                                <div className="flex justify-center mb-6">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Funnel_icon.svg/1200px-Funnel_icon.svg.png" alt="Value Ladder Diagram" className="w-32 h-32 opacity-10 grayscale hover:grayscale-0 transition-all" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Understanding Value Ladder</h3>
                                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                    The Value Ladder is a business framework that helps you structure your offers in ascending levels of value and price. Start with something irresistible and low-barrier, then build trust and value at each step.
                                </p>
                                
                                <h4 className="font-bold text-slate-900 text-sm mb-3">Why It Works</h4>
                                <ul className="space-y-2 text-xs text-slate-500">
                                    <li className="flex items-center gap-2"><ArrowRight size={10}/> Builds trust incrementally</li>
                                    <li className="flex items-center gap-2"><ArrowRight size={10}/> Maximizes customer lifetime value</li>
                                    <li className="flex items-center gap-2"><ArrowRight size={10}/> Helps segment your audience</li>
                                    <li className="flex items-center gap-2"><ArrowRight size={10}/> Creates predictable revenue</li>
                                </ul>
                             </div>

                             <div className="bg-white border border-slate-100 rounded-xl p-6">
                                 <h4 className="font-bold text-slate-900 text-sm mb-4">Key Stages</h4>
                                 <div className="space-y-4">
                                     <div>
                                         <div className="text-xs font-bold text-slate-700">Lead Magnet (Bait)</div>
                                         <p className="text-[10px] text-slate-400">Free value to build trust and capture leads</p>
                                     </div>
                                     <div>
                                         <div className="text-xs font-bold text-slate-700">Frontend Offer</div>
                                         <p className="text-[10px] text-slate-400">Low-ticket product to convert leads to buyers</p>
                                     </div>
                                     <div>
                                         <div className="text-xs font-bold text-slate-700">Core Offer</div>
                                         <p className="text-[10px] text-slate-400">Main product/service delivering full solution</p>
                                     </div>
                                     <div>
                                         <div className="text-xs font-bold text-slate-700">Continuity Program</div>
                                         <p className="text-[10px] text-slate-400">Ongoing value through memberships or add-ons</p>
                                     </div>
                                     <div>
                                         <div className="text-xs font-bold text-slate-700">Backend Offer</div>
                                         <p className="text-[10px] text-slate-400">Premium, high-ticket solutions for best customers</p>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      )}

      {/* Content/Artifact Generator Modal (Used for both deep dives and artifacts) */}
      {contentModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                <div className="bg-white border-b border-slate-100 p-4 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                            <Sparkles size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800">{contentModal.title}</h3>
                    </div>
                    <button onClick={() => setContentModal(prev => ({...prev, isOpen: false}))} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    {contentModal.loading ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-4">
                            <Loader2 size={32} className="animate-spin text-purple-600" />
                            <p className="text-slate-500 text-sm font-medium">Generating details with Gemini...</p>
                        </div>
                    ) : (
                        <div className="prose prose-slate prose-sm max-w-none">
                            {contentModal.content.split('\n').map((line, i) => {
                                // Basic markdown rendering for bold and lists
                                if (line.startsWith('###')) return <h3 key={i} className="font-bold text-lg mt-4 mb-2">{line.replace('###', '')}</h3>;
                                if (line.startsWith('**')) return <strong key={i} className="block mt-2 mb-1">{line.replace(/\*\*/g, '')}</strong>;
                                if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.replace('- ', '')}</li>;
                                return <p key={i} className="mb-2">{line}</p>;
                            })}
                        </div>
                    )}
                </div>

                {!contentModal.loading && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                        <button 
                           onClick={handleModalShare}
                           className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 flex items-center gap-2 transition-colors"
                        >
                           <Share2 size={14} /> Share
                        </button>
                        <button 
                           onClick={() => {
                               navigator.clipboard.writeText(contentModal.content);
                               alert("Copied to clipboard");
                           }}
                           className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 flex items-center gap-2 transition-colors"
                        >
                           <Copy size={14} /> Copy
                        </button>
                        <button onClick={() => setContentModal(prev => ({...prev, isOpen: false}))} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                           Done
                        </button>
                    </div>
                )}
             </div>
        </div>
      )}
    </div>
  );
};