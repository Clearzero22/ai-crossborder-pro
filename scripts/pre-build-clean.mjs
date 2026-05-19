import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.join(__dirname, '..', 'packages', 'electron', 'release10');

if (!fs.existsSync(releaseDir)) {
  console.log('[pre-build] release6/ does not exist, nothing to clean.');
  process.exit(0);
}

function sleepMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

for (let i = 0; i < 10; i++) {
  try {
    fs.rmSync(releaseDir, { recursive: true, force: true });
    console.log('[pre-build] release6/ cleaned successfully.');
    process.exit(0);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      if (i < 9) {
        console.warn(`[pre-build] release6/ locked (${i + 1}/10), waiting 3s...`);
        execSync('powershell -NoProfile -Command "Start-Sleep -Seconds 3"', { stdio: 'ignore' });
      } else {
        console.warn(`[pre-build] Could not clean release6/ after 10 retries: ${err.message}`);
        console.warn('[pre-build] Build will proceed — electron-builder will overwrite in place.');
      }
    } else {
      console.warn(`[pre-build] Could not clean release6/: ${err.message}`);
      console.warn('[pre-build] Build will proceed — electron-builder will overwrite in place.');
    }
  }
}

process.exit(0);
