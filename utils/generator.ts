import {
  geo_fragments, starry_fragments, kiss_fragments, symbolisms, artist_mashups,
  color_palette_keys, styles, historical_movements, textures, layouts, perspectives, lighting,
  moods, adjectives, intensity_words, endings
} from '../constants';
import { ArtAttributes, ArtPiece } from '../types';

// Fisher-Yates shuffle for better randomness than sort()
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function pick(source: string[], n: number = 1): string {
  const shuffled = shuffleArray(source);
  return shuffled.slice(0, n).join(", ");
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const generateArtPiece = (): ArtPiece => {
  // Random count 1-3, matching the Python script's logic
  const geo = pick(geo_fragments, Math.floor(Math.random() * 3) + 1);
  const starry = pick(starry_fragments, Math.floor(Math.random() * 3) + 1);
  const kiss = pick(kiss_fragments, Math.floor(Math.random() * 3) + 1);

  const colorName = color_palette_keys[Math.floor(Math.random() * color_palette_keys.length)];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const movement = historical_movements[Math.floor(Math.random() * historical_movements.length)];
  const mood = moods[Math.floor(Math.random() * moods.length)];
  const texture = textures[Math.floor(Math.random() * textures.length)];
  const layout = layouts[Math.floor(Math.random() * layouts.length)];
  const symbol = symbolisms[Math.floor(Math.random() * symbolisms.length)];
  const artist = artist_mashups[Math.floor(Math.random() * artist_mashups.length)];
  const lightingChoice = lighting[Math.floor(Math.random() * lighting.length)];
  const perspectiveChoice = perspectives[Math.floor(Math.random() * perspectives.length)];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const intensity = intensity_words[Math.floor(Math.random() * intensity_words.length)];
  const ending = endings[Math.floor(Math.random() * endings.length)];

  // Random Sentence Structure selection
  const structIndex = Math.floor(Math.random() * 3);
  let finalPrompt = "";

  if (structIndex === 0) {
    const verb = pick(['blending', 'merging', 'interweaving', 'harmonizing'], 1);
    finalPrompt = `A ${mood} ${style} interpreting ${movement} on a ${layout}, ${intensity} crafted with ${texture} and ${lightingChoice}, ${verb} ${geo} with ${starry} and ${kiss}, colored in ${colorName}, ${symbol} — ${ending}`;
  } else if (structIndex === 1) {
    finalPrompt = `${capitalize(intensity)} shaped in ${style} reflecting ${movement} and framed through a ${perspectiveChoice}, this ${adj} artwork combines ${geo}, ${starry}, and ${kiss}, enriched by ${texture}, using a palette of ${colorName}. ${symbol}. ${ending}`;
  } else {
    const verb = pick(['fuses', 'entangles', 'layers'], 1);
    finalPrompt = `In a ${layout} echoing ${movement} and illuminated by ${lightingChoice}, the piece ${verb} ${geo}, ${starry}, and ${kiss} with ${texture} strokes of ${colorName}. Inspired by ${artist}, it ${symbol} ${ending}`;
  }

  const attributes: ArtAttributes = {
    geo, starry, kiss, colorName, style, movement, mood, texture, layout,
    symbol, artist, lighting: lightingChoice, perspective: perspectiveChoice,
    adj, intensity, ending
  };

  const titles = [
    `${capitalize(mood)} ${capitalize(movement)}`,
    `${capitalize(style)} of ${capitalize(movement.split(' ').pop() || 'Art')}`,
    `The ${capitalize(adj)} Composition`,
    `${capitalize(artist)} Reflection`,
    `Echoes of ${colorName.split(' ')[0]}`,
    `${capitalize(symbol.split(' ')[1])} in Motion`
  ];

  return {
    id: crypto.randomUUID(),
    title: titles[Math.floor(Math.random() * titles.length)],
    prompt: finalPrompt,
    timestamp: Date.now(),
    attributes,
    seed: Math.random()
  };
};

export const generateArtBatch = (count: number): ArtPiece[] => {
  return Array.from({ length: count }, () => generateArtPiece());
};