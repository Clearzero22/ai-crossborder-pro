# 西柚找词节点状态检查报告

生成时间：2026-04-28 23:45

## ✅ 前端集成状态

### 1. 节点插件注册
- ✅ **已注册**：`xiyouzhaociPlugin` 已添加到 `src/plugins/index.ts`
- ✅ **ID**：`xiyouzhaoci-keywords`
- ✅ **标签**：西柚找词 - 关键词挖掘
- ✅ **图标**：`search` (已添加到 Icons.tsx)
- ✅ **分类**：`browser` (浏览器自动化)
- ✅ **面板分组**：`browser` (蓝色)

### 2. 节点配置
```typescript
inputSchema: {
  asin: { type: 'string', label: '上游 ASIN（来自 Amazon 商品详情）' }
}

outputSchema: {
  asin: { type: 'string', label: '商品 ASIN' },
  keywords: { type: 'string[]', label: '关键词列表' },
  totalKeywords: { type: 'number', label: '总关键词数' },
  topKeyword: { type: 'string', label: 'Top 1 关键词' },
  csvPath: { type: 'string', label: 'CSV 备份路径' }
}

configSchema: {
  asin: { type: 'string', label: 'ASIN（手动输入，优先级高于上游）' },
  headless: { type: 'boolean', label: '无头模式', default: true },
  maxKeywords: { type: 'number', label: '最大关键词数', default: 50 }
}
```

### 3. 插件数组位置
```typescript
export const plugins: NodePlugin[] = [
  startPlugin,
  gigab2bCrawlPlugin,
  aiVisionPlugin,
  amazonSearchPlugin,
  amazonProductPlugin,
  xiyouzhaociPlugin,  // ← 第 6 位
  extractInfoPlugin,
  aiOptimizePlugin,
  ...
];
```

**节点在工作流编辑器左侧面板的显示位置**：
- 分组：「浏览器自动化」
- 位置：Amazon 商品详情节点之后
- 颜色：蓝色

## ✅ 后端集成状态

### 1. API 服务
- ✅ **文件**：`backend/api/keywords.ts`
- ✅ **路由**：`POST /api/keywords/xiyouzhaoci`
- ✅ **CORS**：已配置，允许 `localhost:5173` 访问

### 2. 爬虫服务
- ✅ **文件**：`backend/services/xiyouzhaociService.ts`
- ✅ **核心函数**：`scrapeXiyouzhaociKeywords(asin, options)`
- ✅ **依赖**：Playwright (已安装)

### 3. 服务器入口
- ✅ **文件**：`backend/server.ts`
- ✅ **端口**：3001
- ✅ **路由注册**：已挂载 `/api/keywords` 路由

### 4. 依赖包
```json
{
  "hono": "^4.0.0",
  "playwright": "^1.58.2"
}
```
✅ 已安装

## 🖥️ 服务器状态

### 前端开发服务器
- ✅ **运行中**：http://localhost:5173
- ✅ **进程**：node (PID: 29015)

### 后端 API 服务器
- ❌ **未运行**：需要启动
- **启动命令**：
  ```bash
  cd backend
  bun run dev
  ```

## 📊 工作流中的位置

在左侧节点面板中，西柚找词节点位于：

```
┌─────────────────────────────┐
│  浏览器自动化 (蓝色)         │
├─────────────────────────────┤
│ □ GigaB2B 爬虫              │
│ □ AI 图片识别               │
│ □ Amazon 竞品搜索           │
│ □ Amazon 商品详情           │
│ □ 西柚找词 - 关键词挖掘 ⭐  │ ← 这里
│ □ 打开 Shopify 后台         │
│ □ 填写商品信息              │
│ □ 上传商品图片              │
│ □ 发布商品                  │
└─────────────────────────────┘
```

## 🔗 推荐连接方式

### 方式 1：从 Amazon 商品详情获取 ASIN
```
[Amazon 商品详情] → [西柚找词 - 关键词挖掘]
```

**连接**：
- Amazon 商品详情 的 `asin` 输出
- → 西柚找词 的 `asin` 输入

### 方式 2：从 Amazon 竞品搜索获取 ASIN
```
[Amazon 竞品搜索] → [西柚找词 - 关键词挖掘]
```

**连接**：
- Amazon 竞品搜索 的 `asins` 输出（数组）
- → 西柚找词 的 `asin` 输入（自动取第一个）

### 方式 3：手动配置 ASIN
```
[开始] → [西柚找词 - 关键词挖掘] → [结束]
```

**配置**：
- 在西柚找词节点配置中填写 ASIN（如：`B08F5M1K9M`）

## ⚠️ 待启动服务

要使用西柚找词节点，需要：

1. **启动后端服务器**：
   ```bash
   cd backend
   bun run dev
   ```

2. **验证服务**：
   访问 http://localhost:3001/api/health
   应返回：`{"status":"ok",...}`

## 🧪 测试步骤

1. 确保后端服务器运行在 `localhost:3001`
2. 打开工作流编辑器：http://localhost:5173
3. 从左侧面板拖拽「西柚找词 - 关键词挖掘」节点到画布
4. 配置节点：
   - 方式 A：手动输入 ASIN
   - 方式 B：连接上游 Amazon 商品详情节点
5. 点击「运行」按钮
6. 查看节点输出结果

## 📝 预期输出

成功运行后，节点将输出：

```json
{
  "asin": "B08F5M1K9M",
  "keywords": [
    "wireless headphones",
    "bluetooth headset",
    "noise cancelling headphones",
    ...
  ],
  "totalKeywords": 50,
  "topKeyword": "wireless headphones",
  "csvPath": "./output/keywords/keywords-B08F5M1K9M-1714321234567.csv"
}
```

## ✨ 总结

西柚找词节点已完全集成到工作流编辑器中：

✅ 前端节点已注册并可见
✅ 后端 API 已实现
✅ 图标已添加
✅ 配置项已设置
✅ 与上游节点的数据流已定义

**唯一需要做的**：启动后端服务器 (`cd backend && bun run dev`)
