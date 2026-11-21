export interface PaletteColors {
  dominant: string;
  secondary: string;
  topColor: string;
  bottomColor: string;
  darkBase: string;
}

export const DEFAULT_PALETTE: PaletteColors = {
  dominant: '#FA2D48',
  secondary: '#8B5CF6',
  topColor: '#301828',
  bottomColor: '#4A1D34',
  darkBase: '#1a0c10',
};

const paletteCache = new Map<string, PaletteColors>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360 / 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [Math.round(r), Math.round(g), Math.round(b)]
      .map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function extractFromLoadedImage(img: HTMLImageElement): PaletteColors | null {
  try {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size).data;

    let topR = 0, topG = 0, topB = 0, topCount = 0;
    let btmR = 0, btmG = 0, btmB = 0, btmCount = 0;

    let bestScore = -1;
    let dominantRgb = [250, 45, 72];
    let dominantHue = 350;

    let secondaryScore = -1;
    let secondaryRgb = [139, 92, 246];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const a = imgData[idx + 3];

        if (a < 128) continue;

        // Sample top region (rows 0-5)
        if (y <= 5) {
          topR += r;
          topG += g;
          topB += b;
          topCount++;
        }

        // Sample bottom region (rows 22-31)
        if (y >= 22) {
          btmR += r;
          btmG += g;
          btmB += b;
          btmCount++;
        }

        const [h, s, l] = rgbToHsl(r, g, b);

        // Filter out near black, near white, or completely desaturated gray
        if (l > 0.12 && l < 0.88 && s > 0.15) {
          const score = s * 1.5 + (1 - Math.abs(l - 0.5));
          if (score > bestScore) {
            bestScore = score;
            dominantRgb = [r, g, b];
            dominantHue = h;
          }
        }
      }
    }

    // Secondary color search (distinct hue from dominant)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const a = imgData[idx + 3];

        if (a < 128) continue;
        const [h, s, l] = rgbToHsl(r, g, b);

        if (l > 0.15 && l < 0.85 && s > 0.2) {
          const hueDiff = Math.abs(h - dominantHue);
          const angleDiff = Math.min(hueDiff, 360 - hueDiff);
          if (angleDiff > 35) {
            const score = s + angleDiff / 180;
            if (score > secondaryScore) {
              secondaryScore = score;
              secondaryRgb = [r, g, b];
            }
          }
        }
      }
    }

    const topColor =
      topCount > 0
        ? rgbToHex(topR / topCount, topG / topCount, topB / topCount)
        : DEFAULT_PALETTE.topColor;

    const bottomColor =
      btmCount > 0
        ? rgbToHex(btmR / btmCount, btmG / btmCount, btmB / btmCount)
        : DEFAULT_PALETTE.bottomColor;

    const dominant = rgbToHex(dominantRgb[0], dominantRgb[1], dominantRgb[2]);
    const secondary = rgbToHex(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);

    const [domH, domS] = rgbToHsl(dominantRgb[0], dominantRgb[1], dominantRgb[2]);
    const darkBase = hslToHex(domH, Math.min(Math.max(domS, 0.25), 0.55), 0.12);

    return {
      dominant,
      secondary,
      topColor,
      bottomColor,
      darkBase,
    };
  } catch {
    return null;
  }
}

function tryLoadImage(src: string, timeoutMs = 2500): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        img.onload = null;
        img.onerror = null;
        resolve(null);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = src;
  });
}

/**
 * Builds candidate URLs for an image so palette extraction never fails on high-res 404s
 */
function getCandidateUrls(url: string): string[] {
  const candidates: string[] = [];

  if (url.includes('ytimg.com')) {
    // For YouTube thumbnails, hqdefault is 100% reliable across all songs
    const hqUrl = url
      .replace(/maxresdefault\.jpg/i, 'hqdefault.jpg')
      .replace(/mqdefault\.jpg/i, 'hqdefault.jpg');
    const mqUrl = url
      .replace(/maxresdefault\.jpg/i, 'mqdefault.jpg')
      .replace(/hqdefault\.jpg/i, 'mqdefault.jpg');
    
    candidates.push(hqUrl);
    if (!candidates.includes(mqUrl)) candidates.push(mqUrl);
    if (!candidates.includes(url)) candidates.push(url);
  } else if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    // Fast 120px downsampled version for instantaneous color sampling
    const cleanUrl = url.split('?')[0];
    const fast120 = `${cleanUrl}=w120-h120-l90-rj`;
    candidates.push(fast120);
    candidates.push(url);
  } else {
    candidates.push(url);
  }

  return candidates;
}

export async function extractPalette(imageUrl?: string | null): Promise<PaletteColors> {
  if (!imageUrl || imageUrl === '/logo.svg') return DEFAULT_PALETTE;

  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)!;
  }

  const candidateUrls = getCandidateUrls(imageUrl);

  for (const rawUrl of candidateUrls) {
    // 1. Try via /api/avatar CORS proxy
    const proxyUrl =
      rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? `/api/avatar?url=${encodeURIComponent(rawUrl)}`
        : rawUrl;

    let img = await tryLoadImage(proxyUrl, 2000);

    // 2. Fallback to direct load with anonymous crossOrigin
    if (!img && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
      img = await tryLoadImage(rawUrl, 2000);
    }

    if (img) {
      const palette = extractFromLoadedImage(img);
      if (palette) {
        paletteCache.set(imageUrl, palette);
        for (const cand of candidateUrls) {
          paletteCache.set(cand, palette);
        }
        return palette;
      }
    }
  }

  return DEFAULT_PALETTE;
}
