# 工作流节点数据传递分析文档

> 分析日期：2026-05-01
> 分支：feat/mobile-responsive
> 目的：梳理每个节点的输入/输出数据，识别数据传递断裂点

---

## 1. 数据传递机制

### 1.1 引擎执行流程

`WorkflowEngine.execute()` 的核心逻辑：

```typescript
// WorkflowEngine.ts
const stepNodes = nodes.filter(n => n.type === 'step');
this.dataBus.clear();

for (let i = 0; i < stepNodes.length; i++) {
  const previousOutput = i > 0 ? this.dataBus.getOutput(stepNodes[i - 1].id) : undefined;
  const output = await executor.execute({
    config: { ...nodeConfigs[node.id], ...globalConfig },
    input: previousOutput ?? {},
  });
  this.dataBus.setOutput(node.id, output);
}
```

**规则：**
- 只执行 `type === 'step'` 的节点，`start` 和 `end` 被过滤
- 节点 N 的 `input` = 节点 N-1 的 `output`（严格一对一相邻传递）
- 没有累积、没有合并、不能跨节点取数据
- 每次执行都会清空 DataBus

### 1.2 DataBus 能力

| 方法 | 用途 | 是否被引擎使用 |
|---|---|---|
| `setOutput(nodeId, data)` | 存储节点输出 | ✅ 使用 |
| `getOutput(nodeId)` | 按节点 ID 取输出 | ✅ 使用 |
| `resolve(template)` | 解析 `{{nodeId.field}}` 模板 | ❌ **死代码** |
| `getAllOutputs()` | 获取所有节点输出 | ❌ **死代码** |
| `clear()` | 清空所有数据 | ✅ 使用 |

`resolve()` 和 `getAllOutputs()` 已经实现但引擎从未调用，是潜在的能力浪费。

---

## 2. 节点详细输入输出

### 2.1 流程控制节点

#### start（开始节点）

| 属性 | 值 |
|---|---|
| 插件 ID | `start` |
| 分类 | flow |
| 执行器 | 内置 |
| 读取 ctx.input | 无 |
| 读取 ctx.config | 无 |
| 输出 | `{}` |

> 被引擎过滤，不参与执行。

#### end（结束节点）

| 属性 | 值 |
|---|---|
| 插件 ID | `end` |
| 分类 | flow |
| 执行器 | 内置 |
| 读取 ctx.input | 无 |
| 读取 ctx.config | 无 |
| 输出 | `{}` |

> 被引擎过滤，不参与执行。

---

### 2.2 浏览器自动化节点

#### open-amazon（打开亚马逊商品页面）

| 属性 | 值 |
|---|---|
| 插件 ID | `open-amazon` |
| 分类 | browser |
| 执行器类型 | **Mock** (`openAmazonMock`) |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| *(空)* | — | — | — |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `productUrl` | string | `https://amazon.com/dp/B0CXYZ1234` | ❌ mock 不读取 |

**outputSchema**

| 字段 | 类型 |
|---|---|
| `pageUrl` | string |
| `pageTitle` | string |
| `pageLoaded` | boolean |

**实际输出（mock 硬编码）：**
```json
{ "pageUrl": "https://amazon.com/dp/B0CXYZ1234", "pageTitle": "Sony WH-1000XM5", "pageLoaded": true }
```

**数据传递特性：** 数据源节点，不读取上游任何数据，产生全新输出。

---

#### extract-info（提取商品信息）

| 属性 | 值 |
|---|---|
| 插件 ID | `extract-info` |
| 分类 | browser |
| 执行器类型 | **Mock** (`extractInfoMock`) |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `pageTitle` | string | ✅ 是 | ❌ **不读取** |

**configSchema：** 空

**outputSchema（声明）**

| 字段 | 类型 |
|---|---|
| `title` | string |
| `price` | number |
| `rating` | number |
| `images` | string[] |

