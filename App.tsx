import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateArtPiece, generateArtBatch } from './utils/generator';
import { ArtPiece } from './types';
import ArtCard from './components/ArtCard';
import GenerativeCanvas from './components/GenerativeCanvas';
import { downloadHighRes, shareArt } from './utils/actions';
import { Play, Pause, RefreshCw, X, Sparkles, Palette, Download, Share2, Heart, Loader2, Home, Info, Grid } from 'lucide-react';
import { app_themes, AUTO_GENERATE_INTERVAL, STORAGE_KEY, INITIAL_BATCH_SIZE, SCROLL_BATCH_SIZE } from './constants';

type ViewMode = 'home' | 'gallery' | 'favorites' | 'about';

// Skeleton Component for Loading State
const SkeletonCard = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden animate-pulse h-full">
    <div className="aspect-square bg-slate-800/50" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-slate-800 rounded w-3/4" />
      <div className="h-3 bg-slate-800/60 rounded w-1/3 mb-2" />
      <div className="space-y-2 pt-1">
        <div className="h-2 bg-slate-800/40 rounded w-full" />
        <div className="h-2 bg-slate-800/40 rounded w-5/6" />
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  // Initialize with a full batch for immediate content
  const [gallery, setGallery] = useState<ArtPiece[]>(() => generateArtBatch(INITIAL_BATCH_SIZE));
  const [favorites, setFavorites] = useState<ArtPiece[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load favorites", e);
      return [];
    }
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedPiece, setSelectedPiece] = useState<ArtPiece | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Progress bar state for auto mode
  const [progress, setProgress] = useState(0);
  const autoModeTimer = useRef<number | null>(null);
  const progressTimer = useRef<number | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Rotating Theme
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentThemeIndex((prev) => (prev + 1) % app_themes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Core generation logic (adds to TOP)
  const handleGenerate = useCallback(() => {
    if (viewMode === 'favorites') return; 
    
    // Switch to gallery if generating from elsewhere
    if (viewMode !== 'gallery') setViewMode('gallery');

    setIsGenerating(true);
    const delay = 600; 

    setTimeout(() => {
      const newPiece = generateArtPiece();
      setGallery(prev => [newPiece, ...prev]);
      setIsGenerating(false);
    }, delay);
  }, [viewMode]);

  // Load more logic (adds to BOTTOM)
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || viewMode !== 'gallery') return;

    setIsLoadingMore(true);
    // Simulate network delay for "fetching"
    setTimeout(() => {
      const newBatch = generateArtBatch(SCROLL_BATCH_SIZE);
      setGallery(prev => [...prev, ...newBatch]);
      setIsLoadingMore(false);
    }, 800);
  }, [isLoadingMore, viewMode]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMore && !isAutoMode && viewMode === 'gallery') {
          loadMoreItems();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current && viewMode === 'gallery') {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMoreItems, viewMode, isLoadingMore, isAutoMode]);

  // Save favorites whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  // Handle Auto Mode Logic
  useEffect(() => {
    if (isAutoMode) {
      if (viewMode !== 'gallery') setViewMode('gallery');
      setProgress(0);
      
      const startTime = Date.now();
      
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min((elapsed / AUTO_GENERATE_INTERVAL) * 100, 100);
        setProgress(pct);
        
        if (pct < 100) {
          progressTimer.current = requestAnimationFrame(animateProgress);
        }
      };
      progressTimer.current = requestAnimationFrame(animateProgress);

      autoModeTimer.current = window.setInterval(() => {
        handleGenerate();
        
        // Reset animation
        if (progressTimer.current) cancelAnimationFrame(progressTimer.current);
        setProgress(0);
        const newStart = Date.now();
        const loop = () => {
           const e = Date.now() - newStart;
           const p = Math.min((e / AUTO_GENERATE_INTERVAL) * 100, 100);
           setProgress(p);
           if (p < 100) progressTimer.current = requestAnimationFrame(loop);
        };
        progressTimer.current = requestAnimationFrame(loop);
      }, AUTO_GENERATE_INTERVAL);
    } else {
      if (autoModeTimer.current) {
        clearInterval(autoModeTimer.current);
        autoModeTimer.current = null;
      }
      if (progressTimer.current) {
        cancelAnimationFrame(progressTimer.current);
        progressTimer.current = null;
      }
      setProgress(0);
    }
    return () => {
      if (autoModeTimer.current) clearInterval(autoModeTimer.current);
      if (progressTimer.current) cancelAnimationFrame(progressTimer.current);
    };
  }, [isAutoMode, handleGenerate, viewMode]);

  const toggleAutoMode = () => {
    setIsAutoMode(!isAutoMode);
  };

  const toggleFavorite = (piece: ArtPiece) => {
    setFavorites(prev => {
      const exists = prev.some(p => p.id === piece.id);
      if (exists) {
        return prev.filter(p => p.id !== piece.id);
      } else {
        return [piece, ...prev];
      }
    });
  };

  const isFavorite = (id: string) => favorites.some(p => p.id === id);
  const displayGallery = viewMode === 'gallery' ? gallery : favorites;

  // Render Views
  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-fade-in-up">
      <div className="mb-8 p-6 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-slate-700/50">
        <Sparkles size={64} className="text-cyan-400" />
      </div>
      <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 bg-clip-text text-transparent serif mb-8 max-w-4xl leading-tight">
        Lumina Gallery
      </h1>
      <div className="h-24 md:h-20 max-w-3xl flex items-center justify-center mb-8">
        <p className="text-xl md:text-2xl text-slate-300 transition-opacity duration-1000 ease-in-out font-light italic">
          "{app_themes[currentThemeIndex]}"
        </p>
      </div>
      <button 
        onClick={() => setViewMode('gallery')}
        className="group relative px-8 py-4 bg-slate-100 text-slate-900 rounded-full font-bold text-lg hover:bg-white transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
      >
        Enter Gallery
        <span className="absolute inset-0 rounded-full ring-2 ring-white/50 animate-pulse-slow"></span>
      </button>
    </div>
  );

  const renderAbout = () => (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
      <h2 className="text-4xl font-bold serif text-slate-100 mb-8 border-b border-slate-800 pb-4">Philosophy of Lumina</h2>
      
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div>
          <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <Grid size={20} /> The Geometric Foundation
          </h3>
          <p className="text-slate-400 leading-relaxed">
            Every piece begins with structure. We utilize complex algorithms to generate Voronoi diagrams, 
            fractal trees, and coordinate meshes. This represents the orderly, logical nature of the universe—the 
            skeletal framework upon which reality hangs.
          </p>
        </div>
        <div>
          <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            <Sparkles size={20} /> The Cosmic Overlay
          </h3>
          <p className="text-slate-400 leading-relaxed">
            To the structure, we apply chaos. Nebulae, star clusters, and atmospheric turbulence are rendered 
            using noise functions and gradient maps. This layer introduces the unpredictable, emotional, and 
            sublime elements of creation.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 mb-12">
        <h3 className="text-2xl font-bold serif text-slate-200 mb-4">Historical Resonance</h3>
        <p className="text-slate-400 leading-relaxed mb-6">
          Lumina doesn't just draw randomly; it dreams in the styles of history. From the golden mosaics of 
          <span className="text-amber-400"> Gustav Klimt</span> to the swirling turbulence of 
          <span className="text-blue-400"> Van Gogh</span>, and the shattered perspectives of 
          <span className="text-rose-400"> Cubism</span>, the engine reinterprets classic art movements through a digital lens.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Impressionism', 'Baroque', 'Surrealism', 'Cyberpunk', 'Art Nouveau', 'Futurism', 'Cosmic Futurism'].map(tag => (
            <span key={tag} className="px-3 py-1 bg-slate-800 text-slate-400 text-sm rounded-full border border-slate-700">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-500 selection:text-white pb-20">
      
      {/* Header */}
      <header className="fixed top-0 w-full z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 transition-all duration-300 shadow-lg">
        {isAutoMode && (
          <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setViewMode('home')}>
            <Palette className="text-cyan-400 group-hover:rotate-12 transition-transform duration-300" size={24} />
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent serif tracking-tight">
              Lumina
            </h1>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            
            {/* Nav Links */}
            <nav className="hidden md:flex bg-slate-900/50 rounded-full p-1 border border-slate-800 mr-4">
               <button onClick={() => setViewMode('home')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'home' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Home</button>
               <button onClick={() => setViewMode('gallery')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'gallery' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Gallery</button>
               <button onClick={() => setViewMode('favorites')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'favorites' ? 'bg-rose-900/40 text-rose-200' : 'text-slate-400 hover:text-white'}`}>Favorites</button>
               <button onClick={() => setViewMode('about')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'about' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>About</button>
            </nav>

            {/* Mobile Nav Icons */}
             <div className="flex md:hidden mr-2 gap-1">
               <button onClick={() => setViewMode('home')} className={`p-2 rounded-full ${viewMode === 'home' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}><Home size={18} /></button>
               <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-full ${viewMode === 'gallery' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}><Grid size={18} /></button>
               <button onClick={() => setViewMode('favorites')} className={`p-2 rounded-full ${viewMode === 'favorites' ? 'bg-slate-800 text-rose-400' : 'text-slate-400'}`}><Heart size={18} /></button>
               <button onClick={() => setViewMode('about')} className={`p-2 rounded-full ${viewMode === 'about' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'}`}><Info size={18} /></button>
             </div>

            {/* Controls */}
            {(viewMode === 'gallery' || viewMode === 'favorites') && (
              <>
                <button 
                  onClick={toggleAutoMode}
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                    isAutoMode 
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse-slow shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400'
                  }`}
                  title={isAutoMode ? "Pause generation" : "Auto-generate art"}
                >
                  {isAutoMode ? <Pause size={14} /> : <Play size={14} />}
                  {isAutoMode ? 'Auto On' : 'Auto'}
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={isAutoMode || viewMode === 'favorites'}
                  className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-900/20 transition-all active:scale-95 text-xs md:text-sm ${isAutoMode || viewMode === 'favorites' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                  <span className="hidden md:inline">Generate</span>
                  <span className="md:hidden">New</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-[80vh]">
        
        {viewMode === 'home' && renderHome()}
        {viewMode === 'about' && renderAbout()}

        {/* Gallery / Favorites Grid */}
        {(viewMode === 'gallery' || viewMode === 'favorites') && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
              {/* Skeleton for "New" generation (Top) */}
              {isGenerating && viewMode === 'gallery' && (
                <div className="animate-fade-in">
                  <SkeletonCard />
                </div>
              )}

              {displayGallery.map(piece => (
                <div key={piece.id} className="animate-fade-in">
                  <ArtCard 
                    piece={piece} 
                    onSelect={setSelectedPiece} 
                    isFavorite={isFavorite(piece.id)}
                    onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(piece); }}
                  />
                </div>
              ))}

              {/* Skeletons for "Load More" (Bottom) */}
              {isLoadingMore && viewMode === 'gallery' && (
                 <>
                    <div className="animate-fade-in"><SkeletonCard /></div>
                    <div className="hidden sm:block animate-fade-in"><SkeletonCard /></div>
                    <div className="hidden lg:block animate-fade-in"><SkeletonCard /></div>
                 </>
              )}
            </div>

            {/* Infinite Scroll Sentinel */}
            {viewMode === 'gallery' && !isAutoMode && (
              <div ref={observerTarget} className="h-20 w-full flex items-center justify-center text-slate-500">
                 {isLoadingMore ? (
                   <div className="flex items-center gap-2">
                     <Loader2 className="animate-spin" size={20} />
                     <span>Dreaming up new worlds...</span>
                   </div>
                 ) : (
                   <span className="opacity-0">Sentinel</span>
                 )}
              </div>
            )}

            {/* Empty States */}
            {!isGenerating && displayGallery.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 min-h-[40vh]">
                {viewMode === 'favorites' ? (
                  <>
                    <Heart size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-400">No favorites yet.</p>
                    <p className="text-sm mt-2">Click the heart icon on any art piece to save it here.</p>
                  </>
                ) : (
                  <>
                    <Sparkles size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-400">Gallery is empty.</p>
                    <button onClick={handleGenerate} className="text-cyan-400 hover:text-cyan-300 underline mt-2">
                      Generate some art
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      {selectedPiece && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setSelectedPiece(null)}
          role="dialog"
          aria-modal="true"
        >
           <div 
             className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-200" 
             onClick={e => e.stopPropagation()}
           >
              {/* Canvas Side */}
              <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-4 relative aspect-square md:aspect-auto">
                 <GenerativeCanvas 
                   attributes={selectedPiece.attributes} 
                   seed={selectedPiece.seed} 
                   width={800} 
                   height={800} 
                   className="w-full h-full object-contain max-h-[70vh] shadow-2xl" 
                 />
              </div>
              
              {/* Info Side */}
              <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto bg-slate-900">
                 <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0 mr-4">
                      <h2 className="text-2xl md:text-3xl font-bold serif text-white mb-2 leading-tight break-words">{selectedPiece.title}</h2>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded-md bg-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold border border-slate-700 text-cyan-400">{selectedPiece.attributes.movement}</span>
                        <span className="px-2 py-1 rounded-md bg-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold border border-slate-700">{selectedPiece.attributes.style}</span>
                        <span className="px-2 py-1 rounded-md bg-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold border border-slate-700">{selectedPiece.attributes.colorName}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedPiece(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors flex-shrink-0" aria-label="Close details">
                      <X size={24} />
                    </button>
                 </div>

                 <div className="prose prose-invert max-w-none mb-8 flex-grow">
                    <p className="text-lg leading-relaxed text-slate-300 italic border-l-4 border-cyan-500/50 pl-4 py-1 bg-slate-800/30 rounded-r-lg">
                      {selectedPiece.prompt}
                    </p>
                    
                    <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-slate-400">
                      <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
                        <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Layout</span>
                        <span className="text-slate-300">{selectedPiece.attributes.layout}</span>
                      </div>
                       <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
                        <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Mood</span>
                        <span className="text-slate-300">{selectedPiece.attributes.mood}</span>
                      </div>
                       <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
                        <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Texture</span>
                        <span className="text-slate-300">{selectedPiece.attributes.texture}</span>
                      </div>
                       <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
                        <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Symbolism</span>
                        <span className="text-slate-300">{selectedPiece.attributes.symbol}</span>
                      </div>
                    </div>
                 </div>

                 <div className="flex gap-3 mt-auto pt-6 border-t border-slate-800">
                    <button 
                      onClick={() => toggleFavorite(selectedPiece)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${isFavorite(selectedPiece.id) ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'}`}
                    >
                      <Heart size={20} className={isFavorite(selectedPiece.id) ? "fill-current" : ""} />
                      {isFavorite(selectedPiece.id) ? 'Favorited' : 'Favorite'}
                    </button>
                    <button 
                      onClick={() => shareArt(selectedPiece)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all border border-slate-700"
                    >
                      <Share2 size={20} />
                      Share
                    </button>
                     <button 
                      onClick={() => downloadHighRes(selectedPiece)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-800/50 font-medium transition-all"
                    >
                      <Download size={20} />
                      Save HD
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;