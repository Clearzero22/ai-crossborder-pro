import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.join(__dirname, '..', 'packages', 'electron', 'release4');

if (!fs.existsSync(releaseDir)) {
  console.log('[pre-build] release4/ does not exist, nothing to clean.');
  process.exit(0);
}

try {
  fs.rmSync(releaseDir, { recursive: true, force: true });
  console.log('[pre-build] release4/ cleaned successfully.');
} catch (err) {
  console.warn(`[pre-build] Could not clean release4/: ${err.message}`);
  console.warn('[pre-build] Build will proceed — electron-builder will overwrite in place.');
}

process.exit(0);
