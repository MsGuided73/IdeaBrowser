import React, { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { MOCK_TRENDS } from '../constants';
import { MarketTrend } from '../types';
import { getDailyTrends } from '../services/trendService';
import { Loader2, RefreshCw } from 'lucide-react';

export const TrendsGrid: React.FC = () => {
  const [trends, setTrends] = useState<MarketTrend[]>(MOCK_TRENDS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = async (forceRefresh = false) => {
      setIsLoading(true);
      setError(null);
      try {
          const liveTrends = await getDailyTrends(forceRefresh);
          if (liveTrends && liveTrends.length > 0) {
              setTrends(liveTrends);
          }
      } catch (err) {
          console.error("Failed to load live trends", err);
          setError("Failed to update trends. Showing latest cached or default trends.");
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      loadTrends();
  }, []);

  return (
    <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3">
                   <h2 className="text-4xl font-serif text-blue-500 mb-2">Daily Trends</h2>
                   {isLoading && <Loader2 size={24} className="text-blue-500 animate-spin" />}
                </div>
                <p className="text-slate-500">Live AI-analyzed emerging market opportunities</p>
                {error && <p className="text-amber-600 text-sm mt-2">{error}</p>}
                
                <button 
                  onClick={() => loadTrends(true)}
                  disabled={isLoading}
                  className="mt-4 flex items-center gap-2 mx-auto text-sm text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full"
                >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                    {isLoading ? "Analyzing..." : "Refresh Live Trends"}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {trends.map((trend, index) => (
                    <div key={index} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-4">
                            <h3 className="font-bold text-slate-800 mb-1">{trend.title}</h3>
                            <div className="flex gap-3 text-xs">
                                <span className="text-blue-600 font-bold">{trend.volume}</span>
                                <span className="text-green-500 font-bold">{trend.growth}</span>
                            </div>
                            <div className="flex gap-3 text-[10px] text-slate-400 uppercase">
                                <span>Volume</span>
                                <span>Growth</span>
                            </div>
                        </div>
                        
                        <div className="h-24 w-full mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trend.data}>
                                    <defs>
                                        <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill={`url(#grad-${index})`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                            {trend.description}
                        </p>
                    </div>
                ))}
            </div>
            
             <div className="text-center mt-12">
                <button className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                    See all trends -&gt;
                </button>
            </div>
        </div>
    </section>
  );
};
