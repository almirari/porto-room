const loader = new THREE.GLTFLoader();

// Loads a .glb, places it, and returns a promise with the model
export function loadModel(S, url, { x = 0, y = 0, z = 0, ry = 0, scale = 1 } = {}) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      const m = gltf.scene;
      m.position.set(x, y, z);
      m.rotation.y = ry;
      m.scale.setScalar(scale);
      m.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      S.add(m);
      resolve(m);
    }, undefined, reject);
  });
}