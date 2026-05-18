/**
 * Amazon Search Service — 通过 CDP 在 Amazon 搜索竞品
 *
 * 输入关键词，返回竞品 ASIN 列表。
 */

import CDP from 'chrome-remote-interface';
import { launch } from 'chrome-launcher';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { getUserDataDir } from '../utils';

interface SearchResult {
  keyword: string;
  asins: string[];
  links: string[];
  total: number;
}

interface ChromeLauncherOptions {
  chromeFlags?: string[];
  userDataDir?: string;
  headless?: boolean;
}

export class AmazonSearchService {
  private client: CDP.Client | null = null;
  private launcher: any = null;
  private chromePath: string = '';
  private chromePort: number = 0;

  constructor() {
    this.chromePath = this.findChromePath();
  }

  private findChromePath(): string {
    const platform = os.platform();
    const paths: Record<string, string[]> = {
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
      ],
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ],
      linux: [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
      ],
    };

    for (const p of paths[platform] || []) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return '';
  }

  private async launchChrome(options: ChromeLauncherOptions = {}): Promise<{ client: CDP.Client; launcher: any }> {
    const userDataDir = options.userDataDir || await getUserDataDir();

    const flags = [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-popup-blocking',
      '--disable-translate',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,900',
      '--lang=en-US',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=IsolateOrigins,site-per-process',
      ...(options.chromeFlags || []),
      ...(options.headless !== false ? ['--headless=new'] : []),
    ];

    console.log(`[CDP] Chrome path: ${this.chromePath}`);
    console.log(`[CDP] User data dir: ${userDataDir}`);

    const launcher = await launch({
      chromePath: this.chromePath || undefined,
      chromeFlags: [
        ...flags,
        `--user-data-dir=${userDataDir}`,
      ],
      port: 0,
      logLevel: 'error',
    });

    this.chromePort = launcher.port;
    console.log(`[CDP] Chrome launched on port: ${this.chromePort}`);

    await this.sleep(1000);

    const client = await CDP({ port: this.chromePort });
    console.log(`[CDP] CDP client connected`);

    await client.send('Target.setDiscoverTargets', { discover: true });
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    return { client, launcher };
  }

  private async createPage(client: CDP.Client): Promise<CDP.Page> {
    const { targetId } = await client.send('Target.createTarget', {
      url: 'about:blank',
    });

    const page = await CDP({ target: targetId, port: this.chromePort });

    await page.send('Network.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
        window.chrome = {
          runtime: {}
        };
        Object.defineProperty(navigator, 'permissions', {
          get: () => ({
            query: () => Promise.resolve({ state: 'granted' })
          })
        });
      `,
    });

    await Promise.all([
      page.send('Page.enable'),
      page.send('Runtime.enable'),
      page.send('DOM.enable'),
      page.send('Network.enable'),
    ]);

    return page;
  }

  async search(keyword: string, maxResults = 20, options: { headless?: boolean } = {}): Promise<SearchResult> {
    try {
      console.log(`[CDP] Launching Chrome (headless: ${options.headless !== false ? 'true' : 'false'})...`);
      const { client, launcher } = await this.launchChrome({
        headless: options.headless !== false,
      });

      this.client = client;
      this.launcher = launcher;

      console.log(`[CDP] Creating page...`);
      const page = await this.createPage(client);

      console.log(`[CDP] Navigating to Amazon...`);
      await this.waitForPageLoad(page, 'https://www.amazon.com/');
      console.log(`[CDP] Page loaded, waiting for content...`);
      await this.sleep(5000);

      const currentUrl = await this.getCurrentUrl(page);
      console.log(`[CDP] Current URL: ${currentUrl}`);

      if (currentUrl.includes('apb') || currentUrl.includes('error') || currentUrl.includes('js')) {
        throw new Error('Amazon anti-bot page detected. Please try again later or use a different approach.');
      }

      console.log(`[CDP] Searching for: ${keyword}`);
      const searchBoxSelector = '#twotabsearchtextbox, #nav-bb-search, input[type="text"][placeholder*="Search"]';

      const { root } = await page.send('DOM.getDocument');
      const { nodeIds } = await page.send('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: searchBoxSelector,
      });

      if (!nodeIds || nodeIds.length === 0) {
        throw new Error('Search box not found');
      }

      const searchBoxNodeId = nodeIds[0];

      await page.send('DOM.focus', { nodeId: searchBoxNodeId });

      await page.send('DOM.setAttributeValue', {
        nodeId: searchBoxNodeId,
        name: 'value',
        value: keyword,
      });

      await this.sleep(500);

      await page.send('Runtime.evaluate', {
        expression: `
          const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
          document.querySelector('${searchBoxSelector}').dispatchEvent(event);
        `,
      });

      await this.sleep(5000);

      console.log(`[CDP] Extracting ASINs...`);
      const results = await page.send('Runtime.evaluate', {
        expression: `
          (() => {
            const max = ${maxResults};
            const asins = [];
            const links = [];
            const seen = new Set();

            const elements = document.querySelectorAll('[data-component-type="s-search-result"]');
            for (const el of elements) {
              if (asins.length >= max) break;

              const asin = el.getAttribute('data-asin');
              if (!asin || asin.length !== 10 || seen.has(asin)) continue;
              seen.add(asin);
              asins.push(asin);
              links.push('https://www.amazon.com/dp/' + asin);
            }

            if (asins.length === 0) {
              const anchors = document.querySelectorAll('a[href*="/dp/"]');
              for (const a of anchors) {
                if (asins.length >= max) break;
                const href = a.href;
                const match = href.match(/\\/dp\\/([A-Z0-9]{10})/);
                if (match && !seen.has(match[1])) {
                  seen.add(match[1]);
                  asins.push(match[1]);
                  links.push('https://www.amazon.com/dp/' + match[1]);
                }
              }
            }

            return JSON.stringify({ asins, links });
          })()
        `,
        awaitPromise: true,
      });

      const { result } = results;
      const { asins, links } = JSON.parse(result.value as string);

      return {
        keyword,
        asins,
        links,
        total: asins.length,
      };

    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    } finally {
      await this.close();
    }
  }

  private async waitForPageLoad(page: CDP.Page, url: string, timeout = 60000): Promise<void> {
    await page.send('Page.navigate', { url });

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        page.off('Page.loadEventFired', loadHandler);
        page.off('Page.frameNavigated', navigatedHandler);
        reject(new Error(`Page load timeout after ${timeout}ms`));
      }, timeout);

      const loadHandler = () => {
        clearTimeout(timeoutId);
        page.off('Page.loadEventFired', loadHandler);
        page.off('Page.frameNavigated', navigatedHandler);
        resolve();
      };

      const navigatedHandler = (params: any) => {
        if (params.frame && params.frame.url && params.frame.url.includes('amazon.com')) {
          console.log(`[CDP] Navigated to: ${params.frame.url}`);
        }
      };

      page.on('Page.loadEventFired', loadHandler);
      page.on('Page.frameNavigated', navigatedHandler);
    });
  }

  private async getCurrentUrl(page: CDP.Page): Promise<string> {
    const result = await page.send('Runtime.evaluate', {
      expression: 'window.location.href',
    });
    return result.result.value;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
      }
      if (this.launcher) {
        await this.launcher.kill();
      }
    } catch (error) {
      console.error('Error closing Chrome:', error);
    } finally {
      this.client = null;
      this.launcher = null;
    }
  }
}
