import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { MOCK_TRENDS } from '../constants';

export const TrendsGrid: React.FC = () => {
  return (
    <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-serif text-blue-500 mb-2">Trends</h2>
                <p className="text-slate-500">Discover emerging trends and opportunities</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {MOCK_TRENDS.map((trend, index) => (
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
                        
                        <div className="h-24 w-full mb-4" style={{ minHeight: '96px', minWidth: '200px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trend.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
                    See all trends {'->'} 
                </button>
            </div>
        </div>
    </section>
  );
};
