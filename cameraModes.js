// cameraModes.js
// Two camera behaviors:
//  - MapCameraController: orbiting bird's-eye camera for the map view,
//    with a 2D/3D toggle (polar angle) and zoom.
//  - StreetCameraController: first-person, mounted just behind/above
//    the car, with free mouse-look independent of the car's heading.

export class MapCameraController {
  constructor(THREE, OrbitControls, camera, domElement) {
    this.THREE = THREE;
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 1400;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minPolarAngle = Math.PI * 0.05;
    this.mode3D = true;
  }

  focusOn(x, y, z, distance = 220) {
    const controls = this.controls;
    controls.target.set(x, y, z);
    const angle = this.mode3D ? Math.PI * 0.32 : Math.PI * 0.08;
    const dir = new this.THREE.Vector3(0.3, Math.cos(angle), Math.sin(angle)).normalize();
    this.camera.position.set(
      x + dir.x * distance,
      y + Math.cos(angle) * distance,
      z + Math.sin(angle) * distance
    );
    controls.update();
  }

  toggleDimension() {
    this.mode3D = !this.mode3D;
    const target = this.controls.target;
    const dist = this.camera.position.distanceTo(target);
    this.focusOn(target.x, target.y, target.z, dist);
    return this.mode3D;
  }

  zoom(factor) {
    const target = this.controls.target;
    const dist = Math.max(
      this.controls.minDistance,
      Math.min(this.controls.maxDistance, this.camera.position.distanceTo(target) * factor)
    );
    const dir = this.camera.position.clone().sub(target).normalize();
    this.camera.position.copy(target.clone().add(dir.multiplyScalar(dist)));
    this.controls.update();
  }

  resetCompass() {
    // Snap azimuth back to "north up" while preserving current tilt/zoom.
    const target = this.controls.target;
    const dist = this.camera.position.distanceTo(target);
    this.focusOn(target.x, target.y, target.z, dist);
  }

  update() {
    this.controls.update();
  }
}

export class StreetCameraController {
  constructor(THREE, camera, domElement) {
    this.THREE = THREE;
    this.camera = camera;
    this.domElement = domElement;
    this.yaw = 0; // look offset relative to car heading
    this.pitch = -0.03;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;

    this._onDown = (e) => {
      this.dragging = true;
      this.lastX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      this.lastY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    };
    this._onUp = () => (this.dragging = false);
    this._onMove = (e) => {
      if (!this.dragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? this.lastX;
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? this.lastY;
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      this.lastX = x;
      this.lastY = y;
      this.yaw -= dx * 0.005;
      this.pitch = Math.max(-0.9, Math.min(0.6, this.pitch - dy * 0.004));
    };

    domElement.addEventListener("mousedown", this._onDown);
    window.addEventListener("mouseup", this._onUp);
    window.addEventListener("mousemove", this._onMove);
    domElement.addEventListener("touchstart", this._onDown, { passive: true });
    window.addEventListener("touchend", this._onUp);
    window.addEventListener("touchmove", this._onMove, { passive: true });
  }

  dispose() {
    this.domElement.removeEventListener("mousedown", this._onDown);
    window.removeEventListener("mouseup", this._onUp);
    window.removeEventListener("mousemove", this._onMove);
    this.domElement.removeEventListener("touchstart", this._onDown);
    window.removeEventListener("touchend", this._onUp);
    window.removeEventListener("touchmove", this._onMove);
  }

  update(driveState) {
    const THREE = this.THREE;
    const totalYaw = driveState.heading + this.yaw;
    const eyeHeight = 1.55;
    const back = 0.15;

    const camPos = new THREE.Vector3(
      driveState.x - Math.sin(driveState.heading) * back,
      driveState.y + eyeHeight,
      driveState.z - Math.cos(driveState.heading) * back
    );
    this.camera.position.copy(camPos);

    const lookDir = new THREE.Vector3(
      Math.sin(totalYaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(totalYaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(camPos.clone().add(lookDir));
  }
}
