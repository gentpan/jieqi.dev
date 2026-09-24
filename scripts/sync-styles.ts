import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { seriesEventIds } from '../src/artwork.ts';
import { syncArtwork } from './sync-artwork.ts';

const root = resolve(import.meta.dirname, '..');
const variantsPath = join(root, 'site/lib/variants.json');
const variants = JSON.parse(readFileSync(variantsPath, 'utf8')) as { id: string; title: string; image: string }[];
const updated = await syncArtwork(root, [...seriesEventIds], variants);
for (const filename of ['artwork.ts', 'styles.ts']) {
  copyFileSync(join(root, 'src', filename), join(root, 'site/lib/calendar', filename));
}
writeFileSync(variantsPath, JSON.stringify(updated, null, 2) + '\n');
console.log(`Synced ${updated.length} style previews without changing the calendar database.`);
