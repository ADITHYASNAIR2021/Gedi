import { readFileSync, writeFileSync } from 'node:fs';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FloatType } from 'three';
const buffer = readFileSync(new URL('./source/rainforest-4k.hdr', import.meta.url));
const hdr = new RGBELoader().setDataType(FloatType).parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
const rgba = new Uint8Array(hdr.width * hdr.height * 4);
for (let i = 0; i < hdr.data.length; i += 4) {
  for (let c = 0; c < 3; c++) {
    const x = hdr.data[i + c] * .5;
    const mapped = Math.max(0, Math.min(1, (x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)));
    const srgb = mapped <= .0031308 ? mapped * 12.92 : 1.055 * mapped ** (1 / 2.4) - .055;
    rgba[i + c] = Math.round(srgb * 255);
  }
  rgba[i + 3] = 255;
}
writeFileSync(new URL('./source/forest.rgba', import.meta.url), rgba);
writeFileSync(new URL('./source/forest-size.json', import.meta.url), JSON.stringify([hdr.width, hdr.height]));
