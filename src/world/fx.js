// Pooled particle bursts: dust, splashes, confetti, fireworks, sneeze spray.
import * as THREE from 'three';

const POOL = 260;

export class Fx {
  constructor(scene) {
    this.geo = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float instanceAlpha; varying float particleAlpha;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nparticleAlpha = instanceAlpha;');
      shader.fragmentShader = 'varying float particleAlpha;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= particleAlpha;');
    };
    this.mesh = new THREE.InstancedMesh(this.geo, material, POOL);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(POOL), 1);
    this.geo.setAttribute('instanceAlpha', this.alpha);
    this.matrix = new THREE.Matrix4();
    this.color = new THREE.Color();
    scene.add(this.mesh);
    this.items = [];
    for (let i = 0; i < POOL; i++) {
      this.mesh.setMatrixAt(i, this.matrix.makeScale(0, 0, 0));
      this.mesh.setColorAt(i, this.color.set('#ffffff'));
      this.items.push({ pos: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, g: 0, size: 0.1 });
    }
    this.cursor = 0;
  }

  spawn(pos, { count = 12, color = '#ffffff', colors = null, speed = 5, up = 2, gravity = 12, life = 0.8, size = 0.12, spread = 1 }) {
    for (let i = 0; i < count; i++) {
      const index = this.cursor;
      const p = this.items[index];
      this.cursor = (this.cursor + 1) % POOL;
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI * spread;
      const s = speed * (0.4 + Math.random() * 0.6);
      p.v.set(Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + up, Math.sin(a) * Math.cos(b) * s * 0.5);
      p.pos.copy(pos);
      this.mesh.setColorAt(index, this.color.set(colors ? colors[i % colors.length] : color));
      p.life = p.max = life * (0.6 + Math.random() * 0.6);
      p.g = gravity;
      p.size = size * (0.6 + Math.random() * 0.8);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  dust(pos) { this.spawn(pos, { count: 16, color: '#b89a6a', speed: 4, up: 2, life: 0.7, size: 0.18 }); }
  marigolds(pos) { this.spawn(pos, { count: 24, colors: ['#e79a32', '#eab94d', '#f1d79a'], speed: 4, up: 3, gravity: 5, life: 1.6, size: 0.09 }); }
  splash(pos) { this.spawn(pos, { count: 26, colors: ['#9fd8ff', '#ffffff', '#4fb0e0'], speed: 6, up: 7, gravity: 18, life: 0.9, size: 0.14 }); }
  sparkle(pos) { this.spawn(pos, { count: 10, colors: ['#ffd23f', '#fff3b0'], speed: 4, up: 1, gravity: 2, life: 0.5, size: 0.08 }); }
  confetti(pos) { this.spawn(pos, { count: 30, colors: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#ff4fa3'], speed: 8, up: 5, gravity: 9, life: 1.3, size: 0.1 }); }
  sneeze(pos) { this.spawn(pos, { count: 30, colors: ['#bfe9ff', '#ffffff'], speed: 9, up: -2, gravity: 6, life: 0.7, size: 0.12, spread: 0.6 }); }
  firework(pos) {
    const palette = [['#ff4f4f', '#ffd23f'], ['#4fd1ff', '#ffffff'], ['#b84fff', '#ff4fa3'], ['#4fff8a', '#ffd23f']];
    this.spawn(pos, { count: 40, colors: palette[Math.floor(Math.random() * palette.length)], speed: 10, up: 0, gravity: 3, life: 1.4, size: 0.16, spread: 2 });
  }

  update(dt) {
    let active = 0;
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i];
      if (p.life <= 0) { this.mesh.setMatrixAt(i, this.matrix.makeScale(0, 0, 0)); continue; }
      p.life = Math.max(0, p.life - dt);
      p.v.y -= p.g * dt;
      p.pos.addScaledVector(p.v, dt);
      const k = p.life / p.max;
      this.alpha.setX(i, Math.min(1, k * 2));
      const size = p.life > 0 ? p.size * (0.5 + k * 0.5) : 0;
      this.matrix.makeScale(size, size, size).setPosition(p.pos);
      this.mesh.setMatrixAt(i, this.matrix);
      if (p.life > 0) active++;
    }
    this.mesh.visible = active > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.alpha.needsUpdate = true;
  }
}
