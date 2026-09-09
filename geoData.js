// geoData.js
// Simplified, hand-placed demo data for the CA -> NV -> AZ -> UT -> CO -> TX
// corridor. Coordinates are approximate (rounded real-world longitude/
// latitude), meant to produce a recognizable, well-proportioned demo —
// not a survey-accurate atlas. See README for how to extend this to the
// full 50 states with real elevation/road datasets.

export const CITIES = [
  { name: "Los Angeles", state: "CA", lon: -118.2437, lat: 34.0522, size: 3 },
  { name: "San Francisco", state: "CA", lon: -122.4194, lat: 37.7749, size: 2.4 },
  { name: "Sacramento", state: "CA", lon: -121.4944, lat: 38.5816, size: 1.8 },
  { name: "San Diego", state: "CA", lon: -117.1611, lat: 32.7157, size: 2.2 },
  { name: "Fresno", state: "CA", lon: -119.7726, lat: 36.7468, size: 1.5 },
  { name: "Las Vegas", state: "NV", lon: -115.1398, lat: 36.1699, size: 2.4 },
  { name: "Reno", state: "NV", lon: -119.8138, lat: 39.5296, size: 1.6 },
  { name: "Phoenix", state: "AZ", lon: -112.074, lat: 33.4484, size: 2.6 },
  { name: "Tucson", state: "AZ", lon: -110.9747, lat: 32.2226, size: 1.8 },
  { name: "Flagstaff", state: "AZ", lon: -111.6513, lat: 35.1983, size: 1.2 },
  { name: "Salt Lake City", state: "UT", lon: -111.891, lat: 40.7608, size: 2.0 },
  { name: "Denver", state: "CO", lon: -104.9903, lat: 39.7392, size: 2.4 },
  { name: "Colorado Springs", state: "CO", lon: -104.8214, lat: 38.8339, size: 1.6 },
  { name: "Dallas", state: "TX", lon: -96.797, lat: 32.7767, size: 2.6 },
  { name: "Fort Worth", state: "TX", lon: -97.3308, lat: 32.7555, size: 1.8 },
  { name: "Houston", state: "TX", lon: -95.3698, lat: 29.7604, size: 2.8 },
  { name: "Austin", state: "TX", lon: -97.7431, lat: 30.2672, size: 2.0 },
  { name: "San Antonio", state: "TX", lon: -98.4936, lat: 29.4241, size: 2.2 },
  { name: "El Paso", state: "TX", lon: -106.485, lat: 31.7619, size: 1.8 },
];

// Interstate highways: each is a named polyline (lon, lat waypoints).
// Curves are drawn through these with a Catmull-Rom spline and draped
// onto the terrain height field.
export const HIGHWAYS = [
  {
    id: "I-5",
    label: "I-5",
    points: [
      [-122.42, 40.59],
      [-121.49, 38.58],
      [-119.9, 37.0],
      [-118.24, 34.05],
      [-117.16, 32.72],
    ],
  },
  {
    id: "I-10",
    label: "I-10",
    points: [
      [-118.24, 34.05],
      [-116.55, 33.82],
      [-112.074, 33.4484],
      [-110.9747, 32.2226],
      [-106.485, 31.7619],
      [-98.4936, 29.4241],
      [-95.3698, 29.7604],
    ],
  },
  {
    id: "I-15",
    label: "I-15",
    points: [
      [-117.1611, 32.7157],
      [-115.1398, 36.1699],
      [-113.8, 38.5],
      [-111.891, 40.7608],
    ],
  },
  {
    id: "I-40",
    label: "I-40",
    points: [
      [-117.0, 34.9],
      [-111.6513, 35.1983],
      [-106.65, 35.08],
      [-101.83, 35.22],
    ],
  },
  {
    id: "I-70",
    label: "I-70",
    points: [
      [-112.98, 38.6],
      [-108.55, 39.07],
      [-104.9903, 39.7392],
    ],
  },
  {
    id: "I-25",
    label: "I-25",
    points: [
      [-104.9903, 39.7392],
      [-104.8214, 38.8339],
      [-105.94, 35.69],
      [-106.485, 31.7619],
    ],
  },
  {
    id: "I-35",
    label: "I-35",
    points: [
      [-97.3308, 32.7555],
      [-97.7431, 30.2672],
      [-98.4936, 29.4241],
    ],
  },
  {
    id: "I-45",
    label: "I-45",
    points: [
      [-96.797, 32.7767],
      [-96.42, 31.2],
      [-95.3698, 29.7604],
    ],
  },
  {
    id: "I-20",
    label: "I-20",
    points: [
      [-97.3308, 32.7555],
      [-99.73, 32.45],
      [-102.08, 31.997],
      [-104.0, 31.2],
      [-106.485, 31.7619],
    ],
  },
  {
    id: "I-80",
    label: "I-80",
    points: [
      [-119.8138, 39.5296],
      [-117.74, 40.97],
      [-113.9, 41.2],
      [-111.891, 40.7608],
    ],
  },
  {
    id: "I-17",
    label: "I-17",
    points: [
      [-111.6513, 35.1983],
      [-112.074, 33.4484],
    ],
  },
  {
    id: "I-30",
    label: "I-30",
    points: [
      [-96.797, 32.7767],
      [-97.3308, 32.7555],
    ],
  },
];

