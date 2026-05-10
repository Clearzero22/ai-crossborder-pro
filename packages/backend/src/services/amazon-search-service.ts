/**
 * Amazon Search Service — 通过 Playwright 在 Amazon 搜索竞品
 *
 * 输入关键词，返回竞品 ASIN 列表。
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import * as os from 'os';
import * as path from 'path';

interface SearchResult {
  keyword: string;
  asins: string[];
  links: string[];
  total: number;
}

export class AmazonSearchService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async search(keyword: string, maxResults = 20, headless = true): Promise<SearchResult> {
    const userDataDir = path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'amazon-search-profile');

    // 模拟真实 Chrome 的 UA（去掉 HeadlessChrome 前缀）
    const fakeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

    this.browser = await chromium.launchPersistentContext(userDataDir, {
      headless,
      channel: 'chrome',
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      userAgent: fakeUA,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    this.context = this.browser;

    // 隐藏自动化特征
    await this.context.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete window.__playwright;
      delete window.__pw_manual;
      delete window.__pw_inspect;
      window.chrome = { runtime: {} };
    `);

    const page = this.context.pages()[0] || await this.context.newPage();

    await page.goto('https://www.amazon.com/', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    // 如果 Amazon 显示 "Continue shopping" 验证页面，自动点击
    const continueBtn = page.locator('button:has-text("Continue shopping")').first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[Amazon] Detected "Continue shopping" verification, clicking...');
      await continueBtn.click();
      await page.waitForTimeout(3000);
    }

    console.log(`[Amazon] Page title: ${await page.title()}`);
    console.log(`[Amazon] Page URL: ${page.url()}`);

    const bodyText = await page.locator('body').innerText().then(t => t.substring(0, 300)).catch(() => '');
    if (bodyText.toLowerCase().includes('captcha') || bodyText.toLowerCase().includes('robot') || bodyText.toLowerCase().includes('verify')) {
      const screenshotPath = path.join(os.tmpdir(), 'amazon-blocked.png');
      await page.screenshot({ path: screenshotPath });
      throw new Error(`Amazon 检测到自动化访问，已拦截。截图: ${screenshotPath}`);
    }

    const searchBox = page.locator('#twotabsearchtextbox').first();
    await searchBox.waitFor({ state: 'visible', timeout: 15000 });
    await searchBox.fill(keyword);
    await page.waitForTimeout(500);
    await searchBox.press('Enter');
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForTimeout(2000);

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
    this.browser = null;
    this.context = null;
  }
}
