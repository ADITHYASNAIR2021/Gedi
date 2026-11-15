import * as THREE from 'three';

export function restoreTuskerRig(data) {
  if (!data?.positions || data.positions.length !== 399 * 3 || !data.positions.every(Number.isFinite)) throw new Error('Invalid tusker rig');
  const saddle = new THREE.PlaneGeometry(1, 1, 18, 20);
  saddle.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  saddle.computeVertexNormals();
  const sockets = { backY: data.sockets.backY };
  for (const key of ['belly', 'trunk', 'tail']) sockets[key] = new THREE.Vector3().fromArray(data.sockets[key]);
  validateSockets(sockets);
  return { sockets, saddle };
}

function validateSockets(sockets) {
  for (const key of ['belly', 'trunk', 'tail']) {
    if (!sockets[key].toArray().every(Number.isFinite)) throw new Error(`Invalid ${key} attachment`);
  }
  if (sockets.trunk.x > -2 || sockets.tail.x < 1.5 || sockets.trunk.x >= sockets.tail.x) {
    throw new Error('Elephant attachments must put the trunk at the face and the tail at the rump');
  }
}

// Derive every decorative/functional attachment from the same local-space mesh.
export function buildTuskerRig(template) {
  template.updateMatrixWorld(true);
  const coat = [];
  template.traverse(mesh => { if (mesh.isMesh && mesh.material.name.includes('coat')) coat.push(mesh); });
  const ray = new THREE.Raycaster();
  const sample = (origin, direction, fallback, accept = () => true) => {
    ray.set(origin, direction.normalize());
    return ray.intersectObjects(coat, false).find(hit => accept(hit.point))?.point.clone() || fallback.clone();
  };
  const belly = sample(new THREE.Vector3(.55, -.5, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(.55, 1.8, 0));
  const back = sample(new THREE.Vector3(.4, 8, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(.4, 3.7, 0));
  // The animated trunk replaces an open cut in the source mesh. A ray through
  // that opening can hit the rump, so only accept hits in the named face region.
  const trunk = sample(new THREE.Vector3(-6, 2.85, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(-3.05, 2.85, 0), p => p.x < -2.4);
  const tail = sample(new THREE.Vector3(6, 2.8, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(2.35, 2.8, 0), p => p.x > 1.8);
  belly.y += .12; trunk.x += .12; tail.x -= .12;
  const sockets = { belly, trunk, tail, backY: back.y };
  validateSockets(sockets);
  const saddle = new THREE.PlaneGeometry(1, 1, 18, 20);
  const pos = saddle.attributes.position;
  for (let row = 0; row <= 20; row++) for (let col = 0; col <= 18; col++) {
    const x = -1.3 + col / 18 * 2.8;
    const angle = (row / 20 - .5) * 3.05;
    const direction = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
    const centre = new THREE.Vector3(x, 2.6, 0);
    const origin = centre.clone().addScaledVector(direction, 5);
    const p = sample(origin, direction.clone().negate(), centre.clone().addScaledVector(direction, 1));
    p.addScaledVector(direction, .045);
    pos.setXYZ(row * 19 + col, p.x, p.y, p.z);
  }
  saddle.computeVertexNormals();
  return { sockets, saddle };
}
