# 西柚找词集成文档

## 概述

西柚找词爬虫已成功集成到工作流编辑器中，可以通过工作流节点自动抓取 Amazon 商品关键词数据。

## 集成架构

```
工作流编辑器 (前端)
    ↓ fetch('/api/keywords/xiyouzhaoci')
Hono API 服务器 (backend/server.ts)
    ↓ 调用
xiyouzhaociService (backend/services/xiyouzhaociService.ts)
    ↓ 使用 Playwright
西柚找词网站 (xiyouzhaoci.com)
    ↓ 返回
关键词数据 + CSV备份
```

## 新增文件

### 前端
1. **src/plugins/index.ts** - 新增 `xiyouzhaociPlugin` 节点插件
2. **src/components/Icons.tsx** - 新增 `search` 图标

### 后端
1. **backend/server.ts** - Hono API 服务器入口
2. **backend/api/keywords.ts** - 关键词 API 路由
3. **backend/services/xiyouzhaociService.ts** - 西柚找词爬虫服务
4. **backend/package.json** - 后端依赖配置
5. **backend/README.md** - 后端使用文档

## 使用方法

### 1. 启动后端服务器

```bash
cd backend
bun install
bun run dev
```

服务器将在 `http://localhost:3001` 启动。

### 2. 启动前端开发服务器

```bash
# 在 workflow-editor 根目录
npm run dev
```

前端将在 `http://localhost:5173` 启动。

### 3. 在工作流中使用节点

1. 从左侧面板找到「西柚找词 - 关键词挖掘」节点
2. 拖拽到画布中
3. 配置节点：
   - **手动输入 ASIN**：在节点配置中直接填写 ASIN
   - **从上游获取**：连接「Amazon 商品详情」节点，自动获取 ASIN
   - **无头模式**：开启后浏览器不显示（默认开启）
   - **最大关键词数**：限制返回的关键词数量（默认 50）

4. 运行工作流

## 节点配置

### 输入
- `asin` (可选) - 从上游节点获取的 ASIN

### 输出
- `asin` - 商品 ASIN
- `keywords` - 关键词列表
- `totalKeywords` - 总关键词数
- `topKeyword` - Top 1 关键词
- `csvPath` - CSV 备份文件路径
- `raw` - 完整关键词数据（包含搜索量、竞争度等）

### 配置项
- `asin` - 手动输入的 ASIN（优先级高于上游）
- `headless` - 是否使用无头模式（默认：true）
- `maxKeywords` - 最大关键词数（默认：50）

## 工作流示例

### 示例 1：直接使用 ASIN

```
[开始] → [西柚找词 - 关键词挖掘] → [结束]
```

配置西柚找词节点，手动输入 ASIN：`B08F5M1K9M`

### 示例 2：从上游获取 ASIN

```
[开始]
  → [GigaB2B 爬虫]
  → [AI 图片识别]
  → [Amazon 竞品搜索]
  → [Amazon 商品详情]
  → [西柚找词 - 关键词挖掘]  ← 自动获取 ASIN
  → [结束]
```

## API 端点

### POST /api/keywords/xiyouzhaoci

抓取西柚找词关键词数据。

**请求：**
```json
{
  "asin": "B08F5M1K9M",
  "headless": true,
  "maxKeywords": 50
}
```

**响应：**
```json
{
  "success": true,
  "asin": "B08F5M1K9M",
  "keywords": [
    {
      "rank": 1,
      "keyword": "example keyword",
      "searchVolume": "10000",
      "searchVolumeTrend": "+5.2%",
      "trafficShare": "12.5%",
      "rankingPosition": "1",
      "difficulty": "45",
      "clickRate": "3.2%",
      "conversionRate": "2.1%"
    }
  ],
  "totalKeywords": 42,
  "csvPath": "./output/keywords/keywords-B08F5M1K9M-1234567890.csv"
}
```

## 错误处理

### 常见错误

1. **ASIN 格式错误**
   - 错误：`Invalid ASIN format`
   - 解决：确保 ASIN 是 10 位字母数字组合

2. **网站反爬**
   - 错误：`Failed to extract table data`
   - 解决：增加等待时间或使用有头模式

3. **浏览器未安装**
   - 错误：`Executable doesn't exist`
   - 解决：运行 `npx playwright install chromium`

## 性能优化

1. **并发限制**：当前实现每次抓取一个 ASIN，可扩展支持并发
2. **缓存**：可添加 Redis 缓存已抓取的关键词数据
3. **数据库**：可将关键词数据保存到 PostgreSQL 进行持久化

## 后续优化

- [ ] 支持批量 ASIN 抓取
- [ ] 添加数据库持久化
- [ ] 实现关键词数据缓存
- [ ] 添加进度反馈
- [ ] 支持自定义搜索时间范围
- [ ] 添加关键词过滤功能

## 注意事项

1. **浏览器数据目录**：`.chrome-data` 目录会保存浏览器会话信息
2. **CSV 输出**：所有抓取结果都会保存 CSV 备份到 `output/keywords/`
3. **爬虫延迟**：每次抓取约需 15-30 秒
4. **网站限制**：西柚找词可能有反爬机制，建议控制请求频率

## 技术栈

- **前端**：React + TypeScript + Vite
- **后端**：Hono + Bun
- **爬虫**：Playwright
- **数据**：CSV 文件 + PostgreSQL（可选）

## 开发者

如需修改爬虫逻辑，请编辑 `backend/services/xiyouzhaociService.ts`。

如需添加新的节点配置，请编辑 `src/plugins/index.ts` 中的 `xiyouzhaociPlugin`。
