import * as THREE from 'three';

const photos = new Map();
export function photographicMaterial(name, { repeat = [1, 1], color = '#ffffff', roughness = .9, normal = true } = {}) {
  const key = `${name}/${repeat}/${normal}`;
  let maps = photos.get(key);
  if (!maps) {
    maps = {};
    for (const type of normal ? ['color', 'normal'] : ['color']) {
      const map = new THREE.TextureLoader().load(`/assets/pbr/${name}-${type}.webp`);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(...repeat);
      map.anisotropy = 4;
      if (type === 'color') map.colorSpace = THREE.SRGBColorSpace;
      maps[type] = map;
    }
    photos.set(key, maps);
  }
  return new THREE.MeshStandardMaterial({ color, map: maps.color, normalMap: maps.normal || null,
    normalScale: new THREE.Vector2(.65, .65), roughness });
}

let skinMap, trunkMap, shadowMap;
export function elephantSkin() {
  if (!skinMap) {
    skinMap = new THREE.TextureLoader().load('/assets/kerala/elephant-skin.webp');
    skinMap.wrapS = skinMap.wrapT = THREE.MirroredRepeatWrapping;
    skinMap.repeat.set(3, 2);
    skinMap.anisotropy = 4;
  }
  return skinMap;
}

export function elephantTrunk() {
  if (!trunkMap) {
    trunkMap = new THREE.TextureLoader().load('/assets/kerala/trunk-speckle.webp');
    trunkMap.colorSpace = THREE.SRGBColorSpace;
    trunkMap.wrapS = trunkMap.wrapT = THREE.MirroredRepeatWrapping;
    trunkMap.repeat.set(2, 2);
    trunkMap.anisotropy = 4;
  }
  return trunkMap;
}

export function contactShadow(width, depth) {
  if (!shadowMap) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 32);
    grad.addColorStop(0, 'rgba(19,31,22,0.48)');
    grad.addColorStop(0.45, 'rgba(19,31,22,0.26)');
    grad.addColorStop(1, 'rgba(19,31,22,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    shadowMap = new THREE.CanvasTexture(canvas);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({
    map: shadowMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.045;
  return mesh;
}
