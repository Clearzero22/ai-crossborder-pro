export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  gradient: string;
  nodeIds: string[];
  defaultConfigs?: Record<string, Record<string, unknown>>;
}

// templates.ts 工作流模板库
// 这是最核心的文件! 定义了预设的工作流模板
// 五个预设的模板 创建新品上架到Amazon
// Keyword-mining 关键词挖掘与分析
// competitor-analysis 竞品全面分析
// ai-copywriting AI 商品文案生成
// full-pipeline 全流程自动化


export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'amazon-product-listing',
    name: '创建新品并上架到Amazon',
    description: '从GigaB2B抓取商品，AI识别图片，优化文案，自动上架到Amazon后台',
    category: 'publish',
    categoryLabel: '上架管理',
    gradient: 'from-blue-500 to-indigo-600',
    nodeIds: ['start', 'gigab2b-crawl', 'ai-vision', 'extract-info', 'ai-optimize', 'open-shopify', 'fill-info', 'upload-images', 'publish', 'end'],
  },
  {
    id: 'keyword-mining',
    name: '关键词挖掘与分析',
    description: 'AI识别图片提取关键词，搜索Amazon竞品，挖掘西柚找词数据并优化文案',
    category: 'research',
    categoryLabel: '市场调研',
    gradient: 'from-emerald-500 to-teal-600',
    nodeIds: ['start', 'gigab2b-crawl', 'ai-vision', 'amazon-search', 'amazon-product', 'xiyouzhaoci-keywords', 'ai-optimize', 'send-email', 'end'],
  },
  {
    id: 'amazon-auto-selection',
    name: 'Amazon 自动化选品优化',
    description: '完整 6 步流水线：GigaB2B 爬取 → AI 识图提取关键词 → Amazon 竞品搜索 → 商品详情抓取 → 西柚找词 → AI 文案优化',
    category: 'research',
    categoryLabel: '市场调研',
    gradient: 'from-amber-500 to-orange-600',
    nodeIds: ['start', 'gigab2b-crawl', 'ai-vision', 'amazon-search', 'amazon-product', 'xiyouzhaoci-keywords', 'ai-optimize', 'end'],
    defaultConfigs: {
      'gigab2b-crawl': { productUrl: 'https://www.gigab2b.com/index.php?route=product/product&product_id=928649' },
      'ai-optimize': { executionMode: 'gemini' },
    },
  },
  {
    id: 'competitor-analysis',
    name: '竞品全面分析',
    description: '搜索Amazon竞品，抓取详情，挖掘关键词并生成对标分析报告',
    category: 'research',
    categoryLabel: '市场调研',
    gradient: 'from-violet-500 to-purple-600',
    nodeIds: ['start', 'amazon-search', 'amazon-product', 'xiyouzhaoci-keywords', 'ai-optimize', 'end'],
  },
  {
    id: 'ai-copywriting',
    name: 'AI商品文案生成',
    description: '抓取商品信息，AI生成优化的标题、五点描述和长描述',
    category: 'ai',
    categoryLabel: 'AI工具',
    gradient: 'from-pink-500 to-rose-600',
    nodeIds: ['start', 'gigab2b-crawl', 'ai-optimize', 'end'],
    defaultConfigs: {
      'ai-optimize': { executionMode: 'gemini' },
    },
  },
  {
    id: 'full-pipeline',
    name: '全流程自动化',
    description: '从爬虫到上架的完整流程，包含关键词挖掘和邮件通知',
    category: 'publish',
    categoryLabel: '上架管理',
    gradient: 'from-orange-500 to-red-600',
    nodeIds: ['start', 'gigab2b-crawl', 'ai-vision', 'amazon-search', 'amazon-product', 'xiyouzhaoci-keywords', 'extract-info', 'ai-optimize', 'open-shopify', 'fill-info', 'upload-images', 'publish', 'send-email', 'end'],
  },
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(t => t.id === id);
}

export const templateCategories = [
  { id: 'all', label: '全部' },
  { id: 'publish', label: '上架管理' },
  { id: 'research', label: '市场调研' },
  { id: 'ai', label: 'AI工具' },
];
