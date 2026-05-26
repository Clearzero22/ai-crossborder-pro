/**
 * API Key 配置管理
 *
 * 功能：
 * - 使用 AES-256-GCM 加密存储 API Keys
 * - 支持运行时热重载 Provider 配置
 * - 提供统一的配置管理接口
 *
 * 存储格式（settings 表）：
 * - ai_key_qwen: 加密后的 Qwen API Key
 * - ai_key_openai: 加密后的 OpenAI API Key
 * - ai_key_claude: 加密后的 Claude API Key
 * - ai_key_gemini: 加密后的 Gemini API Key
 * - ai_baseurl_qwen: 明文存储的 Base URL
 * - ai_baseurl_openai: 明文存储的 Base URL
 * - ai_baseurl_claude: 明文存储的 Base URL
 * - ai_baseurl_gemini: 明文存储的 Base URL
 */

import crypto from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs';

interface DbAccess {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

export interface ApiKeyConfig {
  apiKey: string;
  baseURL?: string;
}

export interface ProviderConfig {
  name: string;
  label: string;
  description: string;
  hasKey: boolean;
  baseURL?: string;
  defaultBaseURL: string;
}

export type ProviderName = 'qwen' | 'openai' | 'claude' | 'gemini';

// Provider 元数据
const PROVIDER_METADATA: Record<ProviderName, { label: string; description: string; defaultBaseURL: string; envKeyName: string }> = {
  qwen: {
    label: '阿里云 DashScope (Qwen)',
    description: '通义千问系列模型，适合中文场景',
    defaultBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    envKeyName: 'DASHSCOPE_API_KEY',
  },
  openai: {
    label: 'OpenAI',
    description: 'GPT-4o / GPT-4o-mini 系列模型',
    defaultBaseURL: 'https://api.openai.com/v1',
    envKeyName: 'OPENAI_API_KEY',
  },
  claude: {
    label: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet 系列模型',
    defaultBaseURL: 'https://api.anthropic.com',
    envKeyName: 'CLAUDE_API_KEY',
  },
  gemini: {
    label: 'Google Gemini',
    description: 'Gemini Pro / Gemini Flash 系列模型',
    defaultBaseURL: 'https://generativelanguage.googleapis.com',
    envKeyName: 'GEMINI_API_KEY',
  },
};

class ApiKeyConfigManager {
  private db: DbAccess | null = null;
  private encryptionKey: Buffer | null = null;

  setDb(db: DbAccess): void {
    this.db = db;
  }

  /**
   * 获取或派生加密密钥
   * 使用机器标识符 + 固定 salt 派生 32 字节密钥
   */
  private getEncryptionKey(): Buffer {
    if (this.encryptionKey) return this.encryptionKey;

    // 尝试获取机器唯一标识
    let machineId = this.getMachineId();

    // 派生 32 字节密钥
    this.encryptionKey = crypto.scryptSync(machineId, 'ai-crossborder-pro-salt', 32);
    return this.encryptionKey;
  }

  /**
   * 获取机器标识符
   * 优先使用存储在用户数据目录的标识符，不存在则生成并保存
   */
  private getMachineId(): string {
    const userDataDir = process.env.APP_USER_DATA_DIR || os.homedir();
    const idFile = path.join(userDataDir, '.ai-crossborder-machine-id');

    try {
      if (fs.existsSync(idFile)) {
        return fs.readFileSync(idFile, 'utf-8').trim();
      }
    } catch {
      // 忽略读取错误
    }

    // 生成新的标识符
    const newId = crypto.randomBytes(32).toString('hex');

    try {
      fs.mkdirSync(path.dirname(idFile), { recursive: true });
      fs.writeFileSync(idFile, newId, { mode: 0o600 }); // 仅所有者可读写
    } catch {
      // 如果无法写入文件，使用内存中的临时标识符
    }

    return newId;
  }

