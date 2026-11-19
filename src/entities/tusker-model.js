import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildTuskerRig, restoreTuskerRig } from './tusker-rig.js';
import { elephantSkin } from '../world/materials.js';

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
      const isCoat = mesh.material.name.includes('coat');
      if (isCoat) {
        skinMaterial = mesh.material;
        mesh.material.color.set('#3c3834');
        mesh.material.roughness = .82;
        mesh.material.envMapIntensity = .38;
        mesh.material.bumpMap = elephantSkin();
        mesh.material.bumpScale = .055;
      }
      mesh.material.onBeforeCompile = shader => {
        shader.uniforms.tuskerTime = { value: 0 };
        shader.uniforms.tuskerMood = { value: 1 };
        mesh.material.userData.shader = shader;
        shader.vertexShader = 'uniform float tuskerTime; uniform float tuskerMood;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
          #include <begin_vertex>
          float ear = smoothstep(0.85,1.4,abs(position.z)) * smoothstep(1.9,2.8,position.y) * (1.0-smoothstep(-1.8,-0.7,position.x));
          float temple = smoothstep(3.0,3.45,position.y) * (1.0-smoothstep(-2.55,-1.75,position.x));
          transformed.y += temple * (0.12 + 0.13 * exp(-pow((abs(position.z)-0.34)*4.2,2.0)));
          transformed.z *= 1.0 - 0.085 * ear;
          transformed.z += ear * sin(tuskerTime * tuskerMood + position.z * 2.0) * 0.1;
          transformed.y += smoothstep(1.8,2.8,position.y) * sin(tuskerTime * 0.8) * 0.012;
        `);
        if (isCoat) {
          shader.uniforms.coatPhoto = { value: elephantSkin() };
          shader.vertexShader = 'varying vec3 coatPosition;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'coatPosition = position;\n#include <begin_vertex>');
          shader.fragmentShader = 'uniform sampler2D coatPhoto; varying vec3 coatPosition;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
            #include <color_fragment>
            float photoGrain = texture2D(coatPhoto, coatPosition.xy * 0.78).r;
            diffuseColor.rgb *= 0.91 + photoGrain * 0.34;
          `);
        }
      };
      mesh.material.customProgramCacheKey = () => isCoat ? 'gedi-elephant-coat' : 'gedi-elephant-detail';
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
