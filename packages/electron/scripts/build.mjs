import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths (monorepo workspace)
const electronDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(electronDir, '..', '..');
const frontendDir = path.join(rootDir, 'packages', 'frontend');
const backendDir = path.join(rootDir, 'packages', 'backend');

const frontendDistDir = path.join(electronDir, 'frontend-dist');
const backendDistDir = path.join(electronDir, 'backend-dist');
const extraNodeModules = path.join(electronDir, 'backend_dist_node_modules');

const shell = process.platform === 'win32' ? 'powershell.exe' : true;

console.log('=== Preparing Electron build artifacts ===');
console.log(`  Root:      ${rootDir}`);
console.log(`  Electron:  ${electronDir}`);
console.log(`  Frontend:  ${frontendDir}`);
console.log(`  Backend:   ${backendDir}`);

// 1. Copy frontend dist
console.log('\n[1/4] Copying frontend dist...');
safeRmSync(frontendDistDir, 'frontend-dist');
copyDir(path.join(frontendDir, 'dist'), frontendDistDir);
console.log(`  Done: ${frontendDistDir}`);

// 2. Copy backend dist (NO .env — users configure API keys in app)
console.log('\n[2/4] Copying backend dist...');
safeRmSync(backendDistDir, 'backend-dist');
copyDir(path.join(backendDir, 'dist'), backendDistDir);
console.log(`  Done: ${backendDistDir}`);
console.log(`  Files: ${fs.readdirSync(backendDistDir).join(', ')}`);

// 3. Install backend production dependencies
console.log('\n[3/4] Installing backend production dependencies...');
safeRmSync(extraNodeModules, 'backend_dist_node_modules');

const tmpDir = path.join(electronDir, '.deps-tmp');
safeRmSync(tmpDir, '.deps-tmp');
fs.mkdirSync(tmpDir, { recursive: true });

fs.copyFileSync(
  path.join(backendDir, 'package.json'),
  path.join(tmpDir, 'package.json'),
);
fs.copyFileSync(
  path.join(rootDir, 'package-lock.json'),
  path.join(tmpDir, 'package-lock.json'),
);

// Backend runs via bundled node.exe (not Electron's Node), so native modules
// are compiled for standard Node.js ABI — no electron-rebuild needed.
execSync('npm install --omit=dev', {
  cwd: tmpDir,
  stdio: 'inherit',
  shell,
  env: {
    ...process.env,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
  },
});

// 4. Copy node.exe for backend runtime
console.log('\n[4/4] Bundling Node.js runtime for backend...');
const nodeRuntimeDir = path.join(electronDir, 'node-runtime');
safeRmSync(nodeRuntimeDir, 'node-runtime');
fs.mkdirSync(nodeRuntimeDir, { recursive: true });
const nodeExeSrc = process.execPath;
const nodeExeDst = path.join(nodeRuntimeDir, 'node.exe');
fs.copyFileSync(nodeExeSrc, nodeExeDst);
console.log(`  Copied: ${nodeExeSrc} -> ${nodeExeDst}`);

// Verify native modules
console.log('  Verifying native module prebuilds...');
const betterSqlite3Dir = path.join(tmpDir, 'node_modules', 'better-sqlite3');
if (fs.existsSync(betterSqlite3Dir)) {
  const buildDir = path.join(betterSqlite3Dir, 'build', 'Release');
  if (fs.existsSync(path.join(buildDir, 'better_sqlite3.node'))) {
    console.log('  better-sqlite3: prebuild found');
  } else {
    console.warn('  WARNING: better-sqlite3 prebuild not found');
  }
}

// Validate critical dependencies
const criticalDeps = ['better-sqlite3', 'playwright', 'playwright-core', 'hono'];
for (const dep of criticalDeps) {
  if (!fs.existsSync(path.join(tmpDir, 'node_modules', dep))) {
    throw new Error(`Critical dependency missing: ${dep}`);
  }
}
console.log(`  All critical dependencies present`);

// Only copy node_modules to extraResources location (single copy)
copyDir(path.join(tmpDir, 'node_modules'), extraNodeModules);

safeRmSync(tmpDir, '.deps-tmp (cleanup)');

// 5. Copy native module bindings explicitly (ensures .node files are present)
console.log('\n[5/5] Ensuring native module bindings...');
const nativeModules = ['better-sqlite3'];
for (const mod of nativeModules) {
  const srcModDir = path.join(rootDir, 'node_modules', mod);
  const dstModDir = path.join(extraNodeModules, mod);

  if (!fs.existsSync(srcModDir)) {
    console.warn(`  WARNING: Module not found in root: ${mod}`);
    continue;
  }

  // Ensure destination exists
  fs.mkdirSync(dstModDir, { recursive: true });

  // Copy critical directories
  ['build', 'lib', 'deps'].forEach(dir => {
    const srcDir = path.join(srcModDir, dir);
    if (fs.existsSync(srcDir)) {
      const dstDir = path.join(dstModDir, dir);
      copyDir(srcDir, dstDir);
      console.log(`  Copied ${dir} for ${mod}`);
    }
  });

  // Copy package.json
  const srcPackageJson = path.join(srcModDir, 'package.json');
  if (fs.existsSync(srcPackageJson)) {
    fs.copyFileSync(srcPackageJson, path.join(dstModDir, 'package.json'));
    console.log(`  Copied package.json for ${mod}`);
  }
}

// Verify native bindings
console.log('\n  Verifying native bindings...');
const betterSqlite3NodePath = path.join(extraNodeModules, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
if (fs.existsSync(betterSqlite3NodePath)) {
  const stats = fs.statSync(betterSqlite3NodePath);
  console.log(`  better_sqlite3.node: ${(stats.size / 1024).toFixed(1)} KB`);
} else {
  console.warn('  WARNING: better_sqlite3.node not found in extra node_modules');
}

console.log('\n=== Artifacts ready ===');

function safeRmSync(dir, label, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      if (err.code === 'EBUSY' || err.code === 'EPERM') {
        if (i < maxRetries - 1) {
          console.warn(`  ⚠️  ${label || dir} locked (${i + 1}/${maxRetries}), waiting 3s...`);
          execSync('powershell -NoProfile -Command "Start-Sleep -Seconds 3"', { stdio: 'ignore' });
        } else {
          console.warn(`  ⚠️  ${label || dir} could not be deleted after ${maxRetries} retries, continuing...`);
        }
      } else {
        throw err;
      }
    }
  }
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn(`  WARNING: Source does not exist: ${src}`);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.cache' || entry.name === '.package-lock.json') continue;
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(srcPath);
      try {
        fs.symlinkSync(linkTarget, dstPath);
      } catch {
        const resolved = path.resolve(path.dirname(srcPath), linkTarget);
        if (fs.existsSync(resolved)) {
          fs.copyFileSync(resolved, dstPath);
        }
      }
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}
