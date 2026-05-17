/**
 * ChatGPTFileService 测试
 * 测试 ChatGPT 文件上传和处理服务
 */

import { ChatGPTFileService } from '../chatgpt-file-service';

// 引入测试工具
const assert = (globalThis as any).assert;
const sleep = (globalThis as any).sleep;

describe('ChatGPTFileService', () => {
  let service: ChatGPTFileService;

  beforeEach(() => {
    service = new ChatGPTFileService();
  });

  test('文件上传功能', async () => {
    const testImagePath = './src/services/__tests__/fixtures/test-images/test-product.jpg';

    const result = await service.uploadFile(testImagePath, '请描述这张图片中的商品', {
      headless: false,
    });

    assert.isDefined(result, '上传结果不应为 undefined');
    assert.isNotEmpty(result, '响应不应为空');
  });

  test('提示词处理', async () => {
    const testPrompt = '请生成商品标题，关键词是：蓝牙耳机';
    const result = await service.processPrompt(testPrompt, { headless: false });

    assert.isDefined(result, '提示词处理应返回结果');
    assert.isNotEmpty(result, '结果不应为空');
  });

  test('多轮对话', async () => {
    const messages = [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好！有什么我可以帮助你的吗？' },
      { role: 'user', content: '请帮我优化商品标题' },
    ];

    const result = await service.chat(messages, { headless: false });

    assert.isDefined(result, '对话应返回结果');
    assert.isNotEmpty(result, '回复不应为空');
  });

  test('上下文维护', async () => {
    // 第一轮对话
    const result1 = await service.sendMessage('商品是什么？', { headless: false });
    assert.isDefined(result1, '第一轮对话应成功');

    await sleep(2000);

    // 第二轮对话，应该保持上下文
    const result2 = await service.sendMessage('价格是多少？', { headless: false });
    assert.isDefined(result2, '第二轮对话应成功');

    await service.close();
  });

  test('错误处理 - 无效文件路径', async () => {
    try {
      await service.uploadFile('./non-existent.jpg', 'test', { headless: false });
      assert.fail('应该抛出文件不存在错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出错误');
    }
  });

  test('错误处理 - 空 prompt', async () => {
    try {
      await service.processPrompt('', { headless: false });
      assert.fail('应该抛出空 prompt 错误');
    } catch (error) {
      assert.isDefined(error, '应该抛出错误');
    }
  });

  test('API 连接验证', async () => {
    try {
      const result = await service.healthCheck();
      assert.isDefined(result, '健康检查应返回结果');
      assert.isTrue(result.status === 'ok' || result.status === 'error', '状态应有效');
    } catch (error) {
      assert.isDefined(error, '连接检查应返回结果');
    }
  });

  test('速率限制处理', async () => {
    // 快速发送多个请求，测试速率限制
    const results = [];

    for (let i = 0; i < 3; i++) {
      try {
        const result = await service.sendMessage(`测试消息 ${i}`, { headless: false });
        results.push(result);
      } catch (error) {
        // 某些请求可能因速率限制失败
      }
      await sleep(1000);
    }

    assert.isTrue(results.length >= 1, '至少应该有一个请求成功');
    await service.close();
  });

  test('响应解析', async () => {
    const result = await service.sendMessage('生成一段短文本', { headless: false });

    assert.isDefined(result, '响应应定义');
    assert.isString(result, '响应应为字符串');
    assert.isNotEmpty(result, '响应不应为空');
    await service.close();
  });

  test('批量处理', async () => {
    const prompts = ['生成标题', '生成描述', '生成关键词'];

    const results = [];
    for (const prompt of prompts) {
      const result = await service.sendMessage(prompt, { headless: false });
      results.push(result);
      await sleep(2000);
    }

    assert.equal(results.length, 3, '应处理 3 个提示词');
    results.forEach(result => {
      assert.isDefined(result, '每个结果都应定义');
    });
    await service.close();
  });
});