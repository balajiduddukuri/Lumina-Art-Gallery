import React, { useRef, useEffect, useState } from 'react';
import { ArtAttributes } from '../types';
import { drawGenerativeArt } from '../utils/renderEngine';

interface GenerativeCanvasProps {
  attributes: ArtAttributes;
  seed: number;
  width?: number;
  height?: number;
  className?: string;
  id?: string;
}

const GenerativeCanvas: React.FC<GenerativeCanvasProps> = ({ attributes, seed, width = 400, height = 400, className, id }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Once visible, we keep it rendered (or you could toggle to save memory)
        }
      },
      { rootMargin: '200px' } // Start rendering before it enters viewport
    );

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Only render if visible and haven't rendered yet (or if attributes/seed changed)
    // We add !hasRendered check to avoid re-drawing if we just scrolled back into view (if we chose to disconnect)
    // But since we disconnect on first sight, isVisible stays true. 
    // We need to re-run if attributes/seed change even if visible.
    
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    
    // Check if we need to resize
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }

    // Draw
    drawGenerativeArt(ctx, attributes, seed, width, height);
    setHasRendered(true);

  }, [attributes, seed, width, height, isVisible]);

  // Construct a meaningful label for screen readers
  const ariaLabel = `Generative art titled ${attributes.style}, features ${attributes.geo} and ${attributes.starry} in ${attributes.colorName}.`;

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      id={id}
      role="img"
      aria-label={ariaLabel}
    />
  );
};

export default GenerativeCanvas;