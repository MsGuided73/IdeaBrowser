
import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { IdeaDetail } from './components/IdeaDetail';
import { TrendsGrid } from './components/TrendsGrid';
import { MyIdeas } from './components/MyIdeas';
import { Whiteboard } from './components/Whiteboard';
import { Sparkles } from 'lucide-react';
import { INITIAL_IDEA, GOLF_IDEA } from './constants';
import { generateBusinessIdea } from './services/geminiService';
import { BusinessIdea, ViewState } from './types';

const App: React.FC = () => {
  const [currentIdea, setCurrentIdea] = useState<BusinessIdea>(INITIAL_IDEA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [myIdeas, setMyIdeas] = useState<BusinessIdea[]>([GOLF_IDEA]);

  const handleGenerateIdea = async () => {
    if (!process.env.API_KEY) {
       alert("Please set your Gemini API Key in the environment variables to use this feature.");
       return;
    }

    setLoading(true);
    setError(null);
    setCurrentView('home'); // Ensure we are on home to see the result
    
    // Scroll to top to show loading state in the main view
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const newIdea = await generateBusinessIdea();
      setCurrentIdea(newIdea);
    } catch (err) {
      setError("Failed to generate idea. The AI might be busy or the search quota exceeded. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIdea = (idea: BusinessIdea) => {
    setMyIdeas(prev => {
        // Prevent duplicates
        if (prev.some(i => i.id === idea.id)) return prev;
        return [idea, ...prev];
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <Header onNavigate={setCurrentView} />
      
      {/* AI Trigger Button (Floating or Sticky) only on Home */}
      {currentView === 'home' && (
        <div className="fixed bottom-6 right-6 z-50">
          <button 
              onClick={handleGenerateIdea}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 font-bold border border-white/20"
          >
            {loading ? (
                <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Thinking...
                </span>
            ) : (
                <>
                    <Sparkles size={20} className="animate-pulse" />
                    Generate Tomorrow's Idea
                </>
            )}
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
              isSaved={myIdeas.some(i => i.id === currentIdea.id)}
            />
            
            <section className="py-16 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
                    <h2 className="text-4xl font-serif text-blue-500 mb-2">The Idea Database</h2>
                    <p className="text-slate-500">Dive into deep research on 700+ business ideas</p>
                </div>
                
                {/* Placeholder Grid for Database */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 opacity-50 pointer-events-none">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-48 bg-slate-50 rounded-xl border border-slate-100"></div>
                    ))}
                </div>
                <div className="text-center mt-8">
                    <button className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium">Browse more ideas -></button>
                </div>
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

      {/* Only show footer on standard pages */}
      {currentView !== 'whiteboard' && <Footer onNavigate={setCurrentView} />}
    </div>
  );
};

export default App;
