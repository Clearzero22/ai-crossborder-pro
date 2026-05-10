import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, cwd, ignoreError = false) {
  console.log(`\n> ${cmd}  (cwd: ${cwd})`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
  } catch (err) {
    if (!ignoreError) throw err;
    console.warn(`  WARNING: Command exited with error but continuing...`);
  }
}

// Paths (monorepo workspace)
const rootDir = path.join(__dirname, '..', '..');
const electronDir = path.join(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

const frontendDistDir = path.join(electronDir, 'frontend-dist');
const backendDistDir = path.join(electronDir, 'backend-dist');

console.log('=== Building AI CrossBorder Pro Electron App ===\n');

// 1. Build frontend
console.log('[1/4] Building frontend...');
run('npm run build', frontendDir);

// 2. Build backend
console.log('[2/4] Building backend...');
run('npm run build', backendDir, true);

// 3. Copy artifacts
console.log('[3/4] Copying artifacts...');
fs.rmSync(frontendDistDir, { recursive: true, force: true });
fs.rmSync(backendDistDir, { recursive: true, force: true });

copyDir(path.join(frontendDir, 'dist'), frontendDistDir);
copyDir(path.join(backendDir, 'dist'), backendDistDir);

console.log(`  Frontend copied: ${frontendDistDir}`);
console.log(`  Backend copied: ${backendDistDir}`);
console.log(`  Backend files: ${fs.readdirSync(backendDistDir).join(', ')}`);

// 4. Copy backend node_modules (all deps including transitive)
console.log('[4/4] Copying backend node_modules...');
const backendNodeModules = path.join(backendDir, 'node_modules');
const targetNodeModules = path.join(backendDistDir, 'node_modules');
const extraNodeModules = path.join(electronDir, 'backend_dist_node_modules');

fs.rmSync(targetNodeModules, { recursive: true, force: true });
fs.rmSync(extraNodeModules, { recursive: true, force: true });

copyDir(backendNodeModules, targetNodeModules);
copyDir(backendNodeModules, extraNodeModules);

console.log('\n=== Build complete ===');
console.log(`  Frontend: ${frontendDistDir}`);
console.log(`  Backend: ${backendDistDir}`);
console.log(`  Backend deps: ${targetNodeModules}`);
console.log(`  Extra deps: ${extraNodeModules}`);

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
    } else if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(srcPath);
      try {
        fs.symlinkSync(linkTarget, dstPath);
      } catch {
        // Fall back to copying the symlink target
        if (fs.existsSync(path.resolve(path.dirname(srcPath), linkTarget))) {
          fs.copyFileSync(path.resolve(path.dirname(srcPath), linkTarget), dstPath);
        }
      }
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}
