// Loads .glb models from /models and drops them into the room.
// GLTFLoader comes from the <script> tag in index.html (global THREE.GLTFLoader).
const T = THREE;
const FLOOR_Y = 0.05;
let loader = null;

// ───────────── list-style models (placed by loadModels) ─────────────
// file: name inside /models · height: auto-scaled · x,z: centre · rotY: degrees · collide: block walking
export const MODELS = [
  { file: 'plant.glb', height: 1.5, x: -3.45, z: -3.45, rotY: 0, collide: true },
  { file: 'shelf.glb',  height: 1.8,  x:  2.2, z:  3.5, rotY: 180, collide: true  },
  { file: 'lamp.glb', height: 0.5, x: 1.65, z: -3.35, y: 0.79, rotY: 0, collide: false },
  { file: 'papers.glb', height: 0.05, x:  3.1, z: -3.7, y: 0.79, rotY: 0, collide: false },
];

// each file is downloaded once; extra copies are clones
const cache = {};
const fetchGLB = file => (cache[file] ??= new Promise((ok, fail) => {
  if (!T.GLTFLoader) return fail(new Error('THREE.GLTFLoader is not loaded (check the <script> tags in index.html)'));
  loader ??= new T.GLTFLoader();
  loader.load('models/' + file, g => ok(g.scene), undefined, fail);
}));

const castShadows = obj => obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

// ───────────── loadModel: used by room.js (chair, bed) ─────────────
// opts: x, y, z (y = floor top), ry (radians), and either height or length.
// Returns a Group straight away (so room.js can make it clickable);
// the model is added into it once the file has loaded.
export function loadModel(scene, path, opts = {}) {
  const holder = new T.Group();
  holder.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
  holder.rotation.y = opts.ry || 0;
  scene.add(holder);

  fetchGLB(path.replace(/^models\//, '')).then(src => {
    const obj = src.clone(true);
    const box = new T.Box3().setFromObject(obj);
    const size = box.getSize(new T.Vector3());

    const s = opts.height ? opts.height / size.y
            : opts.length ? opts.length / Math.max(size.x, size.z)
            : 1;
    obj.scale.setScalar(s);

    box.setFromObject(obj);
    const c = box.getCenter(new T.Vector3());
    obj.position.set(-c.x, -box.min.y, -c.z);   // centred on holder, standing on its y

    castShadows(obj);
    
      if (opts.brighten) {
      obj.traverse(o => {
        if (!o.isMesh) return;
        [].concat(o.material).forEach(m => {
          m.metalness = 0;
          m.roughness = 1;
          if (m.map) { m.emissiveMap = m.map; m.emissive.set(0xffffff); }
          else if (m.color) { m.emissive.copy(m.color); }
          m.emissiveIntensity = opts.brighten;
        });
      });
    }

    holder.add(obj);
  }).catch(err => console.warn('could not load', path, err));

  return holder;
}

// ───────────── loadModels: used by main.js (plant list above) ─────────────
async function place(scene, col, m) {
  const src = await fetchGLB(m.file);
  const obj = src.clone(true);

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