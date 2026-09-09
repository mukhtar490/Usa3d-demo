// routing.js
// A small Dijkstra implementation over the simplified city adjacency
// graph in geoData.js. Real mileage per edge comes from haversine
// distance on the actual lon/lat, so results feel plausible even
// though the underlying network is a hand-drawn demo subset.

import { CITIES, ROAD_GRAPH_EDGES } from "./geoData.js";
import { haversineMiles } from "./projection.js";

function buildGraph() {
  const byName = new Map(CITIES.map((c) => [c.name, c]));
  const adjacency = new Map(CITIES.map((c) => [c.name, []]));

  for (const [a, b, highway] of ROAD_GRAPH_EDGES) {
    const ca = byName.get(a);
    const cb = byName.get(b);
    if (!ca || !cb) continue;
    const miles = haversineMiles(ca.lon, ca.lat, cb.lon, cb.lat);
    adjacency.get(a).push({ to: b, miles, highway });
    adjacency.get(b).push({ to: a, miles, highway });
  }

  return { byName, adjacency };
}

const GRAPH = buildGraph();

export function findRoute(fromName, toName) {
  const { byName, adjacency } = GRAPH;
  if (!byName.has(fromName) || !byName.has(toName)) return null;
  if (fromName === toName) return null;

  const dist = new Map([[fromName, 0]]);
  const prev = new Map();
  const visited = new Set();
  const queue = new Set(byName.keys());

  while (queue.size) {
    let current = null;
    let currentDist = Infinity;
    for (const name of queue) {
      const d = dist.has(name) ? dist.get(name) : Infinity;
      if (d < currentDist) {
        currentDist = d;
        current = name;
      }
    }
    if (current === null) break;
    queue.delete(current);
    visited.add(current);
    if (current === toName) break;

    for (const edge of adjacency.get(current) || []) {
      if (visited.has(edge.to)) continue;
      const alt = currentDist + edge.miles;
      if (alt < (dist.has(edge.to) ? dist.get(edge.to) : Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, { from: current, highway: edge.highway, miles: edge.miles });
      }
    }
  }

  if (!prev.has(toName) && fromName !== toName) {
    return null; // no path in the demo network
  }

  const legs = [];
  let cursor = toName;
  while (cursor !== fromName) {
    const step = prev.get(cursor);
    if (!step) return null;
    legs.unshift({ from: step.from, to: cursor, highway: step.highway, miles: step.miles });
    cursor = step.from;
  }

  const totalMiles = legs.reduce((sum, leg) => sum + leg.miles, 0);
  const avgSpeedMph = 62;
  const hours = totalMiles / avgSpeedMph;

  return {
    from: byName.get(fromName),
    to: byName.get(toName),
    legs,
    totalMiles,
    hours,
    cityPath: [fromName, ...legs.map((l) => l.to)],
  };
}
