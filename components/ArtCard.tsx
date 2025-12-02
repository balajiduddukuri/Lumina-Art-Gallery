import React, { useState } from 'react';
import { ArtPiece } from '../types';
import GenerativeCanvas from './GenerativeCanvas';
import { downloadHighRes, shareArt } from '../utils/actions';
import { Download, Maximize2, Share2, Heart } from 'lucide-react';

interface ArtCardProps {
  piece: ArtPiece;
  onSelect: (piece: ArtPiece) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

const ArtCard: React.FC<ArtCardProps> = ({ piece, onSelect, isFavorite, onToggleFavorite }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadHighRes(piece);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    shareArt(piece);
  };

  return (
    <div 
      className="group relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-cyan-900/20 hover:shadow-2xl hover:border-slate-600 focus-within:ring-2 focus-within:ring-cyan-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(piece)}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${piece.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(piece);
        }
      }}
    >
      <div className="aspect-square relative overflow-hidden bg-slate-950">
        <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-105">
            <GenerativeCanvas 
                attributes={piece.attributes} 
                seed={piece.seed} 
                width={400} 
                height={400} 
                className="w-full h-full object-cover"
            />
        </div>
        
        {/* Actions Overlay: Visible on hover for desktop, always rendered for screen readers */}
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center gap-3 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(piece); }} 
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white" 
            title="View Details"
            aria-label="Maximize view"
          >
            <Maximize2 size={20} />
          </button>
          <button 
            onClick={onToggleFavorite} 
            className={`p-3 rounded-full backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-white ${isFavorite ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`} 
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            aria-label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Heart size={20} className={isFavorite ? "fill-current" : ""} />
          </button>
          <button 
            onClick={handleShare} 
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white" 
            title="Share Art"
            aria-label="Share art"
          >
            <Share2 size={20} />
          </button>
          <button 
            onClick={handleDownload} 
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white" 
            title="Download High Res (2k)"
            aria-label="Download High Res"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-medium text-slate-100 serif truncate">{piece.title}</h3>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-cyan-400/90">{piece.attributes.movement}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span className="opacity-75">{piece.attributes.style}</span>
        </p>
        <p className="text-sm text-slate-500 mt-3 line-clamp-2 italic leading-relaxed">
          "{piece.prompt.substring(0, 100)}..."
        </p>
      </div>
    </div>
  );
};

export default ArtCard;