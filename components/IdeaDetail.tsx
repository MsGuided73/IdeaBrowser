
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, CheckCircle, Zap, TrendingUp, AlertTriangle, 
  Clock, Target, Share2, Bookmark, Hammer, ExternalLink, MessageSquare, 
  Download, Flag, ChevronDown, ChevronUp, Send, X, Loader2, Sparkles, Copy, 
  BarChart3, Twitter, Linkedin, Link as LinkIcon, Maximize2, Pencil, Save, Code, Terminal, FileText,
  Layout, Calendar, Mail, Users, Search, Megaphone, Box, FileCode, DollarSign, PieChart, Eye, BookOpen,
  FileDown
} from 'lucide-react';
import { BusinessIdea, ValueLadderStep } from '../types';
import { TrendChart } from './TrendChart';
import { createIdeaChatSession, generateArtifact, generateSectionDeepDive, generateFullAnalysis } from '../services/geminiService';
import { Chat } from '@google/genai';

interface IdeaDetailProps {
  idea: BusinessIdea;
  loading: boolean;
  onSaveIdea: (idea: BusinessIdea) => void;
  onUpdateIdea: (idea: BusinessIdea) => void;
  isSaved: boolean;
}

// Template Data Configuration
const TEMPLATE_CATEGORIES = [
  {
    id: 'popular',
    title: 'Popular',
    count: '3 templates',
    description: 'Most commonly used templates to get started',
    icon: <Sparkles size={18} className="text-purple-600" />,
    bg: 'bg-purple-50',
    items: [
      { id: 'ad-creatives', title: 'Ad Creatives', description: 'High-converting ad copy and creative concepts', icon: <Megaphone size={18}/> },
      { id: 'brand-package', title: 'Brand Package', description: 'Complete brand identity with logo, colors, and voice', icon: <Flag size={18}/> },
      { id: 'landing-page', title: 'Landing Page', description: 'Copy + wireframe blocks', icon: <Layout size={18}/> },
    ]
  },
  {
    id: 'marketing',
    title: 'Marketing',
    count: '8 templates',
    description: 'Marketing focused templates for your business',
    icon: <Megaphone size={18} className="text-pink-600" />,
    bg: 'bg-pink-50',
    items: [
      { id: 'content-calendar', title: 'Content Calendar', description: '90-day content marketing plan', icon: <Calendar size={18}/> },
      { id: 'email-funnel', title: 'Email Funnel System', description: 'Complete email marketing funnel with sequences', icon: <Mail size={18}/> },
      { id: 'email-sequence', title: 'Email Sequence', description: '5-email nurture sequence', icon: <Mail size={18}/> },
      { id: 'lead-magnet', title: 'Lead Magnet', description: 'Irresistible lead generation offers', icon: <Zap size={18}/> },
      { id: 'sales-funnel', title: 'Sales Funnel', description: 'Customer journey optimization strategy', icon: <Target size={18}/> },
      { id: 'seo-content', title: 'SEO Content', description: 'Search-optimized content strategy', icon: <Search size={18}/> },
      { id: 'tweet-page', title: 'Tweet-Sized Landing Page', description: 'Ultra-minimal 280-character landing page', icon: <Twitter size={18}/> },
      { id: 'user-personas', title: 'User Personas', description: 'Detailed customer persona cards with motivations', icon: <Users size={18}/> },
    ]
  },
  {
    id: 'product',
    title: 'Product',
    count: '3 templates',
    description: 'Product focused templates for your business',
    icon: <Box size={18} className="text-blue-600" />,
    bg: 'bg-blue-50',
    items: [
      { id: 'feature-specs', title: 'Feature Specs', description: 'Detailed feature specifications and user stories', icon: <FileText size={18}/> },
      { id: 'mvp-roadmap', title: 'MVP Roadmap', description: '90-day development plan with feature prioritization', icon: <Hammer size={18}/> },
      { id: 'prd', title: 'Product Requirements Doc', description: 'Complete PRD with technical specifications', icon: <FileCode size={18}/> },
    ]
  },
  {
    id: 'business',
    title: 'Business',
    count: '4 templates',
    description: 'Business focused templates for your business',
    icon: <DollarSign size={18} className="text-indigo-600" />,
    bg: 'bg-indigo-50',
    items: [
      { id: 'gtm-calendar', title: 'GTM Launch Calendar', description: '90-day launch timeline with team coordination', icon: <Calendar size={18}/> },
      { id: 'gtm-strategy', title: 'GTM Strategy', description: 'Go-to-market strategy and launch plan', icon: <Target size={18}/> },
      { id: 'kpi-dashboard', title: 'KPI Dashboard', description: 'Pre-built metrics tracker with formulas', icon: <BarChart3 size={18}/> },
      { id: 'pricing-strategy', title: 'Pricing Strategy', description: 'Strategic pricing framework and psychology', icon: <DollarSign size={18}/> },
    ]
  },
  {
    id: 'research',
    title: 'Research',
    count: '2 templates',
    description: 'Research focused templates for your business',
    icon: <Search size={18} className="text-teal-600" />,
    bg: 'bg-teal-50',
    items: [
      { id: 'competitive-analysis', title: 'Competitive Analysis', description: 'Deep dive into competitors and market gaps', icon: <TrendingUp size={18}/> },
      { id: 'interview-guide', title: 'Customer Interview Guide', description: 'Structured interviews for validation and insights', icon: <MessageSquare size={18}/> },
    ]
  }
];