**实际输出（mock 硬编码，含未声明字段）：**
```json
{
  "title": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
  "price": 349.99,
  "currency": "USD",
  "rating": 4.7,
  "reviewCount": 12483,
  "description": "Industry-leading noise cancellation...",
  "mainImage": "https://m.media-amazon.com/images/I/71QNxkqnRaL._AC_SL1500_.jpg",
  "images": ["https://m.media-amazon.com/images/I/71QNxkqnRaL._AC_SL1500_.jpg"],
  "brand": "Sony",
  "asin": "B0CXYZ1234"
}
```

> ⚠️ 实际输出 9 个字段，但 outputSchema 只声明了 4 个。`currency`、`reviewCount`、`description`、`mainImage`、`brand`、`asin` 是未声明的隐藏字段。

**数据传递特性：** Mock 不读取 `ctx.input`，完全硬编码。声明了 `pageTitle` 必填但从不使用。

---

#### open-shopify（打开 Shopify 后台）

| 属性 | 值 |
|---|---|
| 插件 ID | `open-shopify` |
| 分类 | browser |
| 执行器类型 | **Mock** (`openShopifyMock`) |

**inputSchema：** 空

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `shopUrl` | string | `my-store.myshopify.com` | ❌ mock 不读取 |

**outputSchema（声明）**

| 字段 | 类型 |
|---|---|
| `shopDomain` | string |
| `loginStatus` | string |

**实际输出（含未声明字段）：**
```json
{ "shopDomain": "my-store.myshopify.com", "loginStatus": "已登录", "adminUrl": "https://my-store.myshopify.com/admin/products/new", "isLoggedIn": true }
```

**数据传递特性：** 阶段切换节点，不读取上游数据，产生全新的 Shopify 相关输出。会**打断所有上游数据链**。

---

#### fill-info（填写商品信息）

| 属性 | 值 |
|---|---|
| 插件 ID | `fill-info` |
| 分类 | browser |
| 执行器类型 | **Mock** (`fillInfoMock`) |

**inputSchema**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `optimizedTitle` | string | 否 | ✅ 读取 |
| `optimizedDescription` | string | 否 | ✅ 读取 |

**configSchema：** 空

**outputSchema（声明）**

| 字段 | 类型 |
|---|---|
| `filledTitle` | string |
| `filledPrice` | string |

**实际输出（含未声明字段）：**
```json
{
  "filledTitle": "<ctx.input.optimizedTitle 或 '商品标题'>",
  "filledDescription": "<ctx.input.optimizedDescription 或 ''>",
  "filledPrice": "$349.99",
  "vendor": "Sony Official",
  "productType": "Electronics",
  "tags": ["noise-cancelling", "wireless", "premium"],
  "inventoryTracked": true,
  "quantity": 50
}
```

**数据传递特性：** 消费上游 `optimizedTitle` 和 `optimizedDescription`。如果上游没有这些字段，退回硬编码默认值 `'商品标题'` 和空字符串。

---

#### upload-images（上传商品图片）

| 属性 | 值 |
|---|---|
| 插件 ID | `upload-images` |
| 分类 | browser |
| 执行器类型 | **Mock** (`uploadImagesMock`) |

**inputSchema**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `images` | string[] | 否 | ✅ 读取 |

**configSchema：** 空

**outputSchema（声明）**

| 字段 | 类型 |
|---|---|
| `uploadedCount` | number |
| `imageUrls` | string[] |

**实际输出（含未声明字段）：**
```json
{ "uploadedCount": "<images.length 或 2>", "imageUrls": "<images 或 []>", "thumbnailGenerated": true }
```

**数据传递特性：** 消费上游 `images` 数组。如果上游没有此字段，退回空数组（上传 0 张）。

---

#### publish（发布商品）

| 属性 | 值 |
|---|---|
| 插件 ID | `publish` |
| 分类 | browser |
| 执行器类型 | **Mock** (`publishMock`) |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `filledTitle` | string | 否 | ❌ **不读取** |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `publishMode` | select | `public` | ❌ mock 不读取 |

**outputSchema（声明）**

| 字段 | 类型 |
|---|---|
| `publishedUrl` | string |
| `publishStatus` | string |

**实际输出（含未声明字段）：**
```json
{ "publishedUrl": "https://my-store.myshopify.com/products/sony-wh-1000xm5", "publishStatus": "published", "publishedAt": "2026-05-01T...", "visibility": "public" }
```

