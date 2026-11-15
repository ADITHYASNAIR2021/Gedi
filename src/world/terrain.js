// World-space height and UVs keep streamed tiles continuous at shared edges.
export function terrainHeight(x, z, layer = 0) {
  const depth = (z + 116.5 + layer * 68) / 85;
  const envelope = Math.pow(Math.max(0, Math.sin(Math.max(0, Math.min(1, depth)) * Math.PI)), .8);
  const ridge = 10 + layer * 9 + Math.sin(x * .023 + layer * 4) * 7 + Math.sin(x * .063 + z * .035) * 5;
  return Math.max(0, (ridge + Math.sin(x * .17 + z * .12) * 1.2) * envelope);
}
