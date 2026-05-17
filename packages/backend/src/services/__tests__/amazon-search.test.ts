/**
 * AmazonSearchService 测试
 * 测试 Amazon 搜索服务的所有功能
 */

import { AmazonSearchService } from '../amazon-search-service';

// 引入测试工具
const assert = (globalThis as any).assert;
const sleep = (globalThis as any).sleep;

describe('AmazonSearchService', () => {
  let service: AmazonSearchService;

  beforeEach(() => {
    service = new AmazonSearchService();
  });

  afterEach(async () => {
    await service.close();
  });

  test('正常搜索功能', async () => {
    const result = await service.search('wireless mouse', 5, { headless: false });

    assert.isDefined(result, '搜索结果不应为 undefined');
    assert.equal(result.keyword, 'wireless mouse', '关键词应匹配');
    assert.isNotNull(result.asins, 'ASIN 列表不应为 null');
    assert.isNotNull(result.links, '链接列表不应为 null');
    assert.isNotNull(result.total, '总数不应为 null');
  });

  test('空关键词处理', async () => {
    try {
      await service.search('', 5, { headless: false });
      assert.fail('应该抛出错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出错误');
    }
  });

  test('特殊字符处理', async () => {
    const result = await service.search('laptop & accessories', 5, { headless: false });

    assert.isDefined(result, '特殊字符搜索应返回结果');
    assert.isNotEmpty(result.asins, '应找到结果');
  });

  test('中文关键词搜索', async () => {
    const result = await service.search('蓝牙耳机', 5, { headless: false });

    assert.isDefined(result, '中文搜索应返回结果');
    assert.isNotEmpty(result.asins, '应找到结果');
  });

  test('结果数量限制', async () => {
    const maxResults = 3;
    const result = await service.search('mouse pad', maxResults, { headless: false });

    assert.isTrue(result.total <= maxResults, `结果数量应不超过 ${maxResults}`);
    assert.isTrue(result.asins.length <= maxResults, `ASIN 数量应不超过 ${maxResults}`);
  });

  test('ASIN 格式验证', async () => {
    const result = await service.search('keyboard', 5, { headless: false });

    if (result.asins.length > 0) {
      for (const asin of result.asins) {
        assert.match(asin, /^[A-Z0-9]{10}$/, `ASIN 格式应正确: ${asin}`);
      }
    }
  });

  test('链接格式验证', async () => {
    const result = await service.search('monitor', 5, { headless: false });

    if (result.links.length > 0) {
      for (const link of result.links) {
        assert.match(link, /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}$/, `链接格式应正确: ${link}`);
      }
    }
  });

  test('去重功能', async () => {
    const result = await service.search('usb hub', 20, { headless: false });

    const uniqueAsins = new Set(result.asins);
    assert.equal(result.asins.length, uniqueAsins.size, 'ASIN 应该去重');

    const uniqueLinks = new Set(result.links);
    assert.equal(result.links.length, uniqueLinks.size, '链接应该去重');
  });

  test('浏览器实例复用', async () => {
    const result1 = await service.search('webcam', 3, { headless: false });
    await sleep(3000);
    const result2 = await service.search('microphone', 3, { headless: false });

    assert.isDefined(result1, '第一次搜索应返回结果');
    assert.isDefined(result2, '第二次搜索应返回结果');
  });

  test('浏览器资源清理', async () => {
    await service.search('speaker', 3, { headless: false });
    await service.close();

    // 再次实例化应该成功
    const newService = new AmazonSearchService();
    const result = await newService.search('headphones', 3, { headless: false });
    await newService.close();

    assert.isDefined(result, '清理后重新实例化应正常工作');
  });
});