export const IdeaDetail: React.FC<IdeaDetailProps> = ({ idea, loading, onSaveIdea, onUpdateIdea, isSaved }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedIdea, setEditedIdea] = useState<BusinessIdea>(idea);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({'popular': true});
  
  // Modal States
  const [activeModal, setActiveModal] = useState<'chat' | 'content' | null>(null);
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedIdea(idea);
    setChatMessages([]);
    setChatSession(null);
  }, [idea]);

  useEffect(() => {
    if (activeModal === 'chat' && !chatSession) {
      const session = createIdeaChatSession(idea);
      setChatSession(session);
      setChatMessages([{ role: 'model', text: `Hi! I'm ready to discuss "${idea.title}". Ask me anything about execution, market risks, or strategy.` }]);
    }
  }, [activeModal, idea, chatSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSave = () => {
    onUpdateIdea(editedIdea);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedIdea(idea);
    setIsEditing(false);
  };

  const handleChange = (field: keyof BusinessIdea, value: any) => {
    setEditedIdea(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section: 'kpi' | 'businessFit', key: string, value: any) => {
    setEditedIdea(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSectionChange = (key: keyof typeof editedIdea.sections, value: any) => {
    setEditedIdea(prev => ({
        ...prev,
        sections: {
            ...prev.sections,
            [key]: value
        }
    }));
  };

  const handleDeepDive = async (section: 'whyNow' | 'proofAndSignals' | 'marketGap' | 'executionPlan' | 'revenuePotential' | 'executionDifficulty' | 'goToMarket' | 'communitySignals') => {
    setActiveModal('content');
    setIsGenerating(true);
    setModalContent({ title: 'Generating Analysis...', content: 'Please wait while Gemini analyzes live market data...' });

    try {
      const content = await generateSectionDeepDive(editedIdea, section);
      let title = '';
      switch(section) {
        case 'whyNow': title = 'Why Now & Market Timing'; break;
        case 'proofAndSignals': title = 'Proof & Market Signals'; break;
        case 'marketGap': title = 'Market Gap Analysis'; break;
        case 'executionPlan': title = '90-Day Execution Plan'; break;
        case 'revenuePotential': title = 'Revenue & Business Model'; break;
        case 'executionDifficulty': title = 'Technical & Operational Challenges'; break;
        case 'goToMarket': title = 'Go-To-Market Strategy'; break;
        case 'communitySignals': title = 'Community Signals & Social Listening'; break;
      }
      setModalContent({ title, content });
    } catch (e) {
      setModalContent({ title: 'Error', content: 'Failed to generate analysis.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateArtifact = async (type: string, title: string) => {
      setActiveModal('content');
      setIsGenerating(true);
      setModalContent({ title: `Building ${title}...`, content: 'Gemini is crafting your asset...' });
      
      const content = await generateArtifact(editedIdea, type);
      setModalContent({ title: title, content });
      setIsGenerating(false);
  };

  const handleFullReport = async () => {
      setActiveModal('content');
      setIsGenerating(true);
      setModalContent({ title: 'Generating Investment Memo...', content: 'Compiling a full deep dive report (this may take 30 seconds)...' });
      const content = await generateFullAnalysis(editedIdea);
      setModalContent({ title: 'Investment Memo & Deep Dive', content });
      setIsGenerating(false);
  };

  const handleDownloadDossier = () => {
    const { title, description, tags, trendKeyword, relatedKeywords, trendVolume, trendGrowth, kpi, businessFit, sections, communitySignals, sources } = editedIdea;

    const reportContent = `
# ${title}
**Date Generated:** ${new Date().toLocaleDateString()}
**Tags:** ${tags.join(', ')}

---

## 1. Executive Summary
${description}

---

## 2. Market Trend Intelligence
**Breakout Keyword:** ${trendKeyword}
**Monthly Search Volume:** ${trendVolume}
**YoY Growth:** ${trendGrowth}
**Related Keyword Variations:** ${relatedKeywords?.join(', ')}

---

## 3. KPI Scorecard & Metrics
| Metric | Score | Rating |
| :--- | :--- | :--- |
| **Opportunity** | ${kpi.opportunity.score}/10 | ${kpi.opportunity.label} |
| **Problem Severity** | ${kpi.problem.score}/10 | ${kpi.problem.label} |
| **Feasibility** | ${kpi.feasibility.score}/10 | ${kpi.feasibility.label} |
| **Why Now** | ${kpi.whyNow.score}/10 | ${kpi.whyNow.label} |

---

## 4. Business Fit & Viability
* **Revenue Potential:** ${businessFit.revenuePotential}
  * *Analysis:* ${businessFit.revenuePotentialDescription}
* **Execution Difficulty:** ${businessFit.executionDifficulty}/10
  * *Analysis:* ${businessFit.executionDifficultyDescription}
* **Go-To-Market Score:** ${businessFit.goToMarket}/10
  * *Analysis:* ${businessFit.goToMarketDescription}
* **Founder Fit:** ${businessFit.founderFitDescription}

---

## 5. The Value Ladder Strategy
A structured product strategy moving customers from free value to high-ticket retention.

${sections.offer.map((step, idx) => `
### Step ${idx + 1}: ${step.type}
**Title:** ${step.title}
* **Price:** ${step.price}
* **Strategic Goal:** ${step.goal}
* **Description:** ${step.description}
* **Customer Value:** ${step.valueProvided}
`).join('\n')}

---

## 6. Comprehensive Deep Dive Analysis

### Why Now & Market Timing
${sections.whyNow}

### Proof, Validation & Market Signals
${sections.proofAndSignals}

### Market Gap & Competitive Landscape
${sections.marketGap}

### 90-Day Execution Plan
${sections.executionPlan}

---

## 7. Community Signals (Social Listening)
* **Reddit Analysis:** ${communitySignals.reddit}
* **Facebook Groups:** ${communitySignals.facebook}
* **YouTube Trends:** ${communitySignals.youtube}
* **Other Signals:** ${communitySignals.other}

---

## 8. Sources & References
${sources && sources.length > 0 ? sources.map(s => `* [${s.title}](${s.uri})`).join('\n') : 'No direct sources linked.'}

---

*Report generated by IdeaBrowser AI on ${new Date().toLocaleString()}*
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_comprehensive_dossier.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSession) return;
    
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    
    try {
      const result = await chatSession.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', text: result.text || "I couldn't generate a response." }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error." }]);
    }
  };

  const handleModalShare = async () => {
      if (modalContent) {
          try {
              await navigator.clipboard.writeText(modalContent.content);
              alert("Content copied to clipboard!");
          } catch (err) {
              console.error("Failed to copy", err);
          }
      }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
        <div className="h-64 bg-slate-100 rounded-xl mb-8"></div>
        <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-slate-100 rounded-xl"></div>
            <div className="h-32 bg-slate-100 rounded-xl"></div>
            <div className="h-32 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
             <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">{editedIdea.tags[0]}</span>
             <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">{editedIdea.tags[1] || 'Trending'}</span>
          </div>
          <div className="flex items-center gap-3">
              {isEditing ? (
                  <>
                    <button onClick={handleCancel} className="text-slate-500 text-sm font-medium hover:text-slate-800 px-3 py-1.5">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-200">
                        <Save size={16} /> Save Changes
                    </button>
                  </>
              ) : (
                  <>
                    <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors" title="Edit Idea">
                        <Pencil size={18} />
                    </button>
                    <button onClick={() => setActiveModal('chat')} className="text-slate-600 hover:text-blue-600 font-medium text-sm flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all">
                        <MessageSquare size={16} /> Ask AI
                    </button>
                    <button 
                        onClick={() => onSaveIdea(editedIdea)}
                        disabled={isSaved}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${isSaved ? 'bg-green-100 text-green-700 cursor-default' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-300'}`}
                    >
                        {isSaved ? <><CheckCircle size={16} /> Saved</> : <><Bookmark size={16} /> Save Idea</>}
                    </button>
                  </>
              )}
          </div>
      </div>

      {/* Main Title */}
      <div className="mb-6">
         {isEditing ? (
             <input 
                type="text" 
                value={editedIdea.title} 
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-slate-900 mb-4 border-b-2 border-blue-200 focus:border-blue-500 focus:outline-none bg-transparent pb-2"
             />
         ) : (
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-slate-900 mb-4 leading-tight">
                {editedIdea.title}
             </h1>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Main Content & Report */}
          <div className="lg:col-span-2 space-y-12">
              
              {/* Description */}
              <div>
                 {isEditing ? (
                     <textarea 
                        value={editedIdea.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="w-full h-48 text-lg text-slate-700 leading-relaxed p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                     />
                 ) : (
                     <p className="text-xl text-slate-700 leading-relaxed">
                        {editedIdea.description}
                     </p>
                 )}
              </div>

              {/* Trend Chart - Centered in Main Column */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-900 text-2xl">Search Interest Trend</h3>
                      <span className="text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">Last 5 Years</span>
                  </div>
                  <TrendChart 
                      data={editedIdea.trendData} 
                      keyword={editedIdea.trendKeyword}
                      relatedKeywords={editedIdea.relatedKeywords}
                      volume={editedIdea.trendVolume}
                      growth={editedIdea.trendGrowth}
                      height={300}
                  />
              </div>

              {/* Value Ladder */}
              <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-serif text-slate-900 font-bold">Value Ladder Strategy</h2>
                        <p className="text-sm text-slate-500 mt-1">From free value to high-ticket backend.</p>
                      </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {editedIdea.sections.offer.map((step, idx) => (
                          <div key={idx} className="p-8 hover:bg-slate-50 transition-colors group">
                              <div className="flex items-start justify-between mb-3">
                                  <div className="flex flex-col gap-2">
                                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase w-fit ${
                                          idx === 0 ? 'bg-green-100 text-green-700' :
                                          idx === 2 ? 'bg-blue-100 text-blue-700' : 
                                          idx === 4 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                          {step.type}
                                      </span>
                                      {isEditing ? (
                                          <input 
                                            type="text" 
                                            className="font-bold text-xl text-slate-900 border-b border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent w-full"
                                            value={step.title}
                                            onChange={(e) => {
                                                const newOffers = [...editedIdea.sections.offer];
                                                newOffers[idx] = { ...step, title: e.target.value };
                                                setEditedIdea(prev => ({ ...prev, sections: { ...prev.sections, offer: newOffers } }));
                                            }}
                                          />
                                      ) : (
                                          <h3 className="font-bold text-xl text-slate-900">{step.title}</h3>
                                      )}
                                  </div>
                                  {isEditing ? (
                                      <input 
                                        type="text" 
                                        className="text-lg font-bold text-slate-900 border-b border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent text-right w-24"
                                        value={step.price}
                                        onChange={(e) => {
                                            const newOffers = [...editedIdea.sections.offer];
                                            newOffers[idx] = { ...step, price: e.target.value };
                                            setEditedIdea(prev => ({ ...prev, sections: { ...prev.sections, offer: newOffers } }));
                                        }}
                                      />
                                  ) : (
                                      <span className="text-lg font-bold text-slate-900 whitespace-nowrap">{step.price}</span>
                                  )}
                              </div>
                              <p className="text-base text-slate-600 mb-3 leading-relaxed">{step.description}</p>
                              <div className="text-sm text-slate-500"><span className="font-semibold text-slate-700">Value:</span> {step.valueProvided}</div>
                          </div>
                      ))}
                  </div>
              </section>

              {/* Analysis Report (Consolidated) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 p-8 md:p-10">
                  <div className="flex justify-between items-end mb-10 border-b border-slate-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2">Market Analysis Report</h2>
                        <p className="text-slate-500 text-lg">Deep dive into market timing, signals, and execution strategy.</p>
                    </div>
                    <button onClick={handleFullReport} className="text-white bg-slate-900 hover:bg-slate-800 px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-slate-200">
                          <Sparkles size={16} /> Get Full Memo
                    </button>
                  </div>
                  
                  <div className="space-y-16">
                      {/* Why Now */}
                      <div className="group">
                          <h3 className="flex items-center gap-3 text-slate-900 font-bold text-2xl mb-4">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Clock size={20} /></div>
                              Why Now?
                          </h3>
                          <p className="text-slate-700 leading-relaxed text-lg mb-4">
                            {editedIdea.sections.whyNow}
                          </p>
                          <button onClick={() => handleDeepDive('whyNow')} className="text-blue-600 hover:text-blue-800 text-base font-bold inline-flex items-center gap-1 hover:underline decoration-2 underline-offset-4">
                              Read Market Timing Deep Dive <ArrowRight size={16} />
                          </button>
                      </div>

                      {/* Proof & Signals */}
                      <div className="group">
                          <h3 className="flex items-center gap-3 text-slate-900 font-bold text-2xl mb-4">
                              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><CheckCircle size={20} /></div>
                              Proof & Signals
                          </h3>
                          <p className="text-slate-700 leading-relaxed text-lg mb-4">
                            {editedIdea.sections.proofAndSignals}
                          </p>
                          <button onClick={() => handleDeepDive('proofAndSignals')} className="text-green-600 hover:text-green-800 text-base font-bold inline-flex items-center gap-1 hover:underline decoration-2 underline-offset-4">
                              View Validation Data <ArrowRight size={16} />
                          </button>
                      </div>

                      {/* Market Gap */}
                      <div className="group">
                          <h3 className="flex items-center gap-3 text-slate-900 font-bold text-2xl mb-4">
                              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Zap size={20} /></div>
                              Market Gap
                          </h3>
                          <p className="text-slate-700 leading-relaxed text-lg mb-4">
                            {editedIdea.sections.marketGap}
                          </p>
                          <button onClick={() => handleDeepDive('marketGap')} className="text-purple-600 hover:text-purple-800 text-base font-bold inline-flex items-center gap-1 hover:underline decoration-2 underline-offset-4">
                              See Competitive Landscape <ArrowRight size={16} />
                          </button>
                      </div>

                      {/* Execution Plan */}
                      <div className="group">
                          <h3 className="flex items-center gap-3 text-slate-900 font-bold text-2xl mb-4">
                              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Hammer size={20} /></div>
                              Execution Plan
                          </h3>
                          <p className="text-slate-700 leading-relaxed text-lg mb-4">
                            {editedIdea.sections.executionPlan}
                          </p>
                          <button onClick={() => handleDeepDive('executionPlan')} className="text-amber-600 hover:text-amber-800 text-base font-bold inline-flex items-center gap-1 hover:underline decoration-2 underline-offset-4">
                              View 30-60-90 Day Plan <ArrowRight size={16} />
                          </button>
                      </div>

                      {/* Sources Footnote */}
                      {editedIdea.sources && editedIdea.sources.length > 0 && (
                          <div className="pt-8 border-t border-slate-100">
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                  <BookOpen size={16} /> References & Sources
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {editedIdea.sources.map((source, idx) => (
                                      <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-slate-500 hover:text-blue-600 group transition-colors p-2 rounded hover:bg-slate-50">
                                          <span className="text-slate-300 group-hover:text-blue-400 font-mono">{idx + 1}.</span>
                                          <span className="truncate">{source.title}</span>
                                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 ml-auto" />
                                      </a>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-8">
              
              {/* KPI Scorecards - Vibrant Colors */}
              <div className="space-y-4">
                  {Object.entries(editedIdea.kpi).map(([key, data]: [string, any]) => {
                      let colorClass = 'text-slate-600';
                      let bgClass = 'bg-slate-50';
                      let borderClass = 'border-slate-100';

                      // Explicit Vibrant Colors for KPIs
                      if (key === 'opportunity') { colorClass = 'text-green-700'; bgClass = 'bg-green-50'; borderClass = 'border-green-200'; }
                      if (key === 'problem') { colorClass = 'text-red-700'; bgClass = 'bg-red-50'; borderClass = 'border-red-200'; }
                      if (key === 'feasibility') { colorClass = 'text-blue-700'; bgClass = 'bg-blue-50'; borderClass = 'border-blue-200'; }
                      if (key === 'whyNow') { colorClass = 'text-amber-700'; bgClass = 'bg-amber-50'; borderClass = 'border-amber-200'; }

                      return (
                        <div key={key} className={`${bgClass} rounded-xl p-6 border ${borderClass} shadow-sm transition-all hover:shadow-md`}>
                            <div className="text-xs font-bold opacity-70 uppercase tracking-wider mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <div className="flex items-end justify-between">
                                <div className="flex items-baseline gap-1">
                                    {isEditing ? (
                                        <input 
                                            type="number" 
                                            min="1" max="10"
                                            value={data.score}
                                            onChange={(e) => handleNestedChange('kpi', key, { ...data, score: parseInt(e.target.value) })}
                                            className="w-12 text-3xl font-bold bg-white border border-slate-200 rounded px-1"
                                        />
                                    ) : (
                                        <span className={`text-4xl font-bold ${colorClass}`}>
                                            {data.score}
                                        </span>
                                    )}
                                    <span className="text-sm opacity-60 font-medium">/10</span>
                                </div>
                                <div className={`text-sm font-bold ${colorClass} bg-white/60 px-3 py-1 rounded-full shadow-sm backdrop-blur-sm border border-white/20`}>{data.label}</div>
                            </div>
                        </div>
                      );
                  })}
              </div>

              {/* Business Fit */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                   <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-xl">
                      <Target size={22} className="text-slate-400" /> Business Fit
                   </h3>
                   <div className="space-y-6">
                      {[
                          { label: 'Revenue', key: 'revenuePotential', descKey: 'revenuePotentialDescription', icon: <Sparkles size={18}/> },
                          { label: 'Difficulty', key: 'executionDifficulty', descKey: 'executionDifficultyDescription', icon: <Hammer size={18}/> },
                          { label: 'Go-To-Market', key: 'goToMarket', descKey: 'goToMarketDescription', icon: <Share2 size={18}/> }
                      ].map((item) => (
                          <div key={item.key}>
                              <div className="flex justify-between text-base mb-1.5">
                                  <span className="text-slate-700 font-medium flex items-center gap-2">{item.icon} {item.label}</span>
                                  {isEditing ? (
                                      <input 
                                          type="text" 
                                          className="w-20 text-right text-sm font-bold bg-slate-50 border border-slate-200 rounded"
                                          value={(editedIdea.businessFit as any)[item.key]}
                                          onChange={(e) => handleNestedChange('businessFit', item.key, e.target.value)}
                                      />
                                  ) : (
                                      <span className="font-bold text-slate-900">{(editedIdea.businessFit as any)[item.key]} {typeof (editedIdea.businessFit as any)[item.key] === 'number' ? '/10' : ''}</span>
                                  )}
                              </div>
                              <p className="text-sm text-slate-500 leading-relaxed pl-7">
                                  {(editedIdea.businessFit as any)[item.descKey]}
                              </p>
                          </div>
                      ))}
                   </div>
               </div>
              
              {/* Builder Tools - Light & Vibrant Layout */}
              <div className="space-y-6">
                  <div className="flex items-center gap-2">
                     <div className="h-px flex-1 bg-slate-200"></div>
                     <span className="text-xs text-slate-400 uppercase tracking-wider">Build This Idea</span>
                     <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  
                  {/* Master Coding Prompt Card - Lightened */}
                  <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all" onClick={() => handleGenerateArtifact('coding-prompts', 'AI Coding Agent Prompts')}>
                       {/* Vibrant Abstract Background */}
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-60 group-hover:opacity-80 transition-opacity"></div>
                       <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-100 rounded-full blur-2xl -ml-10 -mb-10 opacity-60"></div>
                       
                       <div className="relative z-10">
                           <div className="flex items-center gap-3 mb-3">
                               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-indigo-50 text-indigo-600">
                                   <Terminal size={20} />
                               </div>
                               <div>
                                   <h3 className="font-bold text-lg text-indigo-900 leading-tight">AI Coding Agent</h3>
                                   <p className="text-xs text-indigo-600 font-medium">Master Prompt Generator</p>
                               </div>
                           </div>
                           <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                               Get the complete prompt pack to build this app using Cursor, Windsurf, or Bolt.
                           </p>
                           <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200">
                               <Sparkles size={16} /> Generate Prompts
                           </button>
                       </div>
                  </div>

                  {/* Template Categories (Accordion) */}
                  <div className="space-y-3">
                      {TEMPLATE_CATEGORIES.map((category) => (
                          <div key={category.id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                              <button 
                                  onClick={() => toggleCategory(category.id)}
                                  className={`w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors ${expandedCategories[category.id] ? 'border-b border-slate-50' : ''}`}
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 ${category.bg} rounded-lg flex items-center justify-center`}>
                                          {category.icon}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-sm text-slate-800">{category.title}</h4>
                                          <p className="text-[10px] text-slate-400">{category.description}</p>
                                      </div>
                                  </div>
                                  {expandedCategories[category.id] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                              </button>

                              {expandedCategories[category.id] && (
                                  <div className="p-2 bg-slate-50/30 grid grid-cols-1 gap-2">
                                      {category.items.map((item) => (
                                          <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-3 group hover:border-blue-200 transition-colors">
                                              <div className="flex items-center gap-3 min-w-0">
                                                  <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
                                                      {item.icon}
                                                  </div>
                                                  <div className="min-w-0">
                                                      <h5 className="font-medium text-slate-700 text-xs truncate">{item.title}</h5>
                                                  </div>
                                              </div>
                                              <button 
                                                  onClick={() => handleGenerateArtifact(item.id, item.title)}
                                                  className="flex-shrink-0 p-1.5 rounded bg-slate-50 text-blue-600 hover:bg-blue-50 transition-colors"
                                                  title="Build"
                                              >
                                                  <ArrowRight size={14} />
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>

              {/* Community Signals */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-xl">
                      <MessageSquare size={20} className="text-blue-500" /> Community Signals
                  </h3>
                  <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                          <div className="w-8 h-8 rounded-full bg-[#FF4500] text-white flex items-center justify-center font-bold">r/</div>
                          <div className="flex-1">
                              <div className="text-sm font-bold text-slate-700">Reddit</div>
                              <div className="text-xs text-slate-500">{editedIdea.communitySignals.reddit}</div>
                          </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                          <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center"><ExternalLink size={14}/></div>
                          <div className="flex-1">
                              <div className="text-sm font-bold text-slate-700">Facebook Groups</div>
                              <div className="text-xs text-slate-500">{editedIdea.communitySignals.facebook}</div>
                          </div>
                      </div>
                      
                      <button 
                          onClick={() => handleDeepDive('communitySignals')}
                          className="w-full py-3 text-center text-sm font-bold text-blue-600 hover:bg-blue-50 rounded transition-colors border border-transparent hover:border-blue-100"
                        >
                          View detailed breakdown {'->'} 
                      </button>
                  </div>
              </div>

              {/* Download Full Dossier Button */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                  <button 
                      onClick={handleDownloadDossier}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all group"
                  >
                      <FileDown size={20} className="text-slate-300 group-hover:text-white transition-colors" />
                      <div>
                          <div className="leading-none">Download Research Dossier</div>
                          <div className="text-xs font-normal text-slate-400 mt-1 opacity-80">Includes Strategy, KPIs, & Full Analysis</div>
                      </div>
                  </button>
              </div>
          </div>
      </div>

      {/* Modals */}
      {activeModal && (
          <div className="fixed inset-1 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* Modal Header */}
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          {activeModal === 'chat' ? (
                              <> <MessageSquare size={18} className="text-blue-600"/> Idea Consultant </>
                          ) : (
                              <> <Sparkles size={18} className="text-purple-600"/> {modalContent?.title} </>
                          )}
                      </h3>
                      <div className="flex items-center gap-2">
                        {activeModal === 'content' && (
                             <button onClick={handleModalShare} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600" title="Copy to Clipboard">
                                 <Copy size={18} />
                             </button>
                        )}
                        <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                      </div>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                      {activeModal === 'content' && (
                          <div className="prose prose-sm max-w-none prose-slate">
                              {isGenerating ? (
                                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                      <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
                                      <p>{modalContent?.content}</p>
                                  </div>
                              ) : (
                                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 whitespace-pre-wrap">
                                      {modalContent?.content}
                                  </div>
                              )}
                          </div>
                      )}

                      {activeModal === 'chat' && (
                          <div className="space-y-4">
                              {chatMessages.map((msg, idx) => (
                                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                      </div>
                                  </div>
                              ))}
                              <div ref={chatEndRef}></div>
                          </div>
                      )}
                  </div>

                  {/* Chat Input */}
                  {activeModal === 'chat' && (
                      <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
                          <div className="relative flex items-center">
                              <input 
                                  type="text" 
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                  placeholder="Ask about competitors, risks, or execution..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button 
                                  onClick={handleSendMessage}
                                  disabled={!chatInput.trim()}
                                  className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                  <Send size={16} />
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