**数据传递特性：** Mock 完全硬编码，声明了 `filledTitle` 输入但从不读取。真实场景下应使用上游的 `filledTitle` 生成发布 URL。

---

### 2.3 AI 节点

#### ai-vision（AI 图片识别）

| 属性 | 值 |
|---|---|
| 插件 ID | `ai-vision` |
| 分类 | ai |
| 执行器类型 | **Inline**（真实实现，调用 DashScope API） |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `images` | string[] | 否 | ✅ 读取 |
| *(未声明)* | | | |
| `runId` | string | — | ✅ 读取（未在 schema 中声明） |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `templateId` | select | `extract-features` | ✅ 读取 |
| `customPrompt` | string | 空 | ✅ 读取 |
| `maxImages` | number | `5` | ✅ 读取 |

**outputSchema**

| 字段 | 类型 |
|---|---|
| `results` | string[] |
| `firstResult` | string |
| `imageCount` | number |
| `runId` | string |

**数据传递特性：** 消费上游 `images` 数组，必须有图片才能工作。可通过 config 的 `templateId` 选择 10 种预设提示模板。

---

#### ai-optimize（AI 优化商品文案）

| 属性 | 值 |
|---|---|
| 插件 ID | `ai-optimize` |
| 分类 | ai |
| 执行器类型 | **Inline**（真实实现，调用 Gemini/ChatGPT） |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `title` | string | 否 | ✅ 读取 |
| `description` | string | 否 | ✅ 读取 |
| `bulletPoints` | string[] | 否 | ✅ 读取 |
| `longDescription` | string | 否 | ✅ 读取 |
| `images` | string[] | 否 | ✅ 读取 |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `productTitle` | string | 空 | ✅ 读取（优先级高于 input） |
| `productDescription` | string | 空 | ✅ 读取（优先级高于 input） |
| `productBulletPoints` | string | 空 | ✅ 读取（优先级高于 input） |
| `productLongDescription` | string | 空 | ✅ 读取（优先级高于 input） |
| `executionMode` | select | `gemini` | ✅ 读取 |
| `customPrompt` | string | 空 | ✅ 读取 |
| `headless` | boolean | `true` | ✅ 读取 |
| `responseTimeout` | number | `60` | ✅ 读取 |
| `useImage` | boolean | `false` | ✅ 读取 |

**优先级规则：** config 字段 > input 字段 > 报错

**outputSchema**

| 字段 | 类型 |
|---|---|
| `optimizedTitle` | string |
| `optimizedDescription` | string |
| `seoKeywords` | string[] |
| `response` | string |
| `chatgptTitle` | string（仅 parallel 模式） |
| `chatgptDescription` | string（仅 parallel 模式） |
| `chatgptKeywords` | string[]（仅 parallel 模式） |
| `chatgptResponse` | string（仅 parallel 模式） |

**数据传递特性：** 这是数据传递最完整的节点。同时支持从上游 input 和用户 config 获取数据，config 优先。注意：`bulletPoints` 和 `longDescription` 字段在大多数上游节点的输出中不存在。

---

### 2.4 数据节点

#### gigab2b-crawl（GigaB2B 爬虫）

| 属性 | 值 |
|---|---|
| 插件 ID | `gigab2b-crawl` |
| 分类 | browser |
| 执行器类型 | **Inline**（真实实现，调用 `/api/crawl/gigab2b`） |

**inputSchema：** 空

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `productUrl` | string | `https://www.gigab2b.com/...` | ✅ 读取 |
| `headless` | boolean | `true` | ✅ 读取 |

**outputSchema（声明）**

| 字段 | 类型 |
|---|---|
| `runId` | string |
| `externalId` | string |
| `title` | string |
| `price` | number |
| `currency` | string |
| `description` | string |
| `images` | string[] |

**实际输出含未声明字段：** `specifications`

**数据传递特性：** 数据源节点，从 config 的 URL 获取数据，不读取上游。

---

#### amazon-search（Amazon 竞品搜索）

