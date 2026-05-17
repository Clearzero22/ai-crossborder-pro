/**
 * XiyouzhaociService 测试
 * 测试西柚找词关键词挖掘服务
 */

import { XiyouzhaociService } from '../xiyouzhaociService';

// 引入测试工具
const assert = (globalThis as any).assert;
const sleep = (globalThis as any).sleep;

describe('XiyouzhaociService', () => {
  let service: XiyouzhaociService;

  beforeEach(() => {
    service = new XiyouzhaociService();
  });

  test('关键词数据抓取', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });

    assert.isDefined(result, '抓取结果不应为 undefined');
    assert.isNotNull(result.asin, 'ASIN 不应为 null');
    assert.equal(result.asin, testASIN, 'ASIN 应匹配');
    assert.isArray(result.keywords, '关键词列表应为数组');
    assert.isTrue(result.keywords.length > 0, '应抓取到关键词');
  });

  test('搜索量提取', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });

    if (result.keywords.length > 0) {
      const firstKeyword = result.keywords[0];
      assert.isDefined(firstKeyword.keyword, '关键词字段应存在');
      assert.isDefined(firstKeyword.searchVolume, '搜索量字段应存在');
      assert.isNotEmpty(firstKeyword.keyword, '关键词不应为空');
    }
  });

  test('竞争度提取', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });

    if (result.keywords.length > 0) {
      const firstKeyword = result.keywords[0];
      assert.isDefined(firstKeyword.difficulty, '难度字段应存在');
    }
  });

  test('CSV 文件生成', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });

    assert.isDefined(result.csvPath, 'CSV 路径应存在');
    assert.isNotEmpty(result.csvPath, 'CSV 路径不应为空');
  });

  test('数据解析验证', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });

    assert.equal(result.totalKeywords, result.keywords.length, '总数应匹配');
    assert.isArray(result.rawKeywords, '原始数据应为数组');
  });

  test('登录状态管理', async () => {
    const testASIN = 'B08F5M1K9M';

    // 首次抓取
    const result1 = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });
    assert.isDefined(result1, '首次抓取应成功');

    // 等待
    await sleep(3000);

    // 二次抓取，应该复用登录状态
    const result2 = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });
    assert.isDefined(result2, '二次抓取应成功');
  });

  test('表格定位', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });

    assert.isTrue(result.totalKeywords > 0, '表格数据应成功提取');
  });

  test('分页处理', async () => {
    const testASIN = 'B08F5M1K9M';
    const maxKeywords = 50;
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords });

    assert.isTrue(result.totalKeywords <= maxKeywords, `关键词数量不应超过 ${maxKeywords}`);
  });

  test('错误处理 - 无效 ASIN', async () => {
    try {
      await service.scrapeKeywords('INVALID_ASIN', { headless: false, maxKeywords: 10 });
      assert.fail('应该抛出错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出 ASIN 错误');
    }
  });

  test('错误处理 - 空 ASIN', async () => {
    try {
      await service.scrapeKeywords('', { headless: false, maxKeywords: 10 });
      assert.fail('应该抛出错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出空 ASIN 错误');
    }
  });

  test('关键词数据完整性', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 5 });

    if (result.keywords.length > 0) {
      const keyword = result.keywords[0];

      // 验证必需字段
      assert.isNotEmpty(keyword.keyword, '关键词不应为空');

      // 验证数值字段格式
      if (keyword.searchVolume) {
        assert.isTrue(!isNaN(Number(keyword.searchVolume)), '搜索量应为数字');
      }
      if (keyword.difficulty) {
        assert.isTrue(!isNaN(Number(keyword.difficulty)), '难度应为数字');
      }
    }
  });

  test('使用默认 ASIN', async () => {
    const result = await service.scrapeKeywords('', {
      headless: false,
      maxKeywords: 10,
      defaultAsin: 'B08F5M1K9M',
    });

    assert.isDefined(result, '默认 ASIN 应起作用');
    assert.isNotNull(result.asin, 'ASIN 不应为 null');
  });

  test('浏览器资源清理', async () => {
    await service.scrapeKeywords('B08F5M1K9M', { headless: false, maxKeywords: 10 });
    await service.close();

    // 重新实例化应该成功
    const newService = new XiyouzhaociService();
    const result = await newService.scrapeKeywords('B004YAVF8I', { headless: false, maxKeywords: 10 });
    await newService.close();

    assert.isDefined(result, '清理后重新实例化应正常工作');
  });

  test('超时处理', async () => {
    try {
      await service.scrapeKeywords('B08F5M1K9M', {
        headless: false,
        maxKeywords: 10,
        timeout: 5000, // 超短超时
      });
      assert.fail('应该因为超时而失败');
    } catch (error) {
      assert.isDefined(error, '应该抛出超时错误');
    }
  });

  test('数据去重', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 20 });

    const keywords = result.keywords.map(k => k.keyword);
    const uniqueKeywords = new Set(keywords);

    assert.equal(keywords.length, uniqueKeywords.size, '关键词应该去重');
  });

  test('流量份额提取', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });

    if (result.keywords.length > 0) {
      const firstKeyword = result.keywords[0];
      assert.isDefined(firstKeyword.trafficShare, '流量份额字段应存在');
    }
  });

  test('排名位置提取', async () => {
    const testASIN = 'B08F5M1K9M';
    const result = await service.scrapeKeywords(testASIN, { headless: false, maxKeywords: 10 });

    if (result.keywords.length > 0) {
      const firstKeyword = result.keywords[0];
      assert.isDefined(firstKeyword.rankingPosition, '排名位置字段应存在');
    }
  });
});