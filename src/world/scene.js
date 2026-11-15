// Renderer, camera, lights, sun/moon and gradient sky with per-biome colour blending.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { spring } from '../core/motion.js';

const SKY_VERT = `
varying vec3 vPos;
void main() {
  vPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
uniform vec3 top;
uniform vec3 bottom;
uniform vec3 center;
varying vec3 vPos;
void main() {
  float h = normalize(vPos - center).y;
  float t = smoothstep(-0.05, 0.6, h);
  gl_FragColor = vec4(mix(bottom, top, t), 1.0);
  #include <colorspace_fragment>
}`;

const DAY_SUN = new THREE.Color('#fff1b8');
const NIGHT_MOON = new THREE.Color('#dfe6ff');

export class Stage {
  constructor(canvas, quality) {
    this.lowQuality = !quality.shadows;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(quality.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentMap = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environmentMap.texture;
    this.scene.environmentIntensity = 0.32;
    room.dispose();
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 700);
    this.camera.position.set(0, 5, 20);

    this.hemi = new THREE.HemisphereLight(0xe0f0ef, 0x525a32, 1.4);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.3);
    this.sun.position.set(-10, 25, 18);
    if (quality.shadows) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const c = this.sun.shadow.camera;
      c.left = -34; c.right = 34; c.top = 22; c.bottom = -10; c.near = 1; c.far = 90;
      this.sun.shadow.bias = -0.0008;
      this.sun.shadow.normalBias = 0.04;
    }
    this.scene.add(this.sun, this.sun.target);
    this.rim = new THREE.DirectionalLight(0xffcb86, 1.4);
    this.rim.position.set(12, 16, -18);
    this.scene.add(this.rim, this.rim.target);

    this.skyUniforms = {
      top: { value: new THREE.Color('#4fa3e0') },
      bottom: { value: new THREE.Color('#ffe2a8') },
      center: { value: new THREE.Vector3() },
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(450, 24, 12),
      new THREE.ShaderMaterial({ uniforms: this.skyUniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog('#ffdca0', 70, 260);

    this.sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(11, 32),
      new THREE.MeshBasicMaterial({ color: DAY_SUN, fog: false, transparent: true, opacity: 0.95 }),
    );
    this.scene.add(this.sunDisc);
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.makeGlow(), color: '#ffda9f', transparent: true,
      opacity: 0.5, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    }));
    this.sunGlow.scale.set(95, 95, 1);
    this.scene.add(this.sunGlow);

    this.stars = this.makeStars();
    this.scene.add(this.stars);

    this.target = { top: new THREE.Color(), bottom: new THREE.Color(), fog: new THREE.Color(), night: 0 };
    this.nightAmt = 0;
    this.camTarget = new THREE.Vector3();
    this.lead = 0;
    this.shake = 0;
    this.cameraVelocity = new THREE.Vector3();
    this.shakeTime = 0;
    this.outdoorSky = null;
    this.forestAmount = 0;
  }

  async prepareLighting() {
    try {
      const hdri = await new RGBELoader().loadAsync('/assets/pbr/outdoor-sky.hdr');
      hdri.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.environmentMap.dispose();
      this.environmentMap = pmrem.fromEquirectangular(hdri);
      this.scene.environment = this.environmentMap.texture;
      this.outdoorSky = hdri;
      this.scene.background = hdri;
      this.scene.backgroundIntensity = .65;
      this.scene.backgroundRotation.y = 1.1;
      this.sky.visible = false;
      this.stars.renderOrder = 1;
      pmrem.dispose();
      try {
        const forest = await new THREE.TextureLoader().loadAsync(`/assets/pbr/forest-panorama${this.lowQuality ? '-mobile' : ''}.webp`);
        forest.colorSpace = THREE.SRGBColorSpace;
        forest.minFilter = THREE.LinearMipmapLinearFilter;
        forest.magFilter = THREE.LinearFilter;
        this.photoForest = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 24), new THREE.MeshBasicMaterial({
          map: forest, color: '#c1cbb9', side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false,
        }));
        this.photoForest.rotation.y = 1.1;
        this.photoForest.renderOrder = -10;
        this.scene.add(this.photoForest);
      } catch { /* The outdoor sky remains available. */ }
    } catch { /* Procedural outdoor lighting remains available offline. */ }
  }

  makeGlow() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.7)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  makeStars() {
    const n = 400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.45;
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * 420;
      pos[i * 3 + 1] = Math.cos(ph) * 420;
      pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 420;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
    return new THREE.Points(g, m);
  }

  setBiome(cfg, instant = false) {
    this.target.top.set(cfg.sky[0]);
    this.target.bottom.set(cfg.sky[1]);
    this.target.fog.set(cfg.fog);
    this.target.night = cfg.night ? 1 : 0;
    this.target.forest = cfg.props.includes('jungle') || cfg.props.includes('temple');
    if (instant) this.blend(1);
  }

  blend(k) {
    const u = this.skyUniforms;
    u.top.value.lerp(this.target.top, k);
    u.bottom.value.lerp(this.target.bottom, k);
    this.scene.fog.color.lerp(this.target.fog, k);
    this.nightAmt += (this.target.night - this.nightAmt) * k;
    const n = this.nightAmt;
    this.sun.intensity = 2.3 * (1 - n) + 0.9 * n;
    this.hemi.intensity = 1.25 * (1 - n) + 1.1 * n;
    this.sun.color.setRGB(1, 0.94 - 0.2 * n, 0.82 + 0.15 * n);
    this.stars.material.opacity = n;
    this.sunDisc.material.color.copy(DAY_SUN).lerp(NIGHT_MOON, n);
    this.sunDisc.scale.setScalar(1 - 0.45 * n);
    this.sunGlow.material.opacity = 0.48 * (1 - n);
    this.rim.intensity = 1.4 * (1 - n) + 0.4 * n;
    this.scene.environmentIntensity = 0.32 - n * 0.18;
    this.forestAmount += ((this.target.forest ? 1 : 0) - this.forestAmount) * k;
    if (this.photoForest) this.photoForest.material.opacity = this.forestAmount * (1 - n);
    if (this.outdoorSky) {
      this.scene.background = n > .55 ? null : this.outdoorSky;
      this.sky.visible = n > .55;
      this.scene.backgroundIntensity = .65 * (1 - n * .8);
      this.scene.environmentIntensity = .65 - n * .5;
      this.sunGlow.visible = false;
      this.sunDisc.visible = n > .55;
    }
  }

  resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 58 : 45;
    this.camera.updateProjectionMatrix();
  }

  // Half the world width visible at the gameplay plane (z = 0).
  viewHalfWidth() {
    return Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z * this.camera.aspect;
  }

  // Follow a point (Gedi) with forward look-ahead and a little speed zoom.
  follow(pos, vel, dt, instant = false) {
    const portrait = this.camera.aspect < 1;
    this.lead += (Math.max(0, vel.x) * 0.22 - this.lead) * (instant ? 1 : 1 - Math.exp(-dt * 2));
    const tx = pos.x + (portrait ? 1.8 : 4.0) + this.lead;
    const tall = this.camera.aspect < 1.35; // square-ish and portrait screens: tilt up, less empty ground
    const ty = Math.min(Math.max(pos.y * 0.5 + (tall ? 1.6 : 2.4), tall ? 3 : 3.6), 9);
    const tz = (portrait ? 21 : tall ? 19 : 19.5) + Math.min(Math.abs(vel.x), 22) * 0.055;
    this.camTarget.set(tx, ty, tz);
    if (instant) { this.camera.position.copy(this.camTarget); this.cameraVelocity.set(0, 0, 0); }
    else for (const axis of ['x', 'y', 'z']) {
      [this.camera.position[axis], this.cameraVelocity[axis]] = spring(this.camera.position[axis], this.cameraVelocity[axis], this.camTarget[axis], axis === 'z' ? 2.4 : 6, dt);
    }
    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      this.shakeTime += dt;
      const strength = Math.min(.22, this.shake);
      sx = Math.sin(this.shakeTime * 31) * strength * .5;
      sy = Math.sin(this.shakeTime * 37) * strength * .3;
    }
    const c = this.camera.position;
    this.camera.lookAt(c.x - 0.8 + sx, c.y + (tall ? 2 : 1.2) + sy, 0);
    this.sky.position.set(c.x, 0, 0);
    this.skyUniforms.center.value.set(c.x, 0, 0);
    this.stars.position.set(c.x, 0, 0);
    if (this.photoForest) this.photoForest.position.set(c.x, 0, 0);
    this.sunDisc.position.set(c.x + 80, 65, -300);
    this.sunDisc.lookAt(c.x, 20, 0);
    this.sunGlow.position.copy(this.sunDisc.position);
    this.sun.position.set(c.x - 10, 25, 18);
    this.sun.target.position.set(c.x, 0, 0);
    this.rim.position.set(c.x + 12, 16, -18);
    this.rim.target.position.set(c.x, 3, 0);
    this.blend(1 - Math.exp(-dt * 1.2));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
