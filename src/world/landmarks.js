import * as THREE from 'three';
import { photographicMaterial } from './materials.js';

function photo(name) {
  const map = new THREE.TextureLoader().load(`/assets/kerala/${name}.webp`);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const stone = photographicMaterial('trail', { color: '#a99a85', repeat: [2, 2] });
const lime = photographicMaterial('plaster', { color: '#e4d5bc', repeat: [3, 1], normal: false });
const wood = new THREE.MeshStandardMaterial({ color: '#482a21', roughness: .88 });
const doorway = new THREE.MeshStandardMaterial({ color: '#261d18', roughness: .85 });
const brass = new THREE.MeshStandardMaterial({ color: '#af762e', metalness: .57, roughness: .46 });
const flame = new THREE.MeshBasicMaterial({ color: '#ffb849' });
let tiled;
const box = new THREE.BoxGeometry();
const post = new THREE.CylinderGeometry(1, 1, 1, 8);
const bulb = new THREE.IcosahedronGeometry(1, 0);
const plane = new THREE.PlaneGeometry();
const rock = new THREE.IcosahedronGeometry(1, 1);

function mesh(g, geo, mat, x, y, z, w, h, d = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  g.add(m);
  return m;
}

function hipRoof() {
  const rings = [[.5, 0, .5], [.47, .24, .43], [.43, .7, .24], [.38, 1, .045]];
  const xyz = [], uv = [];
  const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
  for (let side = 0; side < 4; side++) {
    const ends = [corners[side], corners[(side + 1) % 4]];
    for (let row = 0; row < rings.length - 1; row++) {
      for (const [end, step] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]) {
        const [x, y, z] = rings[row + step];
        xyz.push(x * ends[end][0], y, z * ends[end][1]);
        uv.push(end, y);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}
const roof = hipRoof();

function roofTiers(g, x, z, tiers) {
  if (!tiled) {
    const map = photo('pooram-tile');
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 2);
    tiled = new THREE.MeshStandardMaterial({ color: '#c9836a', map, side: THREE.DoubleSide, roughness: .91 });
  }
  for (const [y, width, height, depth] of tiers) {
    mesh(g, box, wood, x, y - .11, z, width, .23, depth);
    mesh(g, roof, tiled, x, y, z, width, height, depth);
    for (let i = 0; i <= 12; i++) {
      mesh(g, box, wood, x + (i / 12 - .5) * width * .91, y - .25, z + depth * .43, .19, .23, .51);
    }
  }
}

export function pooramGate(g, x, z, night) {
  mesh(g, box, stone, x, .32, z, 34, .64, 10);
  for (const side of [-1, 1]) {
    const wing = x + side * 14.1;
    mesh(g, box, lime, wing, 1.55, z, 9.4, 2.55, 4.8);
    roofTiers(g, wing, z, [[3.02, 10.2, 1.14, 5.8]]);
    mesh(g, box, stone, wing, 1.15, z + 2.35, 9.2, .35, .1);
    mesh(g, box, wood, x + side * 5.05, 2.55, z, 6.8, 4.1, 7.1);
    mesh(g, box, lime, x + side * 5.4, 2.04, z + 3.56, 5.5, 2.78, .13);
    for (let i = 0; i < 6; i++) {
      mesh(g, box, wood, x + side * (2.6 + 1.04 * i), 2.48, z + 3.7, .23, 3.78, .26);
      mesh(g, bulb, night ? flame : brass, x + side * (2.7 + .9 * i), 4.10, z + 4.2, .14, .23);
    }
  }
  mesh(g, box, doorway, x, 2.09, z - 1.8, 3.8, 3.8, .25);
  for (let i = 0; i < 3; i++) mesh(g, box, stone, x, .13 + .10 * i, z + 5.6 - .8 * i, 5.8, .24, 1.3);
  mesh(g, box, wood, x, 5.5, z, 15, 1.8, 6.4);
  mesh(g, box, wood, x, 8.0, z, 10.3, 1.45, 4.75);
  roofTiers(g, x, z, [[4.74, 21.2, 1.72, 9.7], [7.03, 17.1, 1.86, 8], [9.02, 13.6, 2.4, 6.44]]);
  const crest = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 3), wood);
  crest.geometry.rotateY(Math.PI / 6);
  crest.userData.ownedGeometry = true;
  crest.position.set(x, 10.09, z + 2.03);
  crest.scale.set(2.47, 2.4, .45);
  g.add(crest);
  for (const side of [-1, 1]) {
    const lx = x + side * 8.8;
    mesh(g, post, brass, lx, 2.17, z + 4.7, .065, 3.98, .065);
    for (let i = 0; i < 5; i++) {
      const y = 1.0 + .62 * i;
      const r = .55 - .07 * i;
      mesh(g, post, brass, lx, y, z + 4.7, r, .085, r);
      mesh(g, bulb, flame, lx + r * .69, y + .12, z + 4.93, .125, .21, .12);
    }
  }
}

