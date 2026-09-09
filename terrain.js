// terrain.js
// Builds the procedural terrain height field and the colored mesh that
// represents it. getHeight(x, z) is exported so roads, cities, and the
// car can all query the exact same ground level the mesh was built
// from — no raycasting needed, which keeps driving smooth.

import { fbm2D, ridgedFbm2D } from "./noise.js";
import { MOUNTAIN_RANGES } from "./geoData.js";
import { lonLatToWorld, worldBounds, worldToLonLat } from "./projection.js";

const NOISE_SCALE = 0.008; // spatial frequency of base rolling terrain
const DETAIL_SCALE = 0.05; // higher-frequency surface roughness
const MAX_MOUNTAIN_HEIGHT = 95; // world units, exaggerated for readability
const BASE_ROUGHNESS = 6;
const DESERT_BASIN_DEPTH = 5;

// Pre-project each mountain range's ridgeline into world space once.
const RANGES_WORLD = MOUNTAIN_RANGES.filter((r) => r.peak > 0).map((r) => ({
  ...r,
  segments: toSegments(r.points.map(([lon, lat]) => lonLatToWorld(lon, lat))),
}));

function toSegments(pts) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segs.push([pts[i], pts[i + 1]]);
  }
  return segs;
}

function pointSegmentDistance(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const abLenSq = abx * abx + abz * abz || 1e-6;
  let t = (apx * abx + apz * abz) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t;
  const cz = az + abz * t;
  return Math.hypot(px - cx, pz - cz);
}

function mountainBias(x, z) {
  let bias = 0;
  for (const range of RANGES_WORLD) {
    let minDist = Infinity;
    for (const [a, b] of range.segments) {
      const d = pointSegmentDistance(x, z, a.x, a.z, b.x, b.z);
      if (d < minDist) minDist = d;
    }
    const falloff = Math.exp(-((minDist / range.width) ** 2));
    bias = Math.max(bias, falloff * range.peak);
  }
  return bias; // 0..1
}

// Nevada/Arizona basin-and-range desert sits noticeably lower & flatter
// than the surrounding mountains. This is a rough hand-tuned mask
// keyed to the demo region's world bounds, not real hydrology.
function desertMask(x, z) {
  const bounds = worldBounds();
  const nx = (x - bounds.minX) / (bounds.maxX - bounds.minX);
  const nz = (z - bounds.minZ) / (bounds.maxZ - bounds.minZ);
  // Roughly the NV/AZ box in normalized region space.
  const inBoxX = Math.max(0, 1 - Math.abs((nx - 0.32) / 0.16));
  const inBoxZ = Math.max(0, 1 - Math.abs((nz - 0.42) / 0.28));
  return inBoxX * inBoxZ;
}

export function getHeight(x, z) {
  const base = fbm2D(x * NOISE_SCALE, z * NOISE_SCALE, 5) * BASE_ROUGHNESS;
  const detail = fbm2D(x * DETAIL_SCALE, z * DETAIL_SCALE, 3) * 1.5;
  const ridge =
    ridgedFbm2D(x * NOISE_SCALE * 1.6, z * NOISE_SCALE * 1.6, 4) *
    mountainBias(x, z) *
    MAX_MOUNTAIN_HEIGHT;
  const desertDip = desertMask(x, z) * DESERT_BASIN_DEPTH;
  return base + detail + ridge - desertDip;
}

// Biome classification drives both vertex color and (loosely) whether
// a spot reads as forest, plain, desert, or snowcap.
export function classifyBiome(height, x, z) {
  if (height < -1.2) return "water";
  const desert = desertMask(x, z);
  if (height > 46) return "snow";
  if (height > 24) return "rock";
  if (desert > 0.35 && height < 14) return "desert";
  const detail = fbm2D(x * 0.02, z * 0.02, 3);
  if (height > 4 && height < 20 && detail > 0.55) return "forest";
  return "plain";
}

const BIOME_COLOR = {
  water: [0.16, 0.32, 0.46],
  snow: [0.92, 0.94, 0.97],
  rock: [0.42, 0.4, 0.38],
  desert: [0.72, 0.58, 0.4],
  forest: [0.19, 0.34, 0.2],
  plain: [0.32, 0.44, 0.24],
};

// A muted "map mode" palette (closer to a printed atlas / satellite
// blend) used when the user toggles Map <-> Terrain.
const MAP_MODE_COLOR = {
  water: [0.22, 0.42, 0.58],
  snow: [0.85, 0.87, 0.88],
  rock: [0.55, 0.52, 0.47],
  desert: [0.78, 0.68, 0.5],
  forest: [0.34, 0.5, 0.33],
  plain: [0.55, 0.6, 0.42],
};

export function buildTerrainMesh(THREE) {
  const bounds = worldBounds();
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  // Segment counts kept moderate on purpose: dense enough for readable
  // ridgelines, light enough to stay smooth on mid-range GPUs.
  const segX = 220;
  const segZ = 150;

  const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const biomeCache = new Uint8Array(posAttr.count);
  const biomeList = ["water", "snow", "rock", "desert", "forest", "plain"];

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i) + (bounds.minX + bounds.maxX) / 2;
    const z = posAttr.getZ(i) + (bounds.minZ + bounds.maxZ) / 2;
    const h = getHeight(x, z);
    posAttr.setY(i, h);

    const biome = classifyBiome(h, x, z);
    biomeCache[i] = biomeList.indexOf(biome);
    const [r, g, b] = BIOME_COLOR[biome];
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.userData.biomeList = biomeList;
  mesh.userData.biomeCache = biomeCache;

  // Simple water plane for lakes/low basins, at the water cutoff height.
  const waterGeo = new THREE.PlaneGeometry(width, depth, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2c6e91,
    transparent: true,
    opacity: 0.55,
    roughness: 0.15,
    metalness: 0.1,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = -1.2;

  return { mesh, water, bounds };
}

// Toggle between the "3D terrain" palette and a flatter "map" palette
// by recomputing vertex colors in place (cheap: color-only pass).
export function applyPalette(THREE, terrainMesh, mode /* 'terrain' | 'map' */) {
  const geometry = terrainMesh.geometry;
  const posAttr = geometry.attributes.position;
  const colorAttr = geometry.attributes.color;
  const biomeList = terrainMesh.userData.biomeList;
  const biomeCache = terrainMesh.userData.biomeCache;
  const table = mode === "map" ? MAP_MODE_COLOR : BIOME_COLOR;

  for (let i = 0; i < posAttr.count; i++) {
    const biome = biomeList[biomeCache[i]];
    const [r, g, b] = table[biome];
    colorAttr.setXYZ(i, r, g, b);
  }
  colorAttr.needsUpdate = true;
}

export { worldToLonLat };
