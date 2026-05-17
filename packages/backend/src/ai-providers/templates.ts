/**
 * AI 提示词模板
 */

export interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  prompt: string;
  model?: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'product-analysis',
    label: '产品深度拆解',
    description: '针对亚马逊家居品类产品的全面结构化分析',
    prompt: `你现在是一名经验丰富的亚马逊家居品类选品分析师。请你针对这张产品图，进行一次全面、结构化的深度拆解。

1. 【产品定位与用途】
   - 产品名称：请给它一个准确的英文产品名称，适配亚马逊搜索习惯。
   - 核心用途：分析它的使用场景、目标用户、解决了什么痛点。
   - 核心卖点：从图片中识别出所有差异化的设计亮点。

2. 【结构与材质分析】
   - 材质：桌面、桌腿、底座分别是什么材质？请分析材质的优势与成本。
   - 结构：描述桌面形状、尺寸比例；桌腿的调节方式（高度？旋转？）；底座的设计特点与稳定性。
   - 细节功能：识别所有功能性设计，如杯架、手机/平板卡槽、防滑垫、边缘处理等。

3. 【颜色与外观分析】
   - 颜色方案：主体颜色、搭配颜色，分析这种配色在亚马逊市场的受众与流行度。
   - 风格：整体设计风格（现代、北欧、极简、日式等）。

4. 【市场与竞品初判】
   - 直接竞品：这类产品在亚马逊上的常见竞品形态是什么？
   - 差异化优势：和传统的圆形/方形边几相比，它的优势是什么？潜在劣势是什么？

请以清晰的分点形式输出，语言专业，适合用于后续撰写Listing和选品报告。`,
  },
  {
    id: 'general',
    label: '通用描述',
    description: '详细描述图片内容',
    prompt: '请详细描述这张图片的内容',
  },
  {
    id: 'extract-title',
    label: '提取商品标题',
    description: '从商品图片中提取标题',
    prompt: '这是一张电商商品图片。请提取商品标题/名称，只输出标题文本，不要额外解释。',
  },
  {
    id: 'extract-price',
    label: '提取价格',
    description: '从商品图片中识别价格',
    prompt: '这是一张电商商品图片。请提取图中所有价格信息（原价、促销价等），以 JSON 格式输出：{"prices": [{"label": "价格类型", "value": "金额"}]}',
  },
  {
    id: 'extract-specs',
    label: '提取规格参数',
    description: '从商品图中提取规格信息',
    prompt: '这是一张电商商品图片。请提取所有规格参数（尺寸、材质、颜色、重量等），以 JSON 格式输出：{"specifications": {"参数名": "参数值"}}',
  },
  {
    id: 'extract-features',
    label: '提取卖点',
    description: '从商品图中提炼核心卖点',
    prompt: '这是一张电商商品图片。请提炼商品的核心卖点，以简洁的列表形式输出，每条不超过20个字。',
  },
  {
    id: 'extract-search-keywords',
    label: '提取搜索关键词',
    description: '提取适合 Amazon 搜索的英文关键词',
    prompt: `这是一张电商商品图片。请分析图片中的商品，输出适合在 Amazon 上搜索该商品的英文关键词。

要求：
1. 用英文输出
2. 给出 3-5 组关键词，从短到长排列
3. 包含核心产品词 + 材质 + 用途/场景
4. 每组关键词一行，不要序号，不要解释

示例输出格式：
bamboo side table
c-shaped sofa side table
adjustable bamboo couch tray table
bamboo bed table with cup holder
多功能 c 形沙发边桌`,
  },
  {
    id: 'ocr',
    label: 'OCR 文字提取',
    description: '提取图中所有文字',
    prompt: '提取图中所有文字，保持原始排版格式输出',
  },
  {
    id: 'listing-copy',
    label: '生成 Listing 文案',
    description: '根据商品图生成 Amazon Listing',
    prompt: '这是一张电商商品图片。请根据图片内容生成一份 Amazon 商品 Listing，包含：\n1. 标题（200字符以内，关键词丰富）\n2. 五点描述（每点一行，以大写关键词开头）\n3. 搜索关键词（逗号分隔）',
  },
  {
    id: 'compare-products',
    label: '商品对比分析',
    description: '对比多张商品图的差异',
    prompt: '请对比这些商品图片，分析它们的差异，包括外观、功能、材质等方面，给出清晰的对比结论。',
  },
];

/** 根据 ID 查找模板 */
export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(t => t.id === id);
}

/** 获取所有模板列表 */
export function getPromptTemplates(): PromptTemplate[] {
  return PROMPT_TEMPLATES;
}
