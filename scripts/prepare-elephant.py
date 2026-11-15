"""Bake the CC0 Innerscene mesh into four shared, mobile-friendly material batches.
The trunk/tail are supplied by the game's deforming geometry. Source retained locally.
"""
import io, json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'scripts/source/elephant.glb'
b = source.read_bytes()
size = struct.unpack_from('<I', b, 12)[0]
j = json.loads(b[20:20 + size])
data = b[28 + size:]
types = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

def read(index):
    a = j['accessors'][index]; view = j['bufferViews'][a['bufferView']]
    dtype = types[a['componentType']]; n = components[a['type']]
    offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = view.get('byteStride', np.dtype(dtype).itemsize * n)
    return np.ndarray((a['count'], n), dtype=dtype, buffer=data, offset=offset,
                      strides=(stride, np.dtype(dtype).itemsize)).copy()

batches = {}
for node in j['nodes']:
    if 'mesh' not in node or 'tail' in node.get('name', '').lower(): continue
    for primitive in j['meshes'][node['mesh']]['primitives']:
        a = primitive['attributes']
        positions = read(a['POSITION']) * node.get('scale', [1, 1, 1]) + node.get('translation', [0, 0, 0])
        normals = read(a['NORMAL'])
        uv = read(a['TEXCOORD_0'])
        indices = read(primitive['indices']).reshape(-1, 3)
        if 'anatomical' in node.get('name', '').lower():
            # Remove the static lower trunk; leave the muzzle to meet the live trunk.
            # Remove the entire static lower trunk and tail. The old, narrow
            # cut left a second dangling nose/tail alongside the live limbs.
            lower_trunk = (positions[:, 0] > 2.42) & (positions[:, 1] < 2.65) & (abs(positions[:, 2]) < .48)
            lower_tail = (positions[:, 0] < -2.25) & (positions[:, 1] < 2.9) & (abs(positions[:, 2]) < .34)
            cut = lower_trunk | lower_tail
            indices = indices[~cut[indices].any(axis=1)]
            ear = (positions[:, 0] > 1.25) & (positions[:, 1] > 2) & (abs(positions[:, 2]) > .9)
            positions[ear, 2] *= .78
        positions *= [-1.1, 1.12, -.87]
        normals *= [-1, 1, -1]
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-8)
        used, remap = np.unique(indices, return_inverse=True)
        mat = primitive['material']
        # Merge the two identical iris materials.
        if mat == 1: mat = 0
        batch = batches.setdefault(mat, [[], [], [], [], 0])
        batch[0].append(positions[used]); batch[1].append(normals[used]); batch[2].append(uv[used])
        batch[3].append(remap.reshape(-1, 3) + batch[4]); batch[4] += len(used)

out = {'asset': {'version': '2.0', 'generator': 'Gedi asset preparation; CC0 Innerscene source'},
       'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'accessors': [], 'bufferViews': [],
       'materials': j['materials'], 'textures': j['textures'], 'images': [], 'samplers': j.get('samplers', [])}
blob = bytearray()

def append(raw, target=None):
    blob.extend(b'\0' * ((-len(blob)) % 4))
    view = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(raw)}
    if target: view['target'] = target
    out['bufferViews'].append(view); blob.extend(raw)
    return len(out['bufferViews']) - 1

def accessor(array, kind, component=5126, target=34962):
    array = np.asarray(array, dtype=types[component])
    view = append(array.tobytes(), target)
    a = {'bufferView': view, 'componentType': component, 'count': len(array), 'type': kind}
    if kind == 'VEC3': a.update(min=array.min(axis=0).tolist(), max=array.max(axis=0).tolist())
    out['accessors'].append(a); return len(out['accessors']) - 1

triangles = 0
for mat, batch in batches.items():
    positions, normals, uv, indices = [np.concatenate(a) for a in batch[:4]]
    # Preserve the continuous skin exactly; clustering this surface can open
    # tiny holes at UV seams. Only the small eye/toenail batches are simplified.
    if '--low' in sys.argv and mat != 2:
        keys = np.column_stack((np.floor(positions / .04), np.floor(uv * 8))).astype(np.int32)
        _, inverse = np.unique(keys, axis=0, return_inverse=True)
        count = np.bincount(inverse)
        def average(values):
            return np.column_stack([np.bincount(inverse, weights=values[:, i]) / count for i in range(values.shape[1])])
        positions, normals, uv = average(positions), average(normals), average(uv)
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-8)
        indices = inverse[indices]
        indices = indices[(indices[:, 0] != indices[:, 1]) & (indices[:, 1] != indices[:, 2]) & (indices[:, 0] != indices[:, 2])]
    triangles += len(indices)
    primitive = {'attributes': {'POSITION': accessor(positions, 'VEC3'), 'NORMAL': accessor(normals, 'VEC3'),
                                'TEXCOORD_0': accessor(uv, 'VEC2')},
                 'indices': accessor(indices.reshape(-1, 1), 'SCALAR', 5125, 34963), 'material': mat}
    index = len(out['meshes'])
    out['meshes'].append({'name': f'Kerala tusker material {mat}', 'primitives': [primitive]})
    out['nodes'].append({'mesh': index}); out['scenes'][0]['nodes'].append(index)

for img in j['images']:
    view = j['bufferViews'][img['bufferView']]
    image = Image.open(io.BytesIO(data[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']])).convert('RGB')
    image.thumbnail((512, 512) if '--low' in sys.argv else (1024, 1024))
    image_bytes = io.BytesIO(); image.save(image_bytes, format='JPEG', quality=88)
    out['images'].append({'bufferView': append(image_bytes.getvalue()), 'mimeType': 'image/jpeg', 'name': img.get('name', '')})
out['buffers'] = [{'byteLength': len(blob)}]
header = json.dumps(out, separators=(',', ':')).encode(); header += b' ' * ((-len(header)) % 4)
blob += b'\0' * ((-len(blob)) % 4)
result = struct.pack('<III', 0x46546c67, 2, 28 + len(header) + len(blob))
result += struct.pack('<I4s', len(header), b'JSON') + header + struct.pack('<I4s', len(blob), b'BIN\0') + blob
path = root / ('public/assets/models/kerala-tusker-low.glb' if '--low' in sys.argv else 'public/assets/models/kerala-tusker.glb'); path.write_bytes(result)
print(f'{triangles} triangles, {len(batches)} shared material batches, {len(result)} bytes')
