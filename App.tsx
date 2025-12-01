
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { IdeaDetail } from './components/IdeaDetail';
import { TrendsGrid } from './components/TrendsGrid';
import { MyIdeas } from './components/MyIdeas';
import { Whiteboard } from './components/Whiteboard';
import { ProtectedRoute } from './src/components/Auth/ProtectedRoute';
import { AuthProvider } from './src/contexts/AuthContext';
import { IdeaGenerator } from './src/components/IdeaGenerator';
import { businessIdeasApi } from './services/apiService';
import { Sparkles } from 'lucide-react';
import { INITIAL_IDEA, GOLF_IDEA } from './constants';
import { generateBusinessIdea } from './services/geminiService';
import { BusinessIdea, ViewState } from './types';

const AppContent: React.FC = () => {
  const [currentIdea, setCurrentIdea] = useState<BusinessIdea>(INITIAL_IDEA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [myIdeas, setMyIdeas] = useState<BusinessIdea[]>([GOLF_IDEA]);
  const [databaseIdeas, setDatabaseIdeas] = useState<BusinessIdea[]>([]);
  const [showIdeaGenerator, setShowIdeaGenerator] = useState(false);

  // Fetch user's saved ideas from database on component mount
  useEffect(() => {
    const fetchDatabaseIdeas = async () => {
      try {
        const { ideas } = await businessIdeasApi.getIdeas({ limit: 8 });
        setDatabaseIdeas(ideas);
        console.log('✅ Fetched', ideas.length, 'ideas from database');
      } catch (error) {
        console.error('❌ Failed to fetch database ideas:', error);
        // Don't show error to user, just log it
      }
    };

    fetchDatabaseIdeas();
  }, []);

  const handleIdeaGenerated = (idea: BusinessIdea) => {
    setCurrentIdea(idea);
    setCurrentView('home'); // Ensure we are on home to see the result
    setError(null);
    // Scroll to top to show the result
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveIdea = async (idea: BusinessIdea) => {
    try {
      // Save to database
      const savedIdea = await businessIdeasApi.createIdea({
        title: idea.title,
        description: idea.description,
        tags: idea.tags,
        priceRange: idea.priceRange,
        trendKeyword: idea.trendKeyword,
        trendVolume: idea.trendVolume,
        trendGrowth: idea.trendGrowth,
        relatedKeywords: idea.relatedKeywords,
        trendData: idea.trendData,
        kpi: idea.kpi,
        businessFit: idea.businessFit,
        sections: idea.sections,
        communitySignals: idea.communitySignals,
        sources: idea.sources,
      });

      // Update local state
      setMyIdeas(prev => {
        // Prevent duplicates
        if (prev.some(i => i.id === savedIdea.id)) return prev;
        return [savedIdea, ...prev];
      });

      console.log('✅ Idea saved to database:', savedIdea.title);
    } catch (error) {
      console.error('❌ Failed to save idea to database:', error);
      alert('Failed to save idea. Please try again.');
    }
  };

  const handleUpdateIdea = (updatedIdea: BusinessIdea) => {
    setCurrentIdea(updatedIdea);
    // If this idea exists in 'My Ideas', update it there too
    setMyIdeas(prev => prev.map(i => i.id === updatedIdea.id ? updatedIdea : i));
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <Header onNavigate={setCurrentView} />
      
      {/* AI Trigger Button (Floating or Sticky) only on Home */}
      {currentView === 'home' && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
              onClick={() => setShowIdeaGenerator(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 font-bold border border-white/20"
          >
            <Sparkles size={20} className="animate-pulse" />
            Generate Business Ideas
          </button>
        </div>
      )}

      <main className="flex-grow relative">
        {currentView === 'home' && (
          <>
            {error && (
                <div className="max-w-3xl mx-auto mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
                    {error}
                </div>
            )}

            <IdeaDetail 
              idea={currentIdea} 
              loading={loading} 
              onSaveIdea={handleSaveIdea}
              onUpdateIdea={handleUpdateIdea}
              isSaved={myIdeas.some(i => i.id === currentIdea.id)}
            />
            
            <section className="py-16 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
                    <h2 className="text-4xl font-serif text-blue-500 mb-2">The Idea Database</h2>
                    <p className="text-slate-500">Your saved business ideas and research</p>
                </div>

                {/* Real Database Ideas Grid */}
                {databaseIdeas.length > 0 ? (
                    <>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {databaseIdeas.map((idea) => (
                                <div
                                    key={idea.id}
                                    onClick={() => {
                                        setCurrentIdea(idea);
                                        setCurrentView('home');
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 cursor-pointer group"
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                                            <Sparkles size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold text-slate-800 leading-tight mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
                                                {idea.title}
                                            </h3>
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {idea.tags.slice(0, 2).map((tag, idx) => (
                                                    <span key={idx} className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-medium">Trend</span>
                                            <span className="text-slate-700 font-bold">{idea.trendVolume}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-medium">Growth</span>
                                            <span className="text-green-600 font-bold">{idea.trendGrowth}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-medium">Score</span>
                                            <span className="text-blue-600 font-bold">{idea.kpi.opportunity.score}/10</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                            {idea.description.substring(0, 100)}...
                                        </p>
                                        <div className="mt-3 text-xs text-slate-400">
                                            {new Date(idea.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center">
                            <button
                                onClick={() => setCurrentView('my-ideas')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
                            >
                                View all saved ideas ({databaseIdeas.length}) {'->'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="max-w-3xl mx-auto text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                <Sparkles size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No saved ideas yet</h3>
                            <p className="text-slate-500 mb-6">Start by generating some business ideas and saving them to build your personal database.</p>
                            <button
                                onClick={() => setShowIdeaGenerator(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full text-sm font-medium transition-colors"
                            >
                                Generate your first idea
                            </button>
                        </div>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 opacity-30 pointer-events-none">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="h-48 bg-slate-50 rounded-xl border border-slate-100"></div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <TrendsGrid />
          </>
        )}
        
        {currentView === 'my-ideas' && (
          <MyIdeas 
              ideas={myIdeas}
              onAddIdea={(newIdea) => setMyIdeas([newIdea, ...myIdeas])}
              onNavigateHome={() => setCurrentView('home')} 
              onSelectIdea={(idea) => {
                  setCurrentIdea(idea);
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
          />
        )}

        {currentView === 'whiteboard' && (
            <Whiteboard />
        )}
      </main>

      {/* Idea Generator Modal */}
      {showIdeaGenerator && (
        <IdeaGenerator
          onIdeaGenerated={handleIdeaGenerated}
          onClose={() => setShowIdeaGenerator(false)}
        />
      )}

      {/* Only show footer on standard pages */}
      {currentView !== 'whiteboard' && <Footer onNavigate={setCurrentView} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default App;
