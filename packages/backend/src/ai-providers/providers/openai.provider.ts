/**
 * OpenAI GPT-4o Provider
 */

import OpenAI from 'openai';
import { BaseAiProvider } from '../base';
import { getPromptTemplate } from '../templates';
import type { RecognizeRequest, CompareRequest, ChatMessage } from '../types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export const OPENAI_MODELS = {
  gpt4o: 'gpt-4o',
  gpt4oMini: 'gpt-4o-mini',
  gpt4Turbo: 'gpt-4-turbo',
} as const;

export class OpenAiProvider extends BaseAiProvider {
  readonly providerName = 'openai';
  readonly displayName = 'OpenAI GPT';
  readonly supportedModels = Object.values(OPENAI_MODELS);
  readonly defaultModel = OPENAI_MODELS.gpt4o;

  private client: OpenAI;

  constructor(options?: {
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
  }) {
    super();
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY 未设置');

    this.client = new OpenAI({
      apiKey,
      baseURL: options?.baseURL || DEFAULT_BASE_URL,
    });
  }

  async recognize(request: RecognizeRequest): Promise<string> {
    const { image, prompt: rawPrompt, templateId, model } = request;

    const template = templateId ? getPromptTemplate(templateId) : undefined;
    const prompt = template?.prompt || rawPrompt || '请描述这张图片';
    const effectiveModel = model || this.defaultModel;

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
    const effectiveModel = model || this.defaultModel;

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
