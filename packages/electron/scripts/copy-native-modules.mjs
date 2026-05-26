/**
 * Copy native module bindings for Electron build
 * This ensures better-sqlite3 and other native modules work in packaged app
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const electronDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(electronDir, '..', '..');
const extraNodeModules = path.join(electronDir, 'backend_dist_node_modules');

const shell = process.platform === 'win32' ? 'powershell.exe' : true;

console.log('=== Copying native module bindings ===');

// Native modules that need special handling
const nativeModules = ['better-sqlite3'];

for (const mod of nativeModules) {
  const srcModDir = path.join(rootDir, 'node_modules', mod);
  const dstModDir = path.join(extraNodeModules, mod);

  if (!fs.existsSync(srcModDir)) {
    console.warn(`  Module not found in root: ${mod}`);
    continue;
  }

  // Ensure destination exists
  fs.mkdirSync(dstModDir, { recursive: true });

  // Copy build directory (contains .node files)
  const srcBuildDir = path.join(srcModDir, 'build');
  if (fs.existsSync(srcBuildDir)) {
    const dstBuildDir = path.join(dstModDir, 'build');
    fs.mkdirSync(dstBuildDir, { recursive: true });
    copyDir(srcBuildDir, dstBuildDir);
    console.log(`  Copied build directory for ${mod}`);
  }

  // Copy lib directory (contains JS bindings)
  const srcLibDir = path.join(srcModDir, 'lib');
  if (fs.existsSync(srcLibDir)) {
    const dstLibDir = path.join(dstModDir, 'lib');
    fs.mkdirSync(dstLibDir, { recursive: true });
    copyDir(srcLibDir, dstLibDir);
    console.log(`  Copied lib directory for ${mod}`);
  }

  // Copy package.json (needed for require to work)
  const srcPackageJson = path.join(srcModDir, 'package.json');
  if (fs.existsSync(srcPackageJson)) {
    fs.copyFileSync(srcPackageJson, path.join(dstModDir, 'package.json'));
    console.log(`  Copied package.json for ${mod}`);
  }

  // Copy deps directory (sqlite3 dependencies)
  const srcDepsDir = path.join(srcModDir, 'deps');
  if (fs.existsSync(srcDepsDir)) {
    const dstDepsDir = path.join(dstModDir, 'deps');
    fs.mkdirSync(dstDepsDir, { recursive: true });
    copyDir(srcDepsDir, dstDepsDir);
    console.log(`  Copied deps directory for ${mod}`);
  }
}

console.log('=== Native modules copied ===');

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn(`  WARNING: Source does not exist: ${src}`);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}
