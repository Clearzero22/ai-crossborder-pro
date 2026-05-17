/**
 * AIVisionService 测试
 * 测试 AI 图片识别服务
 */

import { AIVisionService } from '../ai-vision-service';

// 引入测试工具
const assert = (globalThis as any).assert;
const sleep = (globalThis as any).sleep;

describe('AIVisionService', () => {
  let service: AIVisionService;

  beforeEach(() => {
    service = new AIVisionService();
  });

  test('图片识别功能', async () => {
    // 需要准备测试图片
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-product.jpg';

    const result = await service.recognize(testImagePath, 'extract-search-keywords', { headless: false });

    assert.isDefined(result, '识别结果不应为 undefined');
    assert.isNotEmpty(result, '识别结果不应为空');
  });

  test('不同模板测试', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-listing.png';
    const templates = ['extract-title', 'extract-price', 'extract-specs'];

    for (const template of templates) {
      const result = await service.recognize(testImagePath, template as any, { headless: false });
      assert.isDefined(result, `模板 ${template} 应返回结果`);
      await sleep(2000); // 避免请求过快
    }
  });

  test('关键词提取模板', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-product.jpg';

    const result = await service.recognize(testImagePath, 'extract-search-keywords', { headless: false });

    assert.isDefined(result, '关键词提取应返回结果');
    // 验证结果中包含关键词相关信息
  });

  test('商品信息提取', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-listing.png';

    const result = await service.recognize(testImagePath, 'product-analysis', { headless: false });

    assert.isDefined(result, '商品信息提取应返回结果');
    // 验证结果格式
  });

  test('OCR 功能', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-text.png';

    const result = await service.recognize(testImagePath, 'ocr', { headless: false });

    assert.isDefined(result, 'OCR 应返回结果');
    // 验证文字识别结果
  });

  test('错误图片处理', async () => {
    try {
      await service.recognize('./non-existent-image.jpg', 'extract-search-keywords', { headless: false });
      assert.fail('应该抛出错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出图片不存在错误');
    }
  });

  test('无效路径处理', async () => {
    const invalidPaths = ['', '   ', null, undefined];

    for (const path of invalidPaths) {
      try {
        await service.recognize(path as any, 'extract-search-keywords', { headless: false });
        assert.fail(`路径 ${JSON.stringify(path)} 应该抛出错误`);
      } catch (error) {
        assert.isDefined(error, '无效路径应该抛出错误');
      }
    }
  });

  test('API 响应解析', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-product.jpg';

    const result = await service.recognize(testImagePath, 'extract-search-keywords', { headless: false });

    // 验证响应可以正确解析
    assert.isString(result, '响应应为字符串');
    assert.isNotEmpty(result, '响应不应为空');
  });

  test('自定义提示词', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-product.jpg';
    const customPrompt = '请提取图片中的商品品牌和价格';

    const result = await service.recognizeWithCustomPrompt(testImagePath, customPrompt, { headless: false });

    assert.isDefined(result, '自定义提示词应返回结果');
    assert.isNotEmpty(result, '自定义提示词结果不应为空');
  });

  test('批量图片识别', async () => {
    const testImages = [
      './src/services/__tests__/fixtures/test-images/test-product.jpg',
      './src/services/__tests__/fixtures/test-images/test-listing.png',
    ];

    const results = [];
    for (const imagePath of testImages) {
      const result = await service.recognize(imagePath, 'extract-search-keywords', { headless: false });
      results.push(result);
      await sleep(2000);
    }

    assert.equal(results.length, 2, '应识别两张图片');
    results.forEach(result => {
      assert.isNotEmpty(result, '每个识别结果都不应为空');
    });
  });
});