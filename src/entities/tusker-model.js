import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildTuskerRig, restoreTuskerRig } from './tusker-rig.js';

let template = null;
let skinMaterial = null;
let sockets = null;
let saddleGeometry = null;
export async function prepareTusker(low = false) {
  try {
    const gltf = await new GLTFLoader().loadAsync(`/assets/models/kerala-tusker${low ? '-low' : ''}.glb?rev=20261112-4`);
    template = gltf.scene;
    template.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.material.side = THREE.DoubleSide;
      mesh.material.envMapIntensity = 0.6;
      mesh.material.normalScale?.set(.65, .65);
      if (mesh.material.name.includes('coat')) {
        skinMaterial = mesh.material;
        mesh.material.color.set('#242826');
        mesh.material.roughness = .87;
        mesh.material.envMapIntensity = .38;
      }
      mesh.material.onBeforeCompile = shader => {
        shader.uniforms.tuskerTime = { value: 0 };
        shader.uniforms.tuskerMood = { value: 1 };
        mesh.material.userData.shader = shader;
        shader.vertexShader = 'uniform float tuskerTime; uniform float tuskerMood;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
          #include <begin_vertex>
          float ear = smoothstep(0.85,1.4,abs(position.z)) * smoothstep(1.9,2.8,position.y) * (1.0-smoothstep(-1.8,-0.7,position.x));
          transformed.z += ear * sin(tuskerTime * tuskerMood + position.z * 2.0) * 0.1;
          transformed.y += smoothstep(1.8,2.8,position.y) * sin(tuskerTime * 0.8) * 0.012;
        `);
      };
    });
    let rig;
    try {
      const response = await fetch('/assets/models/kerala-tusker-rig.json?rev=20261112-4');
      if (!response.ok) throw new Error('Rig unavailable');
      rig = restoreTuskerRig(await response.json());
    } catch { rig = buildTuskerRig(template); }
    sockets = rig.sockets;
    saddleGeometry = rig.saddle;
    return true;
  } catch (error) {
    console.warn('Detailed elephant unavailable; using the procedural fallback.', error.message);
    return false;
  }
}
export function createTusker() { return template?.clone(true) || null; }
export function tuskerSkin() { return skinMaterial; }
export function tuskerSockets() { return sockets; }
export function tuskerSaddle() { return saddleGeometry; }
