import { readdir, rm } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

async function removeSourceMaps(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeSourceMaps(path);
    } else if (extname(entry.name) === '.map') {
      await rm(path);
    }
  }
}

await removeSourceMaps(resolve('dist/frontend/browser'));
