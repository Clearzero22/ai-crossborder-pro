import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, cwd, ignoreError = false) {
  console.log(`\n> ${cmd}  (cwd: ${cwd})`);
  try {
    const shell = process.platform === 'win32' ? 'powershell.exe' : true;
    execSync(cmd, { cwd, stdio: 'inherit', shell });
  } catch (err) {
    if (!ignoreError) throw err;
    console.warn('  WARNING: Command exited with error but continuing...');
  }
}

// Paths (monorepo workspace)
const electronDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(electronDir, '..', '..');
const frontendDir = path.join(rootDir, 'packages', 'frontend');
const backendDir = path.join(rootDir, 'packages', 'backend');

const frontendDistDir = path.join(electronDir, 'frontend-dist');
const backendDistDir = path.join(electronDir, 'backend-dist');
const extraNodeModules = path.join(electronDir, 'backend_dist_node_modules');

console.log('=== Building AI CrossBorder Pro Electron App ===\n');
console.log(`  Root:      ${rootDir}`);
console.log(`  Electron:  ${electronDir}`);
console.log(`  Frontend:  ${frontendDir}`);
console.log(`  Backend:   ${backendDir}`);

// 1. Build frontend
console.log('\n[1/4] Building frontend...');
run('npm run build', frontendDir);

// 2. Build backend
console.log('\n[2/4] Building backend...');
run('npm run build', backendDir, true);

// 3. Copy artifacts
console.log('\n[3/4] Copying artifacts...');
fs.rmSync(frontendDistDir, { recursive: true, force: true });
fs.rmSync(backendDistDir, { recursive: true, force: true });

copyDir(path.join(frontendDir, 'dist'), frontendDistDir);
copyDir(path.join(backendDir, 'dist'), backendDistDir);

console.log(`  Frontend copied: ${frontendDistDir}`);
console.log(`  Backend copied: ${backendDistDir}`);
console.log(`  Backend files: ${fs.readdirSync(backendDistDir).join(', ')}`);

// 4. Install production dependencies for backend
//    npm workspaces hoists shared deps to root node_modules.
//    A clean `npm install --production` resolves all deps (including transitive)
//    without bringing in workspace clutter or devDependencies.
console.log('\n[4/4] Installing backend production dependencies...');
const targetNodeModules = path.join(backendDistDir, 'node_modules');

fs.rmSync(targetNodeModules, { recursive: true, force: true });
fs.rmSync(extraNodeModules, { recursive: true, force: true });

const tmpInstallDir = path.join(electronDir, '.backend-deps-tmp');
fs.rmSync(tmpInstallDir, { recursive: true, force: true });
fs.mkdirSync(tmpInstallDir, { recursive: true });

// Copy only package.json and package-lock.json from backend
const backendPkgJson = path.join(backendDir, 'package.json');
const backendLockfile = path.join(rootDir, 'package-lock.json');
fs.copyFileSync(backendPkgJson, path.join(tmpInstallDir, 'package.json'));

// Install production deps using the monorepo lockfile as reference
const shell = process.platform === 'win32' ? 'powershell.exe' : true;
execSync(
  'npm install --production --ignore-scripts',
  { cwd: tmpInstallDir, stdio: 'inherit', shell, env: { ...process.env } },
);

// Copy installed node_modules to both locations
copyDir(path.join(tmpInstallDir, 'node_modules'), targetNodeModules);
copyDir(path.join(tmpInstallDir, 'node_modules'), extraNodeModules);

// Cleanup temp dir
fs.rmSync(tmpInstallDir, { recursive: true, force: true });

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
        if (fs.existsSync(path.resolve(path.dirname(srcPath), linkTarget))) {
          fs.copyFileSync(path.resolve(path.dirname(srcPath), linkTarget), dstPath);
        }
      }
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}
