import { useState, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import './SleekPopcornRefresh.css';

// Three different popcorn shapes for variety
const PopcornShapes = [
  // Classic fluffy popcorn
  ({ scale }: { scale: number }) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>
      <path d="M12 4C9.5 4 7.5 5.5 7 7.5C5 8 3.5 9.5 3.5 11.5C3.5 13.5 5 15 7 15.5V16C7 18.2 8.8 20 11 20H13C15.2 20 17 18.2 17 16V15.5C19 15 20.5 13.5 20.5 11.5C20.5 9.5 19 8 17 7.5C16.5 5.5 14.5 4 12 4Z" fill="#FDF6E3" />
      <path d="M12 8C11.5 8 11 8.5 11 9C11 11 9 12 8 12C9.5 13 11.5 13 12 11C13 13 15 13 16 12C15 11 13 11 13 9C13 8.5 12.5 8 12 8Z" fill="#FCD34D" />
      <ellipse cx="9" cy="10" rx="1.5" ry="1" fill="#F59E0B" opacity="0.4" />
    </svg>
  ),
  // Rounded popcorn
  ({ scale }: { scale: number }) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>
      <path d="M12 5C10 5 8.5 6.5 8 8C6.5 8.5 5.5 10 5.5 11.5C5.5 13 6.5 14.5 8 15V16.5C8 18 9.5 19.5 11.5 19.5H12.5C14.5 19.5 16 18 16 16.5V15C17.5 14.5 18.5 13 18.5 11.5C18.5 10 17.5 8.5 16 8C15.5 6.5 14 5 12 5Z" fill="#FFFBEB" />
      <circle cx="10" cy="11" r="1.5" fill="#FBBF24" opacity="0.5" />
      <circle cx="14" cy="12" r="1" fill="#F59E0B" opacity="0.4" />
    </svg>
  ),
  // Angular popcorn
  ({ scale }: { scale: number }) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>
      <path d="M12 4L10 7L7 8L6 11L7 14L8 16L10 19H14L16 16L17 14L18 11L17 8L14 7L12 4Z" fill="#FEF3C7" />
      <path d="M12 7L11 9L9.5 10L9 11.5L9.5 13L10.5 15H13.5L14.5 13L15 11.5L14.5 10L13 9L12 7Z" fill="#FDE68A" />
      <path d="M11 11.5L11.5 12.5L12.5 13H13L12.5 12L12 11.5H11Z" fill="#FBBF24" />
    </svg>
  ),
];

interface PopcornParticle {
  id: number;
  scale: number;
  shapeIndex: number;
  x: number;
  y: number;
  rotation: number;
  delay: number;
  duration: number;
}

interface SleekPopcornRefreshProps {
  onRefresh?: () => void;
}

export default function SleekPopcornRefresh({ onRefresh }: SleekPopcornRefreshProps) {
  const [status, setStatus] = useState<'idle' | 'popping' | 'success'>('idle');
  const [popcorns, setPopcorns] = useState<PopcornParticle[]>([]);

  const handleRefresh = useCallback(() => {
    if (status !== 'idle') return;

    // Trigger haptic feedback on supported devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 20, 30]);
    }

    setStatus('popping');
    if (onRefresh) onRefresh();

    setTimeout(() => {
      const particleCount = 28;
      const newPopcorns = Array.from({ length: particleCount }, (_, i) => {
        // More natural explosion pattern
        const angle = (Math.random() * 100) - 50; // Narrower spread for upward shot
        const angleRad = (angle * Math.PI) / 180;
        const velocity = 150 + Math.random() * 200;
        
        // Calculate actual x,y positions
        // Negative Y is UP in CSS transform
        const maxX = Math.sin(angleRad) * velocity;
        const maxY = (Math.cos(angleRad) * velocity * -1) - 150; // Ensure they go up and stay up
        
        return {
          id: Date.now() + i,
          scale: 0.6 + Math.random() * 0.8,
          shapeIndex: Math.floor(Math.random() * PopcornShapes.length),
          x: maxX,
          y: maxY,
          rotation: (Math.random() > 0.5 ? 360 : -360) + Math.random() * 180,
          delay: Math.random() * 0.15,
          duration: 1.2 + Math.random() * 0.5,
        };
      });

      setPopcorns(newPopcorns);
      setStatus('success');

      setTimeout(() => {
        setPopcorns([]);
        setStatus('idle');
      }, 2200);
    }, 500);
  }, [status, onRefresh]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleRefresh();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

  return (
    <div className="relative inline-block">
      
      {/* Matte Dark Button - Matched to Image */}
      <button 
        onClick={handleRefresh} 
        disabled={status !== 'idle'} 
        aria-label="Refresh feed" 
        className={` 
          relative group flex items-center gap-2 px-5 py-2 rounded-full 
          text-sm font-medium tracking-wide transition-all duration-300 ease-out
          shadow-xl
          active:scale-95 
          disabled:cursor-not-allowed 
          ${status === 'popping' 
            ? 'bg-[#151922] text-red-400 shadow-red-500/5 ring-1 ring-red-500/10' 
            : status === 'success' 
            ? 'bg-[#151922] text-pink-400 shadow-pink-500/5 ring-1 ring-pink-500/10' 
            : 'bg-[#151922] text-slate-300 hover:text-white hover:bg-[#1a1f2b] shadow-black/50 ring-1 ring-white/5' 
          } 
          ${status !== 'idle' ? 'opacity-100' : 'opacity-100'} 
        `} 
      > 
        <div className="relative w-4 h-4"> 
          <RefreshCw 
            className={`absolute inset-0 w-4 h-4 transition-all duration-700 ease-in-out ${ 
              status === 'popping' ? 'animate-spin opacity-100 scale-100 text-red-500' : 
              status === 'success' ? 'opacity-100 scale-100 text-pink-400' : 'opacity-100 scale-100 text-red-500 group-hover:rotate-180' 
            }`} 
          /> 
        </div> 
        
        <span className={`relative z-10 transition-colors duration-300 ${
          status === 'popping' ? 'text-red-400' : ''
        }`}> 
          {status === 'success' ? 'Updated' : 'Refresh'} 
        </span> 

        {/* Subtle shimmer for popping state */} 
        {status === 'popping' && ( 
          <div className="absolute inset-0 rounded-full overflow-hidden">
             <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500/50 to-transparent animate-[shimmer_1s_ease-in-out_infinite]" /> 
          </div>
        )} 
      </button> 

      {/* Popcorn Particle System */} 
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 pointer-events-none overflow-visible z-50"> 
        {popcorns.map((p) => { 
          const PopcornShape = PopcornShapes[p.shapeIndex]; 
          return ( 
            <div 
              key={p.id} 
              className="absolute top-0 left-0 popcorn-particle" 
              style={{ 
                animationDelay: `${p.delay}s`, 
                animationDuration: `${p.duration}s`, 
                '--tx': `${p.x}px`, 
                '--ty': `${p.y}px`, 
                '--rotation': `${p.rotation}deg`, 
              } as React.CSSProperties} 
            > 
              <div 
                className="w-8 h-8 particle-inner" 
                style={{ 
                  transform: `scale(${p.scale})`, 
                }} 
              > 
                <PopcornShape scale={p.scale} /> 
              </div> 
            </div> 
          ); 
        })} 
      </div> 
    </div> 
  );
}
