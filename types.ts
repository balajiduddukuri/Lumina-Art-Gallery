export interface ArtAttributes {
  geo: string;
  starry: string;
  kiss: string;
  colorName: string;
  style: string;
  movement: string; // New field for Art History Theme
  mood: string;
  texture: string;
  layout: string;
  symbol: string;
  artist: string;
  lighting: string;
  perspective: string;
  adj: string;
  intensity: string;
  ending: string;
}

export interface ArtPiece {
  id: string;
  title: string;
  prompt: string;
  timestamp: number;
  attributes: ArtAttributes;
  seed: number; // Used for deterministic rendering
}

export type ColorPalette = {
  name: string;
  colors: string[];
  background: string;
};