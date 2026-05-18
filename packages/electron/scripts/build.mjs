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
console.log('\n[1/3] Copying frontend dist...');
fs.rmSync(frontendDistDir, { recursive: true, force: true });
copyDir(path.join(frontendDir, 'dist'), frontendDistDir);
console.log(`  Done: ${frontendDistDir}`);

// 2. Copy backend dist + .env
console.log('\n[2/3] Copying backend dist...');
fs.rmSync(backendDistDir, { recursive: true, force: true });
copyDir(path.join(backendDir, 'dist'), backendDistDir);
// Copy .env so dotenv/config can load API keys in production
const envFile = path.join(backendDir, '.env');
if (fs.existsSync(envFile)) {
  fs.copyFileSync(envFile, path.join(backendDistDir, '.env'));
  console.log('  Copied .env to backend-dist');
}
console.log(`  Done: ${backendDistDir}`);
console.log(`  Files: ${fs.readdirSync(backendDistDir).join(', ')}`);

// 3. Install backend production dependencies
//    npm workspaces hoists shared deps to root node_modules.
//    A clean `npm install --omit=dev` in a temp dir resolves all deps
//    (including hoisted and transitive) with deterministic versions from lockfile.
console.log('\n[3/3] Installing backend production dependencies...');
const targetNodeModules = path.join(backendDistDir, 'node_modules');

fs.rmSync(targetNodeModules, { recursive: true, force: true });
fs.rmSync(extraNodeModules, { recursive: true, force: true });

const tmpDir = path.join(electronDir, '.deps-tmp');
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

fs.copyFileSync(
  path.join(backendDir, 'package.json'),
  path.join(tmpDir, 'package.json'),
);
fs.copyFileSync(
  path.join(rootDir, 'package-lock.json'),
  path.join(tmpDir, 'package-lock.json'),
);

execSync('npm install --omit=dev', {
  cwd: tmpDir,
  stdio: 'inherit',
  shell,
  env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
});

copyDir(path.join(tmpDir, 'node_modules'), targetNodeModules);
copyDir(path.join(tmpDir, 'node_modules'), extraNodeModules);

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('\n=== Artifacts ready ===');

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
