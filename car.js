// car.js
// A small low-poly car mesh plus a lightweight driving model: forward/
// back accelerate along the car's heading, left/right steer, and the
// car always sits on the terrain height field. When close to a
// highway it eases onto the road's exact line so it visually "drives
// on the road" rather than just floating over it.

export function buildCar(THREE) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8a33d, roughness: 0.4, metalness: 0.3 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1c232b, roughness: 0.2, metalness: 0.1 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111417, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.0), bodyMat);
  body.position.y = 0.55;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.0), cabinMat);
  cabin.position.set(0, 1.02, -0.2);
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.34, 16);
  const wheelOffsets = [
    [-0.95, 0.38, 1.35],
    [0.95, 0.38, 1.35],
    [-0.95, 0.38, -1.35],
    [0.95, 0.38, -1.35],
  ];
  for (const [x, y, z] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
  }

  const headlight = new THREE.PointLight(0xfff3d6, 1.2, 22, 2);
  headlight.position.set(0, 0.7, 2.2);
  group.add(headlight);

  return group;
}

export function createDriveState(startX, startZ, headingRad = 0) {
  return {
    x: startX,
    z: startZ,
    y: 0,
    heading: headingRad,
    speed: 0, // world units / second
    maxSpeed: 34,
    speedMultiplier: 1,
    autopilot: null, // { points: THREE.Vector3[], index, } when following a route
  };
}

const ACCEL = 22;
const BRAKE = 34;
const DRAG = 10;
const TURN_RATE = 1.9; // radians/sec at full steer, scales down at low speed

export function updateDrive(state, input, dt, getHeight, roadNetwork, nearestRoadPoint) {
  if (state.autopilot) {
    stepAutopilot(state, dt);
  } else {
    let throttle = 0;
    if (input.forward) throttle += 1;
    if (input.back) throttle -= 1;

    if (throttle !== 0) {
      state.speed += throttle * ACCEL * dt;
    } else if (state.speed > 0) {
      state.speed = Math.max(0, state.speed - DRAG * dt);
    } else if (state.speed < 0) {
      state.speed = Math.min(0, state.speed + DRAG * dt);
    }

    if (input.brake && state.speed !== 0) {
      const decel = Math.sign(state.speed) * BRAKE * dt;
      state.speed = Math.abs(decel) >= Math.abs(state.speed) ? 0 : state.speed - decel;
    }

    const cap = state.maxSpeed * state.speedMultiplier;
    state.speed = Math.max(-cap * 0.5, Math.min(cap, state.speed));

    const speedFactor = Math.min(1, Math.abs(state.speed) / 6);
    let steer = 0;
    if (input.left) steer += 1;
    if (input.right) steer -= 1;
    if (steer !== 0 && state.speed !== 0) {
      const dir = state.speed >= 0 ? 1 : -1;
      state.heading += steer * TURN_RATE * dt * speedFactor * dir;
    }

    state.x += Math.sin(state.heading) * state.speed * dt;
    state.z += Math.cos(state.heading) * state.speed * dt;
  }

  // Ease onto the nearest road's height/line when close by, so the car
  // visually rides the highway ribbon instead of just the raw terrain.
  const near = roadNetwork.length ? nearestRoadPoint(roadNetwork, state.x, state.z) : null;
  const groundY = getHeight(state.x, state.z);
  if (near && near.dist < 3.2) {
    const t = 1 - near.dist / 3.2;
    state.y = groundY * (1 - t) + near.point.y * t;
  } else {
    state.y = groundY;
  }

  return near;
}

export function startAutopilot(state, worldPoints) {
  state.autopilot = { points: worldPoints, index: 0, t: 0 };
  if (worldPoints.length > 1) {
    const a = worldPoints[0];
    const b = worldPoints[1];
    state.heading = Math.atan2(b.x - a.x, b.z - a.z);
  }
}

export function stopAutopilot(state) {
  state.autopilot = null;
}

function stepAutopilot(state, dt) {
  const ap = state.autopilot;
  const pts = ap.points;
  if (ap.index >= pts.length - 1) {
    state.autopilot = null;
    return;
  }
  const a = pts[ap.index];
  const b = pts[ap.index + 1];
  const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6;
  const speed = state.maxSpeed * 0.6 * state.speedMultiplier;
  ap.t += (speed * dt) / segLen;

  if (ap.t >= 1) {
    ap.index += 1;
    ap.t = 0;
    if (ap.index >= pts.length - 1) {
      state.x = b.x;
      state.z = b.z;
      state.speed = 0;
      state.autopilot = null;
      return;
    }
  }

  const a2 = pts[ap.index];
  const b2 = pts[ap.index + 1];
  state.x = a2.x + (b2.x - a2.x) * ap.t;
  state.z = a2.z + (b2.z - a2.z) * ap.t;
  state.heading = Math.atan2(b2.x - a2.x, b2.z - a2.z);
  state.speed = speed;
}
