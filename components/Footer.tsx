
import React from 'react';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate?: (page: 'home' | 'my-ideas') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-slate-100 py-12">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
             <div>
                <div className="flex items-center gap-2 mb-4">
                    <Logo />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Turn your ideas into money with real-time market trends, startup ideas, and go-to-market tactics.
                </p>
             </div>
             
             <div>
                 <h4 className="font-bold text-slate-800 mb-4 text-sm">Browse Ideas</h4>
                 <ul className="space-y-2 text-xs text-slate-500">
                     <li><button onClick={() => onNavigate?.('home')} className="hover:text-blue-600 text-left">Idea of the Day</button></li>
                     <li><a href="#" className="hover:text-blue-600">Idea Database</a></li>
                     <li><a href="#" className="hover:text-blue-600">Trends</a></li>
                     <li><a href="#" className="hover:text-blue-600">Market Insights</a></li>
                 </ul>
             </div>

             <div>
                 <h4 className="font-bold text-slate-800 mb-4 text-sm">Tools</h4>
                 <ul className="space-y-2 text-xs text-slate-500">
                     <li><a href="#" className="hover:text-blue-600">Idea Generator</a></li>
                     <li><button onClick={() => onNavigate?.('my-ideas')} className="hover:text-blue-600 text-left">My Ideas</button></li>
                     <li><a href="#" className="hover:text-blue-600">Idea Builder</a></li>
                 </ul>
             </div>

             <div>
                 <h4 className="font-bold text-slate-800 mb-4 text-sm">Resources</h4>
                 <ul className="space-y-2 text-xs text-slate-500">
                     <li><a href="#" className="hover:text-blue-600">About</a></li>
                     <li><a href="#" className="hover:text-blue-600">Success Stories</a></li>
                     <li><a href="#" className="hover:text-blue-600">FAQ</a></li>
                 </ul>
             </div>
          </div>
          
          <div className="border-t border-slate-100 mt-12 pt-8 flex flex-col md:flex-row justify-between text-[10px] text-slate-400">
              <p>© 2025 BizWiz. All rights reserved.</p>
              <div className="flex gap-4 mt-2 md:mt-0">
                  <a href="#">Terms and Conditions</a>
                  <a href="#">Privacy Policy</a>
                  <a href="#">Data Protection</a>
              </div>
          </div>
       </div>
    </footer>
  );
};
