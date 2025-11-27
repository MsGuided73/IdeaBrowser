
import React from 'react';

export const Logo: React.FC<{ className?: string, showText?: boolean }> = ({ className, showText = true }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-10 h-10 flex-shrink-0">
         <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
            {/* Hat Brim */}
            <ellipse cx="50" cy="85" rx="45" ry="10" fill="#1e3a8a" />
            {/* Hat Cone - Blue */}
            <path d="M15 85 Q 50 -10 85 85 Z" fill="#2563eb" />
            {/* Hat Band - Green */}
            <path d="M22 75 Q 50 85 78 75 L 82 85 Q 50 95 18 85 Z" fill="#16a34a" /> 
            {/* Dollar Sign - Yellow/Gold */}
            <text x="50" y="65" fontSize="35" fontWeight="900" fill="#facc15" textAnchor="middle" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))', fontFamily: 'serif' }}>$</text>
            {/* Shine */}
            <path d="M35 30 Q 40 40 30 50" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
         </svg>
      </div>
      {showText && (
        <div className="font-extrabold text-2xl tracking-tight leading-none font-sans">
            <span className="text-green-600">biz</span>
            <span className="text-blue-600">wiz</span>
        </div>
      )}
    </div>
  );
};
