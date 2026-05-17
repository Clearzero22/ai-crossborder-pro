/**
 * AI Provider 基类
 * 提供通用的图片处理功能
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IAiProvider, ImageContent, MessageContent } from './types';

export abstract class BaseAiProvider implements IAiProvider {
  abstract readonly providerName: string;
  abstract readonly displayName: string;
  abstract readonly supportedModels: readonly string[];
  abstract readonly defaultModel: string;

  // ─── 抽象方法（子类必须实现）─────────────────────────────────────

  abstract recognize(request: any): Promise<string>;
  abstract compare(request: any): Promise<string>;
  abstract chat(messages: any[], model?: string): Promise<string>;

  // ─── 图片处理工具 ─────────────────────────────────────────────────

  /**
   * 判断是否是 Base64 图片
   */
  protected isBase64Image(input: string): boolean {
    return input.startsWith('data:');
  }

  /**
   * 判断是否是 URL 图片
   */
  protected isUrlImage(input: string): boolean {
    return input.startsWith('http://') || input.startsWith('https://');
  }

  /**
   * 判断是否是本地文件路径
   */
  protected isLocalFilePath(input: string): boolean {
    return !this.isBase64Image(input) && !this.isUrlImage(input);
  }

  /**
   * 下载远程图片并转为 Base64
   */
  protected async downloadToBase64(url: string, timeout = 15000): Promise<string> {
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!resp.ok) throw new Error(`下载图片失败: HTTP ${resp.status}`);

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpeg';
    const buffer = Buffer.from(await resp.arrayBuffer());
    return `data:image/${ext};base64,${buffer.toString('base64')}`;
  }

  /**
   * 本地文件转 Base64
   */
  protected imageToBase64(imagePath: string): string {
    const absolutePath = path.resolve(imagePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`文件不存在: ${absolutePath}`);
    }
    const buffer = fs.readFileSync(absolutePath);
    const ext = path.extname(absolutePath).slice(1) || 'png';
    return `data:image/${ext};base64,${buffer.toString('base64')}`;
  }

  /**
   * 统一处理图片输入，确保都是 Base64
   */
  protected async normalizeImage(input: ImageContent): Promise<string> {
    if (this.isBase64Image(input)) {
      return input;
    }
    if (this.isUrlImage(input)) {
      return await this.downloadToBase64(input);
    }
    return this.imageToBase64(input);
  }

  /**
   * 统一处理多张图片
   */
  protected async normalizeImages(inputs: ImageContent[]): Promise<string[]> {
    return await Promise.all(inputs.map((img) => this.normalizeImage(img)));
  }

  // ─── 辅助方法 ─────────────────────────────────────────────────

  /**
   * 构建图文混合消息内容
   */
  protected buildMultimodalContent(
    base64Image: string,
    text: string,
  ): MessageContent {
    return [
      { type: 'image_url', image_url: { url: base64Image } },
      { type: 'text', text },
    ];
  }

  /**
   * 构建多图对比消息内容
   */
  protected buildMultimodalContentForCompare(
    base64Images: string[],
    text: string,
  ): MessageContent {
    const imageParts = base64Images.map((img) => ({
      type: 'image_url' as const,
      image_url: { url: img },
    }));
    return [...imageParts, { type: 'text', text }];
  }
}
