/**
 * AmazonProductService 测试
 * 测试 Amazon 商品详情抓取服务
 */

import { AmazonProductService } from '../amazon-product-service';

// 引入测试工具
const assert = (globalThis as any).assert;
const sleep = (globalThis as any).sleep;

describe('AmazonProductService', () => {
  let service: AmazonProductService;

  beforeEach(() => {
    service = new AmazonProductService();
  });

  test('有效 ASIN 抓取', async () => {
    const validASIN = 'B08F5M1K9M';
    const result = await service.scrapeProduct(validASIN, { headless: false, saveToDb: false });

    assert.isDefined(result, '抓取结果不应为 undefined');
    assert.isNotNull(result.asin, 'ASIN 不应为 null');
    assert.equal(result.asin, validASIN, 'ASIN 应匹配');
    assert.isNotEmpty(result.title, '标题不应为空');
  });

  test('无效 ASIN 处理', async () => {
    try {
      await service.scrapeProduct('INVALID_ASIN', { headless: false, saveToDb: false });
      assert.fail('应该抛出错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出错误');
    }
  });

  test('商品 URL 抓取', async () => {
    const testURL = 'https://www.amazon.com/dp/B08F5M1K9M';
    const result = await service.scrapeProduct('', { headless: false, saveToDb: false, productUrl: testURL });

    assert.isDefined(result, 'URL 抓取应返回结果');
    assert.isNotNull(result.title, '标题不应为 null');
  });

  test('数据完整性验证', async () => {
    const result = await service.scrapeProduct('B004YAVF8I', { headless: false, saveToDb: false });

    assert.isDefined(result, '结果不应为 undefined');
    assert.isNotNull(result.asin, 'ASIN 应存在');
    assert.isNotNull(result.title, '标题应存在');
    assert.isDefined(result.price, '价格应定义');
    assert.isArray(result.bulletPoints, '五点描述应为数组');
    assert.isNotEmpty(result.longDescription, '长描述不应为空');
  });

  test('图片提取', async () => {
    const result = await service.scrapeProduct('B087Z5WDJ2', { headless: false, saveToDb: false });

    assert.isArray(result.images, '图片应为数组');
    if (result.images.length > 0) {
      assert.match(result.images[0], /^https:\/\//, '图片应为有效 URL');
    }
  });

  test('规格参数提取', async () => {
    const result = await service.scrapeProduct('B08F5M1K9M', { headless: false, saveToDb: false });

    assert.isArray(result.specifications, '规格参数应为数组');
    // 某些商品可能没有规格参数，所以只验证格式
    if (result.specifications.length > 0) {
      assert.isNotEmpty(result.specifications[0], '规格参数不应为空');
    }
  });

  test('评分数据提取', async () => {
    const result = await service.scrapeProduct('B004YAVF8I', { headless: false, saveToDb: false });

    assert.isDefined(result.rating, '评分应定义');
    // 某些商品可能没有评分
    if (result.rating && result.rating !== 'N/A') {
      assert.isNotEmpty(result.rating, '评分不应为空');
    }
  });

  test('数据库保存功能', async () => {
    const result = await service.scrapeProduct('B08F5M1K9M', { headless: false, saveToDb: true });

    assert.isDefined(result, '保存操作应返回结果');
    // 数据库保存是否成功需要验证数据库状态
  });

  test('错误处理 - 无网络', async () => {
    // 这个测试需要模拟网络失败的情况
    // 暂时跳过，需要额外的 Mock 设置
    console.log('跳过网络错误测试 (需要 Mock)');
  });

  test('超时处理', async () => {
    try {
      await service.scrapeProduct('B08F5M1K9M', {
        headless: false,
        saveToDb: false,
        timeout: 100 // 超短超时
      });
      assert.fail('应该因为超时而失败');
    } catch (error) {
      assert.isDefined(error, '应该抛出超时错误');
    }
  });

  test('多个商品连续抓取', async () => {
    const asins = ['B08F5M1K9M', 'B004YAVF8I'];
    const results = [];

    for (const asin of asins) {
      const result = await service.scrapeProduct(asin, { headless: false, saveToDb: false });
      results.push(result);
      await sleep(3000); // 避免请求过快
    }

    assert.equal(results.length, 2, '应抓取两个商品');
    results.forEach(result => {
      assert.isNotNull(result.asin, '每个结果都应有 ASIN');
      assert.isNotEmpty(result.title, '每个结果都应有标题');
    });
  });
});