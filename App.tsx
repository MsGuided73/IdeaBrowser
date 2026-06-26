
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { IdeaDetail } from './components/IdeaDetail';
import { TrendsGrid } from './components/TrendsGrid';
import { MyIdeas } from './components/MyIdeas';
import { IdeaGenerator } from './components/IdeaGenerator';
import { IdeaHistory } from './components/IdeaHistory';
import { IdeaDatabasePreview } from './components/IdeaDatabasePreview';
import { Sparkles } from 'lucide-react';
import { GOLF_IDEA } from './constants';
import { generateBusinessIdea, analyzeUserIdea } from './services/geminiService';
import { BusinessIdea, ViewState } from './types';

const App: React.FC = () => {
  const [currentIdea, setCurrentIdea] = useState<BusinessIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState<string | null>("Initializing Advanced Trend Analysis Module...");
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [myIdeas, setMyIdeas] = useState<BusinessIdea[]>(() => {
    try {
      const saved = localStorage.getItem('savedIdeas');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse saved ideas from localStorage", e);
    }
    return [GOLF_IDEA];
  });

  const [ideaHistory, setIdeaHistory] = useState<BusinessIdea[]>(() => {
    try {
      const saved = localStorage.getItem('ideaHistory');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse idea history from localStorage", e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('savedIdeas', JSON.stringify(myIdeas));
  }, [myIdeas]);

  useEffect(() => {
    localStorage.setItem('ideaHistory', JSON.stringify(ideaHistory));
  }, [ideaHistory]);

  const initialized = useRef(false);

  const handleAnalyzeUserIdea = async (title: string) => {
    if (!process.env.API_KEY) {
       alert("Please set your Gemini API Key in the environment variables to use this feature.");
       return;
    }

    setLoading(true);
    setLoadingStatus(`Compiling full dossier for "${title}"...`);
    setError(null);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const newIdea = await analyzeUserIdea(title);
      setCurrentIdea(newIdea);
      setIdeaHistory(prev => [newIdea, ...prev]);
    } catch (err) {
      setError("Failed to analyze idea. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStatus(null);
    }
  };

  const handleGenerateIdea = async () => {
    if (!process.env.API_KEY) {
       alert("Please set your Gemini API Key in the environment variables to use this feature.");
       setLoading(false);
       setLoadingStatus(null);
       return;
    }

    setLoading(true);
    setLoadingStatus("Initializing Advanced Trend Analysis Module...");
    setError(null);
    setCurrentView('home'); // Ensure we are on home to see the result
    
    // Scroll to top to show loading state in the main view
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const newIdea = await generateBusinessIdea((status) => setLoadingStatus(status));
      setCurrentIdea(newIdea);
      setIdeaHistory(prev => [newIdea, ...prev]);
    } catch (err) {
      setError("Failed to generate idea. The AI might be busy or the search quota exceeded. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStatus(null);
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      handleGenerateIdea();
    }
  }, []);

  const handleSaveIdea = (idea: BusinessIdea) => {
    setMyIdeas(prev => {
        // Prevent duplicates
        if (prev.some(i => i.id === idea.id)) return prev;
        return [idea, ...prev];
    });
  };

  const handleUpdateIdea = (updatedIdea: BusinessIdea) => {
    setCurrentIdea(updatedIdea);
    // If this idea exists in 'My Ideas', update it there too
    setMyIdeas(prev => prev.map(i => i.id === updatedIdea.id ? updatedIdea : i));
  };

  const handleDeleteIdea = (id: string) => {
    setMyIdeas(prev => prev.filter(idea => idea.id !== id));
    if (currentIdea && currentIdea.id === id) {
      setCurrentIdea(null);
      setCurrentView('my-ideas');
    }
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
              loadingStatus={loadingStatus}
              onSaveIdea={handleSaveIdea}
              onUpdateIdea={handleUpdateIdea}
              isSaved={currentIdea ? myIdeas.some(i => i.id === currentIdea.id) : false}
            />
            
            <IdeaDatabasePreview 
              onBrowseMore={() => alert("Redirecting to full database...")} 
              onSelectIdea={handleAnalyzeUserIdea}
            />

            <TrendsGrid />
          </>
        )}
        
        {currentView === 'generator' && (
          <IdeaGenerator 
            onIdeaGenerated={(idea) => {
              setCurrentIdea(idea);
              setIdeaHistory(prev => [idea, ...prev]);
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        
        {currentView === 'my-ideas' && (
          <MyIdeas 
              ideas={myIdeas}
              onAddIdea={(newIdea) => {
                  setMyIdeas([newIdea, ...myIdeas]);
                  setIdeaHistory(prev => [newIdea, ...prev]);
              }}
              onDeleteIdea={handleDeleteIdea}
              onNavigateHome={() => setCurrentView('home')} 
              onSelectIdea={(idea) => {
                  setCurrentIdea(idea);
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
          />
        )}

        {currentView === 'history' && (
          <IdeaHistory 
              history={ideaHistory}
              onClearHistory={() => setIdeaHistory([])}
              onNavigateHome={() => setCurrentView('home')} 
              onSelectIdea={(idea) => {
                  setCurrentIdea(idea);
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
          />
        )}
      </main>

      <Footer onNavigate={setCurrentView} />
    </div>
  );
};

export default App;
