
import React, { useState, useRef } from 'react';
import { User, ChevronDown, Sparkles, Database, TrendingUp, Users, LayoutGrid } from 'lucide-react';
import { SacredGeometry } from './SacredGeometry';
import { ViewState } from '../types';

interface HeaderProps {
  onNavigate?: (page: ViewState) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveDropdown(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setActiveDropdown(null);
    }, 150); // Small delay to prevent flickering when moving mouse to dropdown
  };

  const handleNav = (page: ViewState) => {
    if (onNavigate) {
      onNavigate(page);
    }
    setActiveDropdown(null);
  };

  return (
    <header className="border-b border-slate-100 sticky top-0 z-50 bg-white/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav('home')}>
          <div className="w-8 h-8">
            <SacredGeometry className="w-full h-full" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">ideabrowser.com</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 h-full">
          {/* Find Ideas Dropdown */}
          <div 
            className="relative h-full flex items-center"
            onMouseEnter={() => handleMouseEnter('find-ideas')}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              className={`flex items-center gap-1 transition-colors ${activeDropdown === 'find-ideas' ? 'text-blue-600' : 'hover:text-blue-600'}`}
              onClick={() => handleNav('home')}
            >
              Find Ideas <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'find-ideas' ? 'rotate-180' : ''}`}/>
            </button>

            {activeDropdown === 'find-ideas' && (
              <div className="absolute top-full left-0 w-[640px] bg-white rounded-xl shadow-xl border border-slate-100 p-8 grid grid-cols-2 gap-12 animate-in fade-in slide-in-from-top-2 duration-200 z-50 -ml-4 mt-1">
                
                {/* Column 1: Idea Discovery */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6">Idea Discovery</div>
                  <div className="space-y-6">
                    <button onClick={() => handleNav('home')} className="flex items-start gap-4 group text-left w-full hover:bg-slate-50 -mx-3 p-3 rounded-xl transition-colors">
                      <div className="mt-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                         <Sparkles size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          Idea Generator 
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-bold uppercase">Starter</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                          Get AI-generated ideas tailored to your background
                        </p>
                      </div>
                    </button>

                    <button onClick={() => handleNav('home')} className="flex items-start gap-4 group text-left w-full hover:bg-slate-50 -mx-3 p-3 rounded-xl transition-colors">
                      <div className="mt-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                         <Database size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Idea Database</div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                          Explore 700+ validated business opportunities with research
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Column 2: Market Intelligence */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6">Market Intelligence</div>
                  <div className="space-y-6">
                    <button onClick={() => handleNav('home')} className="flex items-start gap-4 group text-left w-full hover:bg-slate-50 -mx-3 p-3 rounded-xl transition-colors">
                      <div className="mt-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                         <TrendingUp size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Trends</div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                          Discover emerging market categories and opportunities
                        </p>
                      </div>
                    </button>

                    <button onClick={() => handleNav('home')} className="flex items-start gap-4 group text-left w-full hover:bg-slate-50 -mx-3 p-3 rounded-xl transition-colors">
                       <div className="mt-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                         <Users size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Market Insights</div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                          Uncover hidden opportunities from online communities
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => handleNav('my-ideas')} className="hover:text-blue-600 flex items-center gap-1">Build Ideas <ChevronDown size={14}/></button>
          
          {/* Whiteboard Link */}
          <button onClick={() => handleNav('whiteboard')} className="hover:text-blue-600 flex items-center gap-1 text-purple-600 font-semibold">
            <LayoutGrid size={14} /> Whiteboard
          </button>
          
          <button onClick={() => handleNav('home')} className="hover:text-blue-600">Pricing</button>
        </nav>

        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 border rounded-full px-3 py-1.5 text-sm hover:bg-slate-50">
             <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                <User size={14} className="text-slate-500"/>
             </div>
             <span className="text-slate-700">dcbenson73</span>
             <ChevronDown size={14} className="text-slate-400"/>
           </button>
        </div>
      </div>
      
      <div className="bg-slate-50 py-2 text-center text-xs text-slate-500 border-b border-slate-100">
        ✨ The #1 Software to Spot Trends and Startup Ideas Worth Building. <button className="ml-2 bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Join</button>
      </div>
    </header>
  );
};
