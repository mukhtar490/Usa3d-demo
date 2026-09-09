// cities.js
// Builds a marker + floating text label for every demo city, sitting
// at the correct terrain height.

import { CITIES } from "./geoData.js";
import { lonLatToWorld } from "./projection.js";

function makeLabelSprite(THREE, text, subtext) {
  const canvas = document.createElement("canvas");
  const pad = 12;
  canvas.width = 320;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.font = "600 34px 'Space Grotesk', 'Segoe UI', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#eaf1f4";
  ctx.fillText(text, pad, 8);
  ctx.font = "400 20px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#6fd8cf";
  ctx.fillText(subtext, pad, 54);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: true,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(22, 6.6, 1);
  return sprite;
}

export function buildCities(THREE, getHeight) {
  const group = new THREE.Group();
  const registry = [];

  for (const city of CITIES) {
    const { x, z } = lonLatToWorld(city.lon, city.lat);
    const y = getHeight(x, z);

    const markerGeo = new THREE.ConeGeometry(0.9 * city.size, 3.2 * city.size, 8);
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0x4fd1c5,
      emissive: 0x0c3b38,
      roughness: 0.4,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(x, y + (1.6 * city.size), z);
    marker.rotation.x = Math.PI;
    group.add(marker);

    const label = makeLabelSprite(THREE, city.name, city.state);
    label.position.set(x, y + 4.2 * city.size + 3, z);
    group.add(label);

    registry.push({ ...city, x, y, z, marker, label });
  }

  return { group, registry };
}

export function findCityRecord(registry, name) {
  const q = name.trim().toLowerCase();
  return (
    registry.find((c) => c.name.toLowerCase() === q) ||
    registry.find((c) => c.name.toLowerCase().startsWith(q)) ||
    registry.find((c) => c.name.toLowerCase().includes(q)) ||
    null
  );
}
