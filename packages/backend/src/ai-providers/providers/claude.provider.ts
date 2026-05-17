/**
 * Anthropic Claude Provider
 * 使用原生 Anthropic API
 */

import { BaseAiProvider } from '../base';
import { getPromptTemplate } from '../templates';
import type { RecognizeRequest, CompareRequest, ChatMessage, MessageContent } from '../types';

const DEFAULT_BASE_URL = 'https://api.anthropic.com';

export const CLAUDE_MODELS = {
  sonnet: 'claude-3-5-sonnet-20241022',
  opus: 'claude-3-opus-20240229',
  haiku: 'claude-3-haiku-20240307',
} as const;

export class ClaudeProvider extends BaseAiProvider {
  readonly providerName = 'claude';
  readonly displayName = 'Anthropic Claude';
  readonly supportedModels = Object.values(CLAUDE_MODELS);
  readonly defaultModel = CLAUDE_MODELS.sonnet;

  private config: { apiKey: string; baseURL: string };

  constructor(options?: {
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
  }) {
    super();
    const apiKey = options?.apiKey || process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error('CLAUDE_API_KEY 未设置');

    this.config = {
      apiKey,
      baseURL: options?.baseURL || DEFAULT_BASE_URL,
    };
  }

  async recognize(request: RecognizeRequest): Promise<string> {
    const { image, prompt: rawPrompt, templateId, model } = request;

    const template = templateId ? getPromptTemplate(templateId) : undefined;
    const prompt = template?.prompt || rawPrompt || '请描述这张图片';
    const effectiveModel = model || this.defaultModel;

    const base64Image = await this.normalizeImage(image);
    const content = this.buildAnthropicContent(base64Image, prompt);

    return await this.callAnthropic(content, effectiveModel);
  }

  async compare(request: CompareRequest): Promise<string> {
    const { images, prompt: rawPrompt, templateId, model } = request;

    const template = templateId ? getPromptTemplate(templateId) : undefined;
    const prompt = template?.prompt || rawPrompt || '请对比这些图片';
    const effectiveModel = model || this.defaultModel;

    const base64Images = await this.normalizeImages(images);
    const content = this.buildAnthropicContentForCompare(base64Images, prompt);

    return await this.callAnthropic(content, effectiveModel);
  }

  async chat(messages: ChatMessage[], model?: string): Promise<string> {
    const effectiveModel = model || this.defaultModel;
    const content = this.buildAnthropicChatContent(messages);
    return await this.callAnthropic(content, effectiveModel);
  }

  // ─── Anthropic 特定方法 ────────────────────────────────────────

  private parseBase64(base64Str: string): { mediaType: string; data: string } {
    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mediaType: match[1], data: match[2] };
    }
    return { mediaType: 'image/jpeg', data: base64Str };
  }

  private buildAnthropicContent(base64Image: string, text: string): any[] {
    const { mediaType, data } = this.parseBase64(base64Image);
    return [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
      { type: 'text', text },
    ];
  }

  private buildAnthropicContentForCompare(base64Images: string[], text: string): any[] {
    const imageParts = base64Images.map((img) => {
      const { mediaType, data } = this.parseBase64(img);
      return { type: 'image' as const, source: { type: 'base64', media_type: mediaType, data } };
    });
    return [...imageParts, { type: 'text', text }];
  }

  private buildAnthropicChatContent(messages: ChatMessage[]): any[] {
    // 转换消息格式
    return messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      const content = msg.content.map((part) => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        } else {
          const { mediaType, data } = this.parseBase64(part.image_url.url);
          return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
        }
      });
      return { role: msg.role, content };
    });
  }

  private async callAnthropic(content: any, model: string): Promise<string> {
    const response = await fetch(`${this.config.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API 错误: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.content?.[0]?.text || '';
  }
}
