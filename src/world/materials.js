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

let skinMap, shadowMap;
export function elephantSkin() {
  if (skinMap) return skinMap;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const gray = 90 + Math.floor(Math.random() * 90);
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  ctx.strokeStyle = '#636363'; ctx.lineWidth = 0.7;
  for (let i = 0; i < 55; i++) {
    const y = Math.random() * 256;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
    ctx.stroke();
  }
  skinMap = new THREE.CanvasTexture(canvas);
  skinMap.wrapS = skinMap.wrapT = THREE.RepeatWrapping;
  skinMap.repeat.set(3, 2);
  return skinMap;
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
