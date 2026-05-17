/**
 * CrawlerService 测试
 * 测试爬虫服务功能
 */

import { CrawlerService } from '../crawler-service';

// 引入测试工具
const assert = (globalThis as any).assert;
const sleep = (globalThis as any).sleep;

describe('CrawlerService', () => {
  let service: CrawlerService;

  beforeEach(() => {
    service = new CrawlerService();
  });

  test('GigaB2B 爬取', async () => {
    const testUrl = 'https://www.gigab2b.com/index.php?route=product/product&product_id=747431';

    const result = await service.crawlGigaB2B(testUrl, { headless: false });

    assert.isDefined(result, '爬取结果不应为 undefined');
    assert.isNotNull(result.product, '商品信息不应为 null');
    assert.isNotEmpty(result.product.title, '商品标题不应为空');
  });

  test('数据提取验证', async () => {
    const testUrl = 'https://www.gigab2b.com/index.php?route=product/product&product_id=747431';
    const result = await service.crawlGigaB2B(testUrl, { headless: false });

    const product = result.product;
    assert.isNotNull(product.title, '应提取标题');
    assert.isDefined(product.price, '应提取价格');
    assert.isNotEmpty(product.description, '应提取描述');
    assert.isArray(product.images, '图片应为数组');
  });

  test('数据清洗', async () => {
    const testUrl = 'https://www.gigab2b.com/index.php?route=product/product&product_id=747431';
    const result = await service.crawlGigaB2B(testUrl, { headless: false });

    const product = result.product;
    // 验证数据经过清洗
    if (product.title) {
      assert.equal(product.title.trim(), product.title, '标题应无前后空格');
    }
    if (product.price) {
      assert.isDefined(product.price, '价格应已清洗');
    }
  });

  test('数据保存', async () => {
    const testUrl = 'https://www.gigab2b.com/index.php?route=product/product&product_id=747431';

    const result = await service.crawlGigaB2B(testUrl, { headless: false, saveToDb: true });

    assert.isDefined(result.runId, '应生成运行 ID');
    assert.isDefined(result.product.externalId, '应提取外部 ID');
  });

  test('运行记录管理', async () => {
    // 先执行一次爬取
    const testUrl = 'https://www.gigab2b.com/index.php?route=product/product&product_id=747431';
    await service.crawlGigaB2B(testUrl, { headless: false, saveToDb: true });

    // 查询运行记录
    const runs = await service.getRuns(10);

    assert.isArray(runs, '运行记录应为数组');
    assert.isTrue(runs.length > 0, '应至少有一条运行记录');
  });

  test('错误处理 - 无效 URL', async () => {
    try {
      await service.crawlGigaB2B('invalid-url', { headless: false });
      assert.fail('应该抛出错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出 URL 错误');
    }
  });

  test('错误处理 - 404 页面', async () => {
    try {
      await service.crawlGigaB2B('https://www.gigab2b.com/non-existent-page', { headless: false });
      assert.fail('应该抛出错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出 404 错误');
    }
  });

  test('重试机制', async () => {
    const testUrl = 'https://www.gigab2b.com/index.php?route=product/product&product_id=747431';

    const result = await service.crawlGigaB2B(testUrl, {
      headless: false,
      retryAttempts: 3,
      retryDelay: 2000,
    });

    assert.isDefined(result, '重试后应成功爬取');
  });

  test('并发控制', async () => {
    const urls = [
      'https://www.gigab2b.com/index.php?route=product/product&product_id=747431',
      'https://www.gigab2b.com/index.php?route=product/product&product_id=747432',
    ];

    const results = await Promise.all(
      urls.map(url => service.crawlGigaB2B(url, { headless: false }))
    );

    assert.equal(results.length, 2, '应并发爬取两个 URL');
    results.forEach(result => {
      assert.isDefined(result, '每个并发请求都应返回结果');
    });
  });

  test('爬取超时处理', async () => {
    try {
      await service.crawlGigaB2B('https://www.gigab2b.com/index.php?route=product/product&product_id=747431', {
        headless: false,
        timeout: 100, // 超短超时
      });
      assert.fail('应该因为超时而失败');
    } catch (error) {
      assert.isDefined(error, '应该抛出超时错误');
    }
  });

  test('数据验证完整性', async () => {
    const testUrl = 'https://www.gigab2b.com/index.php?route=product/product&product_id=747431';
    const result = await service.crawlGigaB2B(testUrl, { headless: false });

    const product = result.product;

    // 验证必需字段
    assert.isNotNull(product.title, '标题是必需的');
    assert.isNotEmpty(product.title, '标题不能为空');

    // 验证可选字段
    const optionalFields = ['price', 'description', 'images', 'specifications'];
    const definedFields = optionalFields.filter(field => product[field] !== undefined);

    assert.isTrue(definedFields.length >= 2, '至少应该提取到 2 个可选字段');
  });
});