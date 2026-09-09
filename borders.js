// borders.js
// Renders each state's simplified polygon as a thin glowing line draped
// on the terrain surface, plus a state-code label near its centroid.

import { STATE_BORDERS } from "./geoData.js";
import { lonLatToWorld } from "./projection.js";

function makeStateLabel(THREE, code) {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  ctx.font = "700 44px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "rgba(231,238,242,0.28)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(code, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(20, 10, 1);
  return sprite;
}

export function buildBorders(THREE, getHeight) {
  const group = new THREE.Group();

  for (const [code, ring] of Object.entries(STATE_BORDERS)) {
    const worldPts = ring.map(([lon, lat]) => lonLatToWorld(lon, lat));
    const drapedPts = [];
    let cx = 0;
    let cz = 0;
    for (const p of worldPts) {
      const y = getHeight(p.x, p.z) + 0.8;
      drapedPts.push(new THREE.Vector3(p.x, y, p.z));
      cx += p.x;
      cz += p.z;
    }
    cx /= worldPts.length;
    cz /= worldPts.length;

    const geometry = new THREE.BufferGeometry().setFromPoints(drapedPts);
    const material = new THREE.LineBasicMaterial({
      color: 0x4fd1c5,
      transparent: true,
      opacity: 0.35,
    });
    const line = new THREE.Line(geometry, material);
    group.add(line);

    const label = makeStateLabel(THREE, code);
    label.position.set(cx, getHeight(cx, cz) + 14, cz);
    group.add(label);
  }

  return group;
}
