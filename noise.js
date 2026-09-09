// noise.js
// Small, dependency-free 2D value-noise + fractal Brownian motion (fBm).
// Used to generate the procedural terrain height field. Deterministic:
// the same (x, y) always produces the same value, so the terrain mesh,
// the car's ground-following logic, and the road draping all agree
// without needing to raycast against the actual mesh.

export function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const tl = hash2(xi, yi);
  const tr = hash2(xi + 1, yi);
  const bl = hash2(xi, yi + 1);
  const br = hash2(xi + 1, yi + 1);

  const u = smooth(xf);
  const v = smooth(yf);

  return lerp(lerp(tl, tr, u), lerp(bl, br, u), v);
}

// Fractal Brownian motion: layers several octaves of noise for natural,
// multi-scale roughness (big rolling shapes + small-scale detail).
export function fbm2D(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let amp = 0.5;
  let freq = 1.0;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0; // normalized to ~0..1
}

// "Ridged" noise: folds the noise so valleys become sharp ridges.
// Good for mountain silhouettes rather than rolling hills.
export function ridgedFbm2D(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let amp = 0.5;
  let freq = 1.0;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise2D(x * freq, y * freq) * 2 - 1);
    sum += amp * n * n;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}
