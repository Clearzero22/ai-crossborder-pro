import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';

export type BrowserMode = 'system-chrome' | 'playwright-chromium';

export interface BrowserSettings {
  mode: BrowserMode;
  playwrightPath: string;
}

export interface LaunchOptions {
  channel?: 'chrome';
  executablePath?: string;
  env?: Record<string, string>;
}

interface DbAccess {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

// Playwright Chromium 下载配置（与 playwright-core 1.59.1 对齐）
const CHROMIUM_REVISION = '1217';
const CHROMIUM_VERSION = '147.0.7727.15';
const CDN_BASE = 'https://cdn.playwright.dev/builds/cft';

const PLATFORM_CONFIG: Record<string, { platform: string; zipDir: string; exePath: string }> = {
  win32: {
    platform: 'win64',
    zipDir: 'chrome-win64',
    exePath: 'chrome.exe',
  },
  darwin: {
    platform: process.arch === 'arm64' ? 'mac-arm64' : 'mac',
    zipDir: 'chrome-mac-' + (process.arch === 'arm64' ? 'arm64' : 'x64'),
    exePath: path.join('Chromium.app', 'Contents', 'MacOS', 'Chromium'),
  },
  linux: {
    platform: 'linux64',
    zipDir: 'chrome-linux64',
    exePath: 'chrome',
  },
};

function getDownloadUrl(): string {
  const config = PLATFORM_CONFIG[process.platform];
  if (!config) throw new Error(`Unsupported platform: ${process.platform}`);
  return `${CDN_BASE}/${CHROMIUM_VERSION}/${config.platform}/chrome-${config.platform}.zip`;
}

class BrowserConfigSingleton {
  private cached: BrowserSettings | null = null;
  private db: DbAccess | null = null;

  setDb(db: DbAccess): void {
    this.db = db;
  }

  async getConfig(): Promise<BrowserSettings> {
    if (this.cached) return this.cached;

    let mode: BrowserMode = 'system-chrome';
    let playwrightPath = '';

    if (!this.db) {
      mode = (process.env.BROWSER_MODE as BrowserMode) || 'system-chrome';
      playwrightPath = process.env.BROWSER_PLAYWRIGHT_PATH || '';
      this.cached = { mode, playwrightPath };
      return this.cached;
    }

    try {
      const modeVal = await this.db!.getSetting('browser_mode');
      const pathVal = await this.db!.getSetting('browser_playwright_path');
      if (modeVal === 'system-chrome' || modeVal === 'playwright-chromium') {
        mode = modeVal;
      }
      if (pathVal) playwrightPath = pathVal;
    } catch (err) {
      console.warn('[BrowserConfig] Failed to load settings from DB, using defaults:', err);
    }

    this.cached = { mode, playwrightPath };
    return this.cached;
  }

  async updateConfig(patch: Partial<BrowserSettings>): Promise<BrowserSettings> {
    const current = await this.getConfig();
    const updated = { ...current, ...patch };
    this.cached = updated;

    if (this.db) {
      if (patch.mode !== undefined) await this.db.setSetting('browser_mode', patch.mode);
      if (patch.playwrightPath !== undefined) await this.db.setSetting('browser_playwright_path', patch.playwrightPath || '');
    }

    return updated;
  }

  async getLaunchOptions(): Promise<LaunchOptions> {
    const config = await this.getConfig();

    if (config.mode === 'playwright-chromium' && config.playwrightPath) {
      const exePath = this.resolvePlaywrightExecutable(config.playwrightPath);
      if (exePath && fs.existsSync(exePath)) {
        return {
          executablePath: exePath,
          env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: config.playwrightPath },
        };
      }
      console.warn(`[BrowserConfig] Playwright Chromium not found at ${config.playwrightPath}, falling back to system Chrome`);
    }

    return { channel: 'chrome' };
  }

