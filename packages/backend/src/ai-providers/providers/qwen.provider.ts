/**
 * Qwen AI Provider (阿里云 DashScope)
 * 兼容 OpenAI 接口格式
 */

import OpenAI from 'openai';
import { BaseAiProvider } from '../base';
import { getPromptTemplate } from '../templates';
import type { RecognizeRequest, CompareRequest, ChatMessage } from '../types';

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export const QWEN_VL_MODELS = {
  flash: 'qwen3.6-flash',
  max: 'qwen-vl-max',
  ocr: 'qwen-vl-ocr-latest',
} as const;

export class QwenProvider extends BaseAiProvider {
  readonly providerName = 'qwen';
  readonly displayName = '通义千问 (Qwen)';
  readonly supportedModels = Object.values(QWEN_VL_MODELS);
  readonly defaultModel = QWEN_VL_MODELS.flash;

  private client: OpenAI;
  private config: { baseURL: string; apiKey: string };

  constructor(options?: {
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
  }) {
    super();
    const apiKey = options?.apiKey || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) throw new Error('DASHSCOPE_API_KEY 未设置');

    this.config = {
      baseURL: options?.baseURL || DEFAULT_BASE_URL,
      apiKey,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    });
  }

  async recognize(request: RecognizeRequest): Promise<string> {
    const { image, prompt: rawPrompt, templateId, model } = request;

    const template = templateId ? getPromptTemplate(templateId) : undefined;
    const prompt = template?.prompt || rawPrompt || '请描述这张图片';
    const effectiveModel = model || template?.model || this.defaultModel;

    const base64Image = await this.normalizeImage(image);
    const content = this.buildMultimodalContent(base64Image, prompt);

    const completion = await this.client.chat.completions.create({
      model: effectiveModel,
      messages: [{ role: 'user', content }],
    });

    return completion.choices[0]?.message?.content || '';
  }

  async compare(request: CompareRequest): Promise<string> {
    const { images, prompt: rawPrompt, templateId, model } = request;

    const template = templateId ? getPromptTemplate(templateId) : undefined;
    const prompt = template?.prompt || rawPrompt || '请对比这些图片';
    const effectiveModel = model || template?.model || QWEN_VL_MODELS.max;

    const base64Images = await this.normalizeImages(images);
    const content = this.buildMultimodalContentForCompare(base64Images, prompt);

    const completion = await this.client.chat.completions.create({
      model: effectiveModel,
      messages: [{ role: 'user', content }],
    });

    return completion.choices[0]?.message?.content || '';
  }

  async chat(messages: ChatMessage[], model?: string): Promise<string> {
    const effectiveModel = model || this.defaultModel;
    const completion = await this.client.chat.completions.create({
      model: effectiveModel,
      messages: messages as any,
    });
    return completion.choices[0]?.message?.content || '';
  }
}