const fallsClock = { value: 0 };
function scenicPhoto(name, color, flowing = false) {
  const mat = new THREE.MeshBasicMaterial({ map: photo(name), color, transparent: true, depthWrite: false, fog: false });
  mat.onBeforeCompile = shader => {
    if (flowing) {
      shader.uniforms.fallsClock = fallsClock;
      shader.fragmentShader = 'uniform float fallsClock;\n' + shader.fragmentShader;
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `
      diffuseColor.a *= smoothstep(0.0, 0.14, vMapUv.x) * smoothstep(0.0, 0.14, 1.0 - vMapUv.x)
        * smoothstep(0.0, 0.17, vMapUv.y) * smoothstep(0.0, 0.14, 1.0 - vMapUv.y);
      ${flowing ? `
        float water = smoothstep(.22,.60, dot(diffuseColor.rgb, vec3(.24,.58,.18))) *
          smoothstep(.03,.15,vMapUv.x) * (1.-smoothstep(.52,.68,vMapUv.x)) *
          smoothstep(.05,.20,vMapUv.y) * (1.-smoothstep(.75,.91,vMapUv.y));
        float streak = sin(vMapUv.y*91.0 + fallsClock*7.8 + sin(vMapUv.x*180.0)*2.2);
        diffuseColor.rgb *= 1.0 + water * (.07 + .13 * streak);
      ` : ''}
      #include <alphatest_fragment>
    `);
  };
  mat.customProgramCacheKey = () => flowing ? 'moving-waterfall-photo' : 'feathered-landmark-photo';
  return mat;
}

