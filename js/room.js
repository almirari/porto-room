// Builds the room. Add furniture by adding lines inside the matching section.
// on(mesh, label, fn) makes something clickable.
import { loadModel } from './models.js';

const T = THREE;

// ─────────── room size ───────────
// 4.8 x 4.8 m (about 23 m²) is roughly a generous dorm room.
// L / R / B / F are the inner faces of the left, right, back and front walls.
const HALF  = 2.4;
const CEIL  = 3.8;
const INNER = HALF - 0.05;
const L = -INNER, R = INNER, B = -INNER, F = INNER;
const GAP = 0.02; // wall pictures sit this far in front of the wall

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

  // floor: tiled wood texture
  const FLOOR_REPEAT = 3;
  const floorTex = new T.TextureLoader().load('textures/floor.jpg');
  floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping;
  floorTex.repeat.set(FLOOR_REPEAT, FLOOR_REPEAT);
  floorTex.anisotropy = 8;
  if (T.SRGBColorSpace) floorTex.colorSpace = T.SRGBColorSpace;
  const floor = new T.Mesh(
    new T.BoxGeometry(2 * HALF, 0.1, 2 * HALF),
    new T.MeshLambertMaterial({ map: floorTex, color: 0xffffff })
  );
  floor.receiveShadow = true;
  scene.add(floor);

  box(2 * HALF, 0.1, 2 * HALF, 0xfdf6ea, 0, CEIL, 0, 0, false); // ceiling

  // textured wall piece: UVs come from world position, so neighbouring pieces line up
  const TILE = 2.0;   // meters covered by one copy of the texture (raise = bigger pattern)
  const wallTex = new T.TextureLoader().load('textures/wall.avif');
  wallTex.wrapS = wallTex.wrapT = T.MirroredRepeatWrapping;   // mirrored = no visible tile edges
  wallTex.anisotropy = 8;
  if (T.SRGBColorSpace) wallTex.colorSpace = T.SRGBColorSpace;
  const wallMat = new T.MeshLambertMaterial({ map: wallTex, color: 0xffffff });

  const wallBox = (w, h, d, x, y, z) => {
    const geo = new T.BoxGeometry(w, h, d);
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + x, wy = pos.getY(i) + y, wz = pos.getZ(i) + z;
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
      if (nx > 0.5)      uv.setXY(i, wz / TILE, wy / TILE);   // faces looking along x
      else if (ny > 0.5) uv.setXY(i, wx / TILE, wz / TILE);   // top / bottom
      else               uv.setXY(i, wx / TILE, wy / TILE);   // faces looking along z
    }
    const m = new T.Mesh(geo, wallMat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  // back wall
  const WIN_X   = [-1.5, -0.3];   // window centers (same as the addWindow calls)
  const OPEN_HW = 0.42;           // half-width of each opening (a bit smaller than the window, so the frame hides the edge)
  const OPEN_Y0 = 1.05, OPEN_Y1 = 2.35;
  const wallSpan = (xa, xb) => wallBox(xb - xa, CEIL, 0.1, (xa + xb) / 2, CEIL / 2, -HALF);

  wallSpan(-HALF, WIN_X[0] - OPEN_HW);                   // left of window 1
  wallSpan(WIN_X[0] + OPEN_HW, WIN_X[1] - OPEN_HW);      // pillar between the windows
  wallSpan(WIN_X[1] + OPEN_HW, HALF);                    // right of window 2
  WIN_X.forEach(cx => {
    wallBox(2 * OPEN_HW, OPEN_Y0, 0.1, cx, OPEN_Y0 / 2, -HALF);                                   // below
    wallBox(2 * OPEN_HW, CEIL - OPEN_Y1, 0.1, cx, OPEN_Y1 + (CEIL - OPEN_Y1) / 2, -HALF);        // above
  });

  // left + right walls
  wallBox(0.1, CEIL, 2 * HALF, -HALF, CEIL / 2, 0);
  wallBox(0.1, CEIL, 2 * HALF,  HALF, CEIL / 2, 0);

  // front wall with a doorway + an alcove sticking out past it
  const DOOR_X = 0.5;   // doorway center
  const DOOR_W = 1.8;   // doorway / alcove width (x = -0.4 .. 1.4)
  const DOOR_H = 2.3;   // doorway / alcove height
  const NOOK_D = 0.9;   // how far the alcove sticks out
  const x0 = DOOR_X - DOOR_W / 2, x1 = DOOR_X + DOOR_W / 2;

  wallBox(x0 + HALF, CEIL, 0.1, (-HALF + x0) / 2, CEIL / 2, HALF);                   // left piece
  wallBox(HALF - x1, CEIL, 0.1, (x1 + HALF) / 2,  CEIL / 2, HALF);                   // right piece
  wallBox(DOOR_W, CEIL - DOOR_H, 0.1, DOOR_X, DOOR_H + (CEIL - DOOR_H) / 2, HALF);  // lintel

  const nookZ = HALF + NOOK_D / 2;
  wallBox(0.1, DOOR_H, NOOK_D + 0.1, x0 - 0.05, DOOR_H / 2, nookZ);                  // alcove side walls
  wallBox(0.1, DOOR_H, NOOK_D + 0.1, x1 + 0.05, DOOR_H / 2, nookZ);
  wallBox(DOOR_W + 0.2, DOOR_H, 0.1, DOOR_X, DOOR_H / 2, HALF + NOOK_D + 0.05);      // alcove end wall

  // nook floor: same wood texture, UVs from world position so it continues the room's floor
  const nookFloorTex = new T.TextureLoader().load('textures/floor.jpg');
  nookFloorTex.wrapS = nookFloorTex.wrapT = T.RepeatWrapping;
  nookFloorTex.anisotropy = 8;
  if (T.SRGBColorSpace) nookFloorTex.colorSpace = T.SRGBColorSpace;

  const nookFloorGeo = new T.PlaneGeometry(DOOR_W, NOOK_D);
  nookFloorGeo.rotateX(-Math.PI / 2);
  nookFloorGeo.translate(DOOR_X, 0.05, nookZ);        // 0.05 = top of the main floor
  const nfPos = nookFloorGeo.attributes.position, nfUv = nookFloorGeo.attributes.uv;
  const FLOOR_TILE = (2 * HALF) / FLOOR_REPEAT;       // meters per texture copy
  for (let i = 0; i < nfPos.count; i++) {
    nfUv.setXY(i, (nfPos.getX(i) + HALF) / FLOOR_TILE, (HALF - nfPos.getZ(i)) / FLOOR_TILE);
  }
  const nookFloor = new T.Mesh(nookFloorGeo, new T.MeshLambertMaterial({ map: nookFloorTex, color: 0xffffff }));
  nookFloor.receiveShadow = true;
  scene.add(nookFloor);

  // nook ceiling
  box(DOOR_W + 0.2, 0.1, NOOK_D + 0.1, 0xfdf6ea, DOOR_X, DOOR_H + 0.05, nookZ, 0, false);

  // the door, on the end wall
  const DOOR_RY     = 0;                 // if the door faces the wall, set to Math.PI
  const DOOR_MODEL_H = 2.15;             // door height in meters (frame included, if the model has one)
  const endWallZ    = HALF + NOOK_D;     // inner face of the alcove's end wall

  loadModel(scene, 'models/door.glb', {
    x: DOOR_X, y: 0.05, z: endWallZ - 0.05, height: DOOR_MODEL_H, ry: DOOR_RY,
    onLoad: ({ holder }) => {
      holder.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(holder);
      let s = b.getSize(new T.Vector3());

      // a door is wide and thin: if it's thinner along x than z, it's edge-on, so spin it a quarter turn
      if (s.z > s.x) {
        holder.rotation.y += Math.PI / 2;
        holder.updateMatrixWorld(true);
        b.setFromObject(holder);
      }

      // center it on the doorway and push its back flush against the end wall
      holder.position.x += DOOR_X - (b.min.x + b.max.x) / 2;
      holder.position.z += endWallZ - b.max.z;
      holder.updateMatrixWorld(true);
    },
  });

  // alcove light so it isn't a dark box
  const nookLight = new T.PointLight(0xffe6cc, 0.35, 3);
  nookLight.position.set(DOOR_X, 2.1, nookZ);
  scene.add(nookLight);

  // alcove wall collision (the opening stays walkable)
  col.push([x0 - 0.1, x0, F, HALF + NOOK_D + 0.1]);
  col.push([x1, x1 + 0.1, F, HALF + NOOK_D + 0.1]);
  col.push([x0, x1, HALF + NOOK_D, HALF + NOOK_D + 0.1]);

  const rug = mesh(new T.CircleGeometry(1.0, 32), 0x2b3f6b, -0.2, 0.06, 0.2, 0, false);
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

  const SILL_TOP = 1.05;   // window model sits right on top of the sill
  const WINDOW_H = 1.3;    // window model height (width follows the model's proportions)

  // models/window.glb: once it loads, onLoad measures the whole model, pushes it flush to the
  // wall, and sizes the sky panel and the sill to it.
  // The model turns itself to face the room (see onLoad), so WINDOW_RY normally stays 0.
  const WINDOW_RY = 0;
  const addWindow = (wx, cactusDx, cactusScale) => {
    loadModel(scene, 'models/window.glb', {
      x: wx, y: SILL_TOP, z: B + 0.1, height: WINDOW_H, ry: WINDOW_RY,
      onLoad: ({ obj, holder }) => {
        const frame = new T.Box3();                        // box around every part of the window
        const measure = () => {
          holder.updateMatrixWorld(true);
          frame.makeEmpty();
          obj.traverse(o => { if (o.isMesh) frame.expandByObject(o); });
          return frame.getSize(new T.Vector3());
        };
        let size = measure();
        if (frame.isEmpty()) return;
        // a window is wide and thin. If it's thinner along z than x it's already facing the room;
        // if not, it's turned edge-on, so spin it a quarter turn.
        if (size.x < size.z) { holder.rotation.y += Math.PI / 2; size = measure(); }

        const shift = B - frame.min.z;                     // back of the frame touches the wall
        holder.position.z += shift;
        frame.translate(new T.Vector3(0, 0, shift));
        const cx = (frame.min.x + frame.max.x) / 2;
        const w = frame.max.x - frame.min.x;
        const h = frame.max.y - frame.min.y;

        // sill
        box(w + 0.2, 0.06, 0.28, 0xfffaf0, cx, frame.min.y - 0.03, B + 0.14, 0, false);
      },
    });
    plant(wx + cactusDx, SILL_TOP, B + 0.2, cactusScale);  // one cactus per sill
  };

  // two windows side by side, centered between the left wall and the desk
  addWindow(-1.5, -0.22, 0.8);
  addWindow(-0.3,  0.22, 0.6);

  // ═════════ building outside the windows (models/building.glb) ═════════
  const BUILDING_H   = 30;      // building height in meters (about 10 floors, ~3 m each)
  const BUILDING_Y   = -12;     // ground level in meters. Lower = you see higher floors, raise = lower floors
  const BUILDING_GAP = 10;      // distance from your back wall to the nearest face of the building
  const BUILDING_X   = -0.9;    // sideways center (-0.9 = centered on your two windows)
  const BUILDING_RY  = 0;       // which face looks at you: try 0, Math.PI / 2, Math.PI, -Math.PI / 2

  scene.background = new T.Color(0xcfe3f5);   // sky color (only visible through the windows)

  loadModel(scene, 'models/building.glb', {
    x: BUILDING_X, y: BUILDING_Y, z: B - BUILDING_GAP - 10, height: BUILDING_H, ry: BUILDING_RY,
    onLoad: ({ obj, holder }) => {
      // unlit materials so the brick stays bright, and nothing outside casts shadows into the room
      obj.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = false;
        o.receiveShadow = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const basic = mats.map(m => new T.MeshBasicMaterial({
          map: m.map || null,
          alphaMap: m.alphaMap || null,      // keeps the see-through fire escape grating
          alphaTest: m.alphaTest || 0,
          color: m.map ? 0xffffff : (m.color || 0xffffff),
          side: T.DoubleSide,
          transparent: m.transparent,
          opacity: m.opacity,
        }));
        o.material = Array.isArray(o.material) ? basic : basic[0];
      });

      // place it: centered on BUILDING_X, ground at BUILDING_Y, nearest face BUILDING_GAP behind the wall
      holder.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(holder);
      holder.position.x += BUILDING_X - (b.min.x + b.max.x) / 2;
      holder.position.y += BUILDING_Y - b.min.y;
      holder.position.z += (B - BUILDING_GAP) - b.max.z;
      holder.updateMatrixWorld(true);
    },
  });

  // ═════════ desk nook (back right): hacked-PC desk model ═════════
  const DESK_LEN = 2.1;
  const deskX = R - DESK_LEN / 2 - 0.03;
  const deskZ = B + 0.6;   // rough; onLoad pushes it flush to the back wall

  // ── settings ──
  const CHAIR_HUE = 240;       // 240 = blue. Red is 0.
  const SCREEN_TUNER = false;  // true = move the screens with the keyboard (see keys below)

  // screen drawing (blank dark screen)
  const drawDark = (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#12151c');
    grad.addColorStop(1, '#050608');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  };

  // where each screen sits, as FRACTIONS of the desk model's bounding box (saved from the tuner)
  const SCREENS = [
    { name: 'monitor',      draw: drawDark, cw: 512, ch: 288, fx: 0.476, fy: 0.768, fz: 0.220, fw: 0.392, fh: 0.314, ry: -0.05, rx: 0.00 },
    { name: 'side monitor', draw: drawDark, cw: 288, ch: 512, fx: 0.812, fy: 0.760, fz: 0.224, fw: 0.198, fh: 0.473, ry: -0.10, rx: 0.00 },
    { name: 'laptop',       draw: drawDark, cw: 512, ch: 288, fx: 0.128, fy: 0.574, fz: 0.212, fw: 0.210, fh: 0.163, ry: 0.25,  rx: 0.00 },
  ];

  // chair: split it out of the single baked mesh and shift its colour
  const recolorChair = obj => {
    let target = null;
    obj.traverse(o => { if (!target && o.isMesh && !Array.isArray(o.material) && o.material.map) target = o; });
    if (!target) { console.warn('[pc.glb] no textured mesh found, chair not recolored'); return; }

    target.geometry = target.geometry.clone();
    const g = target.geometry;
    const pos = g.attributes.position, uv = g.attributes.uv;
    const idx = g.index ? g.index.array : null;
    const triCount = (idx ? idx.length : pos.count) / 3;
    const vi = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);

    // weld vertices that share a position, then group triangles into connected pieces
    const ids = new Map();
    const weld = new Int32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const key = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
      let id = ids.get(key);
      if (id === undefined) { id = ids.size; ids.set(key, id); }
      weld[i] = id;
    }
    const parent = new Int32Array(ids.size).map((_, i) => i);
    const find = a => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    for (let t = 0; t < triCount; t++) {
      union(weld[vi(t, 0)], weld[vi(t, 1)]);
      union(weld[vi(t, 0)], weld[vi(t, 2)]);
    }

    // sample the texture so we can tell which pieces are red
    const map = target.material.map;
    const SAMPLE = 512;
    const sc = document.createElement('canvas');
    sc.width = SAMPLE; sc.height = SAMPLE;
    const sg = sc.getContext('2d', { willReadFrequently: true });
    sg.drawImage(map.image, 0, 0, SAMPLE, SAMPLE);
    const px = sg.getImageData(0, 0, SAMPLE, SAMPLE).data;

    const stats = new Map();   // root -> { tris, red }
    const triRoot = new Int32Array(triCount);
    for (let t = 0; t < triCount; t++) {
      const root = find(weld[vi(t, 0)]);
      triRoot[t] = root;
      let s = stats.get(root);
      if (!s) { s = { tris: 0, red: 0 }; stats.set(root, s); }
      s.tris++;
      if (uv) {
        const u = (uv.getX(vi(t, 0)) + uv.getX(vi(t, 1)) + uv.getX(vi(t, 2))) / 3;
        const v = (uv.getY(vi(t, 0)) + uv.getY(vi(t, 1)) + uv.getY(vi(t, 2))) / 3;
        const x = Math.min(SAMPLE - 1, Math.max(0, Math.floor((((u % 1) + 1) % 1) * SAMPLE)));
        const yv = ((v % 1) + 1) % 1;
        const y = Math.min(SAMPLE - 1, Math.max(0, Math.floor((map.flipY ? 1 - yv : yv) * SAMPLE)));
        const p = (y * SAMPLE + x) * 4;
        if (px[p] > 120 && px[p] > px[p + 1] * 2.2 && px[p] > px[p + 2] * 2.2) s.red++;
      }
    }

    // every mostly-red piece counts as chair (backrest, seat, ...)
    // if the coffee cup or the laptop's red tag turns blue too, raise 40 (try 120); if the seat stays red, lower it (try 15)
    let chairRoot = -1, best = 0;
    stats.forEach((s, root) => { if (s.red > best) { best = s.red; chairRoot = root; } });
    const chairRoots = new Set();
    stats.forEach((s, root) => { if (s.red >= 40 && s.red >= s.tris * 0.5) chairRoots.add(root); });
    if (chairRoot >= 0) chairRoots.add(chairRoot);
    console.log('[pc.glb] pieces found:', stats.size, '| chair pieces:', chairRoots.size);
    if (!chairRoots.size) { console.warn('[pc.glb] could not find a red piece'); return; }

    const chairIdx = [], restIdx = [];
    for (let t = 0; t < triCount; t++) {
      (chairRoots.has(triRoot[t]) ? chairIdx : restIdx).push(vi(t, 0), vi(t, 1), vi(t, 2));
    }
    g.setIndex(restIdx);

    const cg = new T.BufferGeometry();
    for (const k in g.attributes) cg.setAttribute(k, g.attributes[k]);
    cg.setIndex(chairIdx);

    // copy of the texture with the hue rotated (only the chair uses it)
    const hc = document.createElement('canvas');
    hc.width = map.image.width; hc.height = map.image.height;
    const hg = hc.getContext('2d');
    hg.filter = `hue-rotate(${CHAIR_HUE}deg)`;
    hg.drawImage(map.image, 0, 0);
    const tex = new T.CanvasTexture(hc);
    tex.flipY = map.flipY;
    tex.wrapS = map.wrapS; tex.wrapT = map.wrapT;
    if (map.colorSpace !== undefined) tex.colorSpace = map.colorSpace;
    if (map.encoding !== undefined) tex.encoding = map.encoding;
    tex.needsUpdate = true;

    const mat = target.material.clone();
    mat.map = tex;
    if (mat.emissiveMap) mat.emissiveMap = tex;

    const chair = new T.Mesh(cg, mat);
    chair.castShadow = true; chair.receiveShadow = true;
    target.add(chair);                       // same transform as the parent mesh
  };

  const pc = loadModel(scene, 'models/pc.glb', {
    x: deskX, y: 0.05, z: deskZ, length: DESK_LEN, ry: 0, brighten: 0.3,
    onLoad: ({ obj, holder, size }) => {
      // 1) snap the desk to the back wall, right corner
      if (size.z > size.x) holder.rotation.y += Math.PI / 2;
      holder.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(holder);
      holder.position.z += B - b.min.z;
      holder.position.x += (R - 0.03) - b.max.x;
      holder.updateMatrixWorld(true);

      // 2) chair colour
      try { recolorChair(obj); } catch (e) { console.warn('[pc.glb] chair recolor failed', e); }

      // 3) screens: flat dark panels laid over the baked-in screens
      const wb = new T.Box3().setFromObject(holder);
      const ws = wb.getSize(new T.Vector3());
      const apply = s => {
        s.mesh.position.set(wb.min.x + s.fx * ws.x, wb.min.y + s.fy * ws.y, wb.min.z + s.fz * ws.z);
        s.mesh.scale.set(s.fw * ws.x, s.fh * ws.y, 1);
        s.mesh.rotation.set(s.rx || 0, s.ry || 0, 0);
      };
      SCREENS.forEach(s => {
        s.mesh = new T.Mesh(
          new T.PlaneGeometry(1, 1),
          new T.MeshBasicMaterial({
            map: canvasTexture(s.draw, s.cw, s.ch),
            side: T.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          })
        );
        s.mesh.renderOrder = SCREEN_TUNER ? 10 : 0;
        s.mesh.rotation.order = 'YXZ';
        scene.add(s.mesh);
        on(s.mesh, 'The PC — play a game', actions.game);
        apply(s);
      });

      // 4) tuner: line the screens up by eye (only when SCREEN_TUNER = true)
      if (SCREEN_TUNER) {
        let cur = 0;
        console.log('[tuner] keys: 1/2/3 pick screen | J/L left-right | I/K up-down | U/O back-front | N/M turn | T/G tilt | Z/X narrower-wider | C/V shorter-taller | hold Shift = fine steps | P = print all numbers');
        window.addEventListener('keydown', e => {
          const k = e.code;
          const s = SCREENS[cur];
          const step = e.shiftKey ? 0.003 : 0.012;
          const turn = e.shiftKey ? 0.02 : 0.05;
          const grow = e.shiftKey ? 0.01 : 0.03;
          if (k === 'Digit1') cur = 0;
          else if (k === 'Digit2') cur = 1;
          else if (k === 'Digit3') cur = 2;
          else if (k === 'KeyJ') s.fx -= step;
          else if (k === 'KeyL') s.fx += step;
          else if (k === 'KeyI') s.fy += step;
          else if (k === 'KeyK') s.fy -= step;
          else if (k === 'KeyU') s.fz -= step;
          else if (k === 'KeyO') s.fz += step;
          else if (k === 'KeyN') s.ry -= turn;
          else if (k === 'KeyM') s.ry += turn;
          else if (k === 'KeyT') s.rx += turn;
          else if (k === 'KeyG') s.rx -= turn;
          else if (k === 'KeyZ') s.fw *= 1 - grow;
          else if (k === 'KeyX') s.fw *= 1 + grow;
          else if (k === 'KeyC') s.fh *= 1 - grow;
          else if (k === 'KeyV') s.fh *= 1 + grow;
          else if (k === 'KeyP') {
            SCREENS.forEach(t => console.log(`    { name: '${t.name}', draw: drawDark, cw: ${t.cw}, ch: ${t.ch}, fx: ${t.fx.toFixed(3)}, fy: ${t.fy.toFixed(3)}, fz: ${t.fz.toFixed(3)}, fw: ${t.fw.toFixed(3)}, fh: ${t.fh.toFixed(3)}, ry: ${t.ry.toFixed(2)}, rx: ${t.rx.toFixed(2)} },`));
            return;
          }
          else return;
          const t = SCREENS[cur];
          apply(t);
          console.log(`[tuner] ${t.name}: fx: ${t.fx.toFixed(3)}, fy: ${t.fy.toFixed(3)}, fz: ${t.fz.toFixed(3)}, fw: ${t.fw.toFixed(3)}, fh: ${t.fh.toFixed(3)}, ry: ${t.ry.toFixed(2)}, rx: ${t.rx.toFixed(2)}`);
        });
      }
    },
  });
  on(pc, 'The PC — play a game', actions.game);
  col.push([deskX - DESK_LEN / 2, deskX + DESK_LEN / 2, B, B + 1.1]);

  // desk lamp light
  const deskLight = new T.PointLight(0xffd9a0, 0.45, 3);
  deskLight.position.set(0.8, 1.25, deskZ);
  scene.add(deskLight);

  // ═════════ bed: measured after it loads, so any bed model works ═════════
  const BED_LEN  = 2.2;     // length of the bed (longest side), in meters
  const BED_FLIP = false;   // true = turn the bed around if the head is at the wrong end
  const bedZ = F - BED_LEN / 2;   // used by the polaroid wall

  const bedCol = [L, L + 1.2, F - BED_LEN, F];   // collision box, corrected once the bed loads
  col.push(bedCol);

  const bed = loadModel(scene, 'models/bed.glb', {
    x: L + 0.7, y: 0.05, z: bedZ, length: BED_LEN,
    ry: Math.PI / 2 + (BED_FLIP ? Math.PI : 0),
    onLoad: ({ holder }) => {
      holder.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(holder);
      let s = b.getSize(new T.Vector3());

      // the bed's long side should run along z (head at the front wall)
      if (s.x > s.z) {
        holder.rotation.y += Math.PI / 2;
        holder.updateMatrixWorld(true);
        b.setFromObject(holder);
        s = b.getSize(new T.Vector3());
      }

      // push into the corner: left wall + front wall
      holder.position.x += L - b.min.x;
      holder.position.z += F - b.max.z;
      holder.updateMatrixWorld(true);
      b.setFromObject(holder);
      s = b.getSize(new T.Vector3());
      console.log('[bed] size', s.x.toFixed(2), 'x', s.y.toFixed(2), 'x', s.z.toFixed(2), '| top y', b.max.y.toFixed(2));

      // collision box
      bedCol[0] = b.min.x; bedCol[1] = b.max.x; bedCol[2] = b.min.z; bedCol[3] = b.max.z;

      // nightstand + mushroom lamp, beside the head of the bed
      const nsX = b.max.x + 0.3;
      box(0.5, 0.45, 0.5, 0xe6c9a0, nsX, 0.23, F - 0.25);
      mushroomLamp(nsX, 0.46, F - 0.25, 0.4);
      col.push([nsX - 0.25, nsX + 0.25, F - 0.5, F]);

      // usagi sits on the bed surface: drop a ray from above and land where it hits
      const usagiX = (b.min.x + b.max.x) / 2;
      const usagiZ = F - 0.55;           // a bit away from the headboard so the ray hits the mattress
      const SINK   = 0.03;               // how far he settles into the duvet (raise to sink more)
      const ray = new T.Raycaster(new T.Vector3(usagiX, 3, usagiZ), new T.Vector3(0, -1, 0));
      const hits = ray.intersectObject(holder, true);
      const bedTop = hits.length ? hits[0].point.y - SINK : b.max.y - 0.25;
      console.log('[usagi] landing y', bedTop.toFixed(2), hits.length ? '(ray hit)' : '(no hit, fallback)');
      const usagi = loadModel(scene, 'models/usagi.glb', {
        x: usagiX, y: bedTop, z: usagiZ,
        height: 0.65, ry: Math.PI, brighten: 0.5,
      });
      usagi.rotation.order = 'YXZ';   // so the tilt happens in his own frame
      usagi.rotation.x = -0.35;       // lean back
    },
  });
  on(bed, 'The bed — about me', actions.about);

  // ═════════ dresser (right wall, front) + record player + vinyl box ═════════
  const dresserX = R - 0.35;
  const dresserZ = F - 0.77;      // 1.58 (spans 0.83 .. 2.33)
  const DRESSER_TOP = 1.1;
  box(0.7, 1.1, 1.5, 0xe6c9a0, dresserX, 0.55, dresserZ); // sage dresser
  col.push([dresserX - 0.35, R, dresserZ - 0.75, dresserZ + 0.75]);

  [0.2, 0.5, 0.8].forEach(y => {
    box(0.04, 0.25, 1.35, 0xe6c9a0, dresserX - 0.36, y + 0.1, dresserZ); // drawer front
    sphere(0.04, 0x5a3a20, dresserX - 0.4, y + 0.1, dresserZ);           // knob
  });

  // record player + box of vinyls on top, facing into the room (ry = -PI/2 faces away from the right wall)
  loadModel(scene, 'models/recordplayer.glb', { x: dresserX, y: DRESSER_TOP, z: dresserZ + 0.38, length: 0.65, ry: -Math.PI / 2, brighten: 0.5 });
  loadModel(scene, 'models/vinyls.glb',       { x: dresserX, y: DRESSER_TOP, z: dresserZ - 0.42, length: 1,  ry: -Math.PI / 2, brighten: 1 });

  // ═════════ right wall: whiteboard + posters + corkboard ═════════
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
    return picture(0.7, 1.0, canvasTexture(draw), R - GAP, y, z, -Math.PI / 2);
  };

  // vinyl poster collage, centered on the dresser
  const VINYL_POSTER_H = 2.0;
  const VINYL_POSTER_W = VINYL_POSTER_H * (469 / 582);   // keeps the image's proportions
  const vinylTex = new T.TextureLoader().load('textures/vinylposter.png');
  if (T.SRGBColorSpace) vinylTex.colorSpace = T.SRGBColorSpace;
  vinylTex.anisotropy = 8;
  const vinylPoster = picture(
  VINYL_POSTER_W, VINYL_POSTER_H, vinylTex,
  R - GAP, 2.5, dresserZ - 0.2,
  -Math.PI / 2
  );
  vinylPoster.material.transparent = true;
  vinylPoster.material.alphaTest = 0.05;   // fully clear pixels are skipped, avoids dark fringes at the edges
  vinylPoster.material.needsUpdate = true;

  // poster on the right wall
  const PAPER_POSTER_H = 1.5;     // height in meters
  const PAPER_LEFT_Z   = -2.1;    // where the poster's left edge sits (matches the tall monitor). Raise to move right
  const PAPER_BOTTOM_Y = 0.85;    // where the poster's bottom edge sits (just above the desk top). Lower = further down

  const paperTex = new T.TextureLoader().load('textures/christinakoch.png', tex => {
    // size the poster to the image's real proportions once it has loaded
    const w = PAPER_POSTER_H * tex.image.width / tex.image.height;
    whiteboard.scale.x = w;
    whiteboard.position.z = PAPER_LEFT_Z + w / 2;   // keep the LEFT edge fixed as the width changes
  });
  if (T.SRGBColorSpace) paperTex.colorSpace = T.SRGBColorSpace;
  paperTex.anisotropy = 8;

  const whiteboard = picture(
    1, PAPER_POSTER_H, paperTex,
    R - GAP, PAPER_BOTTOM_Y + PAPER_POSTER_H / 2, PAPER_LEFT_Z + 0.6,
    -Math.PI / 2
  );
  whiteboard.material.transparent = true;
  whiteboard.material.alphaTest = 0.05;   // skip fully clear pixels, avoids dark fringes
  whiteboard.material.needsUpdate = true;

  // ivy hanging down the right wall (back corner, above the desk)
  vine(R - 0.07, CEIL - 0.05, -1.85, 0.6);
  vine(R - 0.07, CEIL - 0.05, -1.7,  0.45);

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
  wallArt(0.7, 1.0, gigPoster, L + GAP, 1.75, -1.95, Math.PI / 2,  0.02);
  wallArt(0.7, 1.0, ufoPoster, L + GAP, 1.75, -1.1,  Math.PI / 2, -0.03);

  // polaroid grid over the bed (more saturated so they read as photos)
  const TINTS = [['#ff9eb5', '#ffc27a'], ['#8cc8f0', '#c6e88f'], ['#b79cf0', '#ff9ec9'], ['#7fd1a5', '#ffe27a']];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c;
      polaroid(L + GAP, 1.45 + r * 0.38, bedZ - 0.76 + c * 0.38, Math.PI / 2, ((i * 37) % 10 - 5) * 0.012, TINTS[i % 4], i);
    }
  }

  // reading corner (back-left, under the windows): bean bag turned toward the spawn point, books, mug
  const BEAN_X = -1.6, BEAN_Z = -1.7;
  const BEAN_TURN = -Math.PI / 2;   // if it faces the wrong way, try Math.PI / 2 or Math.PI
  const beanFacing = Math.atan2(0.5 - BEAN_X, 2.8 - BEAN_Z) + BEAN_TURN;
  loadModel(scene, 'models/bean_bag.glb',  { x: BEAN_X, y: 0.05, z: BEAN_Z, height: 0.75, ry: beanFacing, brighten: -0.5 });
  loadModel(scene, 'models/books.glb',     { x: -0.7,  y: 0.1,  z: -2.0,  length: 0.9,  ry: 0.3, brighten: 0.3 });
  loadModel(scene, 'models/coffeemug.glb', { x: -0.95, y: 0.06, z: -1.35, height: 0.2,  ry: 0.8, brighten: 0.3 });
  col.push([-2.1, -1.1, -2.2, -1.2]);

  // ═════════ fairy lights (back wall, draped in a curve, with soft glow) ═════════
  const FAIRY_COLORS = [0xffd070, 0xff8fb5, 0xfff3b0];
  for (let i = 0; i < 15; i++) {
    const pos = new T.Vector3(-2.1 + i * 0.3, 2.52 - Math.sin(i / 2.2) * 0.1, B + 0.12);

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
  sun.target.position.set(0, 0, 0.5);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;      // fixes the staircase patterns on furniture
  sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, far: 25 });

  // gentle fill light from the ceiling
  const warmFill = new T.PointLight(0xffe6cc, 0.12, 6);
  warmFill.position.set(0, 2.4, 0);
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
  for (let i = 0; i < 70; i++) {
    positions.push(
      (Math.random() - 0.5) * 4.2,
      0.3 + Math.random() * 2.1,
      (Math.random() - 0.5) * 4.2
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