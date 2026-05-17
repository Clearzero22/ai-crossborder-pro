/**
 * Simple script to open Amazon URL and inspect page
 * 简单脚本打开 Amazon URL 并检查页面
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as os from 'os';

async function openAmazonUrl() {
  const url = process.argv[2] || 'https://www.amazon.com/s?k=bed&crid=MBRY8463MCYP';

  console.log('='.repeat(60));
  console.log('Opening Amazon URL');
  console.log('='.repeat(60));
  console.log(`URL: ${url}`);

  const userDataDir = path.join(os.homedir(), '.node-plawright-test', 'chrome-profile', 'automation');

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = browser.pages()[0] || await browser.newPage();

  try {
    console.log('\nNavigating to URL...');
    await page.goto(url, {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    const title = await page.title();
    console.log(`Page title: ${title}`);

    // 检查页面上的 ASIN
    const asins = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-component-type="s-search-result"]');
      const results = [];
      for (const el of elements) {
        const asin = el.getAttribute('data-asin');
        if (asin && asin.length === 10) {
          results.push(asin);
        }
      }
      return results;
    });

    console.log(`\nFound ${asins.length} ASINs:`);
    console.log(asins.slice(0, 10).join(', '));

    // 如果没有找到 ASIN，尝试从链接中提取
    if (asins.length === 0) {
      console.log('\nNo ASINs found from data-asin attribute, trying fallback...');
      const fallbackAsins = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a[href*="/dp/"]');
        const seen = new Set();
        const results = [];
        for (const a of anchors) {
          const href = a.href;
          const match = href.match(/\/dp\/([A-Z0-9]{10})/);
          if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            results.push(match[1]);
            if (results.length >= 10) break;
          }
        }
        return results;
      });

      console.log(`Fallback found ${fallbackAsins.length} ASINs:`);
      console.log(fallbackAsins.join(', '));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Browser will stay open for inspection. Press Ctrl+C to close.');
    console.log('='.repeat(60));

    // 保持浏览器打开
    await new Promise(() => {});

  } catch (error) {
    console.error('\nError:', error);
  } finally {
    await browser.close();
  }
}

openAmazonUrl().catch(console.error);
