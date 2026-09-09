// main.js
// Wires together terrain, roads, cities, borders, the car, both camera
// modes, and the UI. This is the only file that knows about the THREE
// scene graph as a whole.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { buildTerrainMesh, getHeight, applyPalette } from "./terrain.js";
import { buildRoads, nearestRoadPoint } from "./roads.js";
import { buildCities, findCityRecord } from "./cities.js";
import { buildBorders } from "./borders.js";
import { buildCar, createDriveState, updateDrive, startAutopilot, stopAutopilot } from "./car.js";
import { MapCameraController, StreetCameraController } from "./cameraModes.js";
import { findRoute } from "./routing.js";
import { initUI, drawMiniMap } from "./ui.js";

const canvasHost = document.getElementById("scene-container");

// ---------- Renderer / scene / lights ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // keep the demo fast; see README for enabling shadows
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e14);
scene.fog = new THREE.FogExp2(0x0a0e14, 0.0016);

const hemi = new THREE.HemisphereLight(0x9fb8c9, 0x2a2018, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 1.15);
sun.position.set(-300, 420, 220);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 6000);

// ---------- World content ----------
const { mesh: terrainMesh, water, bounds } = buildTerrainMesh(THREE);
scene.add(terrainMesh);
scene.add(water);

const { group: roadsGroup, roadNetwork } = buildRoads(THREE, getHeight);
scene.add(roadsGroup);

const { group: citiesGroup, registry: cityRegistry } = buildCities(THREE, getHeight);
scene.add(citiesGroup);

const bordersGroup = buildBorders(THREE, getHeight);
scene.add(bordersGroup);

const car = buildCar(THREE);
car.visible = false; // hidden until the user enters Street View
scene.add(car);

// ---------- Camera controllers ----------
const mapController = new MapCameraController(THREE, OrbitControls, camera, renderer.domElement);
const streetController = new StreetCameraController(THREE, camera, renderer.domElement);

const laRecord = findCityRecord(cityRegistry, "Los Angeles");
mapController.focusOn(laRecord.x, laRecord.y, laRecord.z, 260);

// ---------- Driving state ----------
const driveState = createDriveState(laRecord.x, laRecord.z, 0);
let isStreetView = false;
let paletteMode = "terrain";
let pendingRoute = null;
let routeLine = null;
let distanceDrivenMi = 0;

const input = { forward: false, back: false, left: false, right: false, brake: false };

function cancelManualAutopilotIfSteering() {
  if (driveState.autopilot && (input.forward || input.back || input.left || input.right)) {
    stopAutopilot(driveState);
  }
}

window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      input.forward = true;
      break;
    case "KeyS":
    case "ArrowDown":
      input.back = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      input.left = true;
      break;
    case "KeyD":
    case "ArrowRight":
      input.right = true;
      break;
    case "Space":
      input.brake = true;
      break;
    default:
      return;
  }
  cancelManualAutopilotIfSteering();
});

window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      input.forward = false;
      break;
    case "KeyS":
    case "ArrowDown":
      input.back = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      input.left = false;
      break;
    case "KeyD":
    case "ArrowRight":
      input.right = false;
      break;
    case "Space":
      input.brake = false;
      break;
  }
});

