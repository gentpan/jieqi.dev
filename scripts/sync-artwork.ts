import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

type Asset = { style: string; eventId: string; title: string; status: string; source: string; publishedAsset: string | null; sha256?: string; bytes?: number; sourceSha256?: string };
type Variant = { id: string; title: string; image: string };
const series = ['minimal', 'character', 'anime', 'sweet'];

/** Publish only individually reviewed originals; keep the runtime map independent of provenance. */
export async function syncArtwork(root: string, eventIds: string[], variants: Variant[]) {
  const site = join(root, 'site');
  const progressPath = join(root, 'docs/artwork-series-progress.json');
  const progress = JSON.parse(readFileSync(progressPath, 'utf8')) as { assets: Asset[]; [key: string]: unknown };
  const sharp = createRequire(join(site, 'package.json'))('sharp');
  const expected = [...new Set(eventIds)].sort();
  if (expected.length !== 40) throw new Error('Expected 40 distinct calendar events');
  const hashes = new Set<string>();
  for (const style of series) {
    const assets = progress.assets.filter(a => a.style === style);
    if (assets.length !== 40 || JSON.stringify(assets.map(a => a.eventId).sort()) !== JSON.stringify(expected)) throw new Error(`${style}: incomplete event coverage`);
    for (const asset of assets) {
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
  for (const asset of progress.assets) {
    const image = asset.eventId === 'term-bailu' ? `/assets/bailu-${asset.style}.webp` : `/assets/${asset.eventId}-${asset.style}-v1.webp`;
    const output = join(site, 'public', image);
    const original = resolve(root, asset.source);
    await sharp(original).webp({ quality: 90 }).toFile(output);
    copyFileSync(output, join(root, 'public', image));
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
  const source = '// Generated from docs/artwork-series-progress.json by sync-site. Do not edit.\n' +
    `export const seriesEventIds = ${JSON.stringify(expected, null, 2)} as const;\n` +
    `export const seriesArtwork: Record<string, Record<string, string>> = ${JSON.stringify(artwork, null, 2)};\n`;
  writeFileSync(join(root, 'src/artwork.ts'), source);
  writeFileSync(progressPath, JSON.stringify(progress, null, 2) + '\n');
  return [...byId.values()];
}
