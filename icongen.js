/**
 * Lean Text-to-Pixel Art Generator
 * Ultra-lightweight procedural pixel art from text input
 * Default: Abstract style, Retro palette, 8px, Complexity 2
 */

class PixelArtGen {
    constructor(options = {}) {
        this.size = options.size || 8;
        this.complexity = options.complexity || 2;
        this.palette = options.palette || ['#000000', '#d62d20', '#ffa500', '#ffff00', '#008c00', '#0030ff', '#732982'];
        this.scale = options.scale || 20; // For rendering
    }

    // Simple hash function for consistent randomization
    hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    // Seeded random number generator
    random(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Generate abstract pixel art from text
    generate(text) {
        const seed = this.hash(text.toLowerCase());
        const pixels = [];

        for (let y = 0; y < this.size; y++) {
            pixels[y] = [];
            for (let x = 0; x < this.size; x++) {
                const freq = this.complexity * 0.3;
                const noise1 = Math.sin(x * freq + seed) * Math.cos(y * freq + seed);
                const noise2 = Math.sin((x + y) * freq * 0.5 + seed * 1.5);
                const combined = (noise1 + noise2) * 0.5;
                
                if (combined > -0.2) {
                    const colorIndex = Math.floor(((combined + 1) * 0.5) * this.palette.length);
                    const clampedIndex = Math.max(0, Math.min(this.palette.length - 1, colorIndex));
                    pixels[y][x] = this.palette[clampedIndex];
                } else {
                    pixels[y][x] = null; // Transparent/empty
                }
            }
        }
        
        return pixels;
    }

    // Render to canvas element
    renderToCanvas(text, canvas) {
        const ctx = canvas.getContext('2d');
        const pixels = this.generate(text);
        
        canvas.width = this.size * this.scale;
        canvas.height = this.size * this.scale;
        
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw pixels
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (pixels[y][x]) {
                    ctx.fillStyle = pixels[y][x];
                    ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
                }
            }
        }
        
        return canvas;
    }

    // Generate as data URL (for images)
    toDataURL(text, format = 'image/png') {
        const canvas = document.createElement('canvas');
        this.renderToCanvas(text, canvas);
        return canvas.toDataURL(format);
    }

    // Generate as SVG string
    toSVG(text) {
        const pixels = this.generate(text);
        const svgSize = this.size * this.scale;
        
        let svg = `<svg width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">`;
        svg += `<rect width="100%" height="100%" fill="#000000"/>`;
        
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (pixels[y][x]) {
                    const px = x * this.scale;
                    const py = y * this.scale;
                    svg += `<rect x="${px}" y="${py}" width="${this.scale}" height="${this.scale}" fill="${pixels[y][x]}"/>`;
                }
            }
        }
        
        svg += '</svg>';
        return svg;
    }

    // Get raw pixel data (2D array)
    getPixelData(text) {
        return this.generate(text);
    }

    // Generate multiple variations with slight seed modifications
    generateVariations(text, count = 4) {
        const variations = [];
        for (let i = 0; i < count; i++) {
            const modifiedText = text + i.toString();
            variations.push(this.generate(modifiedText));
        }
        return variations;
    }
}

// Factory function for quick usage
function createPixelArt(text, options = {}) {
    const generator = new PixelArtGen({
        size: 8,
        complexity: 2,
        palette: ['#000000', '#d62d20', '#ffa500', '#ffff00', '#008c00', '#0030ff', '#732982'],
        scale: 20,
        ...options
    });
    return generator.getPixelData(text);
}

// Quick canvas render function
function renderPixelArt(text, canvasElement, options = {}) {
    const generator = new PixelArtGen({
        size: 8,
        complexity: 2,
        palette: ['#000000', '#d62d20', '#ffa500', '#ffff00', '#008c00', '#0030ff', '#732982'],
        scale: 20,
        ...options
    });
    return generator.renderToCanvas(text, canvasElement);
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = { PixelArtGen, createPixelArt, renderPixelArt };
} else if (typeof window !== 'undefined') {
    // Browser
    window.PixelArtGen = PixelArtGen;
    window.createPixelArt = createPixelArt;
    window.renderPixelArt = renderPixelArt;
}

/*
USAGE EXAMPLES:

// 1. Basic usage (your defaults)
const pixels = createPixelArt("sword");

// 2. Render to canvas
const canvas = document.getElementById('myCanvas');
renderPixelArt("dragon", canvas);

// 3. Advanced usage
const generator = new PixelArtGen({
    size: 8,
    complexity: 2,
    palette: ['#000000', '#d62d20', '#ffa500', '#ffff00', '#008c00', '#0030ff', '#732982']
});

const svg = generator.toSVG("monster");
const dataURL = generator.toDataURL("treasure");
const variations = generator.generateVariations("spell", 6);

// 4. Custom palette
const customGen = new PixelArtGen({
    palette: ['#ff0000', '#00ff00', '#0000ff']
});
const customArt = customGen.generate("fire");
*/