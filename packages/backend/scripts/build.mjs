import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

const EXTERNALS = [
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

// Inject module.paths so external packages (playwright-core, better-sqlite3, etc.)
// can be resolved from backend_node_modules regardless of NODE_PATH or ESM limitations.
const outfile = path.join(backendDir, 'dist', 'api-server.js');
const banner = `// Inject module resolution paths for packaged app
(function(){var p=require("path"),d=p.join(__dirname,"..","backend_node_modules");if(require("fs").existsSync(d)){module.paths.push(d)}})();
`;
let content = fs.readFileSync(outfile, 'utf-8');
content = banner + content;
fs.writeFileSync(outfile, content);
console.log('Injected module.paths for backend_node_modules');
