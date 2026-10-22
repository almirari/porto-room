// js/models.js
const T = THREE; // global from the script tag in index.html

// Loads a .glb into the scene. Returns a group right away (the model fills in once loaded),
// so you can pass the result to on(...) to make it clickable.
//   height: make the model this tall        (good for chairs, plants)
//   length: make its longest side this long (good for beds, rugs, desks)
//   x, z:   floor position;  y: height of the model's bottom;  ry: rotation
export function loadModel(scene, url, { x = 0, y = 0, z = 0, height, length, ry = 0 } = {}) {
  const pivot = new T.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.y = ry;
  scene.add(pivot);

  new T.GLTFLoader().load(
    url,
    (gltf) => {
      const model = gltf.scene;

      // scale to the requested size
      const size = new T.Box3().setFromObject(model).getSize(new T.Vector3());
      console.log('native size of', url, size);
      const s = height ? height / size.y
              : length ? length / Math.max(size.x, size.z)
              : 1;
      model.scale.setScalar(s);

      // center it on the pivot with its bottom at y = 0, so rotation spins it in place
      const box = new T.Box3().setFromObject(model);
      const c = box.getCenter(new T.Vector3());
      model.position.set(-c.x, -box.min.y, -c.z);

      model.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      pivot.add(model);
    },
    undefined,
    (err) => console.error('Failed to load', url, err)
  );

  return pivot;
}