| 属性 | 值 |
|---|---|
| 插件 ID | `amazon-search` |
| 分类 | browser |
| 执行器类型 | **Inline**（真实实现，调用 `/api/search/amazon`） |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `firstResult` | string | 否 | ✅ 读取 |
| `results` | string[] | 否 | ❌ **不读取** |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `keyword` | string | 空 | ✅ 读取（优先级高于 input） |
| `maxResults` | number | `10` | ✅ 读取 |
| `useFirstLine` | boolean | `true` | ✅ 读取 |

**优先级规则：** config.keyword > input.firstResult（第一行）> 报错

**outputSchema**

| 字段 | 类型 |
|---|---|
| `keyword` | string |
| `asins` | string[] |
| `links` | string[] |
| `total` | number |

**数据传递特性：** 可消费 ai-vision 的 `firstResult` 作为搜索关键词，也可通过 config 手动指定。

---

#### amazon-product（Amazon 商品详情）

| 属性 | 值 |
|---|---|
| 插件 ID | `amazon-product` |
| 分类 | browser |
| 执行器类型 | **Inline**（真实实现，调用 `/api/scrape/amazon-product`） |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `asins` | string[] | 否 | ✅ 读取（取第一个） |
| `links` | string[] | 否 | ✅ 读取（取第一个） |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `asin` | string | 空 | ✅ 读取（优先级高于 input） |
| `productUrl` | string | 空 | ✅ 读取（优先级高于 input） |
| `headless` | boolean | `true` | ✅ 读取 |
| `saveToDb` | boolean | `true` | ✅ 读取 |

**优先级规则：** config.asin/config.productUrl > input.asins[0]/input.links[0]

**outputSchema**

| 字段 | 类型 |
|---|---|
| `asin` | string |
| `title` | string |
| `brand` | string |
| `price` | string |
| `rating` | string |
| `bulletPoints` | string[] |
| `longDescription` | string |
| `images` | string[] |
| `specifications` | string[] |
| `bestSellersRank` | string[] |

**数据传递特性：** 输出字段最丰富的节点之一。消费 amazon-search 的 `asins`/`links`。注意：这个节点输出 `bulletPoints` 和 `longDescription`，而 extract-info 不输出这些字段 — 如果用 amazon-product 替代 extract-info，可以解决 ai-optimize 缺少这两个字段的问题。

---

#### xiyouzhaoci-keywords（西柚找词 - 关键词挖掘）

| 属性 | 值 |
|---|---|
| 插件 ID | `xiyouzhaoci-keywords` |
| 分类 | browser |
| 执行器类型 | **Inline**（真实实现，调用 `/api/keywords/xiyouzhaoci`） |

**inputSchema**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `asin` | string | 否 | ✅ 读取 |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `defaultAsin` | string | `B08F5M1K9M` | ✅ 读取 |
| `asin` | string | 空 | ✅ 读取（优先级最高） |
| `headless` | boolean | `true` | ✅ 读取 |
| `maxKeywords` | number | `50` | ✅ 读取 |

**优先级规则：** config.asin > input.asin > config.defaultAsin

**outputSchema（声明）**

| 字段 | 类型 |
|---|---|
| `asin` | string |
| `keywords` | string[] |
| `totalKeywords` | number |
| `topKeyword` | string |
| `csvPath` | string |

**实际输出含未声明字段：** `raw`（完整关键词对象数组）

**数据传递特性：** 消费上游 `asin`，有三层 fallback。可独立运行（有默认 ASIN）。

---

#### view-runs（查看运行记录）

| 属性 | 值 |
|---|---|
| 插件 ID | `view-runs` |
| 分类 | data |
| 执行器类型 | **Inline**（真实实现，调用 `/api/runs`） |

**inputSchema：** 空

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `limit` | number | `10` | ✅ 读取 |

**outputSchema**

| 字段 | 类型 |
|---|---|
| `runs` | string[] |
| `total` | number |

**数据传递特性：** 独立查询节点，不读取上游数据，会打断数据链。

---

#### http-request（HTTP 请求）