const mist = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { tint: { value: new THREE.Color('#dce9dc') } },
  vertexShader: 'varying vec2 field; void main(){ field=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `varying vec2 field; uniform vec3 tint; void main(){
    vec2 shape=(field-.5)*2.0;
    float fog=pow(max(0.0,1.0-dot(shape,shape)),2.0);
    gl_FragColor=vec4(tint,fog*.23);
  }`,
});
function mistBank(g, x, y, z, w, h, speed) {
  const cloud = mesh(g, plane, mist, x, y, z, w, h);
  cloud.userData.dynamic = true;
  (g.userData.mistBanks ||= []).push({ cloud, x, y, speed });
}

let fallsPhoto;
export function athirappilly(g, x, z) {
  fallsPhoto ||= scenicPhoto('athirappilly', '#ebedd8', true);
  const wall = mesh(g, plane, fallsPhoto, x + 7, 12.8, z - 4, 70, 39);
  wall.userData.dynamic = true;
  wall.renderOrder = -2;
  for (let i = 0; i < 11; i++) {
    const rx = x - 27 + 4.95 * i;
    const h = 3.0 + 1.5 * Math.sin(i * 1.4);
    const slab = mesh(g, rock, stone, rx, h * .26, z + 2.0 + 1.1 * Math.sin(i), 5.4, h, 4.6);
    slab.rotation.y = i * .62;
  }
  mistBank(g, x - 9, 2.15, z + 12, 39, 5.6, 1.08);
  mistBank(g, x - 13, 3.85, z + 16, 31, 7.2, .67);
}

const levee = new THREE.MeshStandardMaterial({ color: '#607650', roughness: .92 });
export function alappuzhaShore(g, start, end) {
  for (let x = start + 6, i = 0; x <= end - 5; x += 14, i++) {
    mesh(g, rock, levee, x, -.58, -32 + Math.sin(x * .08)*2.8, 9.8, 1.7 + i*.15, 4.1);
  }
}

const bush = new THREE.IcosahedronGeometry(1, 1);
const tea = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .92 });
const hill = photographicMaterial('grass', { color: '#678048', normal: false });
const teaShade = new THREE.MeshStandardMaterial({ color: '#52764d', roughness: .93 });
const teaColors = ['#3d6e35', '#537c38', '#608749', '#37663b'].map(code => new THREE.Color(code));
let teaPhoto;
function terrain(x, depth) {
  return Math.sin(Math.PI * depth) * (1.55 + .65 * Math.sin(x * .07) + 1.8 * depth) + depth * 1.0;
}

export function munnarPlantation(g, x0, width, density, backdrop) {
  const verts = new THREE.PlaneGeometry(width, 29, 20, 13);
  verts.rotateX(-Math.PI / 2);
  const p = verts.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = x0 + width / 2 + p.getX(i);
    const depth = (.5 - p.getZ(i) / 29);
    p.setY(i, terrain(x, depth));
  }
  verts.computeVertexNormals();
  const slope = mesh(g, verts, hill, x0 + width / 2, -.03, -21, 1, 1);
  slope.userData.ownedGeometry = true;
  const rows = density < .75 ? 6 : 9;
  const columns = density < .75 ? 16 : 22;
  const bushes = new THREE.InstancedMesh(bush, tea, rows * columns);
  const matrix = new THREE.Matrix4();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = x0 + width * (col + .5) / columns;
      const depth = (row + 1) / (rows + 1) + Math.sin(x * .12 + row * .29) * .040;
      const index = row * columns + col;
      matrix.makeScale(width / columns * .62, .42 + .07 * Math.sin(col + row), .84).setPosition(x, terrain(x, depth) + .25, -6.5 - depth * 29);
      bushes.setMatrixAt(index, matrix);
      bushes.setColorAt(index, teaColors[(row + Math.floor(col / 4)) % teaColors.length]);
    }
  }
  g.add(bushes);
  if (backdrop) {
    teaPhoto ||= scenicPhoto('munnar', '#b7c6b0');
    const vista = mesh(g, plane, teaPhoto, x0 + width / 2, 13, -69, 116, 50);
    vista.userData.dynamic = true;
    vista.renderOrder = -2;
    mistBank(g, x0 + 16, 6.5, -33, 67, 8, .65);
    mistBank(g, x0 + 37, 11.5, -49, 81, 12, .39);
    for (const [x, z, height] of [[7, -28, 9.1], [26, -46, 12], [35, -34, 10.5]]) {
      const stem = mesh(g, post, wood, x0 + x, height * .49, z, .20, height, .20);
      stem.rotation.z = Math.sin(x)*.12;
      mesh(g, bush, teaShade, x0 + x - 1.3, height * .97, z, 2.55, 1.11, 1.60);
      mesh(g, bush, teaShade, x0 + x + .94, height * 1.04, z, 2.13, 1.35, 1.60);
    }
  }
}

export function updateLandmarks(g, t) {
  fallsClock.value = t;
  for (const { cloud, x, y, speed } of g.userData.mistBanks || []) {
    cloud.position.x = x + Math.sin(t * speed * .29 + x) * 7;
    cloud.position.y = y + Math.sin(t * .3 + speed) * .7;
  }
}
