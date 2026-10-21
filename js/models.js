// js/models.js
const T = THREE; // global from the script tag in index.html

export function loadModel(scene, url, { x = 0, y = 0, z = 0, height = 1, ry = 0 } = {}) {
  new T.GLTFLoader().load(
    url,
    (gltf) => {
      const m = gltf.scene;

      // scale so the model is `height` units tall
      const size = new T.Box3().setFromObject(m).getSize(new T.Vector3());
      console.log('native size of', url, size);
      m.scale.setScalar(height / size.y);

      // put the bottom of the model at y, centered on x/z
      const box = new T.Box3().setFromObject(m);
      const c = box.getCenter(new T.Vector3());
      m.position.set(x - c.x, y - box.min.y, z - c.z);
      m.rotation.y = ry;

      m.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      scene.add(m);
    },
    undefined,
    (err) => console.error('Failed to load', url, err)
  );
}