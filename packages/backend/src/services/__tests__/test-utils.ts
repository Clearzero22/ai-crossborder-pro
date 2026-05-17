/**
 * 测试工具函数
 * 提供通用的测试辅助函数
 */

import * as fs from 'fs';
import * as path from 'path';

// 加载测试数据
export function loadTestData<T = any>(filePath: string): T {
  const fullPath = path.join(__dirname, 'fixtures', filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

// 生成随机字符串
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

// 生成随机数字
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 延迟执行
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 重试函数
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        console.log(`重试 ${attempt}/${maxAttempts}...`);
        await delay(delayMs);
      }
    }
  }

  throw lastError!;
}

// 验证 ASIN 格式
export function isValidASIN(asin: string): boolean {
  return /^[A-Z0-9]{10}$/.test(asin);
}

// 验证 Amazon 链接格式
export function isValidAmazonLink(link: string): boolean {
  return /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}$/.test(link);
}

// 验证价格格式
export function isValidPrice(price: string): boolean {
  return /^\$?\d+(\.\d{2})?$/.test(price);
}

// 验证评分格式
export function isValidRating(rating: string): boolean {
  return /^\d(\.\d)?\s*out of\s*5\s*stars?$/i.test(rating) ||
         /^\d(\.\d)?\s*星$/i.test(rating);
}

// 清理字符串
export function cleanString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

// 提取数字
export function extractNumber(str: string): number | null {
  const match = str.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

// 检查对象是否有属性
export function hasProperties(obj: any, properties: string[]): boolean {
  return properties.every(prop => prop in obj && obj[prop] !== undefined);
}

// 深度比较对象
export function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// 格式化时间
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

// 创建测试报告目录
export function ensureReportDir(): string {
  const reportDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  return reportDir;
}

// 保存测试结果
export function saveTestResult(
  testName: string,
  result: any,
  filename?: string
): string {
  const reportDir = ensureReportDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `${testName}_${timestamp}.json`;
  const finalFilename = filename || defaultFilename;
  const filepath = path.join(reportDir, finalFilename);

  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  return filepath;
}

// 加载测试结果
export function loadTestResult(filename: string): any {
  const reportDir = ensureReportDir();
  const filepath = path.join(reportDir, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`测试结果文件不存在: ${filename}`);
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

// 环境变量获取
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`环境变量未设置: ${key}`);
  }
  return value;
}

// 检查环境
export function getTestEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV || 'development';
  if (!['development', 'staging', 'production'].includes(env)) {
    throw new Error(`无效的环境: ${env}`);
  }
  return env as 'development' | 'staging' | 'production';
}

// 条件测试
export function shouldSkipTest(testName: string): boolean {
  const skipTests = process.env.SKIP_TESTS?.split(',') || [];
  return skipTests.includes(testName);
}

// 并行执行测试
export async function parallel<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number = 3
): Promise<T[]> {
  const results: T[] = [];
  const executing: Array<Promise<void>> = [];

  for (const task of tasks) {
    const promise = task().then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// 超时包装器
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = '操作超时'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}