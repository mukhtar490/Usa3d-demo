// ui.js
// All DOM wiring lives here: the search bar, toolbar buttons, the 2D
// minimap canvas, and the speed/distance HUD. Keeping this separate
// from main.js means the 3D scene code doesn't need to know about
// button ids or canvas contexts.

export function initUI(callbacks) {
  const el = (id) => document.getElementById(id);

  const searchInput = el("search-input");
  const searchForm = el("search-form");
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = searchInput.value.trim();
    if (!text) return;
    if (/\s(to|الى|إلى)\s|->|—/i.test(text)) {
      callbacks.onRoute(text);
    } else {
      callbacks.onSearch(text);
    }
  });

  el("btn-zoom-in").addEventListener("click", () => callbacks.onZoom(0.8));
  el("btn-zoom-out").addEventListener("click", () => callbacks.onZoom(1.25));
  el("btn-compass").addEventListener("click", () => callbacks.onCompass());
  el("btn-locate").addEventListener("click", () => callbacks.onLocate());
  el("btn-dimension").addEventListener("click", (e) => {
    const is3D = callbacks.onToggleDimension();
    e.currentTarget.textContent = is3D ? "3D" : "2D";
  });
  el("btn-palette").addEventListener("click", (e) => {
    const mode = callbacks.onTogglePalette();
    e.currentTarget.textContent = mode === "map" ? "Map" : "Terrain";
  });
  el("btn-streetview").addEventListener("click", () => callbacks.onToggleStreetView());
  el("btn-fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  el("btn-start-drive").addEventListener("click", () => callbacks.onStartDrive());

  const speedRange = el("speed-range");
  speedRange.addEventListener("input", () => callbacks.onSpeedChange(parseFloat(speedRange.value)));

  return {
    setStatus(text) {
      el("status-line").textContent = text;
    },
    setSearchValue(text) {
      searchInput.value = text;
    },
    showRoutePanel(routeResult) {
      const panel = el("route-panel");
      panel.classList.remove("hidden");
      el("route-title").textContent = `${routeResult.from.name} \u2192 ${routeResult.to.name}`;
      const viaList = [...new Set(routeResult.legs.map((l) => l.highway))].join(", ");
      el("route-detail").textContent =
        `${routeResult.totalMiles.toFixed(0)} mi \u00b7 ${formatHours(routeResult.hours)} \u00b7 via ${viaList}`;
    },
    hideRoutePanel() {
      el("route-panel").classList.add("hidden");
    },
    setStreetViewActive(active) {
      el("btn-streetview").classList.toggle("active", active);
      el("btn-streetview").textContent = active ? "\uD83D\uDDFA\uFE0F EXIT" : "\uD83D\uDE97 STREET VIEW";
      el("hud-drive").classList.toggle("hidden", !active);
      el("panel-topbar").classList.toggle("compact", active);
    },
    updateHUD({ speedMph, distanceMi, roadLabel }) {
      el("hud-speed-value").textContent = Math.round(speedMph);
      el("hud-distance-value").textContent = distanceMi.toFixed(1);
      el("hud-road-value").textContent = roadLabel || "off-road";
    },
    hideLoading() {
      el("loading-overlay").classList.add("hidden");
    },
  };
}

function formatHours(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

// Draws the top-down minimap: state borders bounding box, roads, cities,
// and the current player/camera marker.
export function drawMiniMap(ctx, canvas, { bounds, roadNetwork, cities, playerX, playerZ, heading }) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(10,14,20,0.55)";
  ctx.fillRect(0, 0, w, h);

  const pad = 10;
  const sx = (x) => pad + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (w - pad * 2);
  const sy = (z) => pad + ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * (h - pad * 2);

  ctx.strokeStyle = "rgba(79,209,197,0.5)";
  ctx.lineWidth = 1;
  for (const road of roadNetwork) {
    ctx.beginPath();
    road.points.forEach((p, i) => {
      const px = sx(p.x);
      const pz = sy(p.z);
      if (i === 0) ctx.moveTo(px, pz);
      else ctx.lineTo(px, pz);
    });
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(232,163,61,0.9)";
  for (const city of cities) {
    ctx.beginPath();
    ctx.arc(sx(city.x), sy(city.z), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (playerX !== undefined) {
    const px = sx(playerX);
    const pz = sy(playerZ);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(heading || 0);
    ctx.fillStyle = "#4fd1c5";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
