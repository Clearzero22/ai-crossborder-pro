# 集成测试流水线开发经验总结

> 项目：ai-crossborder-pro — 跨境电商自动化平台
> 分支：feat/integration-test-pipeline
> 周期：2026-05-19
> 模块：独立集成测试流水线 + Pipeline Data Viewer

---

## 1. 项目背景

我们需要一个端到端的 6 步业务流水线来验证跨境电商数据自动化链路：

```
GigaB2B 爬虫 → AI 识图 → Amazon 搜索 → Amazon 商品详情 → 西柚找词 → AI 文案优化
```

目标是独立于主项目运行，可自由修改调试，不影响主代码。

---

## 2. 架构决策与经验

### 2.1 独立副本策略

**决策：** 将后端 `src/services/` 及依赖复制到 `integration-test/src/`，而非引用主项目代码。

**原因：**
- 主项目使用 monorepo workspace 引用，修改会影响全局
- 集成测试需要频繁修改调试（加日志、改参数），独立副本更安全
- 避免 `tsconfig` 路径冲突（`packages/backend/tsconfig.json` 会干扰 `tsx` 模块解析）

**代价：** 21 个文件需要手动同步。长期来看应抽取为共享包。

**经验：** 独立副本适合探索阶段，一旦稳定应回流到主项目或抽取共享库。

### 2.2 文件系统作为数据存储

**决策：** 使用 `runs/<timestamp>/` 目录结构，每个文件一个 JSON。

**原因：**
- 零依赖，不需要数据库
- 人类可读，方便调试
- Git 友好（可选择性 gitignore）
- 每步数据独立文件，单步失败不影响其他步

**结构：**
```
runs/
  20260519-160017/
    metadata.json        # 运行元信息
    step1-input.json     # 13 个文件/次
    step1-output.json
    step2-input.json
    step2-output.json
    ...
    step6-output.json
```

**经验：** 文件存储在 <50 次运行时完全够用。超过后应考虑分页或归档。

### 2.3 前端查看器后置开发

**决策：** 先用 CLI 验证数据流，确认数据正确后再开发前端。

**流程：**
1. 先用 `console.log` + JSON 文件验证每步输入输出
2. 修复所有数据问题后再设计 UI
3. 有了真实数据结构作为参考，UI 组件设计更精准

**经验：** 不要过早投入前端。真实数据会揭示类型设计中遗漏的字段（如 Step 4 缺少 `reviewCount`、`url`、`colors`、`timestamp`）。

---

## 3. 数据流设计经验

### 3.1 输入快照必须完整

**教训：** 最初 Step 2 的 input 只保存了 `{title, images}`，丢失了 `specifications`、`price` 等字段。导致无法从 Step 2 开始重放流水线。

**修正：** 每步 input 保存完整上一步 output：

| Step | Input 内容 |
|------|-----------|
| 2 | 完整 Step 1 output |
| 3 | 完整 Step 2 output + fallbackTitle |
| 4 | 完整 Step 3 output |
| 5 | 完整 Step 4 output |
| 6 | `{step1Data, step4Data, step5Data}` |

**原则：** 输入快照 = 上一步完整输出，不做任何裁剪。

### 3.2 类型定义必须对照真实数据

**教训：** `AmazonProductResult` 类型声明缺少 4 个字段（`reviewCount`、`url`、`colors`、`timestamp`），`bestSellersRank` 声明为 `string[]` 但实际应为结构化对象。

**方法：** 先跑通流水线，用真实输出反推类型定义，而非先定义类型再开发。

**原则：** 类型来自数据，数据来自运行结果。不要凭想象定义类型。

### 3.3 数据质量可视化

**决策：** 在前端查看器中为已知数据问题添加琥珀色警告徽标。

**覆盖的问题：**
- Step 4 `brand` 为空（提取失败）
- Step 4 `specifications["Customer Reviews"]` 包含 2000 字符 JS 代码
- Step 4 `bestSellersRank` 解析失败
- Step 5 `keywords` 解析返回 0
- Step 6 `rawResponse` 有 DOM 提取前缀

**经验：** 数据质量问题的可视化比隐藏它们更有价值。开发者能立即看到哪些数据需要关注。

---

## 4. 浏览器自动化经验

### 4.1 Playwright 超时策略

| 场景 | 原始设置 | 修正后 | 原因 |
|------|---------|--------|------|
| Amazon 搜索页 | `waitUntil: 'networkidle'` | `'domcontentloaded'` | Amazon 页面持续加载资源，networkidle 永远不会到达 |
| Amazon 商品页 | `setTimeout(30000)` | `60000` | 商品详情页资源多，30s 不够 |

**经验：** 大型电商网站的 `networkidle` 几乎不可用，用 `domcontentloaded` + 针对性等待更可靠。

### 4.2 DOM 提取的陷阱

**教训：** Step 6 从 Gemini 页面提取 AI 响应时，DOM 轮询把输入框的提示文本 `"Gemini 说"` 也抓进了输出。

**修正：** 改为等待 DOM 文本长度连续 3 次稳定（每 2s 检查一次），而非固定等待 5s。

**原则：** DOM 提取时必须考虑页面上的非目标文本元素（placeholder、label、提示语）。

### 4.3 共享 Chrome Profile 的冲突

