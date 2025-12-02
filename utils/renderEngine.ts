import { ArtAttributes } from '../types';
import { PALETTES } from '../constants';

// LCG Random Generator for deterministic visual output
export class Random {
  seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
  bool(chance: number = 0.5) {
      return this.next() < chance;
  }
  shuffle<T>(array: T[]): T[] {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
          const j = Math.floor(this.next() * (i + 1));
          [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
  }
}

/**
 * Pure rendering function used by components and export actions.
 */
export const drawGenerativeArt = (
  ctx: CanvasRenderingContext2D,
  attributes: ArtAttributes,
  seed: number,
  width: number,
  height: number
) => {
    const rng = new Random(seed);
    const palette = PALETTES[attributes.colorName] || PALETTES["radiant gold and deep ultramarine"];
    const w = width;
    const h = height;
    const scale = Math.min(w, h) / 800; // Base scale factor

    // --- 1. Global Mood & Intensity Parameters ---
    // Mood affects density, line weights, and chaos
    const moodLower = attributes.mood.toLowerCase();
    const intensityLower = attributes.intensity.toLowerCase();

    const isCalm = moodLower.includes('calm') || moodLower.includes('meditative');
    const isBold = moodLower.includes('bold') || moodLower.includes('energetic') || moodLower.includes('vibrant');
    
    // Intensity Logic: "Softly" vs "Fiercely" affects opacity and saturation logic
    const isSoft = intensityLower.match(/soft|quiet|subtl|delicate|tender|wistful|dream/);
    const isIntense = intensityLower.match(/bold|deep|vibrant|fierce|wild|power|dramatic/);

    let globalAlphaMod = 1.0;
    if (isSoft) globalAlphaMod = 0.7;
    if (isIntense) globalAlphaMod = 1.0; // Keep full opacity but maybe increase line weight

    const densityMod = (isCalm ? 0.6 : (isBold ? 1.5 : 1.0));
    const lineMod = (isBold || isIntense ? 1.5 : 1.0) * (isSoft ? 0.8 : 1.0);

    // --- Helpers ---
    const getColor = (alpha: number = 1.0) => {
        const c = rng.choice(palette.colors);
        // Apply global alpha modifier
        const finalAlpha = alpha * globalAlphaMod;
        
        if(c.startsWith('#') && c.length === 7) {
            const r = parseInt(c.slice(1,3), 16);
            const g = parseInt(c.slice(3,5), 16);
            const b = parseInt(c.slice(5,7), 16);
            return `rgba(${r},${g},${b},${finalAlpha})`;
        }
        return c;
    };

    const has = (text: string, keywords: string[]) => keywords.some(k => text.toLowerCase().includes(k));

    // --- 2. Background / Style Textures ---
    const drawBackgroundStyle = () => {
        const style = attributes.style.toLowerCase();
        
        ctx.fillStyle = palette.background;
        ctx.fillRect(0, 0, w, h);

        if (style.includes('watercolor') || style.includes('wash') || style.includes('ink')) {
            const count = rng.range(15, 30) * densityMod;
            ctx.globalCompositeOperation = 'multiply';
            for(let i=0; i<count; i++) {
                const cx = rng.range(0, w);
                const cy = rng.range(0, h);
                const r = rng.range(100, 500) * scale;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, getColor(0.3));
                grad.addColorStop(1, getColor(0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                for(let a=0; a<=Math.PI*2; a+=0.5) {
                    const radius = r + rng.range(-30, 30) * scale;
                    ctx.lineTo(cx + Math.cos(a)*radius, cy + Math.sin(a)*radius);
                }
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        } 
        else if (style.includes('oil') || style.includes('impasto') || style.includes('expressionist')) {
            const count = rng.range(60, 120) * densityMod;
            for(let i=0; i<count; i++) {
                ctx.strokeStyle = getColor(0.7);
                ctx.lineWidth = rng.range(10, 50) * scale * lineMod;
                ctx.lineCap = 'round';
                ctx.beginPath();
                const x = rng.range(-100, w+100);
                const y = rng.range(-100, h+100);
                ctx.moveTo(x, y);
                const cp1x = x + rng.range(-100,100);
                const cp1y = y + rng.range(-100,100);
                const endx = x + rng.range(-200,200);
                const endy = y + rng.range(-200,200);
                ctx.quadraticCurveTo(cp1x, cp1y, endx, endy);
                ctx.stroke();
            }
        }
        else if (style.includes('digital') || style.includes('cyber') || style.includes('glitch') || style.includes('vector')) {
            const count = rng.range(30, 80) * densityMod;
            for(let i=0; i<count; i++) {
                ctx.fillStyle = getColor(rng.range(0.1, 0.4));
                const bw = rng.range(10, 300)*scale;
                const bh = rng.range(2, 40)*scale;
                ctx.fillRect(rng.range(-50, w), rng.range(-50, h), bw, bh);
            }
        }
        else {
             // Generic atmospheric background
             const grad = ctx.createLinearGradient(0, 0, w, h);
             grad.addColorStop(0, palette.background);
             grad.addColorStop(1, getColor(0.2));
             ctx.fillStyle = grad;
             ctx.fillRect(0,0,w,h);
             for(let k=0; k<5; k++) {
                 ctx.fillStyle = getColor(0.05);
                 ctx.beginPath();
                 ctx.arc(rng.range(0,w), rng.range(0,h), rng.range(100,400)*scale, 0, Math.PI*2);
                 ctx.fill();
             }
        }
    };

    // --- 3. Perspective Transformation ---
    // Sets up the matrix for the Geometric layer
    const applyPerspective = () => {
        const pText = attributes.perspective.toLowerCase();
        
        if (pText.includes('tilted') || pText.includes('dynamic')) {
            ctx.translate(w/2, h/2);
            ctx.rotate(rng.range(-0.2, 0.2));
            ctx.scale(1.1, 1.1); // Zoom in to cover edges
            ctx.translate(-w/2, -h/2);
        }
        else if (pText.includes('macro') || pText.includes('close-up')) {
            ctx.translate(w/2, h/2);
            ctx.scale(1.5, 1.5);
            ctx.translate(-w/2, -h/2);
        }
        else if (pText.includes('overhead')) {
            // No rotation, just slight flattening if we were 3D, but here 2D
        }
    };

    // --- 4. Drawing Primitives (Geo) ---
    const drawGrid = () => {
        const isCurved = rng.bool(0.4); 
        const step = rng.range(30, 100) * scale;
        
        ctx.beginPath();
        ctx.strokeStyle = getColor(0.3); 
        ctx.lineWidth = rng.range(0.5, 2) * scale * lineMod;
        
        if (isCurved) {
            for(let x=-50; x<=w+50; x+=step) {
                ctx.moveTo(x, 0);
                ctx.bezierCurveTo(x + rng.range(-150, 150)*scale, h/2, x - rng.range(-150, 150)*scale, h, x + rng.range(-50, 50)*scale, h);
            }
             for(let y=-50; y<=h+50; y+=step) {
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(w/2, y + rng.range(-150, 150)*scale, w, y - rng.range(-150, 150)*scale, w, y + rng.range(-50, 50)*scale);
            }
        } else {
            const vanishX = rng.range(0, w);
            const vanishY = rng.range(0, h);
            // Perspective attribute influences this choice
            const pText = attributes.perspective.toLowerCase();
            let type = rng.choice(['perspective', 'ortho', 'radial']);
            if (pText.includes('wide')) type = 'perspective';
            
            if (type === 'perspective') {
                 const rays = 24 * densityMod;
                 for(let i=0; i<rays; i++) {
                     ctx.moveTo(vanishX, vanishY);
                     ctx.lineTo(rng.bool() ? 0 : w, rng.range(0, h));
                     ctx.lineTo(rng.range(0, w), rng.bool() ? 0 : h);
                 }
            } else if (type === 'radial') {
                 const cx = w/2, cy = h/2;
                 const count = 12 * densityMod;
                 for(let i=0; i<count; i++) {
                     ctx.moveTo(cx, cy);
                     const ang = (Math.PI*2/count)*i;
                     ctx.lineTo(cx + Math.cos(ang)*w, cy + Math.sin(ang)*w);
                 }
                 for(let r=step; r<w; r+=step) {
                     ctx.moveTo(cx + r, cy);
                     ctx.arc(cx, cy, r, 0, Math.PI*2);
                 }
            } else {
                 ctx.save();
                 ctx.translate(w/2, h/2);
                 ctx.rotate(rng.range(0, Math.PI));
                 ctx.translate(-w*1.5, -h*1.5);
                 for(let i=0; i< (w+h)*2; i+=step) {
                     ctx.moveTo(i, 0);
                     ctx.lineTo(i, (w+h)*2);
                     ctx.moveTo(0, i);
                     ctx.lineTo((w+h)*2, i);
                 }
                 ctx.restore();
            }
        }
        ctx.stroke();
    };

    const drawTessellation = () => {
        const count = rng.range(30, 80) * densityMod;
        ctx.lineWidth = 1 * scale * lineMod;
        const type = rng.choice(['tri', 'hex', 'rect', 'shard']);
        
        for(let i=0; i<count; i++){
            const cx = rng.range(0, w);
            const cy = rng.range(0, h);
            const size = rng.range(20, 100) * scale;
            
            ctx.beginPath();
            ctx.fillStyle = getColor(rng.range(0.1, 0.5));
            ctx.strokeStyle = getColor(0.6);
            
            if (type === 'hex') {
                for (let j = 0; j < 6; j++) {
                    const angle = (Math.PI / 3) * j;
                    ctx.lineTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
                }
            } else if (type === 'rect') {
                ctx.rect(cx, cy, size, size * rng.range(0.5, 1.5));
            } else {
                ctx.moveTo(cx, cy - size);
                ctx.lineTo(cx + size, cy + size);
                ctx.lineTo(cx - size * rng.range(0.5, 1.5), cy + size * rng.range(0.5, 1.5));
            }
            
            ctx.closePath();
            if (rng.bool(0.5)) ctx.fill();
            else ctx.stroke();
        }
    };

    const drawFractal = () => {
        ctx.strokeStyle = getColor(0.6);
        ctx.lineWidth = 1.2 * scale * lineMod;
        const roots = Math.ceil(rng.range(1, 3) * densityMod);
        
        for(let r=0; r<roots; r++) {
             const startX = rng.range(w*0.1, w*0.9);
             const startY = rng.range(h*0.1, h*0.9);
             
             const branch = (x: number, y: number, len: number, angle: number, depth: number) => {
                if (depth <= 0) return;
                const endX = x + len * Math.cos(angle);
                const endY = y + len * Math.sin(angle);
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.quadraticCurveTo(x + rng.range(-10,10), y - rng.range(-10,10), endX, endY);
                ctx.stroke();
                
                const subLen = len * rng.range(0.6, 0.85);
                const split = rng.range(0.2, 0.8);
                branch(endX, endY, subLen, angle - split, depth - 1);
                branch(endX, endY, subLen, angle + split, depth - 1);
            };
            
            branch(startX, startY, rng.range(80, 150)*scale, rng.range(0, Math.PI*2), rng.range(4, 6));
        }
    };

    const drawOrbits = () => {
        const cx = w / 2 + rng.range(-150, 150)*scale;
        const cy = h / 2 + rng.range(-150, 150)*scale;
        const count = rng.range(8, 20) * densityMod;
        
        for(let i=0; i<count; i++) {
            ctx.strokeStyle = getColor(0.5);
            ctx.lineWidth = rng.range(1, 3) * scale;
            ctx.beginPath();
            const rx = rng.range(40, w/1.5);
            const ry = rx * rng.range(0.3, 1); 
            const rot = rng.range(0, Math.PI);
            
            ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
            ctx.stroke();
            
            if(rng.bool(0.6)) {
                 const pc = rng.range(1, 4);
                 for(let k=0; k<pc; k++) {
                     const ang = rng.range(0, Math.PI*2);
                     const px = cx + rx * Math.cos(ang) * Math.cos(rot) - ry * Math.sin(ang) * Math.sin(rot);
                     const py = cy + rx * Math.cos(ang) * Math.sin(rot) + ry * Math.sin(ang) * Math.cos(rot);
                     
                     ctx.fillStyle = getColor(0.9);
                     ctx.beginPath();
                     ctx.arc(px, py, rng.range(3, 8)*scale, 0, Math.PI*2);
                     ctx.fill();
                 }
            }
        }
    };

    const drawContours = () => {
        const lines = 30 * densityMod;
        ctx.lineWidth = 1.5 * scale * lineMod;
        const noiseSeed = rng.next() * 100;
        const type = rng.choice(['horizontal', 'vertical', 'circular']);
        ctx.strokeStyle = getColor(0.5);

        if (type === 'circular') {
            const cx = w/2, cy = h/2;
            for(let r=10; r<w; r+=20*scale) {
                ctx.beginPath();
                for(let a=0; a<=Math.PI*2; a+=0.1) {
                    const n = Math.sin(a*5 + noiseSeed)*10 + Math.cos(a*3)*5;
                    const rad = r + n;
                    ctx.lineTo(cx + Math.cos(a)*rad, cy + Math.sin(a)*rad);
                }
                ctx.closePath();
                ctx.stroke();
            }
        } else {
            for (let i = 0; i < lines; i++) {
                ctx.beginPath();
                if (type === 'horizontal') {
                    let y = (h / lines) * i;
                    ctx.moveTo(0, y);
                    for (let x = 0; x <= w; x += 15) {
                        const n = Math.sin(x * 0.01 + i * 0.2 + noiseSeed) * 40 * scale;
                        ctx.lineTo(x, y + n);
                    }
                } else {
                    let x = (w / lines) * i;
                    ctx.moveTo(x, 0);
                    for (let y = 0; y <= h; y += 15) {
                        const n = Math.sin(y * 0.01 + i * 0.2 + noiseSeed) * 40 * scale;
                        ctx.lineTo(x + n, y);
                    }
                }
                ctx.stroke();
            }
        }
    };

    const drawAbstractShapes = () => {
        const count = rng.range(5, 15) * densityMod;
        for(let i=0; i<count; i++) {
            ctx.fillStyle = getColor(rng.range(0.1, 0.4));
            ctx.strokeStyle = getColor(0.6);
            ctx.lineWidth = 2 * scale;
            
            const type = rng.choice(['circle', 'rect', 'line']);
            const cx = rng.range(0, w);
            const cy = rng.range(0, h);
            const sz = rng.range(20, 150) * scale;

            ctx.beginPath();
            if(type === 'circle') {
                ctx.arc(cx, cy, sz, 0, Math.PI*2);
                rng.bool() ? ctx.fill() : ctx.stroke();
            } else if (type === 'rect') {
                ctx.rect(cx - sz/2, cy - sz/2, sz, sz);
                rng.bool() ? ctx.fill() : ctx.stroke();
            } else {
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + rng.range(-100, 100)*scale, cy + rng.range(-100, 100)*scale);
                ctx.stroke();
            }
        }
    };

    // --- 5. Layer Groups ---
    const renderGeoLayer = () => {
        const geoText = attributes.geo.toLowerCase();
        let methods = [];

        if (has(geoText, ['grid', 'mesh', 'latitude', 'coordinate', 'cartesian', 'parametric', 'matrix', 'schematic', 'framework', 'geodetic', 'laser', 'link'])) methods.push(drawGrid);
        if (has(geoText, ['tessellat', 'polygonal', 'crystall', 'interlocking', 'mosaic', 'partition', 'fragment', 'tile', 'triangular', 'hexagonal', 'constellation'])) methods.push(drawTessellation);
        if (has(geoText, ['fractal', 'web', 'vector', 'branch', 'recursive', 'formation', 'network', 'neural'])) methods.push(drawFractal);
        if (has(geoText, ['orbit', 'ring', 'sacred', 'radial', 'symmetry', 'gravitational', 'cycle', 'satellite', 'sphere', 'kardashev'])) methods.push(drawOrbits);
        if (has(geoText, ['contour', 'topograph', 'wave', 'terrain', 'strata', 'atlas', 'elevation', 'landmass'])) methods.push(drawContours);
        if (has(geoText, ['shape', 'geometry', 'abstract', 'structure', 'construct', 'infrastructure'])) methods.push(drawAbstractShapes);

        if (methods.length === 0) {
            methods = [drawGrid, drawTessellation, drawFractal, drawOrbits, drawContours, drawAbstractShapes];
        }

        const count = rng.bool(0.3) ? 2 : 1; 
        const selected = rng.shuffle(methods).slice(0, count);
        
        ctx.save();
        applyPerspective(); // Apply perspective only to Geo layer
        selected.forEach(fn => fn());
        ctx.restore();
    };

    const renderStarryLayer = () => {
        const starryText = attributes.starry.toLowerCase();
        
        if (has(starryText, ['nebula', 'glow', 'radiant', 'cloud', 'cosmic', 'dreamlike', 'void', 'consciousness', 'data']) || rng.bool(0.5)) {
            const clouds = rng.range(3, 8) * densityMod;
            ctx.globalCompositeOperation = 'screen'; 
            for (let i=0; i<clouds; i++) {
                const cx = rng.range(0, w);
                const cy = rng.range(0, h);
                const r = rng.range(100, 600) * scale;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, getColor(0.25));
                grad.addColorStop(0.6, getColor(0.05));
                grad.addColorStop(1, "transparent");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        if (has(starryText, ['swirl', 'spiral', 'vortic', 'whorl', 'turbulence', 'wind', 'motion', 'wave', 'current', 'flow']) || rng.bool(0.4)) {
            const swirlCount = rng.range(4, 10);
            for(let i=0; i<swirlCount; i++) {
                let cx = rng.range(0, w);
                let cy = rng.range(0, h);
                let theta = rng.range(0, Math.PI*2);
                let r = 1;
                
                ctx.strokeStyle = palette.colors.some(c => c.toLowerCase().includes('fff')) ? "#FFFFE0" : getColor(0.7);
                ctx.lineWidth = rng.range(1, 4) * scale;
                ctx.lineCap = 'round';
                ctx.beginPath();
                const maxR = rng.range(50, 200) * scale;
                const segments = 40;
                for(let j=0; j<segments; j++) {
                    if (j % 2 === 0) {
                         ctx.beginPath();
                         ctx.moveTo(cx + Math.cos(theta)*r, cy + Math.sin(theta)*r);
                    } else {
                         ctx.lineTo(cx + Math.cos(theta)*r, cy + Math.sin(theta)*r);
                         ctx.stroke();
                    }
                    r += (maxR / segments);
                    theta += 0.4;
                }
            }
        }

        const starCount = rng.range(50, 250) * densityMod;
        ctx.fillStyle = "#FFFFFF";
        for(let i=0; i<starCount; i++) {
            const x = rng.range(0, w);
            const y = rng.range(0, h);
            const size = rng.range(0.5, 2.5) * scale;
            ctx.globalAlpha = rng.range(0.2, 0.9) * globalAlphaMod;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    };

    const renderKissLayer = () => {
        const kissText = attributes.kiss.toLowerCase();
        
        if (has(kissText, ['rectangle', 'mosaic', 'gold', 'gilded', 'geometric', 'tessellation', 'pattern', 'abundance']) || rng.bool(0.6)) {
             const clusters = rng.range(3, 8) * densityMod;
             for(let c=0; c<clusters; c++) {
                const cx = rng.range(0, w);
                const cy = rng.range(0, h);
                const radius = rng.range(40, 180) * scale;
                const items = rng.range(15, 40);

                for(let i=0; i<items; i++) {
                    const a = rng.range(0, Math.PI*2);
                    const d = rng.range(0, radius);
                    const x = cx + Math.cos(a)*d;
                    const y = cy + Math.sin(a)*d;

                    const isGold = rng.bool(0.6); 
                    ctx.fillStyle = isGold ? "#FFD700" : getColor(); 
                    if (!isGold && rng.bool(0.3)) ctx.fillStyle = "#C0C0C0"; 

                    const rw = rng.range(4, 20) * scale;
                    const rh = rng.range(4, 20) * scale;
                    
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(rng.range(0, Math.PI));
                    ctx.fillRect(0, 0, rw, rh);
                    if(rw > 8*scale) {
                        ctx.fillStyle = "rgba(0,0,0,0.2)";
                        ctx.fillRect(rw*0.25, rh*0.25, rw*0.5, rh*0.5);
                    }
                    ctx.restore();
                }
             }
        }

        if (has(kissText, ['ornament', 'swirl', 'flourish', 'curve', 'floral', 'vine', 'elegance', 'organic']) || rng.bool(0.5)) {
            const lines = rng.range(3, 8);
            ctx.strokeStyle = "#DAA520"; 
            ctx.lineWidth = rng.range(1, 3) * scale;
            ctx.globalAlpha = 0.8 * globalAlphaMod;
            for(let i=0; i<lines; i++) {
                const sx = rng.range(0, w);
                const sy = rng.bool() ? rng.range(0, h/4) : rng.range(h*0.75, h);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.bezierCurveTo(
                    rng.range(0, w), rng.range(0, h), 
                    rng.range(0, w), rng.range(0, h), 
                    rng.range(0, w), rng.range(0, h)
                );
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        }

        if (has(kissText, ['symbol', 'circle', 'halo', 'ring', 'sun', 'moon', 'coin', 'robot', 'symbiosis']) || rng.bool(0.3)) {
             const count = rng.range(3, 7);
             for(let i=0; i<count; i++) {
                 const x = rng.range(0, w);
                 const y = rng.range(0, h);
                 const r = rng.range(10, 40) * scale;
                 ctx.strokeStyle = getColor();
                 ctx.lineWidth = 2 * scale;
                 ctx.beginPath();
                 ctx.arc(x, y, r, 0, Math.PI*2);
                 ctx.stroke();
                 ctx.beginPath();
                 ctx.arc(x, y, r*0.6, 0, Math.PI*2);
                 ctx.fill();
             }
        }
    };

    // --- 6. Symbolism Layer ---
    const drawSymbolism = () => {
        const sym = attributes.symbol.toLowerCase();
        
        ctx.strokeStyle = getColor(0.8);
        ctx.lineWidth = 1 * scale;

        if (sym.includes('unity') || sym.includes('connection') || sym.includes('bond') || sym.includes('mesh')) {
            // Interconnected circles or lines
            const cx = w/2, cy = h/2;
            for(let i=0; i<5; i++) {
                ctx.beginPath();
                ctx.arc(cx, cy, (50 + i*30)*scale, 0, Math.PI*2);
                ctx.stroke();
            }
        }
        else if (sym.includes('cycle') || sym.includes('spiral') || sym.includes('rebirth')) {
            // Large spiral overlay
            ctx.beginPath();
            const cx = w/2, cy = h/2;
            let r = 0;
            for(let a=0; a<Math.PI*10; a+=0.1) {
                const x = cx + Math.cos(a)*r;
                const y = cy + Math.sin(a)*r;
                ctx.lineTo(x, y);
                r += 0.5 * scale;
            }
            ctx.globalAlpha = 0.3 * globalAlphaMod;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        else if (sym.includes('growth') || sym.includes('tree') || sym.includes('life') || sym.includes('brain')) {
             // Upward flowing lines
             ctx.globalAlpha = 0.4 * globalAlphaMod;
             for(let i=0; i<10; i++) {
                 const x = rng.range(w*0.2, w*0.8);
                 ctx.beginPath();
                 ctx.moveTo(x, h);
                 ctx.bezierCurveTo(x + rng.range(-50,50), h/2, x + rng.range(-100,100), 0, x, 0);
                 ctx.stroke();
             }
             ctx.globalAlpha = 1.0;
        }
    };

    // --- 7. Artist Influence ---
    const drawArtistDetails = () => {
        const artist = attributes.artist.toLowerCase();
        
        if (artist.includes('pollock')) {
            // Splatters
            const splats = rng.range(20, 50);
            for(let i=0; i<splats; i++) {
                const cx = rng.range(0, w);
                const cy = rng.range(0, h);
                ctx.fillStyle = getColor();
                ctx.beginPath();
                ctx.arc(cx, cy, rng.range(2, 10)*scale, 0, Math.PI*2);
                ctx.fill();
                // Drips
                if (rng.bool(0.3)) {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + rng.range(-5,5), cy + rng.range(20, 100)*scale);
                    ctx.stroke();
                }
            }
        }
        else if (artist.includes('matisse') || artist.includes('cutout')) {
            // Organic shapes
            const shapes = 5;
            for(let i=0; i<shapes; i++) {
                ctx.fillStyle = getColor(0.8);
                const cx = rng.range(0, w);
                const cy = rng.range(0, h);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                for(let j=0; j<5; j++) {
                    ctx.quadraticCurveTo(cx + rng.range(-50,50)*scale, cy + rng.range(-50,50)*scale, cx + rng.range(-100,100)*scale, cy + rng.range(-100,100)*scale);
                }
                ctx.fill();
            }
        }
    };

    // --- 8. Lighting FX ---
    const drawLightingFX = () => {
        const lit = attributes.lighting.toLowerCase();
        ctx.globalCompositeOperation = 'overlay';
        
        if (lit.includes('chiaroscuro') || lit.includes('dramatic')) {
            const grad = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(1, "rgba(0,0,0,0.8)");
            ctx.fillStyle = grad;
            ctx.fillRect(0,0,w,h);
        }
        else if (lit.includes('halo') || lit.includes('glow')) {
            const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/1.5);
            grad.addColorStop(0, "rgba(255,255,255,0.3)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = grad;
            ctx.fillRect(0,0,w,h);
        }
        else if (lit.includes('moonlit') || lit.includes('cool')) {
            ctx.fillStyle = "rgba(0, 0, 100, 0.2)";
            ctx.fillRect(0,0,w,h);
        }
        else if (lit.includes('golden') || lit.includes('radiant')) {
             ctx.fillStyle = "rgba(255, 200, 0, 0.15)";
             ctx.fillRect(0,0,w,h);
        }
        
        ctx.globalCompositeOperation = 'source-over';
    };

    const drawTexture = () => {
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = w;
        noiseCanvas.height = h;
        const noiseCtx = noiseCanvas.getContext('2d');
        if (!noiseCtx) return;

        const imageData = noiseCtx.createImageData(w, h);
        const data = imageData.data;
        
        const textStyle = attributes.texture.toLowerCase();
        const heavyTexture = textStyle.includes('rough') || textStyle.includes('cracked') || textStyle.includes('grainy') || textStyle.includes('impasto');
        
        for (let i = 0; i < data.length; i += 4) {
            const val = Math.floor(rng.range(0, 255));
            data[i] = val;    
            data[i+1] = val;   
            data[i+2] = val;   
            data[i+3] = heavyTexture ? rng.range(15, 35) : rng.range(5, 15);
        }
        noiseCtx.putImageData(imageData, 0, 0);

        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(noiseCanvas, 0, 0);
        ctx.restore();

        if (textStyle.includes('cracked') || textStyle.includes('vintage') || textStyle.includes('weathered')) {
             ctx.strokeStyle = "rgba(0,0,0,0.2)";
             ctx.lineWidth = 1 * scale;
             const cracks = 8;
             for(let i=0; i<cracks; i++) {
                 ctx.beginPath();
                 let cx = rng.range(0, w);
                 let cy = rng.range(0, h);
                 ctx.moveTo(cx, cy);
                 for(let j=0; j<8; j++) {
                     cx += rng.range(-20, 20)*scale;
                     cy += rng.range(-20, 20)*scale;
                     ctx.lineTo(cx, cy);
                 }
                 ctx.stroke();
             }
        }
    };
    
    // --- 9. Movement Specific FX ---
    const applyMovementInfluence = () => {
        const mov = attributes.movement.toLowerCase();
        
        if (mov.includes('pop art')) {
            // Halftone overlay
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            for(let x=0; x<w; x+=8*scale) {
                for(let y=0; y<h; y+=8*scale) {
                    ctx.beginPath();
                    ctx.arc(x, y, 2*scale, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
        else if (mov.includes('ancient') || mov.includes('greek')) {
            // Marble/Stone tint
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = "rgba(100, 90, 80, 0.1)"; 
            ctx.fillRect(0,0,w,h);
            ctx.restore();
        }
        else if (mov.includes('asian') || mov.includes('ink')) {
            // Vertical flow bias
             ctx.save();
             ctx.globalCompositeOperation = 'soft-light';
             const grad = ctx.createLinearGradient(0,0,0,h);
             grad.addColorStop(0, "rgba(255,255,255,0.4)");
             grad.addColorStop(1, "rgba(0,0,0,0.2)");
             ctx.fillStyle = grad;
             ctx.fillRect(0,0,w,h);
             ctx.restore();
        }
        else if (mov.includes('futurism') || mov.includes('cubism')) {
             // Angular shards
             ctx.save();
             ctx.globalCompositeOperation = 'screen';
             ctx.strokeStyle = "rgba(255,255,255,0.2)";
             ctx.lineWidth = 1 * scale;
             for(let i=0; i<20; i++) {
                 ctx.beginPath();
                 ctx.moveTo(rng.range(0,w), rng.range(0,h));
                 ctx.lineTo(rng.range(0,w), rng.range(0,h));
                 ctx.stroke();
             }
             ctx.restore();
        }
        else if (mov.includes('cosmic futurism')) {
            // Laser Link Network Overlay
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = "rgba(0, 255, 255, 0.3)"; 
            ctx.lineWidth = 0.5 * scale;
            
            // Draw a constellation-like network
            const nodes = [];
            const count = 15;
            for(let i=0; i<count; i++) {
                nodes.push({x: rng.range(0, w), y: rng.range(0, h)});
            }
            
            ctx.beginPath();
            for(let i=0; i<count; i++) {
                for(let j=i+1; j<count; j++) {
                    const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                    if (dist < w * 0.3) {
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                    }
                }
            }
            ctx.stroke();

            // Draw glowing nodes
            ctx.fillStyle = "#00FFFF";
            for(const n of nodes) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, 2 * scale, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.restore();
        }
    };

    // --- Main Render Sequence ---
    ctx.save(); 
    const layout = attributes.layout.toLowerCase();

    // Layout Masking
    if (layout.includes('circular') || layout.includes('mandala') || layout.includes('focal circle')) {
        ctx.beginPath();
        ctx.arc(w/2, h/2, Math.min(w, h)/2 - 20*scale, 0, Math.PI * 2);
        ctx.clip();
    } 
    else if (layout.includes('hexagonal')) {
        const r = Math.min(w, h)/2 - 20*scale;
        const cx = w/2, cy = h/2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.clip();
    }
    else if (layout.includes('diamond') || layout.includes('rhombus')) {
        const pad = 20*scale;
        ctx.beginPath();
        ctx.moveTo(w/2, pad); 
        ctx.lineTo(w-pad, h/2); 
        ctx.lineTo(w/2, h-pad); 
        ctx.lineTo(pad, h/2); 
        ctx.closePath();
        ctx.clip();
    }

    drawBackgroundStyle();
    renderGeoLayer(); // Uses ApplyPerspective internally
    drawSymbolism();  
    renderStarryLayer();
    renderKissLayer();
    drawArtistDetails(); 
    drawLightingFX();    
    applyMovementInfluence(); // Apply theme specific visual overrides
    drawTexture();

    ctx.restore(); 

    // Layout Overlays (Frames)
    if (layout.includes('triptych')) {
        ctx.fillStyle = "#0f172a"; 
        const barWidth = w * 0.025;
        ctx.fillRect(w/3 - barWidth/2, 0, barWidth, h);
        ctx.fillRect((w/3)*2 - barWidth/2, 0, barWidth, h);
    }
    else if (layout.includes('poster')) {
        const matteH = h * 0.15;
        ctx.fillStyle = "#f8f8f8"; 
        ctx.fillRect(10*scale, h - matteH, w - 20*scale, matteH - 10*scale);
        
        ctx.fillStyle = "#222";
        ctx.globalAlpha = 0.7;
        const fh = 6*scale;
        ctx.fillRect(30*scale, h - matteH + 20*scale, w * 0.3, fh);
        ctx.fillRect(30*scale, h - matteH + 35*scale, w * 0.5, fh/2);
        ctx.globalAlpha = 1.0;
    }
    else if (layout.includes('panoramic') || layout.includes('cinematic')) {
        ctx.fillStyle = "#000000";
        const barH = h * 0.15;
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);
    }
    
    // Final subtle border
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2*scale;
    ctx.strokeRect(0,0,w,h);
};