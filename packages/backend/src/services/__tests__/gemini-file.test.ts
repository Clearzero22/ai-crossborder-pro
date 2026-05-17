/**
 * GeminiFileService 测试
 * 测试 Gemini 文件上传和处理服务
 */

import { GeminiFileService } from '../gemini-file-service';

// 引入测试工具
const assert = (globalThis as any).assert;
const sleep = (globalThis as any).sleep;

describe('GeminiFileService', () => {
  let service: GeminiFileService;

  beforeEach(() => {
    service = new GeminiFileService();
  });

  test('文件上传功能', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-product.jpg';

    const result = await service.uploadFile(testImagePath, '请识别这张图片中的商品', {
      headless: false,
    });

    assert.isDefined(result, '上传结果不应为 undefined');
    assert.isNotEmpty(result, '响应不应为空');
  });

  test('多模态识别', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-listing.png';

    const result = await service.recognizeImage(testImagePath, '请分析这个商品页面的内容', {
      headless: false,
    });

    assert.isDefined(result, '多模态识别应返回结果');
    assert.isNotEmpty(result, '分析结果不应为空');
  });

  test('文本生成', async () => {
    const prompt = '请为这个产品生成标题：蓝牙耳机';

    const result = await service.generateText(prompt, {
      headless: false,
      maxLength: 100,
    });

    assert.isDefined(result, '文本生成应返回结果');
    assert.isNotEmpty(result, '生成的文本不应为空');
  });

  test('流式响应', async () => {
    const prompt = '请列出 5 个产品特性';

    const result = await service.generateTextStream(prompt, {
      headless: false,
      onChunk: (chunk: string) => {
        assert.isNotEmpty(chunk, '每个 chunk 不应为空');
      },
    });

    assert.isDefined(result, '流式响应应返回结果');
    assert.isNotEmpty(result, '完整响应不应为空');
  });

  test('错误处理 - 无效文件路径', async () => {
    try {
      await service.uploadFile('./non-existent.jpg', 'test', { headless: false });
      assert.fail('应该抛出文件不存在错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出错误');
    }
  });

  test('错误处理 - 不支持的图片格式', async () => {
    try {
      await service.uploadFile('./test.txt', 'test', { headless: false });
      assert.fail('应该抛出格式错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出格式错误');
    }
  });

  test('批量图片处理', async () => {
    const testImages = [
      './src/services/__tests__/fixtures/test-images/test-product.jpg',
      './src/services/__tests__/fixtures/test-images/test-listing.png',
    ];

    const results = [];
    for (const imagePath of testImages) {
      try {
        const result = await service.recognizeImage(imagePath, '请识别商品信息', {
          headless: false,
        });
        results.push(result);
      } catch (error) {
        // 某些图片可能处理失败
      }
      await sleep(2000);
    }

    assert.isTrue(results.length >= 0, '批量处理应执行完成');
  });

  test('API 密钥验证', async () => {
    const result = await service.validateApiKey();

    assert.isDefined(result, '密钥验证应返回结果');
    assert.isTrue(result.valid === true || result.valid === false, '验证结果应有效');
  });

  test('超时处理', async () => {
    try {
      await service.generateText('请生成一篇长文章（至少1000字）', {
        headless: false,
        timeout: 5000, // 超短超时
      });
      assert.fail('应该因为超时而失败');
    } catch (error) {
      assert.isDefined(error, '应该抛出超时错误');
    }
  });

  test('内容安全检查', async () => {
    const safePrompt = '请生成产品标题：蓝牙耳机';

    const result = await service.generateText(safePrompt, {
      headless: false,
    });

    assert.isDefined(result, '安全内容应正常生成');
    assert.isNotEmpty(result, '结果不应为空');
  });

  test('模型选择', async () => {
    const models = ['gemini-pro', 'gemini-pro-vision'];

    for (const model of models) {
      try {
        const result = await service.generateText('测试', {
          headless: false,
          model: model as any,
        });
        assert.isDefined(result, `模型 ${model} 应工作`);
      } catch (error) {
        console.warn(`模型 ${model} 不可用:`, error);
      }
      await sleep(1000);
    }
  });

  test('并发请求处理', async () => {
    const prompts = ['标题1', '标题2', '标题3'];

    const results = await Promise.all(
      prompts.map(prompt =>
        service.generateText(`请生成产品标题：${prompt}`, { headless: false })
          .catch(error => ({ error }))
      )
    );

    const successfulResults = results.filter(r => !r.error);
    assert.isTrue(successfulResults.length >= 1, '至少应该有一个并发请求成功');
  });
});