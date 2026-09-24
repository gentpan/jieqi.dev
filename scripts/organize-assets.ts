import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { groupedAssetPath } from '../src/asset-paths.ts';

function hash(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

for (const input of process.argv.slice(2)) {
  const root = resolve(input);
  if (!existsSync(root)) throw new Error(`Missing asset directory: ${root}`);
  const flatFiles = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isFile());
  const moves = flatFiles.map(entry => {
    const oldPath = join(root, entry.name);
    const grouped = groupedAssetPath(`/assets/${entry.name}`);
    if (grouped === `/assets/${entry.name}`) throw new Error(`Unclassified image: ${oldPath}`);
    const folder = grouped.split('/')[2];
    return { oldPath, newPath: join(root, folder, basename(grouped)) };
  });
  let moved = 0;
  let removedDuplicate = 0;
  for (const { oldPath, newPath } of moves) {
    mkdirSync(dirname(newPath), { recursive: true });
    if (existsSync(newPath)) {
      if (hash(oldPath) !== hash(newPath)) throw new Error(`Asset conflict: ${oldPath} -> ${newPath}`);
      unlinkSync(oldPath);
      removedDuplicate++;
    } else {
      renameSync(oldPath, newPath);
      moved++;
    }
  }
  console.log(`${root}: moved ${moved}, removed ${removedDuplicate} identical flat copies`);
}
