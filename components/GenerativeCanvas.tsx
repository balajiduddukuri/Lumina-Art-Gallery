import React, { useRef, useEffect } from 'react';
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Set display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);

    drawGenerativeArt(ctx, attributes, seed, width, height);
  }, [attributes, seed, width, height]);

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