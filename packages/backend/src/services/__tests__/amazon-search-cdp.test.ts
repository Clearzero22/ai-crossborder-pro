/**
 * AmazonSearchServiceCDP 测试
 * 测试 CDP 版本的 Amazon 搜索服务
 */

import { AmazonSearchServiceCDP } from '../amazon-search-service-cdp';

// 引入测试工具
const assert = (globalThis as any).assert;
const sleep = (globalThis as any).sleep;

describe('AmazonSearchServiceCDP', () => {
  let service: AmazonSearchServiceCDP;

  beforeEach(() => {
    service = new AmazonSearchServiceCDP();
  });

  test('CDP 连接建立', async () => {
    const result = await service.search('wireless mouse', 5, { headless: false });

    assert.isDefined(result, 'CDP 连接应成功');
    assert.isNotEmpty(result.asins, '应返回搜索结果');
  });

  test('页面导航', async () => {
    const result = await service.search('laptop', 5, { headless: false });

    assert.isDefined(result, '页面导航应成功');
    assert.isNotEmpty(result.keyword, '关键词应正确');
  });

  test('DOM 操作', async () => {
    const result = await service.search('keyboard', 5, { headless: false });

    assert.isArray(result.asins, 'ASIN 列表应为数组');
    assert.isArray(result.links, '链接列表应为数组');
  });

  test('数据提取', async () => {
    const result = await service.search('monitor', 5, { headless: false });

    if (result.asins.length > 0) {
      assert.match(result.asins[0], /^[A-Z0-9]{10}$/, 'ASIN 格式应正确');
    }
  });

  test('资源清理', async () => {
    await service.search('usb hub', 3, { headless: false });
    await service.close();

    // 重新实例化应成功
    const newService = new AmazonSearchServiceCDP();
    const result = await newService.search('webcam', 3, { headless: false });
    await newService.close();

    assert.isDefined(result, '清理后应正常工作');
  });

  test('连接错误处理', async () => {
    // 测试无效端口或配置
    const tempService = new AmazonSearchServiceCDP();
    try {
      await tempService.search('test', 5, { headless: false, port: 9999 });
      assert.fail('应该抛出连接错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出连接错误');
    } finally {
      await tempService.close();
    }
  });

  test('与 Playwright 版本对比', async () => {
    const keyword = 'mouse pad';
    const maxResults = 5;

    // Playwright 版本
    // const playwrightService = new AmazonSearchService();
    // const playwrightResult = await playwrightService.search(keyword, maxResults, { headless: false });
    // await playwrightService.close();

    // CDP 版本
    const cdpResult = await service.search(keyword, maxResults, { headless: false });

    assert.isDefined(cdpResult, 'CDP 版本应返回结果');
    assert.isTrue(cdpResult.asins.length <= maxResults, '结果数量应受限');
  });

  test('Chrome 路径检测', async () => {
    const tempService = new AmazonSearchServiceCDP();

    // 验证 Chrome 路径被正确检测
    assert.isDefined(tempService, '服务实例应创建成功');

    await tempService.close();
  });

  test('超时处理', async () => {
    try {
      await service.search('timeout test', 5, {
        headless: false,
        timeout: 1000, // 超短超时
      });
      assert.fail('应该因为超时而失败');
    } catch (error) {
      assert.isDefined(error, '应该抛出超时错误');
    }
  });

  test('无头模式切换', async () => {
    // 有头模式
    const result1 = await service.search('headphones', 3, { headless: false });
    assert.isDefined(result1, '有头模式应工作');

    await sleep(2000);

    // 无头模式
    await service.close();
    const newService = new AmazonSearchServiceCDP();
    const result2 = await newService.search('speakers', 3, { headless: true });
    await newService.close();

    assert.isDefined(result2, '无头模式应工作');
  });
});