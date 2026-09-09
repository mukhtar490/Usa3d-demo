// projection.js
// Converts real longitude/latitude into the scene's flat world (x, z)
// coordinates, and back. This is a simple equirectangular projection
// centered on the demo region — good enough for a regional demo, not
// meant for survey-grade accuracy.
//
// Route distances shown in the UI are computed with the haversine
// formula directly on longitude/latitude, so they stay realistic
// regardless of how the visual scale below is tuned.

export const REGION = {
  lonMin: -124.6,
  lonMax: -93.4,
  latMin: 25.6,
  latMax: 42.2,
  lonCenter: -109.0,
  latCenter: 34.0,
};

// World units per degree of latitude. Longitude is scaled by the same
// number times cos(latCenter) so a square degree near the region's
// center renders as a visual square, not stretched.
export const WORLD_SCALE = 58;

const latRad = (REGION.latCenter * Math.PI) / 180;
export const LON_SCALE = WORLD_SCALE * Math.cos(latRad);

export function lonLatToWorld(lon, lat) {
  const x = (lon - REGION.lonCenter) * LON_SCALE;
  const z = -(lat - REGION.latCenter) * WORLD_SCALE; // north => smaller z
  return { x, z };
}

export function worldToLonLat(x, z) {
  const lon = x / LON_SCALE + REGION.lonCenter;
  const lat = -z / WORLD_SCALE + REGION.latCenter;
  return { lon, lat };
}

export function worldBounds() {
  const nw = lonLatToWorld(REGION.lonMin, REGION.latMax);
  const se = lonLatToWorld(REGION.lonMax, REGION.latMin);
  return { minX: nw.x, maxX: se.x, minZ: nw.z, maxZ: se.z };
}

export function haversineMiles(lon1, lat1, lon2, lat2) {
  const R = 3958.8; // Earth radius, miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
