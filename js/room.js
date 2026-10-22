// Builds the room. Add furniture by adding lines inside the matching section.
// on(mesh, label, fn) makes something clickable.
import { loadModel } from './models.js';

const T = THREE;

// ─────────── room size (change these to resize the shell) ───────────
const HALF = 3.25;            // half of the room width/depth (6.5 x 6.5 m total)
const CEIL = 2.9;             // ceiling height
const INNER = HALF - 0.05;    // inner face of the walls (3.2)

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

  // wall art with a slight tilt (ry: PI/2 = left wall, -PI/2 = right wall, 0 = back wall, PI = front wall)
  const wallArt = (w, h, draw, x, y, z, ry, tilt = 0) => {
    const m = picture(w, h, canvasTexture(draw, 256, Math.round(256 * h / w)), x, y, z, ry);
    m.rotation.z = tilt;
    return m;
  };

  // a row of colorful books (pastel-ish)
  const BOOK_COLORS = [0xf08aa8, 0x8fd3c8, 0xffd36b, 0xb9a7e8, 0x9cc98a];
  const books = (x, y, z, count, direction = 1) => {
    for (let i = 0; i < count; i++) {
      const height = 0.3 + (i % 3) * 0.05;
      box(0.07, height, 0.22, BOOK_COLORS[i % 5], x + i * 0.09 * direction, y + 0.15, z);
    }
  };

  // mushroom lamp: glowing dome + small real light
  const mushroomLamp = (x, y, z, intensity = 0.45) => {
    cylinder(0.045, 0.16, 0xfff6e8, x, y + 0.08, z);
    const cap = new T.Mesh(
      new T.SphereGeometry(0.16, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new T.MeshBasicMaterial({ color: 0xfff3d1 })
    );
    cap.position.set(x, y + 0.16, z);
    scene.add(cap);
    const light = new T.PointLight(0xffd9a0, intensity, 3);
    light.position.set(x, y + 0.3, z);
    scene.add(light);
  };

  // little potted cactus (3D model)
  // set CACTUS_HAS_POT = false if cactus.glb is just the cactus with no pot
  const CACTUS_HAS_POT = true;
  const plant = (x, y, z, s = 1) => {
    if (CACTUS_HAS_POT) {
      return loadModel(scene, 'models/cactus.glb', { x, y, z, height: 0.45 * s, ry: x * 3 });
    }
    cylinder(0.12 * s, 0.2 * s, 0xd98b5f, x, y + 0.1 * s, z); // terracotta pot
    return loadModel(scene, 'models/cactus.glb', { x, y: y + 0.2 * s, z, height: 0.35 * s, ry: x * 3 });
  };

  // big floor monstera (not used right now, kept for later)
  const monstera = (x, z) => {
    cylinder(0.22, 0.35, 0xd98b5f, x, 0.2, z);
    cylinder(0.02, 1.2, 0x4a7a4a, x, 0.9, z);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const leaf = sphere(
        0.22, 0x4f9a5c,
        x + Math.cos(a) * (0.25 + (i % 3) * 0.08),
        0.7 + i * 0.14,
        z + Math.sin(a) * (0.25 + (i % 3) * 0.08)
      );
      leaf.scale.set(1.2, 0.12, 0.9);
      leaf.rotation.set(0, a, 0.3);
    }
  };

  // polaroid with a tiny scene (sun + hill). Swap for a real photo later with TextureLoader
  const polaroid = (x, y, z, ry, tilt, [c1, c2], variant = 0) =>
    wallArt(0.26, 0.31, (g, w, h) => {
      g.fillStyle = '#fffdf7'; g.fillRect(0, 0, w, h);
      const grad = g.createLinearGradient(0, 14, 0, h - 42);
      grad.addColorStop(0, c1); grad.addColorStop(1, c2);
      g.fillStyle = grad; g.fillRect(14, 14, w - 28, h - 56);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.arc(w * (0.3 + 0.4 * (variant % 2)), 62, 18, 0, 7); g.fill();
      g.fillStyle = 'rgba(60,70,90,0.55)';
      g.beginPath();
      g.moveTo(14, h - 42);
      g.lineTo(w * 0.4, 120 + (variant % 3) * 12);
      g.lineTo(w * 0.7, h - 42);
      g.fill();
    }, x, y, z, ry, tilt);

  // hanging ivy strand (leaves on a vertical chain)
  const vine = (x, yTop, z, length) => {
    const n = Math.round(length / 0.11);
    for (let i = 0; i < n; i++) {
      const leaf = sphere(0.045, i % 2 ? 0x5da35f : 0x78b86c, x + Math.sin(i * 1.3) * 0.04, yTop - i * 0.11, z + Math.cos(i * 1.7) * 0.03);
      leaf.scale.set(1.3, 0.6, 1);
      leaf.castShadow = false;
    }
  };

  // plush star (extruded star shape with a face)
  const plushStar = (x, y, z, ry, color = 0xffd54d) => {
    const shape = new T.Shape();
    const spikes = 5, outer = 0.22, inner = 0.12;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
    }
    shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
    const star = mesh(geo, color, x, y, z, ry);
    star.rotation.x = -0.35;
    [-0.045, 0.045].forEach(dx => {
      const eye = sphere(0.014, 0x3b2a20, 0, 0, 0);
      star.add(eye);
      eye.position.set(dx, 0.02, 0.14);
    });
    return star;
  };

  // ═════════ shell: floor, ceiling, walls, rug ═════════
  box(2 * HALF, 0.1, 2 * HALF, 0xcfa97c, 0, 0,    0, 0, false); // floor: warm oak
  box(2 * HALF, 0.1, 2 * HALF, 0xfdf6ea, 0, CEIL, 0, 0, false); // ceiling

  [-HALF, HALF].forEach(z => box(2 * HALF, CEIL, 0.1, 0xf1e2cc, 0, CEIL / 2, z, 0, false)); // back + front walls: warm cream
  box(0.1, CEIL, 2 * HALF, 0xcddcc4, -HALF, CEIL / 2, 0, 0, false); // left wall: sage (collage wall)
  box(0.1, CEIL, 2 * HALF, 0xcfe0ec,  HALF, CEIL / 2, 0, 0, false); // right wall: powder blue (posters pop)

  const rug = mesh(new T.CircleGeometry(1.2, 32), 0x2b3f6b, 0.2, 0.06, 0.2, 0, false);
  rug.rotation.x = -Math.PI / 2;

  // ═════════ windows with plants on the sill (back wall) ═════════
  const drawSunnyGlass = (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#cfe8ff');
    sky.addColorStop(0.6, '#fff4cf');
    sky.addColorStop(1, '#ffe2a8');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
  };

  [-1.95, -0.3].forEach(x => {
    box(1.5, 1.4, 0.08, 0xfffaf0, x, 1.8, -3.18, 0, false);                        // frame
    picture(1.3, 1.2, canvasTexture(drawSunnyGlass), x, 1.8, -3.13, 0, true);       // glowing glass
    box(0.05, 1.2, 0.03, 0xfffaf0, x, 1.8, -3.11, 0, false);                        // vertical bar
    box(1.3, 0.05, 0.03, 0xfffaf0, x, 1.8, -3.11, 0, false);                        // horizontal bar
    box(1.7, 0.06, 0.28, 0xfffaf0, x, 1.07, -3.09, 0, false);                       // sill
    plant(x - 0.4, 1.1, -3.09, 0.8);
    plant(x + 0.35, 1.1, -3.09, 0.6);
  });

  // ═════════ desk nook (back right): desk, shelf, PC ═════════
  // desk
  box(2.4,  0.08, 0.9, 0xe8c28f, 1.65, 0.8, -2.75);
  box(0.08, 0.8,  0.9, 0xe8c28f, 0.5,  0.4, -2.75);
  box(0.08, 0.8,  0.9, 0xe8c28f, 2.8,  0.4, -2.75);
  col.push([0.45, 2.85, -3.25, -2.25]);

  // wall shelf above the desk
  box(2.4,  0.08, 0.4, 0xe8c28f, 1.65, 1.9,  -3.0);
  box(0.08, 0.7,  0.4, 0xe8c28f, 0.5,  1.55, -3.0);
  books(0.75, 1.94, -3.0, 9);
  sphere(0.16, 0xff8fb5, 2.55, 2.12, -3.0); // pink figurine (body)
  sphere(0.1,  0xff8fb5, 2.55, 2.34, -3.0); // pink figurine (head)
  box(0.3, 0.16, 0.03, 0xf4a6b8, 2.0, 2.04, -3.05); // pink game console

  // monitor + stand
  box(0.75, 0.5,  0.05, 0x222222, 1.65, 1.1,  -2.85);
  box(0.08, 0.25, 0.08, 0x222222, 1.65, 0.95, -2.85);

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
  const screen = picture(0.7, 0.4, canvasTexture(drawPcScreen), 1.65, 1.1, -2.82, 0, true);
  on(screen, 'The PC — play a game', actions.game);

  // desk bits: keyboard, mug, headphones, mushroom lamp
  box(0.25, 0.02, 0.1, 0xffffff, 1.25, 0.86, -2.45);
  cylinder(0.06, 0.1, 0xffffff, 2.35, 0.9, -2.55);
  const headphones = mesh(new T.TorusGeometry(0.08, 0.016, 8, 16), 0x2a2a2a, 2.15, 0.92, -2.25);
  headphones.rotation.x = Math.PI / 2;
  const deskLight = new T.PointLight(0xffd9a0, 0.45, 3);
  deskLight.position.set(0.9, 1.3, -2.55);
  scene.add(deskLight);

  // ═════════ chair (3D model) ═════════
  loadModel(scene, 'models/chair.glb', { x: 1.65, y: 0.05, z: -1.95, height: 1.5, ry: Math.PI / 2 });

  // ═════════ table + record player (left wall, back) ═════════
  const TABLE_TOP = 0.84;
  const table = loadModel(scene, 'models/wooden_table.glb', { x: -2.75, y: 0.05, z: -2.0, length: 2.4, ry: Math.PI / 2, brighten: 1 });
  col.push([-3.25, -2.2, -3.25, -0.8]);
  on(table, 'The table — projects', actions.projects);

  loadModel(scene, 'models/recordplayer.glb', { x: -2.75, y: TABLE_TOP, z: -1.5, length: 0.7, ry: Math.PI / 2, brighten: 0.5 });
  loadModel(scene, 'models/vinyls.glb',       { x: -2.75, y: TABLE_TOP, z: -2.5, length: 1.3, ry: Math.PI / 2, brighten: 1 });
  loadModel(scene, 'models/vinyls.glb',       { x: -2.85, y: 0.05,      z: -2.0, length: 1.3, ry: -Math.PI / 2, brighten: 0.7 });

  // ═════════ bed (3D model, left front) + nightstand + plushies ═════════
  // the bed is scaled down from 3.1 to BED_LEN, so its top surface comes down with it
  const BED_LEN = 2.4;
  const BED_TOP = 0.05 + 0.77 * (BED_LEN / 3.1); // was 0.82 at length 3.1
  const bed = loadModel(scene, 'models/bed.glb', { x: -2.45, y: 0.05, z: INNER - BED_LEN / 2, length: BED_LEN, ry: Math.PI / 2 });
  on(bed, 'The bed — about me', actions.about);
  col.push([-3.2, -1.75, INNER - BED_LEN, INNER]);

  // nightstand + mushroom lamp (next to the head of the bed, against the front wall)
  box(0.5, 0.45, 0.5, 0xe6c9a0, -1.45, 0.23, 2.95);
  mushroomLamp(-1.45, 0.46, 2.95, 0.4);
  col.push([-1.7, -1.2, 2.7, 3.2]);

  // we bare bears (between the table and the bed)
  loadModel(scene, 'models/we_bare_bears.glb', { x: -2.85, y: 0.05, z: 0.0, height: 1.5, ry: Math.PI / 2, brighten: 0.3 });
  col.push([-3.15, -2.6, -0.3, 0.3]);

  // usagi (sitting on the bed)
  const usagi = loadModel(scene, 'models/usagi.glb', { x: -2.45, y: BED_TOP, z: 2.5, height: 0.7, ry: Math.PI, brighten: 0.5 });
  usagi.rotation.order = 'YXZ'; // so the tilt happens in his own frame
  usagi.rotation.x = -0.35;     // lean back

  // ═════════ dresser (right) + globe + camera ═════════
  box(0.9, 1.2, 2, 0x9db89a, 2.75, 0.6, 0.8); // sage dresser
  col.push([2.3, 3.2, -0.2, 1.8]);

  [0.2, 0.55, 0.9].forEach(y => {
    box(0.04, 0.28, 1.8, 0xb7cfb0, 2.29, y + 0.1, 0.8); // drawer front
    sphere(0.04, 0x5a3a20, 2.25, y + 0.1, 0.8);         // knob
  });

  const globe = sphere(0.3, 0x5fb6d4, 2.75, 1.65, 1.1);
  const globeTex = canvasTexture((g, w, h) => {
    g.fillStyle = '#6fc3e0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9ad28a';
    [[50, 50, 38, 20], [130, 40, 28, 28], [185, 85, 34, 16], [90, 100, 26, 14], [225, 35, 22, 12]].forEach(([x, y, rx, ry]) => {
      g.beginPath(); g.ellipse(x, y, rx, ry, 0.4, 0, 7); g.fill();
    });
  }, 256, 128);
  globe.material = new T.MeshLambertMaterial({ map: globeTex });
  cylinder(0.02, 0.3, 0x555555, 2.75, 1.35, 1.1);       // globe stand
  on(globe, 'The globe — find me online', actions.contact);

  box(0.25, 0.15, 0.15, 0x222222, 2.75, 1.28, 0.2);     // camera

  // ═════════ right wall: posters + whiteboard + corkboard ═════════
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
    return picture(0.8, 1.1, canvasTexture(draw), 3.18, y, z, -Math.PI / 2);
  };
  poster('STAY CURIOUS', '#e8606f', 0.3, 2.1);
  poster('LOFI BEATS',   '#9b7fe0', 1.3, 2.1);

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
  box(0.05, 1.3, 1.9, 0xffffff, 3.2, 1.8, -1.5); // whiteboard frame
  const whiteboard = picture(1.8, 1.2, canvasTexture(drawWhiteboard), 3.15, 1.8, -1.5, -Math.PI / 2);
  on(whiteboard, 'The whiteboard — my paper', actions.paper);

  // corkboard with stickers
  const drawCork = (g, w, h) => {
    g.fillStyle = '#c99a63'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = Math.random() > 0.5 ? '#b8884f' : '#d6aa75';
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    const stickers = [['#ff8fb5', 40, 50], ['#8fd3c8', 150, 90], ['#ffd36b', 70, 160], ['#b9a7e8', 170, 170], ['#ffffff', 110, 40]];
    stickers.forEach(([c, x, y]) => {
      g.fillStyle = c; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x - 6, y - 6, 6, 0, 7); g.fill();
    });
    g.strokeStyle = '#fffaf0'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  };
  wallArt(0.9, 0.7, drawCork, 3.18, 1.75, 2.3, -Math.PI / 2, 0.01);

  // ivy hanging down the right wall (front corner)
  vine(3.13, CEIL - 0.05, 3.05, 1.0);
  vine(3.13, CEIL - 0.05, 2.9,  0.7);
  vine(3.13, CEIL - 0.05, 2.75, 0.5);

  // ═════════ left wall: gig posters + polaroid collage ═════════
  const gigPoster = (g, w, h) => {
    g.fillStyle = '#ffe14d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a1a1a'; g.textAlign = 'center';
    g.font = 'bold 54px Impact, sans-serif'; g.fillText('LIVE', w / 2, 70);
    g.font = 'bold 28px sans-serif'; g.fillText('IN CONCERT', w / 2, 110);
    g.fillRect(30, 128, w - 60, 3);
    g.fillStyle = '#e0485a'; g.beginPath(); g.arc(w / 2, 215, 55, 0, 7); g.fill();
    g.fillStyle = '#1a1a1a'; g.font = 'bold 20px sans-serif'; g.fillText('FRI · 8PM · THE ROOM', w / 2, h - 28);
  };
  const ufoPoster = (g, w, h) => {
    g.fillStyle = '#e9eef2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1f2a';
    g.beginPath(); g.ellipse(w / 2, 95, 52, 12, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(w / 2, 85, 22, 14, 0, Math.PI, 0); g.fill();
    g.fillRect(0, h - 120, w, 120);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 26px sans-serif';
    g.fillText('WE ARE', w / 2, h - 72); g.fillText('NOT ALONE', w / 2, h - 40);
  };
  wallArt(0.8, 1.1, gigPoster, -3.18, 2.0, -2.5, Math.PI / 2,  0.02);
  wallArt(0.8, 1.1, ufoPoster, -3.18, 2.0, -1.5, Math.PI / 2, -0.03);

  // polaroid grid over the bed (more saturated so they read as photos)
  const TINTS = [['#ff9eb5', '#ffc27a'], ['#8cc8f0', '#c6e88f'], ['#b79cf0', '#ff9ec9'], ['#7fd1a5', '#ffe27a']];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c;
      polaroid(-3.18, 1.6 + r * 0.4, 1.2 + c * 0.42, Math.PI / 2, ((i * 37) % 10 - 5) * 0.012, TINTS[i % 4], i);
    }
  }

  // ═════════ front wall: rope shelf with tiny figurines ═════════
  box(1.1, 0.05, 0.28, 0xa8683a, 0.8, 2.2, 3.07);
  [-0.5, 0.5].forEach(dx => cylinder(0.008, 0.6, 0xd9c3a0, 0.8 + dx, 2.5, 3.07)); // ropes
  [[0xff8fb5, 0.5], [0xffd36b, 0.8], [0x8fd3c8, 1.05], [0xb9a7e8, 1.25]].forEach(([c, x]) => {
    sphere(0.07, c, x, 2.3, 3.07);
    sphere(0.045, c, x, 2.41, 3.07);
  });

  // ═════════ floor clutter (cute!) ═════════
  // sneakers
  box(0.3, 0.12, 0.18, 0xff6b5a, 1.5, 0.13, 1.5, 0.4);
  cylinder(0.04, 0.03, 0x222222, 1.4, 0.08, 1.45);
  cylinder(0.04, 0.03, 0x222222, 1.6, 0.08, 1.55);

  // stacked boxes (back wall, between the table and the desk)
  box(0.5,  0.4,  0.5,  0xe6c9a0, -0.9, 0.25, -2.8);
  box(0.45, 0.08, 0.35, 0xa8d5c2, -0.9, 0.5,  -2.8);
  box(0.45, 0.5,  0.45, 0xa9c8ea, -0.3, 0.28, -2.9);
  col.push([-1.15, -0.65, -3.05, -2.55]);
  col.push([-0.525, -0.075, -3.125, -2.675]);

  // bean bag chair
  loadModel(scene, 'models/bean_bag.glb', { x: -0.5, y: 0.05, z: 2.5, height: 0.85, ry: Math.PI / 2, brighten: -0.5 });

  // books and mug
  loadModel(scene, 'models/books.glb',     { x: 0.75, y: 0.1,  z: 2.8, length: 1.2,  ry: -0.4, brighten: 0.3 });
  loadModel(scene, 'models/coffeemug.glb', { x: 0.5,  y: 0.06, z: 2.4, height: 0.2, ry: 0.8,  brighten: 0.3 });

  // ═════════ fairy lights (back wall, draped in a curve, with soft glow) ═════════
  const FAIRY_COLORS = [0xffd070, 0xff8fb5, 0xfff3b0];
  for (let i = 0; i < 21; i++) {
    const pos = new T.Vector3(-3.0 + i * 0.3, 2.72 - Math.sin(i / 3.5) * 0.12, -3.13);

    const bulb = new T.Mesh(
      new T.SphereGeometry(0.05),
      new T.MeshBasicMaterial({ color: FAIRY_COLORS[i % 3] })
    );
    bulb.position.copy(pos);
    scene.add(bulb);

    const halo = new T.Mesh(
      new T.SphereGeometry(0.08),
      new T.MeshBasicMaterial({ color: FAIRY_COLORS[i % 3], transparent: true, opacity: 0.18, depthWrite: false })
    );
    halo.position.copy(pos);
    scene.add(halo);
  }

  // ═════════ lighting (dialed down so the pastels don't blow out) ═════════
  scene.add(new T.AmbientLight(0xfff4e8, 0.4));
  scene.add(new T.HemisphereLight(0xfff6ec, 0xd9c2a0, 0.35));

  // soft golden-hour sun coming through the windows
  const sun = new T.DirectionalLight(0xffe6bf, 0.6);
  sun.position.set(-1, 3, -9);
  sun.target.position.set(0, 0, 1.5);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;      // fixes the staircase patterns on furniture
  sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, far: 25 });

  // gentle fill light from the ceiling
  const warmFill = new T.PointLight(0xffe6cc, 0.12, 8);
  warmFill.position.set(0, 2.6, 0.5);
  scene.add(warmFill);

  // ═════════ dust motes floating in the sunbeams (soft round) ═════════
  const dotTexture = canvasTexture((g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,248,220,1)');
    grad.addColorStop(1, 'rgba(255,248,220,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, 64, 64);

  const positions = [];
  for (let i = 0; i < 90; i++) {
    positions.push(
      (Math.random() - 0.5) * 5.5,
      0.3 + Math.random() * 2.3,
      (Math.random() - 0.5) * 5.5
    );
  }
  const moteGeometry = new T.BufferGeometry();
  moteGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  const motes = new T.Points(
    moteGeometry,
    new T.PointsMaterial({ map: dotTexture, size: 0.07, transparent: true, depthWrite: false })
  );
  scene.add(motes);

  return { col, motes };
}