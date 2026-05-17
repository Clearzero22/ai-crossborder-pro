# 这个文件是整个项目h核心节点插件的注册中心，定义了所有的工作流节点的类型、配置和执行逻辑

## 📋 文件结构概览
### 1️⃣ 头部注释和类型导入
文件开头有详细的中文注释，说明了如何创建新节点，然后导入了：

- NodePlugin 类型（来自 ../engine/pluginTypes ）
- pluginRegistry （来自 ../engine/pluginRegistry ）
- 一些 mock executor（来自 ../engine/mockExecutors ）
### 2️⃣ 节点类型分类 🔄 流程控制节点 (2个)
节点ID 名称 说明 start 开始节点 工作流执行的起点 end 结束节点 工作流执行的终点
 🌐 浏览器/爬虫业务节点 (8个)
节点ID 名称 功能 open-amazon 打开亚马逊商品页面 Mock节点 extract-info 提取商品信息 Mock节点 open-shopify 打开Amazon后台 Mock节点 fill-info 填写商品信息 Mock节点 upload-images 上传商品图片 Mock节点 publish 发布商品 Mock节点 gigab2b-crawl GigaB2B爬虫 从GigaB2B抓取商品数据 amazon-search Amazon竞品搜索 使用关键词搜索竞品 amazon-product Amazon商品详情 抓取商品完整信息
 🧠 AI节点 (2个)
节点ID 名称 功能 ai-optimize AI优化商品文案 使用Gemini/ChatGPT优化Listing ai-vision AI图片识别 识别电商图片内容
 🔍 关键词挖掘节点 (1个)
节点ID 名称 功能 xiyouzhaoci-keywords 西柚找词 - 关键词挖掘 抓取Amazon关键词数据
 📊 数据处理节点 (3个)
节点ID 名称 功能 view-runs 查看运行记录 查询爬虫运行历史 http-request HTTP请求 发送自定义HTTP请求 send-email 发送邮件通知 示例节点

## 🏗️ NodePlugin 核心结构
每个节点插件都遵循以下结构：

```
{
  id: '节点唯一ID',              // 关键：用于识别节点类型
  label: '显示名称',
  description: '描述',
  icon: '图标名称',             // 需要在 Icons.tsx 中注册
  category: '分类',            // flow | browser | ai | data
  nodeType: '节点类型',         // start | end | step
  panelGroup: '面板分组',
  panelColor: '面板颜色',
  executor: {                   // 执行器配置
    type: '同id',
    label: '同label',
    icon: '同icon',
    category: '同category',
    inputSchema: { ... },      // 输入数据的类型定义
    outputSchema: { ... },     // 输出数据的类型定义
    configSchema: { ... },     // 配置表单的字段定义
    async execute(ctx) { ... } // 核心执行逻辑
  }
}
```
## 🔑 核心节点详解
### 🧠 ai-optimize（AI优化商品文案）
这是最复杂的节点，功能包括：

- 支持 Gemini、ChatGPT、并行对比三种模式
- 可输入商品信息或从上游获取
- 自动提取上游竞品 Listing 数据
- 注入西柚找词关键词数据
- 智能生成提示词
- 解析 AI 回复并结构化输出
### 🌐 gigab2b-crawl（GigaB2B爬虫）
- 抓取商品标题、价格、描述、图片、规格
- 支持无头模式
- 输出结构化数据
### 🔍 amazon-search & amazon-product
- amazon-search : 关键词搜索 → 获取 ASIN 列表
- amazon-product : ASIN/链接 → 获取完整商品信息
### 🤖 ai-vision（AI图片识别）
- 支持8种识别模板（提取关键词、产品分析、OCR等）
- 支持自定义提示词
- 批量处理图片
### 🔎 xiyouzhaoci-keywords（西柚找词）
- 抓取关键词搜索量、难度、流量份额
- 输出完整关键词数据 JSON
- 透传上游竞品数据
## 📝 节点注册
文件底部有完整的插件数组和自动注册：

```
export const plugins: NodePlugin[] = [
  startPlugin,
  gigab2bCrawlPlugin,
  aiVisionPlugin,
  // ... 其他节点
  endPlugin,
];

pluginRegistry.registerAll(plugins);
```
注意 ：数组的顺序就是画布上节点从上到下的显示顺序！

## 🚀 如何创建新节点
根据文件头部的注释，创建新节点只需3步：

1. 在本文件添加一个 NodePlugin 对象
2. 在 src/components/Icons.tsx 注册图标
3. 在底部的 plugins 数组中添加引用
这个文件是整个系统的"插件库"，定义了所有可用的工作流节点，是理解和修改项目的核心入口！