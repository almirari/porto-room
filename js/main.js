import { buildRoom } from './room.js';
import { show, isOpen } from './ui.js';
import { flappy } from './flappy.js';
import * as C from './content.js';

const T = THREE;
const $ = id => document.getElementById(id);
const canvas = $('c');
const tag = $('tag');

// ───────────── renderer, scene, camera ─────────────
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new T.Scene();
scene.background = new T.Color(0xffd9b0);
scene.fog = new T.Fog(0xffd9b0, 8, 20);

const camera = new T.PerspectiveCamera(70, 1, 0.1, 50);
camera.position.set(0, 1.6, 2.5);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ───────────── room + clickable furniture ─────────────
const clickables = [];
const on = (mesh, label, fn) => {
  mesh.userData = { label, fn };
  clickables.push(mesh);
};

const { col, motes } = buildRoom(scene, on, {
  about:    () => show(`<h2>About me</h2><p>${C.ABOUT}</p>`),
  projects: () => show(`<h2>Projects</h2>${C.PROJECTS.map(p => `<p>• ${p}</p>`).join('')}`),
  paper:    () => show(`<h2>${C.PAPER.title}</h2><p><i>${C.PAPER.venue}</i></p><p>${C.PAPER.abs}</p>
                        <a class="btn" href="${C.PAPER.link}" target="_blank" rel="noopener">Read the paper</a>`),
  contact:  () => show(`<h2>Find me</h2>${C.CONTACT.map(([n, u]) =>
                        `<a class="btn" href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}`),
  game:     () => show(`<h2>Games</h2><p>Click or press Space to flap.</p>
                        <canvas id="g" width="320" height="400"></canvas>`, flappy($('g'))),
});

// ───────────── collision ─────────────
const ROOM_LIMIT = 3.6;
const BODY = 0.3; // how close you can get to furniture

const canStandAt = (x, z) =>
  Math.abs(x) < ROOM_LIMIT &&
  Math.abs(z) < ROOM_LIMIT &&
  !col.some(([x0, x1, z0, z1]) => x > x0 - BODY && x < x1 + BODY && z > z0 - BODY && z < z1 + BODY);

// ───────────── state ─────────────
let yaw = 0, pitch = 0;
let loaded = false;
let drag = null;        // set while a finger/mouse is down on the canvas
let walkTarget = null;  // where tap-to-move is heading
const keys = {};

// ───────────── keyboard ─────────────
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

// ───────────── picking (raycasting) ─────────────
const raycaster = new T.Raycaster();
const pointer = new T.Vector2();

function aimRayAt(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

// returns the clickable object under the pointer, or undefined
function clickableAt(e) {
  aimRayAt(e);
  const hit = raycaster.intersectObjects(clickables, true)[0];
  if (!hit) return;
  let o = hit.object;
  while (o && !o.userData.fn) o = o.parent;
  return o || undefined;
}

// ───────────── tap to move ─────────────
const floorPlane = new T.Plane(new T.Vector3(0, 1, 0), -0.05); // floor top is at y≈0.05

const marker = new T.Mesh(
  new T.RingGeometry(0.12, 0.18, 24),
  new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);

function walkTo(e) {
  aimRayAt(e);
  const p = raycaster.ray.intersectPlane(floorPlane, new T.Vector3()); // null if you tap the ceiling
  if (p && canStandAt(p.x, p.z)) {
    walkTarget = p;
    marker.position.set(p.x, 0.07, p.z);
    marker.visible = true;
  }
}

function stopWalking() {
  walkTarget = null;
  marker.visible = false;
}

// ───────────── pointer input: look, hover, click, tap ─────────────
canvas.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
});

addEventListener('pointermove', e => {
  if (drag) {
    // dragging = looking around
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * 0.005;
    pitch = Math.max(-1.2, Math.min(1.2, pitch - dy * 0.005));
    drag.x = e.clientX;
    drag.y = e.clientY;
  } else if (loaded) {
    // hovering = show label (desktop only)
    const thing = clickableAt(e);
    canvas.style.cursor = thing ? 'pointer' : 'default';
    tag.style.display = thing ? 'block' : 'none';
    if (thing) tag.textContent = thing.userData.label;
  }
});

addEventListener('pointerup', e => {
  const wasTap = drag && drag.moved < 6;
  drag = null;
  if (!wasTap || !loaded || isOpen()) return;

  const thing = clickableAt(e);
  if (thing) thing.userData.fn(); // tapped furniture → open it
  else walkTo(e);                 // tapped floor → walk there
});

// ───────────── movement ─────────────
const WALK_SPEED = 2.4;

// WASD / arrows → how far to move this frame, or null if no key is held
function keyboardMove(dt) {
  const forward = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
  const strafe  = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  if (!forward && !strafe) return null;
  const step = WALK_SPEED * dt;
  return {
    dx: (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * step,
    dz: (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * step,
  };
}

// tap target → how far to move this frame, or null if we've arrived
function targetMove(dt) {
  if (!walkTarget) return null;
  const dx = walkTarget.x - camera.position.x;
  const dz = walkTarget.z - camera.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) { stopWalking(); return null; }
  const step = Math.min(WALK_SPEED * dt, dist);
  return { dx: (dx / dist) * step, dz: (dz / dist) * step };
}

// move each axis separately so you slide along furniture instead of sticking
function tryMove({ dx, dz }) {
  const p = camera.position;
  let moved = false;
  if (canStandAt(p.x + dx, p.z)) { p.x += dx; moved = true; }
  if (canStandAt(p.x, p.z + dz)) { p.z += dz; moved = true; }
  return moved;
}

function updatePlayer(dt) {
  if (!loaded || isOpen()) return;

  let move = keyboardMove(dt);
  if (move) stopWalking();            // pressing a key cancels tap-to-move
  else move = targetMove(dt);

  if (move && !tryMove(move) && walkTarget) stopWalking(); // blocked → give up
}

// ───────────── main loop ─────────────
let lastTime = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - lastTime) / 1000, 0.05);
  lastTime = t;

  updatePlayer(dt);
  motes.rotation.y += dt * 0.02;
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  renderer.render(scene, camera);
}
loop(0);

// ───────────── loading screen ─────────────
const WELCOME = 'hi, i’m almira raisa izzatina, or call me sasya — welcome to my room!';

let charCount = 0;
const typer = setInterval(() => {
  $('intro').textContent = WELCOME.slice(0, ++charCount);
  if (charCount >= WELCOME.length) clearInterval(typer);
}, 70);

let progress = 0;
const progressTimer = setInterval(() => {
  progress = Math.min(100, progress + 1.6);
  $('fill').style.width = progress + '%';
  if (progress >= 100) {
    clearInterval(progressTimer);
    document.querySelector('#load h1').style.opacity = 1;
    $('enter').style.display = 'inline-block';
  }
}, 50);

$('enter').onclick = () => {
  $('load').style.opacity = 0;
  setTimeout(() => $('load').style.display = 'none', 800);
  loaded = true;
};

// ───────────── touch devices ─────────────
if (matchMedia('(pointer: coarse)').matches) {
  $('hud').textContent = 'Tap the floor to walk · drag to look · tap things to explore';
}