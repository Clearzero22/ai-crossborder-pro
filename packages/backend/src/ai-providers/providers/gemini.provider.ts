/**
 * Google Gemini Provider
 * 使用原生 Google AI API
 */

import { BaseAiProvider } from '../base';
import { getPromptTemplate } from '../templates';
import type { RecognizeRequest, CompareRequest, ChatMessage } from '../types';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

export const GEMINI_MODELS = {
  gemini20Flash: 'gemini-2.0-flash',
  gemini15Pro: 'gemini-1.5-pro',
  gemini15Flash: 'gemini-1.5-flash',
} as const;

export class GeminiProvider extends BaseAiProvider {
  readonly providerName = 'gemini';
  readonly displayName = 'Google Gemini';
  readonly supportedModels = Object.values(GEMINI_MODELS);
  readonly defaultModel = GEMINI_MODELS.gemini20Flash;

  private config: { apiKey: string; baseURL: string };

  constructor(options?: {
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
  }) {
    super();
    const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY 未设置');

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
    const parts = this.buildGeminiParts(base64Image, prompt);

    return await this.callGemini(parts, effectiveModel);
  }

  async compare(request: CompareRequest): Promise<string> {
    const { images, prompt: rawPrompt, templateId, model } = request;

    const template = templateId ? getPromptTemplate(templateId) : undefined;
    const prompt = template?.prompt || rawPrompt || '请对比这些图片';
    const effectiveModel = model || this.defaultModel;

    const base64Images = await this.normalizeImages(images);
    const parts = this.buildGeminiPartsForCompare(base64Images, prompt);

    return await this.callGemini(parts, effectiveModel);
  }

  async chat(messages: ChatMessage[], model?: string): Promise<string> {
    const effectiveModel = model || this.defaultModel;
    const contents = this.buildGeminiChatContents(messages);
    return await this.callGeminiChat(contents, effectiveModel);
  }

  // ─── Gemini 特定方法 ──────────────────────────────────────────

  private parseBase64(base64Str: string): { mimeType: string; data: string } {
    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
    return { mimeType: 'image/jpeg', data: base64Str };
  }

  private buildGeminiParts(base64Image: string, text: string): any[] {
    const { mimeType, data } = this.parseBase64(base64Image);
    return [
      { inlineData: { mimeType, data } },
      { text },
    ];
  }

  private buildGeminiPartsForCompare(base64Images: string[], text: string): any[] {
    const imageParts = base64Images.map((img) => {
      const { mimeType, data } = this.parseBase64(img);
      return { inlineData: { mimeType, data } };
    });
    return [...imageParts, { text }];
  }

  private buildGeminiChatContents(messages: ChatMessage[]): any[] {
    return messages.map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      let parts: any[];

      if (typeof msg.content === 'string') {
        parts = [{ text: msg.content }];
      } else {
        parts = msg.content.map((part) => {
          if (part.type === 'text') {
            return { text: part.text };
          } else {
            const { mimeType, data } = this.parseBase64(part.image_url.url);
            return { inlineData: { mimeType, data } };
          }
        });
      }

      return { role, parts };
    });
  }

  private async callGemini(parts: any[], model: string): Promise<string> {
    const url = `${this.config.baseURL}/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 错误: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callGeminiChat(contents: any[], model: string): Promise<string> {
    const url = `${this.config.baseURL}/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 错误: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
