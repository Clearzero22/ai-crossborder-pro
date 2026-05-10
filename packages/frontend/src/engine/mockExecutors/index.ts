import type { NodeExecutor } from '../types';

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export const openAmazonMock: NodeExecutor = {
  type: 'open-amazon',
  label: '打开亚马逊商品页面',
  icon: 'globe',
  category: 'browser',
  inputSchema: {},
  outputSchema: {
    pageUrl: { type: 'string', label: '页面 URL' },
    pageTitle: { type: 'string', label: '页面标题' },
    pageLoaded: { type: 'boolean', label: '页面加载成功' },
  },
  configSchema: {
    productUrl: { type: 'string', label: '商品链接', default: 'https://amazon.com/dp/B0CXYZ1234' },
  },
  async execute(ctx) {
    ctx.logger('info', '正在打开亚马逊商品页面...');
    await delay(600 + Math.random() * 800);
    if (ctx.abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      pageUrl: 'https://amazon.com/dp/B0CXYZ1234',
      pageTitle: 'Sony WH-1000XM5 Wireless Headphones',
      pageLoaded: true,
    };
  },
};

export const extractInfoMock: NodeExecutor = {
  type: 'extract-info',
  label: '提取商品信息',
  icon: 'data',
  category: 'browser',
  inputSchema: {
    pageTitle: { type: 'string', label: '页面标题', required: true },
  },
  outputSchema: {
    title: { type: 'string', label: '商品标题' },
    price: { type: 'number', label: '价格' },
    rating: { type: 'number', label: '评分' },
    images: { type: 'string[]', label: '图片列表' },
  },
  configSchema: {},
  async execute(ctx) {
    ctx.logger('info', '正在提取商品信息...');
    await delay(600 + Math.random() * 800);
    if (ctx.abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
      price: 349.99,
      currency: 'USD',
      rating: 4.7,
      reviewCount: 12483,
      description: 'Industry-leading noise cancellation with Auto NC Optimizer.',
      mainImage: 'https://m.media-amazon.com/images/I/71QNxkqnRaL._AC_SL1500_.jpg',
      images: [
        'https://m.media-amazon.com/images/I/71QNxkqnRaL._AC_SL1500_.jpg',
        'https://m.media-amazon.com/images/I/71QNxkqnRaL._AC_SL1000_.jpg',
      ],
      brand: 'Sony',
      asin: 'B0CXYZ1234',
    };
  },
};

