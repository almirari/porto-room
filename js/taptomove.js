const T = THREE;

export function setupTapMove({ canvas, camera, col, clickables = [], speed = 2.5, radius = 0.25, scene }) {
  const ray = new T.Raycaster();
  const floor = new T.Plane(new T.Vector3(0, 1, 0), -0.05); // floor top is y≈0.05
  const target = new T.Vector3();
  let moving = false;

  // little ring on the floor where you tapped
  const marker = new T.Mesh(
    new T.RingGeometry(0.12, 0.18, 24),
    new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);

  const blocked = (x, z) =>
    Math.abs(x) > 3.7 || Math.abs(z) > 3.7 ||
    col.some(([x0, x1, z0, z1]) => x > x0 - radius && x < x1 + radius && z > z0 - radius && z < z1 + radius);

  // tap vs drag: only short, small movements count as a tap
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const isTap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 300;
    down = null;
    if (!isTap) return;

    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(
      new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1),
      camera
    );

    // tapped something clickable? let your existing click handler deal with it
    if (ray.intersectObjects(clickables, true).length) return;

    const hit = new T.Vector3();
    if (ray.ray.intersectPlane(floor, hit) && !blocked(hit.x, hit.z)) {
      target.copy(hit);
      moving = true;
      marker.position.set(hit.x, 0.07, hit.z);
      marker.visible = true;
    }
  });

  // call every frame with delta time in seconds
  return function update(dt) {
    if (!moving) return;
    const p = camera.position;
    const dx = target.x - p.x, dz = target.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) { moving = false; marker.visible = false; return; }

    const step = Math.min(speed * dt, dist);
    const nx = p.x + (dx / dist) * step, nz = p.z + (dz / dist) * step;

    // try each axis separately so you slide along furniture instead of sticking
    let moved = false;
    if (!blocked(nx, p.z)) { p.x = nx; moved = true; }
    if (!blocked(p.x, nz)) { p.z = nz; moved = true; }
    if (!moved) { moving = false; marker.visible = false; } // stuck, give up
  };
}