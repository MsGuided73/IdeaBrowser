import React, { useState, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendPoint } from '../types';
import { ChevronDown, Check, ChevronRight } from 'lucide-react';

interface TrendChartProps {
  data: TrendPoint[];
  keyword?: string;
  relatedKeywords?: string[];
  volume?: string;
  growth?: string;
  showHeader?: boolean;
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({ 
  data, 
  keyword = "", 
  relatedKeywords = [],
  volume = "6.6K", 
  growth = "+128%",
  showHeader = true,
  height = 200
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState(keyword);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedKeyword(keyword);
  }, [keyword]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const keywordsList = relatedKeywords.length > 0 ? relatedKeywords : [keyword];

  return (
    <div className={`${showHeader ? 'bg-white rounded-xl border border-slate-100 shadow-sm p-6' : 'w-full h-full'}`}>
      {showHeader && (
        <div className="flex justify-between items-start mb-6 relative z-20">
           <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                Keyword:
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="font-medium text-slate-800 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  {selectedKeyword} <ChevronDown size={14} />
                </button>
              </div>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {keywordsList.map((kw, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedKeyword(kw);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between group transition-colors"
                      >
                        <span className={`truncate ${kw === selectedKeyword ? 'text-blue-600 font-medium' : 'text-slate-600'}`}>
                          {kw}
                        </span>
                        {kw === selectedKeyword && <Check size={14} className="text-blue-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-100 bg-slate-50">
                     <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1 transition-colors">
                       Go to Keyword Analysis <ChevronRight size={12} />
                     </button>
                  </div>
                </div>
              )}
           </div>
           <div className="flex gap-4">
               <div className="text-right">
                   <div className="text-blue-600 font-bold text-2xl leading-none mb-1">{volume}</div>
                   <div className="text-xs text-slate-400">Volume <span className="text-slate-300">ⓘ</span></div>
               </div>
               <div className="text-right">
                   <div className="text-green-500 font-bold text-2xl leading-none mb-1">{growth}</div>
                   <div className="text-xs text-slate-400">Growth <span className="text-slate-300">ⓘ</span></div>
               </div>
           </div>
        </div>
      )}
      
      <div style={{ height: `${height}px`, width: '100%' }} className="relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 12, fill: '#94a3b8'}} 
                dy={10}
                hide={!showHeader}
            />
            <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
            />
            <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};