  checkChromeExists(): { exists: boolean; path: string } {
    const paths: Record<string, string[]> = {
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ],
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ],
      linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
    };

    for (const p of paths[process.platform] || []) {
      if (fs.existsSync(p)) return { exists: true, path: p };
    }
    return { exists: false, path: '' };
  }

  checkPlaywrightStatus(targetPath: string): { installed: boolean; executablePath: string | null } {
    if (!targetPath) return { installed: false, executablePath: null };
    const exePath = this.resolvePlaywrightExecutable(targetPath);
    if (exePath && fs.existsSync(exePath)) {
      return { installed: true, executablePath: exePath };
    }
    return { installed: false, executablePath: null };
  }

  getChromiumVersion(): string {
    return CHROMIUM_VERSION;
  }

  private resolvePlaywrightExecutable(browserPath: string): string | null {
    // 优先查找 CDN 下载的目录结构: <browserPath>/chromium-<revision>/<zipDir>/<exe>
    const config = PLATFORM_CONFIG[process.platform];
    if (!config) return null;

    const cdnDir = path.join(browserPath, `chromium-${CHROMIUM_REVISION}`, config.zipDir);
    const cdnExe = path.join(cdnDir, config.exePath);
    if (fs.existsSync(cdnExe)) return cdnExe;

    // 兼容 playwright install 的目录结构: <browserPath>/chromium-<revision>/chrome-<platform>/<exe>
    const pwDir = path.join(browserPath, `chromium-${CHROMIUM_REVISION}`, config.zipDir);
    if (fs.existsSync(pwDir)) return path.join(pwDir, config.exePath);

    // 兼容旧版 playwright 目录结构
    const legacyPatterns: string[][] = [
      ['chrome-win', 'chrome.exe'],
      ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
      ['chrome-linux', 'chrome'],
    ];
    for (const parts of legacyPatterns) {
      const candidate = path.join(browserPath, `chromium-${CHROMIUM_REVISION}`, ...parts);
      if (fs.existsSync(candidate)) return candidate;
    }

    // 模糊匹配: 查找 browserPath 下任何包含 chromium 的目录
    try {
      const entries = fs.readdirSync(browserPath)
        .filter(e => e.startsWith('chromium') && fs.statSync(path.join(browserPath, e)).isDirectory());
      for (const entry of entries) {
        // 检查 CDN 下载的子目录
        const subDir = path.join(browserPath, entry, config.zipDir);
        if (fs.existsSync(subDir)) return path.join(subDir, config.exePath);
      }
    } catch { /* ignore */ }

    return null;
  }

  invalidateCache(): void {
    this.cached = null;
  }

  async downloadPlaywrightChromium(
    targetPath: string,
    onProgress: (data: { percent: number; stage: string }) => void,
  ): Promise<{ success: boolean; error?: string }> {
    const config = PLATFORM_CONFIG[process.platform];
    if (!config) {
      return { success: false, error: `Unsupported platform: ${process.platform}` };
    }

    const installDir = path.join(targetPath, `chromium-${CHROMIUM_REVISION}`);
    const zipPath = path.join(targetPath, `chromium-${CHROMIUM_REVISION}.zip`);

    try {
      fs.mkdirSync(targetPath, { recursive: true });
    } catch (err) {
      return { success: false, error: `无法创建目录: ${targetPath}` };
    }

    try {
      // Step 1: 下载 zip
      const downloadUrl = getDownloadUrl();
      onProgress({ percent: 0, stage: `开始下载 Chrome ${CHROMIUM_VERSION}...` });
      console.log(`[BrowserConfig] Downloading from: ${downloadUrl}`);

      await this.downloadFile(downloadUrl, zipPath, (percent) => {
        // 下载占总进度的 80%，解压占 20%
        onProgress({ percent: Math.round(percent * 0.8), stage: `下载中 ${percent}%` });
      });

      onProgress({ percent: 80, stage: '下载完成，正在解压...' });
      console.log('[BrowserConfig] Download complete, extracting...');

      // Step 2: 解压 zip
      await this.extractZip(zipPath, installDir, (percent) => {
        onProgress({ percent: 80 + Math.round(percent * 0.2), stage: `解压中 ${percent}%` });
      });

      // Step 3: 验证
      const exePath = path.join(installDir, config.zipDir, config.exePath);
      if (!fs.existsSync(exePath)) {
        // 尝试查找: zip 可能直接解压到 installDir
        const altExe = path.join(installDir, config.exePath);
        if (!fs.existsSync(altExe)) {
          return { success: false, error: `解压后未找到可执行文件: ${exePath}` };
        }
      }

      // Step 4: 清理 zip
      try { fs.unlinkSync(zipPath); } catch { /* ignore */ }

      onProgress({ percent: 100, stage: `安装完成 — Chrome ${CHROMIUM_VERSION}` });
      console.log(`[BrowserConfig] Chromium installed successfully at ${installDir}`);
      return { success: true };
    } catch (err) {
      // 清理失败的下载
      try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch { /* ignore */ }
      return { success: false, error: String(err) };
    }
  }

  private downloadFile(url: string, destPath: string, onProgress: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (res) => {
        // 处理重定向
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            this.downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
            return;
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const totalSize = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;

        const file = fs.createWriteStream(destPath);
        res.pipe(file);

        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (totalSize > 0) {
            onProgress(Math.round((downloaded / totalSize) * 100));
          }
        });

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', reject);
      }).on('error', reject);
    });
  }

  private extractZip(zipPath: string, destDir: string, onProgress: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      // 使用 yauzl（playwright-core 的依赖，已存在）解压 zip
      let yauzl: any;
      try {
        yauzl = require('yauzl');
      } catch {
        // yauzl 不可用，尝试用系统 unzip/tar
        this.extractZipExternal(zipPath, destDir, onProgress).then(resolve).catch(reject);
        return;
      }

      yauzl.open(zipPath, { lazyEntries: true }, (err: any, zipfile: any) => {
        if (err) {
          reject(err);
          return;
        }

        let total = 0;
        let extracted = 0;
        let pending = 0;

        zipfile.readEntry();

        zipfile.on('entry', (entry: any) => {
          total++;
          pending++;
          if (/\/$/.test(entry.fileName)) {
            // 目录
            const dirPath = path.join(destDir, entry.fileName);
            fs.mkdirSync(dirPath, { recursive: true });
            pending--;
            if (pending === 0) {
              onProgress(100);
              resolve();
            }
          } else {
            zipfile.openReadStream(entry, (readErr: any, readStream: any) => {
              if (readErr) {
                pending--;
                if (pending === 0) resolve();
                return;
              }
              const filePath = path.join(destDir, entry.fileName);
              fs.mkdirSync(path.dirname(filePath), { recursive: true });
              const writeStream = fs.createWriteStream(filePath);
              readStream.pipe(writeStream);
              writeStream.on('finish', () => {
                writeStream.close();
                extracted++;
                onProgress(Math.round((extracted / Math.max(total, 1)) * 100));
                pending--;
                if (pending === 0) {
                  onProgress(100);
                  resolve();
                }
              });
              writeStream.on('error', () => {
                pending--;
                if (pending === 0) resolve();
              });
            });
          }
          zipfile.readEntry();
        });

        zipfile.on('end', () => {
          if (total === 0) {
            onProgress(100);
            resolve();
          }
        });
      });
    });
  }

  private extractZipExternal(zipPath: string, destDir: string, onProgress: (percent: number) => void): Promise<void> {
    return new Promise((resolve) => {
      const { execSync } = require('child_process');
      const { platform } = require('os');

      fs.mkdirSync(destDir, { recursive: true });

      let cmd: string;
      if (platform() === 'win32') {
        cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`;
      } else {
        cmd = `unzip -o "${zipPath}" -d "${destDir}"`;
      }

      try {
        onProgress(50);
        execSync(cmd, { stdio: 'pipe', timeout: 300000 });
        onProgress(100);
      } catch (err) {
        console.error('[BrowserConfig] Extract failed:', err);
      }
      resolve();
    });
  }
}

export const browserConfig = new BrowserConfigSingleton();