// ---------- Route <-> road-following path helper ----------
function legPathPoints(fromRec, toRec, highwayId) {
  const road = roadNetwork.find((r) => r.id === highwayId);
  if (!road) return [new THREE.Vector3(fromRec.x, fromRec.y, fromRec.z), new THREE.Vector3(toRec.x, toRec.y, toRec.z)];

  const nearestIndex = (rec) => {
    let bestI = 0;
    let bestD = Infinity;
    road.points.forEach((p, i) => {
      const d = Math.hypot(p.x - rec.x, p.z - rec.z);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    return bestI;
  };

  const i0 = nearestIndex(fromRec);
  const i1 = nearestIndex(toRec);
  const slice =
    i0 <= i1 ? road.points.slice(i0, i1 + 1) : road.points.slice(i1, i0 + 1).reverse();
  return slice.length ? slice : [new THREE.Vector3(fromRec.x, fromRec.y, fromRec.z)];
}

function buildFullRoutePath(routeResult) {
  const points = [];
  for (const leg of routeResult.legs) {
    const fromRec = findCityRecord(cityRegistry, leg.from);
    const toRec = findCityRecord(cityRegistry, leg.to);
    const seg = legPathPoints(fromRec, toRec, leg.highway);
    if (points.length && seg.length) points.pop(); // avoid duplicate joint point
    points.push(...seg);
  }
  return points;
}

function showRouteLine(points) {
  if (routeLine) {
    scene.remove(routeLine);
    routeLine.geometry.dispose();
    routeLine.material.dispose();
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map((p) => new THREE.Vector3(p.x, p.y + 0.6, p.z))
  );
  const material = new THREE.LineBasicMaterial({ color: 0x4fd1c5, linewidth: 2 });
  routeLine = new THREE.Line(geometry, material);
  scene.add(routeLine);
}

// ---------- UI ----------
const ui = initUI({
  onSearch(text) {
    const rec = findCityRecord(cityRegistry, text);
    if (!rec) {
      ui.setStatus(`No demo city matches "${text}". Try Dallas, Phoenix, Denver...`);
      return;
    }
    ui.setStatus(`Showing ${rec.name}, ${rec.state}`);
    ui.hideRoutePanel();
    pendingRoute = null;
    if (isStreetView) {
      driveState.x = rec.x;
      driveState.z = rec.z;
      driveState.speed = 0;
      stopAutopilot(driveState);
    } else {
      mapController.focusOn(rec.x, rec.y, rec.z, 200);
    }
  },
  onRoute(text) {
    const parts = text.split(/\s+to\s+|\s+الى\s+|\s+إلى\s+|->|—|-{1,2}>/i);
    if (parts.length !== 2) {
      ui.setStatus('Type "City A to City B" to plan a route.');
      return;
    }
    const fromRec = findCityRecord(cityRegistry, parts[0]);
    const toRec = findCityRecord(cityRegistry, parts[1]);
    if (!fromRec || !toRec) {
      ui.setStatus("Couldn't match both city names.");
      return;
    }
    const result = findRoute(fromRec.name, toRec.name);
    if (!result) {
      ui.setStatus(`No demo highway connects ${fromRec.name} and ${toRec.name} yet.`);
      return;
    }
    pendingRoute = result;
    ui.showRoutePanel(result);
    showRouteLine(buildFullRoutePath(result));
    mapController.focusOn(
      (fromRec.x + toRec.x) / 2,
      Math.max(fromRec.y, toRec.y),
      (fromRec.z + toRec.z) / 2,
      Math.max(260, Math.hypot(toRec.x - fromRec.x, toRec.z - fromRec.z) * 0.7)
    );
  },
  onZoom(factor) {
    if (isStreetView) {
      camera.fov = Math.max(30, Math.min(80, camera.fov * factor));
      camera.updateProjectionMatrix();
    } else {
      mapController.zoom(factor);
    }
  },
  onCompass() {
    if (!isStreetView) mapController.resetCompass();
  },
  onLocate() {
    if (isStreetView) {
      driveState.x = laRecord.x;
      driveState.z = laRecord.z;
      driveState.speed = 0;
      stopAutopilot(driveState);
    } else {
      mapController.focusOn(laRecord.x, laRecord.y, laRecord.z, 260);
    }
    ui.setStatus("Back to Los Angeles");
  },
  onToggleDimension() {
    return mapController.toggleDimension();
  },
  onTogglePalette() {
    paletteMode = paletteMode === "terrain" ? "map" : "terrain";
    applyPalette(THREE, terrainMesh, paletteMode);
    return paletteMode;
  },
  onToggleStreetView() {
    setStreetView(!isStreetView);
  },
  onStartDrive() {
    if (!pendingRoute) return;
    const fromRec = findCityRecord(cityRegistry, pendingRoute.from.name);
    if (!isStreetView) setStreetView(true);
    driveState.x = fromRec.x;
    driveState.z = fromRec.z;
    driveState.speed = 0;
    const path = buildFullRoutePath(pendingRoute);
    distanceDrivenMi = 0;
    startAutopilot(driveState, path);
    ui.setStatus(`Driving ${pendingRoute.from.name} \u2192 ${pendingRoute.to.name}. Press W/A/S/D any time to take over.`);
  },
  onSpeedChange(multiplier) {
    driveState.speedMultiplier = multiplier;
  },
});

function setStreetView(active) {
  isStreetView = active;
  mapController.controls.enabled = !active;
  car.visible = active;
  ui.setStreetViewActive(active);
  touchControls.classList.toggle("hidden", !active);
  if (active) {
    camera.fov = 62;
    camera.updateProjectionMatrix();
  } else {
    stopAutopilot(driveState);
    mapController.focusOn(driveState.x, getHeight(driveState.x, driveState.z), driveState.z, 220);
  }
}

ui.hideLoading();

// ---------- Touch driving controls (phones/tablets) ----------
const touchControls = document.getElementById("touch-controls");

function bindHoldButton(id, key) {
  const btn = document.getElementById(id);
  const press = (e) => {
    e.preventDefault();
    input[key] = true;
    btn.classList.add("pressed");
    cancelManualAutopilotIfSteering();
  };
  const release = (e) => {
    e.preventDefault();
    input[key] = false;
    btn.classList.remove("pressed");
  };
  btn.addEventListener("pointerdown", press);
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointercancel", release);
  btn.addEventListener("pointerleave", release);
}

bindHoldButton("tc-forward", "forward");
bindHoldButton("tc-back", "back");
bindHoldButton("tc-left", "left");
bindHoldButton("tc-right", "right");

// ---------- Minimap ----------
const minimapCanvas = document.getElementById("minimap-canvas");
const minimapCtx = minimapCanvas.getContext("2d");

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Animate ----------
const clock = new THREE.Clock();
let lastMiniMapUpdate = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.06, clock.getDelta());

  if (isStreetView) {
    const near = updateDrive(driveState, input, dt, getHeight, roadNetwork, nearestRoadPoint);

    car.position.set(driveState.x, driveState.y, driveState.z);
    car.rotation.y = driveState.heading;

    streetController.update(driveState);

    // Stylized speed readout (this is a demo scale, not a literal
    // unit conversion) — distance is integrated from the same number
    // so the two HUD readouts always agree with each other.
    const speedMph = Math.abs(driveState.speed) * 2.237 * 1.9;
    distanceDrivenMi += (speedMph / 3600) * dt;
    ui.updateHUD({
      speedMph,
      distanceMi: distanceDrivenMi,
      roadLabel: near && near.dist < 3.2 ? near.road.label : null,
    });
  } else {
    mapController.update();
  }

  const now = performance.now();
  if (now - lastMiniMapUpdate > 90) {
    lastMiniMapUpdate = now;
    drawMiniMap(minimapCtx, minimapCanvas, {
      bounds,
      roadNetwork,
      cities: cityRegistry,
      playerX: isStreetView ? driveState.x : mapController.controls.target.x,
      playerZ: isStreetView ? driveState.z : mapController.controls.target.z,
      heading: isStreetView ? driveState.heading : 0,
    });
  }

  renderer.render(scene, camera);
}

animate();