// Mountain ranges expressed as ridgelines (lon, lat) with a peak height
// weight and a falloff width in kilometers-ish (world units after
// projection). terrain.js turns each into a gaussian ridge bias.
export const MOUNTAIN_RANGES = [
  {
    name: "Sierra Nevada",
    points: [
      [-120.6, 40.2],
      [-119.6, 38.4],
      [-118.6, 36.6],
      [-118.35, 35.3],
    ],
    peak: 1.0,
    width: 22,
  },
  {
    name: "Cascade Range",
    points: [
      [-122.0, 42.2],
      [-121.9, 41.0],
      [-121.5, 40.0],
    ],
    peak: 0.85,
    width: 20,
  },
  {
    name: "Rocky Mountains (Front Range)",
    points: [
      [-106.0, 40.7],
      [-105.7, 39.7],
      [-105.9, 38.8],
      [-106.5, 37.5],
      [-107.9, 36.9],
    ],
    peak: 1.0,
    width: 28,
  },
  {
    name: "Wasatch Range",
    points: [
      [-111.8, 41.7],
      [-111.65, 40.76],
      [-111.55, 39.4],
    ],
    peak: 0.8,
    width: 16,
  },
  {
    name: "Appalachian (out of demo bounds)",
    points: [
      [-93.4, 42.2],
      [-93.4, 25.6],
    ],
    peak: 0.0,
    width: 1,
  },
];

// Simplified state border polygons (lon, lat), closed rings.
export const STATE_BORDERS = {
  CA: [
    [-124.2, 42.0], [-120.0, 42.0], [-120.0, 39.0], [-114.6, 35.0],
    [-114.6, 34.87], [-114.1, 34.3], [-114.5, 33.5], [-117.1, 32.53],
    [-118.5, 33.4], [-120.5, 34.45], [-121.9, 36.3], [-122.4, 37.2],
    [-123.0, 38.0], [-124.1, 40.0], [-124.2, 42.0],
  ],
  NV: [
    [-120.0, 42.0], [-114.05, 42.0], [-114.05, 36.0], [-114.6, 36.0],
    [-114.6, 35.0], [-120.0, 39.0], [-120.0, 42.0],
  ],
  AZ: [
    [-114.6, 37.0], [-109.05, 37.0], [-109.05, 31.33], [-111.07, 31.33],
    [-114.8, 32.5], [-114.6, 34.87], [-114.6, 37.0],
  ],
  UT: [
    [-114.05, 42.0], [-111.05, 42.0], [-111.05, 41.0], [-109.05, 41.0],
    [-109.05, 37.0], [-114.05, 37.0], [-114.05, 42.0],
  ],
  CO: [
    [-109.05, 41.0], [-102.05, 41.0], [-102.05, 37.0], [-109.05, 37.0],
    [-109.05, 41.0],
  ],
  TX: [
    [-103.05, 36.5], [-100.0, 36.5], [-100.0, 34.56], [-94.98, 33.85],
    [-94.0, 30.0], [-93.8, 29.7], [-97.14, 26.0], [-99.5, 27.5],
    [-101.4, 29.8], [-103.65, 29.0], [-106.5, 31.8], [-106.2, 32.0],
    [-103.05, 32.0], [-103.05, 36.5],
  ],
};

// Simplified routing graph: which city pairs are directly connected by
// a demo interstate, and which highway to display for that leg. Real
// mileage is computed at runtime via haversine, this just says "these
// two are adjacent." Dijkstra in routing.js chains legs together for
// longer trips (e.g. Los Angeles -> Denver).
export const ROAD_GRAPH_EDGES = [
  ["Los Angeles", "San Diego", "I-5"],
  ["Los Angeles", "Fresno", "I-5"],
  ["Fresno", "Sacramento", "I-5"],
  ["Sacramento", "San Francisco", "I-80"],
  ["Reno", "Sacramento", "I-80"],
  ["Reno", "Salt Lake City", "I-80"],
  ["Los Angeles", "Las Vegas", "I-15"],
  ["San Diego", "Las Vegas", "I-15"],
  ["Las Vegas", "Salt Lake City", "I-15"],
  ["Los Angeles", "Phoenix", "I-10"],
  ["Phoenix", "Tucson", "I-10"],
  ["Tucson", "El Paso", "I-10"],
  ["El Paso", "San Antonio", "I-10"],
  ["San Antonio", "Houston", "I-10"],
  ["Los Angeles", "Flagstaff", "I-40"],
  ["Flagstaff", "Phoenix", "I-17"],
  ["Salt Lake City", "Denver", "I-70"],
  ["Denver", "Colorado Springs", "I-25"],
  ["Colorado Springs", "El Paso", "I-25"],
  ["Dallas", "Fort Worth", "I-30"],
  ["Dallas", "Austin", "I-35"],
  ["Austin", "San Antonio", "I-35"],
  ["Dallas", "Houston", "I-45"],
  ["Fort Worth", "El Paso", "I-20"],
];

export function findCity(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    CITIES.find((c) => c.name.toLowerCase() === q) ||
    CITIES.find((c) => c.name.toLowerCase().startsWith(q)) ||
    CITIES.find((c) => c.name.toLowerCase().includes(q)) ||
    null
  );
}

// Parses "A to B" / "A الى B" / "A - B" style route queries.
export function parseRouteQuery(text) {
  const parts = text.split(/\s+to\s+|\s+الى\s+|\s+إلى\s+|->|—|-{1,2}>/i);
  if (parts.length !== 2) return null;
  const from = findCity(parts[0]);
  const to = findCity(parts[1]);
  if (!from || !to) return null;
  return { from, to };
}