**问题：** 后端 API 服务和集成测试使用同一个 Chrome Profile 目录，同时运行时会锁定。

**解法：** 先停后端服务再跑测试，或使用独立 Profile。

---

## 5. AI 服务集成经验

### 5.1 双模板调用模式

**决策：** Step 2 对同一批图片连续调用两个 AI 模板：
1. `product-analysis` — 深度产品分析（4500 字/张）
2. `extract-search-keywords` — 提取搜索关键词（4-5 个英文词）

**优势：** 单次图片上传，两次分析，输出不同维度的结果。关键词直接用于 Step 3 Amazon 搜索。

### 5.2 AI 输出解析

**教训：** AI 返回的文本常包含非结构化内容（Markdown 格式、前缀文字、不一致的标点）。

**应对：**
- 标题/关键词等结构化字段 → JSON 解析
- 分析报告等长文本 → `whitespace-pre-wrap` 原样展示
- 前缀污染 → 正则匹配 `{...}` 提取 JSON，或记录为已知问题

---

## 6. 前端开发经验

### 6.1 字段渲染器的分类策略

**决策：** 按数据类型 + 步骤上下文分类字段，而非纯数据类型。

```typescript
// Step 4 brand 字段：shortText + 空值警告
if (key === 'brand') {
  return {
    type: isEmpty(value) ? 'empty' : 'shortText',
    warning: isEmpty(value) ? '品牌提取失败' : undefined,
  };
}

// Step 4 specifications：objectMap + 长值自动截断
if (key === 'specifications') {
  return { type: 'objectMap' }; // 内部处理 >500 字符截断
}
```

**经验：** 纯类型分类不够。同是 `string`，`brand` 和 `title` 的展示逻辑完全不同（前者可能为空需要警告，后者是核心内容）。步骤上下文决定渲染方式。

### 6.2 已有组件的复用与独立

**决策：** FieldRenderers 独立实现，不引用 `NodeDetailRenderers.tsx`。

**原因：**
- `NodeDetailRenderers` 面向工作流节点（`StepData` 接口），数据结构不同
- Pipeline 数据的字段分类逻辑是步骤感知的，需要独立实现
- 避免跨目录的组件耦合

**经验：** 相似但不相同的组件，独立实现比强行复用更清晰。复用思路（而非代码）是最有价值的。

### 6.3 对话框模式

**模式：** 整个项目没有对话框组件库。使用统一的手写模式：

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
  <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col"
       onClick={e => e.stopPropagation()}>
    {/* Header + Tabs + Content */}
  </div>
</div>
```

**经验：** 5 行 CSS 搞定，不需要任何对话框库。

---

## 7. 调试技巧

### 7.1 带颜色的 I/O 日志

在 `run-pipeline.ts` 中实现 `logger` 模块：

```typescript
logger.step(1, 'input', data);  // 绿色 → 输入
logger.step(1, 'output', data); // 蓝色 → 输出
logger.error('Step 3 failed');   // 红色 → 错误
```

每次运行输出格式化的 JSON 日志，快速定位数据问题。

### 7.2 跳步调试

`--skip-to 3` 参数允许跳过前面的步骤直接调试 Step 3，节省重复执行时间。通过读取上次运行的 output 作为 input。

### 7.3 Mock 数据

`--mock` 参数使用预定义的 Step 1 数据，避免每次都爬 GigaB2B。

---

## 8. 遗留问题与后续计划

### 高优先级

1. **Step 5 CSV 解析**：提取了 19 行表格但解析出 0 个关键词，`xiyouzhaociService.ts` 需要修复
2. **Step 4 specifications 清洗**：过滤 `Customer Reviews` 等非结构化字段
3. **Step 4 brand 提取**：从 `Item Details.Brand Name` 取值

### 中优先级

4. **Zod 数据验证**：给所有步骤添加运行时类型检查
5. **数据编辑功能**：在查看器中支持修改并回写 JSON
6. **AI 审查面板**：自动分析数据质量并给出修复建议

### 低优先级

7. **输入快照完整化**：修复当前 lossy 的 input 保存
8. **独立副本回流**：将修复后的代码同步回主项目
9. **流水线重放**：从任意步骤开始，使用上次的完整 input

---

## 9. 关键数据

| 指标 | 值 |
|------|---|
| 流水线步骤 | 6 步 |
| JSON 文件/次运行 | 13 个 |
| 复制的后端文件 | 21 个 |
| 新增前端文件 | 5 个（查看器） |
| 修改的前端文件 | 5 个 |
| 总提交数 | 8 个 |
| 代码行数 | ~1360 行（查看器）+ ~1500 行（流水线） |
| 端到端运行时间 | ~135 秒（真实爬取） |

---

## 10. 结论

这次开发的核心经验是**先让数据跑通，再做 UI 展示**。真实数据揭示了类型定义中的 4 处错误和 6 个数据质量问题，这些都是先写 UI 永远发现不了的。

独立副本策略让流水线开发完全不受主项目约束，可以快速迭代。文件系统存储在数据量小时极其高效，且天然支持人类审查。

后续最重要的工作是修复 Step 5 的 CSV 解析和 Step 4 的数据清洗，这两项直接影响数据质量和下游 AI 优化的效果。
