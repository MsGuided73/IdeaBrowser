import React from 'react';

interface SacredGeometryProps {
  className?: string;
}

export const SacredGeometry: React.FC<SacredGeometryProps> = ({ className }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full animate-[spin_10s_linear_infinite]"
        style={{ filter: 'drop-shadow(0 0 2px rgba(250, 204, 21, 0.5))' }}
      >
        <defs>
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        
        {/* Upward pointing tetrahedron (Triangle) */}
        <path 
          d="M50 15 L85 75 H15 Z" 
          fill="none" 
          stroke="url(#gold-gradient)" 
          strokeWidth="2"
          className="opacity-90"
        />
        
        {/* Downward pointing tetrahedron (Inverted Triangle) */}
        <path 
          d="M50 85 L15 25 H85 Z" 
          fill="none" 
          stroke="url(#gold-gradient)" 
          strokeWidth="2"
          className="opacity-90"
        />
        
        {/* Internal connecting lines to suggest 3D structure */}
        <path d="M50 15 L50 55" stroke="url(#gold-gradient)" strokeWidth="0.5" className="opacity-50" />
        <path d="M85 75 L50 55" stroke="url(#gold-gradient)" strokeWidth="0.5" className="opacity-50" />
        <path d="M15 75 L50 55" stroke="url(#gold-gradient)" strokeWidth="0.5" className="opacity-50" />
        
        <path d="M50 85 L50 45" stroke="url(#gold-gradient)" strokeWidth="0.5" className="opacity-50" />
        <path d="M15 25 L50 45" stroke="url(#gold-gradient)" strokeWidth="0.5" className="opacity-50" />
        <path d="M85 25 L50 45" stroke="url(#gold-gradient)" strokeWidth="0.5" className="opacity-50" />

        {/* Center glow */}
        <circle cx="50" cy="50" r="2" fill="#FDE047" className="animate-pulse" />
      </svg>
    </div>
  );
};