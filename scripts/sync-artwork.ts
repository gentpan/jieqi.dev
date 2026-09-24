import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

type Asset = { style: string; eventId: string; title: string; status: string; source: string; publishedAsset: string | null; version?: number; sha256?: string; bytes?: number; sourceSha256?: string };
type Variant = { id: string; title: string; image: string };
const series = ['watercolor', 'papercut', 'clay', 'minimal', 'character', 'anime', 'sweet', 'woodblock', 'embroidery'];

/** Publish only individually reviewed originals; keep the runtime map independent of provenance. */
export async function syncArtwork(root: string, eventIds: string[], variants: Variant[]) {
  const site = join(root, 'site');
  const progressPaths = [
    join(root, 'docs/artwork-series-progress.json'),
    join(root, 'docs/artwork-expansion-progress.json'),
  ];
  const manifests = progressPaths.map(path => ({ path, data: JSON.parse(readFileSync(path, 'utf8')) as { assets: Asset[]; [key: string]: unknown } }));
  const assets = manifests.flatMap(manifest => manifest.data.assets);
  const sharp = createRequire(join(site, 'package.json'))('sharp');
  const expected = [...new Set(eventIds)].sort();
  if (expected.length !== 40) throw new Error('Expected 40 distinct calendar events');
  const hashes = new Set<string>();
  for (const style of series) {
    const styleAssets = assets.filter(a => a.style === style);
    if (styleAssets.length !== 40 || JSON.stringify(styleAssets.map(a => a.eventId).sort()) !== JSON.stringify(expected)) throw new Error(`${style}: incomplete event coverage`);
    for (const asset of styleAssets) {
      const original = resolve(root, asset.source);
      if (asset.status !== 'approved' || !existsSync(original)) throw new Error(`${style}/${asset.eventId}: missing approved original`);
      const hash = createHash('sha256').update(readFileSync(original)).digest('hex');
      if (hashes.has(hash)) throw new Error(`${style}/${asset.eventId}: duplicate original`);
      hashes.add(hash);
      const meta = await sharp(original).metadata();
      if (meta.width !== 1024 || meta.height !== 1536) throw new Error(`${style}/${asset.eventId}: expected 1024x1536`);
    }
  }
  const artwork: Record<string, Record<string, string>> = {};
  mkdirSync(join(site, 'public/assets'), { recursive: true });
  mkdirSync(join(root, 'public/assets'), { recursive: true });
  for (const asset of assets) {
    const image = asset.eventId === 'term-bailu' ? `/assets/${asset.style}/bailu-${asset.style}.webp` : `/assets/${asset.style}/${asset.eventId}-${asset.style}-v${asset.version ?? 1}.webp`;
    const output = join(site, 'public', image);
    const original = resolve(root, asset.source);
    mkdirSync(dirname(output), { recursive: true });
    await sharp(original).webp({ quality: 90 }).toFile(output);
    const publicOutput=join(root, 'public', image);
    mkdirSync(dirname(publicOutput), { recursive: true });
    copyFileSync(output, publicOutput);
    (artwork[asset.eventId] ??= {})[asset.style] = image;
    asset.publishedAsset = image;
    asset.sourceSha256 = createHash('sha256').update(readFileSync(original)).digest('hex');
    const bytes = readFileSync(output);
    asset.sha256 = createHash('sha256').update(bytes).digest('hex');
    asset.bytes = bytes.length;
  }
  const byId = new Map(variants.map(v => [v.id, v]));
  for (const style of series) byId.set(`bailu-${style}`, { id: `bailu-${style}`, title: '白露', image: artwork['term-bailu'][style] });
  for (const variant of byId.values()) {
    if (!existsSync(join(site, 'public', variant.image))) throw new Error(`Missing style preview ${variant.id}`);
  }
  const source = '// Generated from artwork progress manifests by sync-site or sync-styles. Do not edit.\n' +
    `export const seriesEventIds = ${JSON.stringify(expected, null, 2)} as const;\n` +
    `export const seriesArtwork: Record<string, Record<string, string>> = ${JSON.stringify(artwork, null, 2)};\n`;
  writeFileSync(join(root, 'src/artwork.ts'), source);
  for (const manifest of manifests) writeFileSync(manifest.path, JSON.stringify(manifest.data, null, 2) + '\n');
  return [...byId.values()];
}
