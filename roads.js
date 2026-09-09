// roads.js
// Turns the simplified lon/lat highway waypoints into smooth curves
// draped over the terrain, plus text-sprite shields (I-10, I-40, ...).
// Also exposes the sampled curve data so car.js can snap the vehicle
// onto the nearest road while driving.

import { HIGHWAYS } from "./geoData.js";
import { lonLatToWorld } from "./projection.js";

const ROAD_WIDTH = 2.6;
const ROAD_OFFSET = 0.45; // lift above terrain to avoid z-fighting
const SAMPLE_COUNT = 220;

function makeShieldSprite(THREE, label) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(15,20,26,0.0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e8a33d";
  roundRect(ctx, 6, 18, 116, 60, 10);
  ctx.fill();
  ctx.fillStyle = "#0a0e14";
  ctx.font = "bold 34px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(9, 6.7, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function buildRoads(THREE, getHeight) {
  const group = new THREE.Group();
  const roadNetwork = []; // { id, label, points: THREE.Vector3[] } draped, for driving snap

  for (const hwy of HIGHWAYS) {
    const rawPoints = hwy.points.map(([lon, lat]) => {
      const { x, z } = lonLatToWorld(lon, lat);
      return new THREE.Vector3(x, 0, z);
    });

    const shapingCurve = new THREE.CatmullRomCurve3(rawPoints, false, "catmullrom", 0.15);
    const sampled = shapingCurve.getPoints(SAMPLE_COUNT);
    const draped = sampled.map(
      (p) => new THREE.Vector3(p.x, getHeight(p.x, p.z) + ROAD_OFFSET, p.z)
    );

    const drivingCurve = new THREE.CatmullRomCurve3(draped, false, "catmullrom", 0.1);
    const tubeGeo = new THREE.TubeGeometry(
      drivingCurve,
      Math.max(60, Math.floor(SAMPLE_COUNT * 0.7)),
      ROAD_WIDTH / 2,
      6,
      false
    );
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x2a2f36,
      roughness: 0.85,
      metalness: 0.05,
    });
    const roadMesh = new THREE.Mesh(tubeGeo, tubeMat);
    roadMesh.castShadow = false;
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // Thin amber centerline stripe for map readability.
    const stripeGeo = new THREE.TubeGeometry(
      drivingCurve,
      Math.max(60, Math.floor(SAMPLE_COUNT * 0.7)),
      0.12,
      4,
      false
    );
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xe8a33d });
    group.add(new THREE.Mesh(stripeGeo, stripeMat));

    // A highway shield roughly at the midpoint.
    const mid = draped[Math.floor(draped.length / 2)];
    const shield = makeShieldSprite(THREE, hwy.label);
    shield.position.set(mid.x, mid.y + 6, mid.z);
    group.add(shield);

    roadNetwork.push({ id: hwy.id, label: hwy.label, points: draped, curve: drivingCurve });
  }

  return { group, roadNetwork };
}

// Finds the nearest point on the whole road network to a given (x, z),
// returning distance, the road id, and a 0..1 progress value along it.
export function nearestRoadPoint(roadNetwork, x, z) {
  let best = null;
  for (const road of roadNetwork) {
    const pts = road.points;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - x, pts[i].z - z);
      if (!best || d < best.dist) {
        best = { dist: d, road, index: i, point: pts[i] };
      }
    }
  }
  return best;
}
