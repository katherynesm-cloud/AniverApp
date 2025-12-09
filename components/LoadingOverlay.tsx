import React from 'react';

interface LoadingOverlayProps {
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      
      {/* Animated Logo Container */}
      <div className="relative mb-8 flex flex-col items-center">
        
        {/* Glowing Background Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-pink-200/50 rounded-full blur-2xl animate-pulse"></div>

        {/* Bouncing Cupcake Icon */}
        <div className="relative animate-bounce duration-[2000ms]">
          <svg 
            width="80" 
            height="80" 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
             {/* Candle */}
             <rect x="47" y="10" width="6" height="25" rx="3" fill="#FCD34D" />
             
             {/* Flame - Pulsing Animation */}
             <path 
               d="M50 0 C50 0 55 8 50 15 C 45 8 50 0 50 0Z" 
               fill="#F59E0B" 
               className="animate-pulse origin-bottom"
             />
             
             {/* Frosting */}
             <circle cx="30" cy="55" r="18" fill="#FB7185" />
             <circle cx="70" cy="55" r="18" fill="#FB7185" />
             <circle cx="50" cy="45" r="22" fill="#F43F5E" />
             
             {/* Sprinkles */}
             <circle cx="50" cy="40" r="3" fill="white" fillOpacity="0.8"/>
             <circle cx="35" cy="55" r="2" fill="white" fillOpacity="0.6"/>
             <circle cx="65" cy="52" r="2" fill="white" fillOpacity="0.6"/>

             {/* Wrapper */}
             <path d="M25 65 L 32 95 L 68 95 L 75 65 Z" fill="#FDA4AF" />
             <path d="M35 65 L 40 95" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.3"/>
             <path d="M45 65 L 50 95" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.3"/>
             <path d="M55 65 L 50 95" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.3"/>
             <path d="M65 65 L 60 95" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.3"/>
          </svg>
        </div>

        {/* Logo Text */}
        <h1 className="mt-4 font-handwriting font-bold text-4xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600 animate-pulse">
          AniverApp
        </h1>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-2">Criando Mágica...</h3>
      <p className="text-slate-500 max-w-xs leading-relaxed">{message}</p>
    </div>
  );
};