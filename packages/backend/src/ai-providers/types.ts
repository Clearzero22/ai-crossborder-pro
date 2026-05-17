/**
 * AI Provider 统一接口定义
 */

import OpenAI from 'openai';

// ─── 核心类型 ──────────────────────────────────────────────────

/**
 * 图片内容类型
 */
export type ImageContent = string; // Base64 或 URL

/**
 * 消息内容：可以是纯文本或图文混合
 */
export type MessageContent = string | Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
>;

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
}

/**
 * 单图识别请求
 */
export interface RecognizeRequest {
  image: ImageContent;
  prompt?: string;
  templateId?: string;
  model?: string;
}

/**
 * 多图对比请求
 */
export interface CompareRequest {
  images: ImageContent[];
  prompt?: string;
  templateId?: string;
  model?: string;
}

/**
 * Provider 基础配置
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
}

// ─── Provider 接口 ──────────────────────────────────────────────

/**
 * AI Provider 统一接口
 */
export interface IAiProvider {
  /** Provider 名称标识 */
  readonly providerName: string;

  /** Provider 显示名称 */
  readonly displayName: string;

  /** 支持的模型列表 */
  readonly supportedModels: readonly string[];

  /** 默认模型 */
  readonly defaultModel: string;

  /**
   * 单图识别
   */
  recognize(request: RecognizeRequest): Promise<string>;

  /**
   * 多图对比
   */
  compare(request: CompareRequest): Promise<string>;

  /**
   * 通用聊天补全
   */
  chat(messages: ChatMessage[], model?: string): Promise<string>;
}

// ─── 注册中心类型 ──────────────────────────────────────────────

export interface ProviderRegistryEntry {
  provider: IAiProvider;
  priority: number; // 优先级，数字越小优先级越高
  enabled: boolean;
}

export interface ProviderCreateFn {
  (config?: Record<string, any>): IAiProvider;
}
