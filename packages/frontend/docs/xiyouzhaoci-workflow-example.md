# 西柚找词工作流示例

## 完整工作流示例

### 场景：从 GigaB2B 商品抓取到 Amazon 关键词挖掘

```
┌─────────────┐
│   开始节点   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  GigaB2B 爬虫   │ ← 输入商品链接
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  AI 图片识别    │ ← 识别商品信息，提取搜索关键词
└──────┬──────────┘
       │
       ▼
┌─────────────────────┐
│ Amazon 竞品搜索     │ ← 使用 AI 识别的关键词搜索
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Amazon 商品详情    │ ← 获取第一个竞品的 ASIN
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────┐
│ 西柚找词 - 关键词挖掘   │ ← 自动获取上游 ASIN
└──────┬──────────────────┘
       │
       ▼
┌─────────────────┐
│   结束节点      │
└─────────────────┘
```

## 节点配置详解

### 1. GigaB2B 爬虫
- **配置**：商品链接
- **输出**：商品标题、价格、图片等

### 2. AI 图片识别
- **配置**：识别模板选择「提取商品标题」
- **输出**：识别出的商品标题（作为搜索关键词）

### 3. Amazon 竞品搜索
- **配置**：最大结果数 = 10
- **输入**：从 AI 图片识别获取关键词
- **输出**：竞品 ASIN 列表

### 4. Amazon 商品详情
- **配置**：保存到数据库 = 是
- **输入**：从 Amazon 竞品搜索获取 ASIN 列表
- **输出**：第一个竞品的完整信息（包括 ASIN）

### 5. 西柚找词 - 关键词挖掘 ⭐ 新增
- **配置**：
  - ASIN：留空（从上游获取）
  - 无头模式：开启
  - 最大关键词数：50
- **输入**：从 Amazon 商品详情获取 ASIN
- **输出**：
  - 50 个关键词
  - 每个关键词的搜索量、竞争度等
  - CSV 备份文件路径

## 数据流转示例

假设我们从一个 GigaB2B 商品开始：

### 输入
```
GigaB2B 商品链接：https://www.gigab2b.com/product/12345
```

### 数据流转

1. **GigaB2B 爬虫**
   ```json
   {
     "title": "Wireless Bluetooth Headphones",
     "price": 29.99,
     "images": ["https://..."]
   }
   ```

2. **AI 图片识别**
   ```json
   {
     "firstResult": "Wireless Bluetooth Headphones with Noise Cancelling"
   }
   ```

3. **Amazon 竞品搜索**
   ```json
   {
     "keyword": "Wireless Bluetooth Headphones with Noise Cancelling",
     "asins": ["B08F5M1K9M", "B07XJ8C8F5", "B09D3X7K2L"],
     "total": 3
   }
   ```

4. **Amazon 商品详情**
   ```json
   {
     "asin": "B08F5M1K9M",
     "title": "Sony WH-1000XM4 Wireless Headphones",
     "brand": "Sony",
     "price": "$348.00"
   }
   ```

5. **西柚找词 - 关键词挖掘** ⭐
   ```json
   {
     "asin": "B08F5M1K9M",
     "keywords": [
       "wireless headphones",
       "bluetooth headset",
       "noise cancelling headphones",
       "sony headphones",
       "over ear headphones",
       ... (50 total)
     ],
     "totalKeywords": 50,
     "topKeyword": "wireless headphones",
     "csvPath": "./output/keywords/keywords-B08F5M1K9M-1714321234567.csv"
   }
   ```

## 快速开始

### 方法 1：使用预设 ASIN

1. 创建新工作流
2. 添加「西柚找词 - 关键词挖掘」节点
3. 在节点配置中输入 ASIN：`B08F5M1K9M`
4. 运行工作流

### 方法 2：从 Amazon 商品详情获取

1. 创建工作流：
   ```
   [开始] → [Amazon 商品详情] → [西柚找词] → [结束]
   ```

2. 配置「Amazon 商品详情」：
   - 输入 ASIN：`B08F5M1K9M`
   - 无头模式：开启

3. 运行工作流

## 预期结果

工作流运行完成后，你将获得：

1. **控制台输出**：
   ```
   [Xiyouzhaoci] Starting scrape for ASIN: B08F5M1K9M
   [Xiyouzhaoci] CSV saved: ./output/keywords/keywords-B08F5M1K9M-1714321234567.csv
   [Xiyouzhaoci] Scraped 50 keywords
   ```

2. **节点输出**：
   - 50 个相关关键词
   - 每个关键词的搜索量、竞争度、点击率等数据
   - CSV 文件备份路径

3. **CSV 文件**：
   位置：`backend/output/keywords/keywords-B08F5M1K9M-<timestamp>.csv`
   内容：关键词数据的表格形式

## 故障排查

### 问题：节点报错 "未提供 ASIN"

**原因**：没有配置 ASIN 且上游节点没有输出 ASIN

**解决方案**：
- 方案 1：在节点配置中手动输入 ASIN
- 方案 2：确保上游节点是「Amazon 商品详情」或「Amazon 竞品搜索」

### 问题：抓取失败，返回 0 个关键词

**原因**：
- 西柚找词网站反爬
- 网络连接问题
- ASIN 不存在或无效

**解决方案**：
- 检查网络连接
- 尝试使用有头模式（关闭 headless）
- 验证 ASIN 是否有效

### 问题：抓取时间过长

**原因**：西柚找词网站加载慢

**解决方案**：
- 正常情况，等待 15-30 秒
- 如超过 60 秒，检查网络或网站是否可访问

## 高级用法

### 批量处理多个 ASIN

如需抓取多个 ASIN 的关键词，可以：

1. 使用「Amazon 竞品搜索」获取多个 ASIN
2. 创建循环工作流（未来版本将支持）
3. 或手动创建多个工作流实例

### 结合其他节点

可以将西柚找词与其他节点组合：

```
[Amazon 商品详情] → [西柚找词] → [AI 优化文案]
                                            ↓
                                      [Shopify 发布]
```

使用抓取到的关键词生成优化文案。

## 数据用途

抓取的关键词数据可用于：

1. **SEO 优化**：优化商品标题和描述
2. **广告投放**：选择高搜索量、低竞争度的关键词
3. **市场分析**：分析竞品的关键词策略
4. **选品参考**：发现潜在的热门产品
