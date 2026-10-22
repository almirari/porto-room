// Builds the room. Add furniture by adding lines inside the matching section.
// on(mesh, label, fn) makes something clickable.
import { loadModel } from './models.js';

const T = THREE;

export function buildRoom(scene, on, actions) {
  const col = []; // collision boxes: [minX, maxX, minZ, maxZ]

  // ═════════ helpers ═════════

  // generic mesh: geometry, color, position, y-rotation
  const mesh = (geo, color, x, y, z, ry = 0, castShadow = true) => {
    const m = new T.Mesh(geo, new T.MeshLambertMaterial({ color }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = castShadow;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  const box      = (w, h, d, color, x, y, z, ry, castShadow) => mesh(new T.BoxGeometry(w, h, d), color, x, y, z, ry, castShadow);
  const sphere   = (r, color, x, y, z)                       => mesh(new T.SphereGeometry(r, 16, 12), color, x, y, z);
  const cylinder = (r, h, color, x, y, z)                    => mesh(new T.CylinderGeometry(r, r, h, 16), color, x, y, z);

  // draw on a 2D canvas and use it as a texture
  const canvasTexture = (draw, w = 256, h = 256) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    return new T.CanvasTexture(canvas);
  };

  // flat picture on the wall (basic = ignores lighting, so it glows)
  const picture = (w, h, texture, x, y, z, ry, basic) => {
    const material = basic
      ? new T.MeshBasicMaterial({ map: texture })
      : new T.MeshLambertMaterial({ map: texture });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), material);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  };

  // a row of colorful books
  const BOOK_COLORS = [0xe86a8a, 0x5ec4b6, 0xffc34d, 0x8e6fd8, 0x6ab04c];
  const books = (x, y, z, count, direction = 1) => {
    for (let i = 0; i < count; i++) {
      const height = 0.3 + (i % 3) * 0.05;
      box(0.07, height, 0.22, BOOK_COLORS[i % 5], x + i * 0.09 * direction, y + 0.15, z);
    }
  };

  // ═════════ shell: floor, ceiling, walls, rug ═════════
  box(8, 0.1, 8, 0xc98a55, 0, 0,   0, 0, false); // floor
  box(8, 0.1, 8, 0xfff1de, 0, 3.2, 0, 0, false); // ceiling

  [-4, 4].forEach(z => box(8, 3.2, 0.1, 0xfbe3c6, 0, 1.6, z, 0, false)); // back + front walls
  [-4, 4].forEach(x => box(0.1, 3.2, 8, 0xf7d9b6, x, 1.6, 0, 0, false)); // left + right walls

  const rug = mesh(new T.CircleGeometry(1.6, 32), 0xf08fb0, -0.4, 0.06, 0.6, 0, false);
  rug.rotation.x = -Math.PI / 2;

  // ═════════ golden-hour windows (back wall) ═════════
  const drawSunnyGlass = (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#fff4c2');
    sky.addColorStop(1, '#ffc46b');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
  };

  [-2.6, -0.4].forEach(x => {
    box(1.5, 1.7, 0.08, 0xe0884a, x, 1.9, -3.93, 0, false);                        // frame
    picture(1.3, 1.5, canvasTexture(drawSunnyGlass), x, 1.9, -3.88, 0, true);       // glowing glass
  });

  // ═════════ desk nook (back right): desk, shelf, PC ═════════
  // desk
  box(2.4,  0.08, 0.9, 0xe8c28f, 2.4,  0.8, -3.5);
  box(0.08, 0.8,  0.9, 0xe8c28f, 1.25, 0.4, -3.5);
  box(0.08, 0.8,  0.9, 0xe8c28f, 3.55, 0.4, -3.5);
  col.push([1.2, 3.6, -4, -3]);

  // wall shelf above the desk
  box(2.4,  0.08, 0.4, 0xe8c28f, 2.4,  1.9,  -3.75);
  box(0.08, 0.7,  0.4, 0xe8c28f, 1.25, 1.55, -3.75);
  books(1.5, 1.94, -3.75, 9);
  sphere(0.16, 0xff6fa5, 3.3, 2.12, -3.75); // pink figurine (body)
  sphere(0.1,  0xff6fa5, 3.3, 2.34, -3.75); // pink figurine (head)

  // monitor + stand
  box(0.75, 0.5,  0.05, 0x222222, 2.4, 1.1,  -3.6);
  box(0.08, 0.25, 0.08, 0x222222, 2.4, 0.95, -3.6);

  const drawPcScreen = (g, w, h) => {
    g.fillStyle = '#1d2b53';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd1e3';
    g.font = 'bold 34px monospace';
    g.fillText('GAMES', 70, 80);
    g.fillStyle = '#ffb347';
    g.fillRect(110, 110, 50, 50);
    g.fillStyle = '#fff';
    g.font = '18px monospace';
    g.fillText('flappy.exe', 80, 200);
  };
  const screen = picture(0.7, 0.4, canvasTexture(drawPcScreen), 2.4, 1.1, -3.57, 0, true);
  on(screen, 'The PC — play a game', actions.game);

  // desk bits: keyboard, mug, lamp
  box(0.25, 0.02, 0.1, 0xffffff, 2.0, 0.86, -3.2);
  cylinder(0.06, 0.1, 0xffffff, 3.1, 0.9, -3.3);
  cylinder(0.02, 0.5, 0x333333, 1.5, 1.1, -3.7);
  sphere(0.12, 0xffd070, 1.5, 1.4, -3.65);

  // ═════════ chair (3D model) ═════════
  loadModel(scene, 'models/chair.glb', { x: 2.4, y: 0.05, z: -2.7, height: 1.5, ry: Math.PI / 2 });

  // ═════════ low bookcase (left) + record player + crates ═════════
  const bookcase = box(0.7, 0.9, 2.1, 0xa8683a, -3.6, 0.45, -2.0);
  col.push([-4, -3.2, -3.1, -0.9]);
  books(-3.55, 0.9, -2.7, 6);
  on(bookcase, 'The bookcase — projects', actions.projects);

  // record player
  box(0.5, 0.1, 0.6, 0x333333, -3.6, 0.95, -1.6);
  cylinder(0.2, 0.03, 0x111111, -3.6, 1.02, -1.6);
  sphere(0.04, 0xff6fa5, -3.6, 1.05, -1.6);

  // crates
  box(0.5, 0.35, 0.6, 0x35c4b8, -3.5, 1.15, -2.5);
  box(0.5, 0.35, 0.6, 0xff6fa5, -3.5, 1.5,  -2.5);

    // ═════════ bed (3D model, left front) ═════════
  const bed = loadModel(scene, 'models/bed.glb', { x: -3, y: 0, z: 2.5, length: 3.1, ry: -Math.PI / -2 });
  on(bed, 'The bed — about me', actions.about);
  col.push([-3.85, -1.95, 0.35, 3.45]);
  // plush bear
  sphere(0.22, 0xff7fb0, -2.9,  0.95, 1.5);  // body
  sphere(0.15, 0xff7fb0, -2.9,  1.22, 1.5);  // head
  sphere(0.06, 0xff7fb0, -3.02, 1.35, 1.5);  // left ear
  sphere(0.06, 0xff7fb0, -2.78, 1.35, 1.5);  // right ear

  // ═════════ dresser (right) + globe + camera ═════════
  box(0.9, 1.2, 2, 0x6d9a58, 3.5, 0.6, 0.8);
  col.push([3.05, 4, -0.2, 1.8]);

  [0.2, 0.55, 0.9].forEach(y => {
    box(0.04, 0.28, 1.8, 0x8fb878, 3.04, y + 0.1, 0.8); // drawer front
    sphere(0.04, 0x5a3a20, 3.0, y + 0.1, 0.8);          // knob
  });

  const globe = sphere(0.3, 0x2f9ab8, 3.5, 1.65, 1.1);
  cylinder(0.02, 0.3, 0x555555, 3.5, 1.35, 1.1);        // globe stand
  on(globe, 'The globe — find me online', actions.contact);

  box(0.25, 0.15, 0.15, 0x222222, 3.5, 1.28, 0.2);      // camera

  // ═════════ right wall: posters + whiteboard ═════════
  const poster = (text, bgColor, z, y) => {
    const draw = (g, w, h) => {
      g.fillStyle = bgColor;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff';
      g.font = 'bold 38px sans-serif';
      g.textAlign = 'center';
      text.split(' ').forEach((word, i) => g.fillText(word, w / 2, 90 + i * 48));
      g.strokeStyle = '#fff';
      g.lineWidth = 8;
      g.strokeRect(8, 8, w - 16, h - 16);
    };
    return picture(0.8, 1.1, canvasTexture(draw), 3.93, y, z, -Math.PI / 2);
  };
  poster('STAY CURIOUS', '#e0485a', 0.3, 2.2);
  poster('LOFI BEATS',   '#7a4fd0', 1.3, 2.2);

  const drawWhiteboard = (g, w, h) => {
    g.fillStyle = '#fffdf8';
    g.fillRect(0, 0, w, h);

    g.fillStyle = '#ff6fa5';
    g.font = 'bold 26px sans-serif';
    g.fillText('MY PAPER ★', 20, 40);

    g.strokeStyle = '#4aa3df';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(30, 200);
    g.bezierCurveTo(100, 60, 160, 230, 230, 80);
    g.stroke();

    g.fillStyle = '#ffe27a'; // sticky note
    g.fillRect(180, 20, 50, 50);
    g.fillStyle = '#333';
    g.font = '14px sans-serif';
    g.fillText('click me!', 185, 50);
  };
  box(0.05, 1.3, 1.9, 0xffffff, 3.95, 1.8, -1.7); // whiteboard frame
  const whiteboard = picture(1.8, 1.2, canvasTexture(drawWhiteboard), 3.9, 1.8, -1.7, -Math.PI / 2);
  on(whiteboard, 'The whiteboard — my paper', actions.paper);

  // ═════════ floor clutter (cute!) ═════════
  // sneakers
  box(0.3, 0.12, 0.18, 0xff5a5a, 0.9, 0.13, 1.4, 0.4);
  cylinder(0.04, 0.03, 0x222222, 0.8, 0.08, 1.35);
  cylinder(0.04, 0.03, 0x222222, 1.0, 0.08, 1.45);

  // scattered cushions / mats: [color, x, z]
  [
    [0xe86a8a,  1.7,  0.9],
    [0x5ec4b6, -1.0,  1.9],
    [0xffc34d,  0.2, -1.6],
    [0x8e6fd8,  1.9,  2.4],
  ].forEach(([color, x, z], i) => box(0.55, 0.1, 0.4, color, x, 0.12, z, i * 1.3));

  // stacked boxes
  box(0.5,  0.4,  0.5,  0xd9a05a, 0.3, 0.25, -2.4);
  box(0.45, 0.08, 0.35, 0x5ec4b6, 0.3, 0.5,  -2.4);
  box(0.45, 0.5,  0.45, 0x4a8fd8, 1.0, 0.28, -2.9);

  // bean bag + small mat
  const beanBag = sphere(0.55, 0xffa6c9, -1.2, 0.35, 3.1);
  beanBag.scale.y = 0.6;
  box(0.5, 0.06, 0.5, 0xe8c070, -1.2, 0.1, 0.2, 0.4);

  // ═════════ fairy lights (back wall, draped in a curve) ═════════
  const FAIRY_COLORS = [0xffd070, 0xff8fb5, 0xfff3b0];
  for (let i = 0; i < 26; i++) {
    const bulb = new T.Mesh(
      new T.SphereGeometry(0.05),
      new T.MeshBasicMaterial({ color: FAIRY_COLORS[i % 3] })
    );
    bulb.position.set(-3.8 + i * 0.3, 2.95 - Math.sin(i / 3.5) * 0.12, -3.88);
    scene.add(bulb);
  }

  // ═════════ lighting ═════════
  scene.add(new T.AmbientLight(0xffd9b0, 0.7));

  // golden-hour sun coming through the windows
  const sun = new T.DirectionalLight(0xffc27a, 1.3);
  sun.position.set(-1, 3, -9);
  sun.target.position.set(0, 0, 2);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, far: 25 });

  // warm fill light from the ceiling
  const warmFill = new T.PointLight(0xffb070, 0.8, 10);
  warmFill.position.set(0, 2.8, 1);
  scene.add(warmFill);

  // ═════════ dust motes floating in the sunbeams ═════════
  const positions = [];
  for (let i = 0; i < 90; i++) {
    positions.push(
      (Math.random() - 0.5) * 7,
      0.3 + Math.random() * 2.6,
      (Math.random() - 0.5) * 7
    );
  }
  const moteGeometry = new T.BufferGeometry();
  moteGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  const motes = new T.Points(moteGeometry, new T.PointsMaterial({ color: 0xfff0c0, size: 0.04 }));
  scene.add(motes);

  return { col, motes };
}