| 属性 | 值 |
|---|---|
| 插件 ID | `http-request` |
| 分类 | data |
| 执行器类型 | **Inline**（真实实现） |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `body` | string | 否 | ✅ 读取（仅非 GET/HEAD） |
| `params` | object | 否 | ❌ **不读取** |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `url` | string | 无 | ✅ 读取 |
| `method` | select | `POST` | ✅ 读取 |
| `headers` | string | `{"Content-Type":"application/json"}` | ✅ 读取 |
| `timeout` | number | `30` | ✅ 读取 |
| `followRedirect` | boolean | `false` | ✅ 读取（但存在 bug） |

**outputSchema**

| 字段 | 类型 |
|---|---|
| `status` | number |
| `data` | object |
| `headers` | object |

**数据传递特性：** 独立节点，打断数据链。可接收上游 `body` 作为请求体。

---

#### send-email（发送邮件通知）

| 属性 | 值 |
|---|---|
| 插件 ID | `send-email` |
| 分类 | data |
| 执行器类型 | **Inline**（Mock 实现） |

**inputSchema（声明）**

| 字段 | 类型 | 必填 | 实际读取？ |
|---|---|---|---|
| `recipient` | string | 否 | ❌ **不读取** |
| `subject` | string | 否 | ❌ **不读取** |

**configSchema**

| 字段 | 类型 | 默认值 | 实际读取？ |
|---|---|---|---|
| `smtpHost` | string | 无 | ✅ 读取 |
| `smtpPort` | number | `587` | ❌ **不读取** |

**outputSchema**

| 字段 | 类型 |
|---|---|
| `sent` | boolean |
| `messageId` | string |

**数据传递特性：** Mock 实现仅延时返回固定结果，不实际读取 `recipient` 和 `subject`。

---

## 3. 节点数据传递矩阵

### 3.1 实际读取上游 input 的节点

每个下游节点实际从 `ctx.input` 中读取的字段：

| 下游节点 | 读取的上游字段 | 理想的上游节点 |
|---|---|---|
| `ai-vision` | `images`, `runId` | gigab2b-crawl, amazon-product, extract-info |
| `amazon-search` | `firstResult` | ai-vision |
| `amazon-product` | `asins`, `links` | amazon-search |
| `xiyouzhaoci-keywords` | `asin` | amazon-product |
| `extract-info` | *(不读取任何 input)* | — |
| `ai-optimize` | `title`, `description`, `bulletPoints`, `longDescription`, `images` | amazon-product, extract-info |
| `fill-info` | `optimizedTitle`, `optimizedDescription` | ai-optimize |
| `upload-images` | `images` | extract-info, amazon-product, gigab2b-crawl |
| `publish` | *(不读取任何 input)* | — |
| `send-email` | *(不读取任何 input)* | — |
| `http-request` | `body` | 任意（通用） |

### 3.2 不读取上游 input 的节点（数据链断裂源）

| 节点 | 声明的 inputSchema | 实际行为 |
|---|---|---|
| `open-amazon` | 空 | 输出全新数据，不读取上游 |
| `open-shopify` | 空 | 输出全新数据，不读取上游 |
| `gigab2b-crawl` | 空 | 从 config URL 获取，不读取上游 |
| `view-runs` | 空 | 从 API 查询，不读取上游 |
| `extract-info` | `{pageTitle}` 声明 | 声明了但不读取 |
| `publish` | `{filledTitle}` 声明 | 声明了但不读取 |
| `send-email` | `{recipient, subject}` 声明 | 声明了但不读取 |

---

## 4. Schema 不一致问题汇总

### 4.1 inputSchema 声明了但代码不读取

| 节点 | 声明字段 | 后果 |
|---|---|---|
| `extract-info` | `pageTitle` (必填) | 上游的 pageTitle 传递过来但被忽略 |
| `amazon-search` | `results` | ai-vision 的 results 数组被忽略 |
| `http-request` | `params` | URL 参数功能完全无效 |
| `publish` | `filledTitle` | 上游的 filledTitle 传递过来但被忽略 |
| `send-email` | `recipient`, `subject` | 邮件功能无法接收动态数据 |

### 4.2 configSchema 声明了但 Mock 不读取

| 节点 | 声明字段 | 后果 |
|---|---|---|
| `open-amazon` | `productUrl` | 用户在配置面板输入的 URL 被忽略 |
| `open-shopify` | `shopUrl` | 用户输入的店铺地址被忽略 |
| `publish` | `publishMode` | 发布模式选择无效 |

