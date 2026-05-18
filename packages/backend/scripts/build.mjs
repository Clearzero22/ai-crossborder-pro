import * as esbuild from 'esbuild';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

const EXTERNALS = [
  'playwright',
  'playwright-core',
  'better-sqlite3',
  'pg',
  'chrome-launcher',
  'chrome-remote-interface',
  'puppeteer-core',
  'electron',
];

await esbuild.build({
  entryPoints: [path.join(backendDir, 'src', 'api-server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(backendDir, 'dist', 'api-server.js'),
  minify: true,
  keepNames: false,
  external: EXTERNALS,
  logLevel: 'info',
});
