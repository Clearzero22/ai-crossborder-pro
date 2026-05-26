import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse electron-builder.yml to get the actual release directory
const electronBuilderYml = fs.readFileSync(
  path.join(__dirname, '..', 'packages', 'electron', 'electron-builder.yml'),
  'utf-8'
);

// Simple regex to extract output directory from YAML
const outputMatch = electronBuilderYml.match(/output:\s*(\S+)/);
const releaseDirName = outputMatch ? outputMatch[1] : 'release';
const releaseDir = path.join(__dirname, '..', 'packages', 'electron', releaseDirName);

if (!fs.existsSync(releaseDir)) {
  console.log(`[pre-build] ${releaseDirName}/ does not exist, nothing to clean.`);
  process.exit(0);
}

function sleepMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

for (let i = 0; i < 10; i++) {
  try {
    fs.rmSync(releaseDir, { recursive: true, force: true });
    console.log(`[pre-build] ${releaseDirName}/ cleaned successfully.`);
    process.exit(0);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      if (i < 9) {
        console.warn(`[pre-build] ${releaseDirName}/ locked (${i + 1}/10), waiting 3s...`);
        execSync('powershell -NoProfile -Command "Start-Sleep -Seconds 3"', { stdio: 'ignore' });
      } else {
        console.warn(`[pre-build] Could not clean ${releaseDirName}/ after 10 retries: ${err.message}`);
        console.warn('[pre-build] Build will proceed — electron-builder will overwrite in place.');
      }
    } else {
      console.warn(`[pre-build] Could not clean ${releaseDirName}/: ${err.message}`);
      console.warn('[pre-build] Build will proceed — electron-builder will overwrite in place.');
    }
  }
}

process.exit(0);
