/**
 * Webhook 执行器 —— 向外部服务发送 HTTP POST 请求
 *
 * 【使用场景】
 * - 工作流执行完毕后通知你的业务系统
 * - 向 Slack/Discord/钉钉发送通知
 * - 调用你自己的后端 API 记录数据
 *
 * 【配置说明】
 * - url: 目标 URL（必填）
 * - method: HTTP 方法（POST/PUT）
 * - headers: 自定义请求头（可选）
 */
import type { NodeExecutor } from '../types';

export const webhookExecutor: NodeExecutor = {
  type: 'webhook',
  label: 'Webhook 通知',
  icon: 'upload',
  category: 'data',

  inputSchema: {
    message: { type: 'string', label: '通知内容', required: true },
  },

  outputSchema: {
    statusCode: { type: 'number', label: 'HTTP 状态码' },
    responseBody: { type: 'string', label: '响应内容' },
    success: { type: 'boolean', label: '是否成功' },
  },

  configSchema: {
    url: {
      type: 'string', label: 'Webhook URL', required: true,
      default: 'https://hooks.example.com/workflow-complete',
    },
    method: {
      type: 'select', label: 'HTTP 方法',
      default: 'POST',
      options: [
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
      ],
    },
    secretToken: {
      type: 'secret', label: '密钥 (可选)',
      required: false,
    },
    customHeaders: {
      type: 'string', label: '自定义 Headers (JSON, 可选)',
      required: false,
    },
  },

  async execute(ctx) {
    const url = ctx.config.url as string;
    const method = (ctx.config.method as string) || 'POST';

    ctx.logger('info', `发送 Webhook 到 ${url}`);

    // 构造请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (ctx.config.secretToken) {
      headers['Authorization'] = `Bearer ${ctx.config.secretToken}`;
    }
    if (ctx.config.customHeaders) {
      try {
        const extra = JSON.parse(ctx.config.customHeaders as string);
        Object.assign(headers, extra);
      } catch {
        ctx.logger('error', '自定义 Headers 格式错误，请使用 JSON 格式');
      }
    }

    // 构建请求体：包含上一步输入 + 时间戳
    const body = JSON.stringify({
      ...ctx.input,
      timestamp: new Date().toISOString(),
      workflowId: ctx.nodeId,
    });

    // 发起真实的 HTTP 请求
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: ctx.abortSignal,  // 支持用户点击"取消"
    });

    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseBody.slice(0, 200)}`);
    }

    ctx.logger('success', `Webhook 发送成功 (${response.status})`);

    return {
      statusCode: response.status,
      responseBody: responseBody.slice(0, 500),
      success: true,
    };
  },
};