### 4.3 实际输出但 outputSchema 未声明

| 节点 | 未声明的输出字段 | 影响 |
|---|---|---|
| `gigab2b-crawl` | `specifications` | 下游无法知道有此字段 |
| `extract-info` | `currency`, `reviewCount`, `description`, `mainImage`, `brand`, `asin` | 6 个字段是隐藏的 |
| `open-shopify` | `adminUrl`, `isLoggedIn` | 2 个字段是隐藏的 |
| `fill-info` | `filledDescription`, `vendor`, `productType`, `tags`, `inventoryTracked`, `quantity` | 6 个字段是隐藏的 |
| `upload-images` | `thumbnailGenerated` | 1 个字段是隐藏的 |
| `publish` | `publishedAt`, `visibility` | 2 个字段是隐藏的 |
| `xiyouzhaoci-keywords` | `raw` | 完整关键词数据被隐藏 |

### 4.4 未声明但实际读取的 input 字段

| 节点 | 未声明的输入字段 | 影响 |
|---|---|---|
| `ai-vision` | `runId` | 文档和 UI 不显示此输入 |

---

## 5. 默认工作流数据链断裂分析

### 5.1 默认工作流节点顺序

```
start → open-amazon → extract-info → ai-optimize → open-shopify → fill-info → upload-images → publish → end
```

### 5.2 逐节点数据传递追踪

| 步骤 | 节点 | 实际接收的 input | 产出 output | 数据链状态 |
|---|---|---|---|---|
| 1 | `open-amazon` | `{}` (无上游) | `{pageUrl, pageTitle, pageLoaded}` | ✅ 正常启动 |
| 2 | `extract-info` | `{pageUrl, pageTitle, pageLoaded}` (上一节点输出) | `{title, price, ...}` (硬编码) | ⚠️ 声明需要 pageTitle 但不读取，实际硬编码 |
| 3 | `ai-optimize` | `{title, price, currency, ...}` (extract-info 输出) | `{optimizedTitle, optimizedDescription, seoKeywords}` | ⚠️ title ✅ description ✅ bulletPoints ❌ longDescription ❌ images ✅ |
| 4 | `open-shopify` | `{optimizedTitle, optimizedDescription, seoKeywords}` | `{shopDomain, loginStatus}` | ❌ **链断裂！** 优化数据全部丢失 |
| 5 | `fill-info` | `{shopDomain, loginStatus}` (open-shopify 输出) | `{filledTitle: '商品标题'}` | ❌ 没有 optimizedTitle，退回默认值 |
| 6 | `upload-images` | `{filledTitle, filledDescription, ...}` (fill-info 输出) | `{uploadedCount: 0, imageUrls: []}` | ❌ 没有 images 字段，上传 0 张 |
| 7 | `publish` | `{uploadedCount, imageUrls}` (upload-images 输出) | `{publishedUrl: '...'}` | ❌ 不读取 filledTitle，硬编码 URL |

### 5.3 断裂点汇总

| 断裂位置 | 原因 | 影响 |
|---|---|---|
| `extract-info` 不读取 input | Mock 硬编码，忽略 `pageTitle` | 如果后续换成真实执行器依赖页面 URL，会失败 |
| `ai-optimize` 缺少 `bulletPoints` | extract-info 不输出此字段 | AI 优化缺少五点描述素材 |
| `ai-optimize` 缺少 `longDescription` | extract-info 不输出此字段 | AI 优化缺少长描述素材 |
| `open-shopify` 打断数据链 | 输出完全不相关的新数据 | 后续所有节点丢失优化后的商品数据 |
| `fill-info` 收不到优化数据 | 因为 open-shopify 打断了链 | 退回默认值 `'商品标题'` |
| `upload-images` 收不到图片 | fill-info 不输出 `images` | 上传 0 张图片 |
| `publish` 不读取 input | Mock 硬编码 | 无法使用真实的商品标题 |

---

## 6. 可行数据链路

### 6.1 链路 A：Amazon 竞品分析（完整可用）

