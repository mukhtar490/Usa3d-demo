# Terrain/One — Independent 3D USA Terrain + Street View Demo

A self-contained prototype of a Google Maps–style 3D terrain viewer with a
first-person "Street View" driving mode — built entirely with **Three.js**,
procedural terrain, and hand-simplified demo geography. It does **not**
call Google Maps, Street View, or any mapping API: every road, city,
mountain range, and border is generated or hand-placed in code.

## What's implemented

- Procedurally generated 3D terrain (noise + ridge-biased mountain ranges)
  covering the **California → Nevada → Arizona → Utah → Colorado → Texas**
  corridor, with the Sierra Nevada, Cascade Range, Rocky Mountains (Front
  Range), and Wasatch Range raised as real geometry — not flat textures.
- Biome coloring: water, snow caps, exposed rock, desert basin, forest,
  and plains, plus a "Map" vs "Terrain" palette toggle.
- Simplified state borders (CA, NV, AZ, UT, CO, TX) and 18 labeled cities.
- 12 interstate-style highways (I-5, I-10, I-15, I-20, I-25, I-35, I-40,
  I-45, I-70, I-80, plus short connectors I-17 and I-30) draped over the
  terrain with amber centerline striping and shield labels.
- A search bar: type a city name to fly the map there, or
  `City A to City B` to compute a route (distance, driving highways, and
  estimated time) and draw it on the map.
- **Enter Street View**: switches to a first-person driving camera. WASD
  or arrow keys drive (forward/back/steer), drag with the mouse to look
  around freely (360°) independent of the car's heading, and the car
  follows terrain height, easing onto the highway ribbon when nearby.
- **Start Drive** on a computed route puts the car at the origin city and
  autopilots along the highway path to the destination — press any drive
  key at any time to take manual control back.
- Full toolbar: zoom in/out, compass (reset north), current-location,
  2D/3D toggle, Map/Terrain toggle, fullscreen, a live mini-map, and a
  driving HUD (speed, distance driven, current road, speed multiplier).
- Responsive layout down to phone-width screens.

## Project structure

```
usa3d/
├── index.html            # page shell, toolbar/HUD markup, import map
├── css/
│   └── style.css         # dark instrument-panel theme, responsive rules
└── js/
    ├── main.js            # scene setup, render loop, input + UI wiring
    ├── noise.js           # dependency-free value-noise / fBm / ridged noise
    ├── projection.js      # lon/lat <-> world XZ, haversine distance
    ├── geoData.js         # demo cities, highways, borders, mountain ridgelines,
    │                      # and the simplified city-adjacency routing graph
    ├── terrain.js         # height field, biome coloring, terrain mesh, palette toggle
    ├── roads.js           # highway curve/tube geometry + nearest-road lookup
    ├── cities.js           # city markers + text-sprite labels
    ├── borders.js         # draped state border outlines + state code labels
    ├── car.js             # car mesh + driving physics (manual + autopilot)
    ├── cameraModes.js     # orbiting map camera vs first-person street camera
    ├── routing.js         # Dijkstra over the city adjacency graph
    └── ui.js              # DOM wiring: search, toolbar, mini-map, HUD
```

## Running it locally

Because the app uses native ES modules (`import`/`export`), most browsers
block it from `file://` due to CORS — you need a tiny local server. Pick
whichever you have installed:

```bash
# Option A — Python (built into most systems)
cd usa3d
python3 -m http.server 8080

# Option B — Node
cd usa3d
npx serve .

# Option C — VS Code
# Right-click index.html -> "Open with Live Server"
```

Then open **http://localhost:8080** (or whatever port your tool prints).
Three.js itself loads from a CDN (`unpkg.com`) via the import map in
`index.html`, so you need an internet connection the first time (browser
caches it after that).

## Try it

1. Type **Dallas** and press Go — the camera flies to Dallas.
2. Type **Dallas to Houston** — a route line appears with distance/time;
   click **START DRIVE**.
3. Or click **🚗 STREET VIEW** directly from anywhere on the map to drop
   into first-person driving at your current map location.
4. While driving: **W/S** or **↑/↓** to go forward/back, **A/D** or
   **←/→** to steer, drag the mouse to look around, and the speed slider
   in the HUD scales your top speed.

## Known simplifications (by design, for a fast-running demo)

- **Not survey-accurate.** City coordinates are real; state borders and
  highway paths are simplified polylines (a handful of points each), not
  real GIS shapefiles or OpenStreetMap data.
- **Only 6 states are built out.** The routing graph and geometry cover
  the demo corridor. Everything is structured so more states are additive,
  not a rewrite (see below).
- **Terrain is procedural, not real elevation.** It's tuned to *look*
  right (raised Sierra Nevada, Rockies, etc.) rather than sourced from a
  real heightmap/DEM.
- **Driving is a lightweight arcade model**, not a physically accurate
  vehicle simulation — it prioritizes feeling responsive over realism.
- **Road-network routing is a hand-authored adjacency graph** between
  cities (which pairs are "directly connected" and by which highway),
  not automatic intersection detection between the rendered curves.
- No shadow mapping is enabled by default (`renderer.shadowMap.enabled`
  in `main.js`) to keep frame rate high on modest GPUs; flip it on if
  your target machine can afford it.

## Extending toward the full 50-state version

1. **Real elevation data**: swap `terrain.js`'s procedural `getHeight()`
   for a lookup into a real DEM (e.g. Mapbox Terrain-RGB tiles or SRTM
   data converted to a heightmap texture), sampled the same way.
2. **Real roads**: replace `geoData.HIGHWAYS` with geometry generated
   from an Interstate Highway shapefile/GeoJSON (e.g. from the US
   Census TIGER/Line dataset), and derive the routing graph
   (`ROAD_GRAPH_EDGES`) from actual intersections instead of a
   hand-written city list.
3. **Real state borders**: replace `geoData.STATE_BORDERS` with the
   Census TIGER/Line state boundary shapefiles (simplify with a tool
   like `mapshaper` before import, so the browser isn't drawing
   full-resolution coastlines).
4. **Level of detail**: chunk the terrain into tiles (e.g. 8×8) and only
   build/keep high-resolution geometry for tiles near the camera,
   swapping in a coarse far-LOD mesh beyond a distance threshold —
   `terrain.js`'s single big `PlaneGeometry` is the first thing to split.
5. **Instancing**: trees, buildings, and road signage should use
   `THREE.InstancedMesh` once you add them at any real density.
6. **True Street View look-and-feel**: add procedural roadside detail
   (buildings, trees, mile markers, exit signs) generated along each
   highway curve as the car approaches, and stream it in/out with a
   simple distance check so memory stays bounded.
