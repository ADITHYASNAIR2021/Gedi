// A smooth tapered tube that is re-laid along a quadratic bezier every frame
// (elephant trunks, tails and the anjaamkaal).
import * as THREE from 'three';

const P = new THREE.Vector3();
const T = new THREE.Vector3();
const N1 = new THREE.Vector3();
const N2 = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);

export class Rope {
  constructor(material, { segments = 16, radial = 7, r0 = 0.4, r1 = 0.15, shadow = false } = {}) {
    this.segments = segments;
    this.radial = radial;
    this.r0 = r0;
    this.r1 = r1;
    const rings = segments + 1;
    this.pos = new Float32Array(rings * radial * 3);
    this.nor = new Float32Array(rings * radial * 3);
    const uv = new Float32Array(rings * radial * 2);
    for (let i = 0; i < rings; i++) for (let j = 0; j < radial; j++) {
      uv[(i * radial + j) * 2] = j / radial;
      uv[(i * radial + j) * 2 + 1] = i / segments;
    }
    this.cos = [];
    this.sin = [];
    for (let j = 0; j < radial; j++) {
      this.cos.push(Math.cos((j / radial) * Math.PI * 2));
      this.sin.push(Math.sin((j / radial) * Math.PI * 2));
    }
    const idx = [];
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * radial + j;
        const b = i * radial + ((j + 1) % radial);
        const c = a + radial;
        const d = b + radial;
        idx.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = true;
    this.mesh.castShadow = shadow;
  }

  // Lay the tube along the bezier a → (c) → b, in the mesh's local space; tEnd < 1 covers only the start.
  setCurve(a, c, b, tEnd = 1) {
    const { segments, radial, pos, nor } = this;
    let k = 0;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * tEnd;
      const u = 1 - t;
      P.set(
        u * u * a.x + 2 * u * t * c.x + t * t * b.x,
        u * u * a.y + 2 * u * t * c.y + t * t * b.y,
        u * u * a.z + 2 * u * t * c.z + t * t * b.z,
      );
      T.set(
        u * (c.x - a.x) + t * (b.x - c.x),
        u * (c.y - a.y) + t * (b.y - c.y),
        u * (c.z - a.z) + t * (b.z - c.z),
      );
      if (T.lengthSq() < 1e-8) T.set(0, -1, 0);
      T.normalize();
      N1.crossVectors(Z, T);
      if (N1.lengthSq() < 1e-6) N1.set(1, 0, 0);
      N1.normalize();
      N2.crossVectors(T, N1);
      const r = this.r0 + (this.r1 - this.r0) * (i / segments);
      for (let j = 0; j < radial; j++) {
        const nx = this.cos[j] * N1.x + this.sin[j] * N2.x;
        const ny = this.cos[j] * N1.y + this.sin[j] * N2.y;
        const nz = this.cos[j] * N1.z + this.sin[j] * N2.z;
        pos[k] = P.x + r * nx;
        pos[k + 1] = P.y + r * ny;
        pos[k + 2] = P.z + r * nz;
        nor[k] = nx;
        nor[k + 1] = ny;
        nor[k + 2] = nz;
        k += 3;
      }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.computeBoundingSphere();
  }

  dispose() {
    this.mesh.geometry.dispose();
  }
}