  /**
   * 加密 API Key
   */
  encryptApiKey(apiKey: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(apiKey, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 格式: iv:authTag:ciphertext (base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * 解密 API Key
   */
  decryptApiKey(encrypted: string): string | null {
    try {
      const key = this.getEncryptionKey();
      const parts = encrypted.split(':');

      if (parts.length !== 3) return null;

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const ciphertext = Buffer.from(parts[2], 'base64');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf-8');
    } catch (err) {
      console.error('[ApiKeyConfig] Failed to decrypt API key:', err);
      return null;
    }
  }

  /**
   * 获取 Provider 配置（解密后）
   */
  async getProviderConfig(provider: ProviderName): Promise<ApiKeyConfig | null> {
    if (!this.db) {
      // 数据库不可用，尝试从环境变量读取
      return this.getConfigFromEnv(provider);
    }

    try {
      const encryptedKey = await this.db.getSetting(`ai_key_${provider}`);
      const baseURL = await this.db.getSetting(`ai_baseurl_${provider}`);

      if (!encryptedKey) {
        // 数据库没有配置，尝试环境变量
        return this.getConfigFromEnv(provider);
      }

      const apiKey = this.decryptApiKey(encryptedKey);
      if (!apiKey) return null;

      return {
        apiKey,
        baseURL: baseURL || PROVIDER_METADATA[provider].defaultBaseURL,
      };
    } catch (err) {
      console.error(`[ApiKeyConfig] Failed to get config for ${provider}:`, err);
      return this.getConfigFromEnv(provider);
    }
  }

  /**
   * 从环境变量获取配置
   */
  private getConfigFromEnv(provider: ProviderName): ApiKeyConfig | null {
    const meta = PROVIDER_METADATA[provider];
    const apiKey = process.env[meta.envKeyName];

    if (!apiKey) return null;

    const baseURLEnvVar = meta.envKeyName.replace('_API_KEY', '_BASE_URL');
    const baseURL = process.env[baseURLEnvVar] || meta.defaultBaseURL;

    return { apiKey, baseURL };
  }

  /**
   * 设置 Provider 配置（加密存储）
   */
  async setProviderConfig(provider: ProviderName, config: ApiKeyConfig): Promise<void> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    const encryptedKey = this.encryptApiKey(config.apiKey);
    await this.db.setSetting(`ai_key_${provider}`, encryptedKey);

    if (config.baseURL) {
      await this.db.setSetting(`ai_baseurl_${provider}`, config.baseURL);
    }

    console.log(`[ApiKeyConfig] Saved config for ${provider}`);
  }

  /**
   * 删除 Provider 配置
   */
  async deleteProviderConfig(provider: ProviderName): Promise<void> {
    if (!this.db) return;

    // 删除配置（通过设置空值）
    await this.db.setSetting(`ai_key_${provider}`, '');
    await this.db.setSetting(`ai_baseurl_${provider}`, '');

    console.log(`[ApiKeyConfig] Deleted config for ${provider}`);
  }

  /**
   * 获取所有 Provider 配置状态（脱敏）
   */
  async getAllProviderConfigs(): Promise<ProviderConfig[]> {
    const configs: ProviderConfig[] = [];

    for (const [name, meta] of Object.entries(PROVIDER_METADATA)) {
      const provider = name as ProviderName;
      const config = await this.getProviderConfig(provider);

      configs.push({
        name: provider,
        label: meta.label,
        description: meta.description,
        hasKey: !!config?.apiKey,
        baseURL: config?.baseURL || meta.defaultBaseURL,
        defaultBaseURL: meta.defaultBaseURL,
      });
    }

    return configs;
  }

  /**
   * 检查 Provider 是否已配置
   */
  async isProviderConfigured(provider: ProviderName): Promise<boolean> {
    const config = await this.getProviderConfig(provider);
    return !!config?.apiKey;
  }

  /**
   * 获取 Provider 元数据
   */
  getProviderMetadata(provider: ProviderName) {
    return PROVIDER_METADATA[provider];
  }

  /**
   * 获取所有 Provider 元数据
   */
  getAllProviderMetadata() {
    return PROVIDER_METADATA;
  }
}

export const apiKeyConfig = new ApiKeyConfigManager();
