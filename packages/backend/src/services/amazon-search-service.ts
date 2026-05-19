/**
 * Amazon Search Service — 通过 Playwright 在 Amazon 搜索竞品
 *
 * 输入关键词，返回竞品 ASIN 列表。
 */

import { chromium, type BrowserContext } from 'playwright-core';
import { browserConfig } from '../core/browser-config';
import { getUserDataDir } from '../utils';

interface SearchResult {
  keyword: string;
  asins: string[];
  links: string[];
  total: number;
}

export class AmazonSearchService {
  private context: BrowserContext | null = null;

  async search(keyword: string, maxResults = 20, options: { headless?: boolean } = {}): Promise<SearchResult> {
    // ⚠️ 重要：统一使用共享的浏览器数据目录
    const userDataDir = await getUserDataDir();

    if (!this.context) {
      console.log(`[Playwright] Launching browser (headless: ${options.headless !== false ? 'true' : 'false'})...`);
      const launchExtras = await browserConfig.getLaunchOptions();
      this.context = await chromium.launchPersistentContext(userDataDir, {
        ...launchExtras,
        headless: options.headless !== false,
        viewport: { width: 1280, height: 900 },
        locale: 'en-US',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });
    }

    const page = this.context.pages()[0] || await this.context.newPage();

    // 添加反检测脚本
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      (window as any).chrome = {
        runtime: {},
      };
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: () => Promise.resolve({ state: 'granted' }),
        }),
      });
    });

    // 直接使用搜索结果页面 URL
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;
    console.log(`[Playwright] Navigating to search results: ${searchUrl}`);
    await page.goto(searchUrl, {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });

    // 检查是否遇到验证页面
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log(`[Playwright] Current URL: ${currentUrl}`);

    if (currentUrl.includes('apb') || currentUrl.includes('error') || currentUrl.includes('verify') || currentUrl.includes('sorry')) {
      console.log('[Playwright] Anti-bot page detected, waiting for manual action...');
      console.log('[Playwright] Please complete the verification in the browser window');
      await page.waitForTimeout(60000); // 等待60秒让用户手动验证
    }

    await page.waitForTimeout(3000);

    // 提取 ASIN
    const results = await page.evaluate((max) => {
      const asins: string[] = [];
      const links: string[] = [];
      const seen = new Set<string>();

      const elements = document.querySelectorAll('[data-component-type="s-search-result"]');
      for (const el of elements) {
        if (asins.length >= max) break;

        const asin = el.getAttribute('data-asin');
        if (!asin || asin.length !== 10 || seen.has(asin)) continue;
        seen.add(asin);
        asins.push(asin);
        links.push(`https://www.amazon.com/dp/${asin}`);
      }

      // fallback: 从链接中提取 ASIN
      if (asins.length === 0) {
        const anchors = document.querySelectorAll('a[href*="/dp/"]');
        for (const a of anchors) {
          if (asins.length >= max) break;
          const href = (a as HTMLAnchorElement).href;
          const match = href.match(/\/dp\/([A-Z0-9]{10})/);
          if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            asins.push(match[1]);
            links.push(`https://www.amazon.com/dp/${match[1]}`);
          }
        }
      }

      return { asins, links };
    }, maxResults);

    return {
      keyword,
      asins: results.asins,
      links: results.links,
      total: results.asins.length,
    };
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    this.context = null;
  }
}