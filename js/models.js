// Loads .glb models from /models and drops them into the room.
// GLTFLoader comes from the <script> tag in index.html (global THREE.GLTFLoader).
const T = THREE;
const FLOOR_Y = 0.05;
let loader = null;

// ───────────── list-style models (placed by loadModels) ─────────────
// file: name inside /models · height: auto-scaled · x,z: centre · rotY: degrees · collide: block walking
// (positions are for the 4.8 x 4.8 m room: walls are at x/z = ±2.35)
export const MODELS = [
  { file: 'plant.glb',  height: 1.3,  x:  2.0,  z:  0.45, rotY: 0,   collide: true  }, // right wall, between whiteboard and dresser
];

// each file is downloaded once; extra copies are clones
// (the cache keeps the whole gltf, not just the scene, so animations stay available)
const cache = {};
const fetchGLB = file => (cache[file] ??= new Promise((ok, fail) => {
  if (!T.GLTFLoader) return fail(new Error('THREE.GLTFLoader is not loaded (check the <script> tags in index.html)'));
  loader ??= new T.GLTFLoader();
  loader.load('models/' + file, g => ok(g), undefined, fail);
}));

const castShadows = obj => obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

// ───────────── loadModel: used by room.js ─────────────
// opts: x, y, z (y = floor top), ry (radians), and either height or length.
//   brighten  how much the model glows on its own (negative = darker)
//   pose      freeze the model's first animation at this time (seconds, or 'end').
//             Fixes models that load in the wrong pose (e.g. a window with a sash swung open).
//   prepare   function(obj) called before the model is measured; use it to move parts by name,
//             e.g. prepare: o => o.getObjectByName('Sash').rotation.y = 0
//   debug     print the model's animations and node names to the console
//   onLoad    function({ obj, holder, size }) called when the model is in place;
//             size is its final size in meters (in the model's own axes, before ry)
// Returns a Group straight away (so room.js can make it clickable);
// the model is added into it once the file has loaded.
export function loadModel(scene, path, opts = {}) {
  const holder = new T.Group();
  holder.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
  holder.rotation.y = opts.ry || 0;
  scene.add(holder);

  fetchGLB(path.replace(/^models\//, '')).then(gltf => {
    const obj = gltf.scene.clone(true);
    const clips = gltf.animations || [];

    if (opts.debug) {
      console.log(`[${path}] animations:`, clips.map(c => `${c.name || '(unnamed)'} ${c.duration.toFixed(2)}s`));
      obj.traverse(o => console.log(`[${path}] node:`, o.name || '(unnamed)', o.type));
    }

    // fix the pose before measuring, so the size and centre match what you'll see
    if (opts.pose !== undefined && clips.length) {
      const mixer = new T.AnimationMixer(obj);
      mixer.clipAction(clips[0]).play();
      mixer.setTime(opts.pose === 'end' ? clips[0].duration : opts.pose);
    }
    if (opts.prepare) opts.prepare(obj);
    obj.updateMatrixWorld(true);

    const box = new T.Box3().setFromObject(obj);
    const size = box.getSize(new T.Vector3());

    const s = opts.height ? opts.height / size.y
            : opts.length ? opts.length / Math.max(size.x, size.z)
            : 1;
    obj.scale.setScalar(s);

    box.setFromObject(obj);
    const finalSize = box.getSize(new T.Vector3());
    const c = box.getCenter(new T.Vector3());
    obj.position.set(-c.x, -box.min.y, -c.z);   // centred on holder, standing on its y

    castShadows(obj);

    if (opts.brighten) {
      obj.traverse(o => {
        if (!o.isMesh) return;
        [].concat(o.material).forEach(m => {
          if (!m.emissive) {
            if (m.color) m.color.multiplyScalar(1 + opts.brighten);
            return;
          }
          m.metalness = 0;
          m.roughness = 1;
          if (m.map) { m.emissiveMap = m.map; m.emissive.set(0xffffff); }
          else if (m.color) { m.emissive.copy(m.color); }
          m.emissiveIntensity = opts.brighten;
        });
      });
    }

    holder.add(obj);
    if (opts.onLoad) opts.onLoad({ obj, holder, size: finalSize });
  }).catch(err => console.warn('could not load', path, err));

  return holder;
}

// ───────────── loadModels: used by main.js (list above) ─────────────
async function place(scene, col, m) {
  const gltf = await fetchGLB(m.file);
  const obj = gltf.scene.clone(true);

  obj.rotation.y = T.MathUtils.degToRad(m.rotY || 0);
  const g = new T.Group(); g.add(obj);

  let box = new T.Box3().setFromObject(g);
  g.scale.setScalar(m.height / (box.max.y - box.min.y));

  box.setFromObject(g);
  g.position.set(m.x - (box.min.x + box.max.x) / 2, FLOOR_Y + (m.y || 0) - box.min.y, m.z - (box.min.z + box.max.z) / 2);

  castShadows(g);
  scene.add(g);

  if (m.collide) {
    box.setFromObject(g);
    const hx = (box.max.x - box.min.x) / 4, hz = (box.max.z - box.min.z) / 4;
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    col.push([cx - hx, cx + hx, cz - hz, cz + hz]);
  }
}

const MAX_WAIT = 10000;
export function loadModels(scene, col) {
  const all = Promise.all(MODELS.map(m =>
    place(scene, col, m).catch(err => console.warn('could not load', m.file, err))));
  const timeout = new Promise(ok => setTimeout(() => { console.warn('models are taking long; continuing without waiting'); ok(); }, MAX_WAIT));
  return Promise.race([all, timeout]);
}