export const aiOptimizeMock: NodeExecutor = {
  type: 'ai-optimize',
  label: 'AI 优化商品文案',
  icon: 'zap',
  category: 'ai',
  inputSchema: {
    title: { type: 'string', label: '原标题', required: true },
    description: { type: 'string', label: '原描述' },
  },
  outputSchema: {
    optimizedTitle: { type: 'string', label: '优化标题' },
    optimizedDescription: { type: 'string', label: '优化描述' },
    seoKeywords: { type: 'string[]', label: 'SEO 关键词' },
  },
  configSchema: {
    model: {
      type: 'select', label: 'AI 模型',
      default: 'claude-3.5',
      options: [
        { label: 'Claude 3.5 Sonnet', value: 'claude-3.5' },
        { label: 'GPT-4o', value: 'gpt-4o' },
      ],
    },
    tone: {
      type: 'select', label: '语气',
      default: '专业',
      options: [
        { label: '专业', value: 'professional' },
        { label: '活泼', value: 'lively' },
        { label: '简洁', value: 'concise' },
      ],
    },
  },
  async execute(ctx) {
    ctx.logger('info', `调用 AI 模型: ${ctx.config.model}，语气: ${ctx.config.tone}`);
    await delay(1000 + Math.random() * 1500);
    if (ctx.abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    const title = (ctx.input.title as string) || '商品';
    return {
      optimizedTitle: title.replace(/Headphones/, 'Premium Wireless Noise Cancelling Headphones'),
      optimizedDescription: `Experience unparalleled audio clarity with ${title}. Features include industry-leading noise cancellation, 30-hour battery life, and comfortable over-ear design.`,
      seoKeywords: ['wireless headphones', 'noise cancelling', 'premium audio'],
      tone: ctx.config.tone,
    };
  },
};

export const openShopifyMock: NodeExecutor = {
  type: 'open-shopify',
  label: '打开 Shopify 后台',
  icon: 'globe',
  category: 'browser',
  inputSchema: {},
  outputSchema: {
    shopDomain: { type: 'string', label: '店铺域名' },
    loginStatus: { type: 'string', label: '登录状态' },
  },
  configSchema: {
    shopUrl: { type: 'string', label: 'Shopify 店铺地址', default: 'my-store.myshopify.com' },
  },
  async execute(ctx) {
    ctx.logger('info', '正在打开 Shopify 后台...');
    await delay(600 + Math.random() * 800);
    if (ctx.abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      shopDomain: 'my-store.myshopify.com',
      loginStatus: '已登录',
      adminUrl: 'https://my-store.myshopify.com/admin/products/new',
      isLoggedIn: true,
    };
  },
};

export const fillInfoMock: NodeExecutor = {
  type: 'fill-info',
  label: '填写商品信息',
  icon: 'edit',
  category: 'browser',
  inputSchema: {
    optimizedTitle: { type: 'string', label: '优化标题' },
    optimizedDescription: { type: 'string', label: '优化描述' },
  },
  outputSchema: {
    filledTitle: { type: 'string', label: '已填标题' },
    filledPrice: { type: 'string', label: '已填价格' },
  },
  configSchema: {},
  async execute(ctx) {
    ctx.logger('info', '正在填写商品信息到 Shopify...');
    await delay(800 + Math.random() * 1000);
    if (ctx.abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      filledTitle: (ctx.input.optimizedTitle as string) || '商品标题',
      filledDescription: (ctx.input.optimizedDescription as string) || '',
      filledPrice: '$349.99',
      vendor: 'Sony Official',
      productType: 'Electronics',
      tags: ['noise-cancelling', 'wireless', 'premium'],
      inventoryTracked: true,
      quantity: 50,
    };
  },
};

export const uploadImagesMock: NodeExecutor = {
  type: 'upload-images',
  label: '上传商品图片',
  icon: 'image',
  category: 'browser',
  inputSchema: {
    images: { type: 'string[]', label: '原始图片列表' },
  },
  outputSchema: {
    uploadedCount: { type: 'number', label: '已上传数量' },
    imageUrls: { type: 'string[]', label: '上传后图片地址' },
  },
  configSchema: {},
  async execute(ctx) {
    const images = (ctx.input.images as string[]) || [];
    ctx.logger('info', `正在上传 ${images.length || 2} 张商品图片...`);
    await delay(800 + Math.random() * 1000);
    if (ctx.abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      uploadedCount: images.length || 2,
      imageUrls: images,
      thumbnailGenerated: true,
    };
  },
};

export const publishMock: NodeExecutor = {
  type: 'publish',
  label: '发布商品',
  icon: 'upload',
  category: 'browser',
  inputSchema: {
    filledTitle: { type: 'string', label: '商品标题' },
  },
  outputSchema: {
    publishedUrl: { type: 'string', label: '发布链接' },
    publishStatus: { type: 'string', label: '发布状态' },
  },
  configSchema: {
    publishMode: {
      type: 'select', label: '发布模式',
      default: 'public',
      options: [
        { label: '公开发布', value: 'public' },
        { label: '草稿', value: 'draft' },
      ],
    },
  },
  async execute(ctx) {
    ctx.logger('info', '正在发布商品到 Shopify...');
    await delay(600 + Math.random() * 800);
    if (ctx.abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      publishedUrl: 'https://my-store.myshopify.com/products/sony-wh-1000xm5',
      publishStatus: 'published',
      publishedAt: new Date().toISOString(),
      visibility: 'public',
    };
  },
};

/** All mock executors for initial registration */
export const mockExecutors: NodeExecutor[] = [
  openAmazonMock,
  extractInfoMock,
  aiOptimizeMock,
  openShopifyMock,
  fillInfoMock,
  uploadImagesMock,
  publishMock,
];