```
amazon-search → amazon-product → xiyouzhaoci-keywords
```

| 传递 | 字段 | 状态 |
|---|---|---|
| search → product | `asins`, `links` | ✅ |
| product → xiyouzhaoci | `asin` | ✅ |

### 6.2 链路 B：GigaB2B → AI 分析（完整可用）

```
gigab2b-crawl → ai-vision → amazon-search → amazon-product
```

| 传递 | 字段 | 状态 |
|---|---|---|
| crawl → vision | `images` | ✅ |
| vision → search | `firstResult` | ✅ |
| search → product | `asins`, `links` | ✅ |

### 6.3 链路 C：Amazon 商品 → AI 优化（需修改）

```
amazon-product → ai-optimize
```

| 传递 | 字段 | 状态 |
|---|---|---|
| product → optimize | `title`, `description`, `bulletPoints`, `longDescription`, `images` | ✅ **全部匹配** |

> ⭐ 关键发现：用 `amazon-product`（真实执行器）替代 `extract-info`（mock），可以解决 ai-optimize 缺少 bulletPoints 和 longDescription 的问题。

### 6.4 链路 D：AI 优化 → 填写 → 发布（需改默认顺序）

```
ai-optimize → fill-info → upload-images → publish
```

| 传递 | 字段 | 状态 |
|---|---|---|
| optimize → fill | `optimizedTitle`, `optimizedDescription` | ✅ |
| fill → upload | — | ❌ fill-info 不输出 images |
| upload → publish | — | ❌ publish 不读取 input |

### 6.5 链路 E：完整电商上架流程（推荐改造方案）

```
amazon-product → ai-optimize → fill-info → upload-images → publish
```

| 传递 | 字段 | 状态 |
|---|---|---|
| product → optimize | `title`, `description`, `bulletPoints`, `longDescription`, `images` | ✅ |
| optimize → fill | `optimizedTitle`, `optimizedDescription` | ✅ |
| fill → upload | ❌ 缺 `images` | ❌ 需要修复 |
| upload → publish | ❌ publish 不读取 input | ❌ 需要修复 |

**这个链路只缺两步修复：**
1. fill-info 需要透传上游的 `images` 字段
2. publish 需要读取 `filledTitle` 生成真实 URL

---

## 7. 根本原因总结

| 编号 | 问题 | 严重程度 |
|---|---|---|
| 1 | 引擎只做相邻节点一对一传递，无累积机制 | 高 |
| 2 | `DataBus.resolve()` 模板语法已实现但未使用 | 高 |
| 3 | 阶段切换节点（open-shopify, open-amazon）打断数据链 | 高 |
| 4 | Mock 执行器不读取 input，掩盖了数据链断裂 | 高 |
| 5 | 6 个节点声明了 inputSchema 字段但代码不读取 | 中 |
| 6 | 7 个节点实际输出了 outputSchema 未声明的字段 | 中 |
| 7 | 默认工作流节点排列顺序不合理 | 中 |
| 8 | testNode() 清空 DataBus 导致单节点测试无上游数据 | 低 |

---

## 8. 解决方向建议

### 方向 A：改引擎为累积式传递

在 WorkflowEngine 中维护一个累积上下文 `accumulatedContext`，每个节点执行时：

```typescript
const input = { ...accumulatedContext, ...previousOutput };
```

这样即使中间插入了 open-shopify 这样的阶段切换节点，后续节点仍然可以拿到之前的数据。

### 方向 B：利用 DataBus.resolve() 模板语法

让每个节点的 executor 可以访问完整 DataBus：

```typescript
const output = await executor.execute({
  input: previousOutput,
  dataBus: this.dataBus, // 传入 DataBus 引用
});
```

节点可以在代码中用 `dataBus.getOutput('extract-info')` 取任意上游节点的输出。

### 方向 C：替换 Mock 执行器

逐步将 mock 执行器替换为真实执行器，让数据链断裂问题暴露出来，然后逐个修复。

### 方向 D：重新设计默认工作流

调整默认节点排列顺序，去掉打断数据链的节点（open-shopify、open-amazon），改为：

```
amazon-product → ai-optimize → fill-info → upload-images → publish
```
