export const assetStyles = ['stamp', 'watercolor', 'papercut', 'clay', 'minimal', 'character', 'anime', 'sweet', 'woodblock', 'embroidery'] as const;

/** Map a historical flat asset URL to its style folder without changing its filename. */
export function groupedAssetPath(path: string): string {
  const match = /^\/assets\/([^/]+)$/.exec(path);
  if (!match) return path;
  const filename = match[1];
  for (const style of assetStyles) {
    if (style === 'stamp') continue;
    if (filename === `bailu-${style}.webp` || filename.endsWith(`-${style}-v1.webp`)) {
      return `/assets/${style}/${filename}`;
    }
  }
  if (/^(?:[a-z0-9-]+-stamp-v1|spring-festival-v1|labour-day-v1)\.(?:png|webp)$/.test(filename)) {
    return `/assets/stamp/${filename}`;
  }
  if (/^[a-f0-9]{64}\.(?:png|jpg|jpeg|webp)$/.test(filename)) {
    return `/assets/uploads/${filename}`;
  }
  return path;
}
