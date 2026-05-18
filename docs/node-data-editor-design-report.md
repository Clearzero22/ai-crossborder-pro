# 工作流节点数据编辑弹窗 — 深度分析与设计方案报告

> 生成时间: 2026-05-19
> 状态: 设计阶段

---

## 一、需求背景

### 1.1 当前问题

工作流编辑器中，每个节点执行完成后会产生数据（商品信息、图片URL列表、关键词数组、AI生成的文案等）。当前这些数据在右侧 ConfigPanel (320px) 的"步骤数据"标签页中以扁平的 `<textarea>` + `JSON.stringify` 方式展示。

**核心问题：**

1. **所有数据类型一视同仁** — 字符串、数组、对象、布尔值全部用 textarea 展示 JSON 字符串，无法直观查看
2. **编辑能力弱** — 320px 侧边栏空间有限，长文本、数组、图片等数据编辑体验极差
3. **无法增删改查** — 对于数组类型数据（如关键词列表），没有添加/删除/编辑单个元素的能力
4. **图片无法预览** — 图片URL以文本形式展示，无法看到缩略图
5. **长文本难以阅读** — AI生成的优化文案可达数千字符，在侧边栏中阅读和编辑困难

### 1.2 设计目标

为每个已执行成功的节点提供**弹窗式编辑界面**，实现：

- **类型感知渲染**：根据字段类型 (string/number/boolean/string[]/object/object[]) 使用对应的专用编辑器
- **结构化布局**：不同类型节点使用不同的分组布局（商品节点分基本信息/图片/规格；AI节点分优化结果/关键词/原始回复）
- **完整 CRUD**：支持增加、删除、修改、查看所有字段数据
- **不影响现有布局**：弹窗覆盖整个视口，不嵌入侧边栏，三栏布局完全不变

---

## 二、现有代码深度分析

### 2.1 UI 组件体系

#### 2.1.1 模态弹窗现状

项目中仅存在 **1个模态弹窗组件**：

**文件**: `packages/frontend/src/components/UpgradeModal.tsx`

```tsx
{open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
       onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
         onClick={e => e.stopPropagation()}>
      {/* 内容 */}
    </div>
  </div>
)}
```

**关键模式:**
- Props: `open: boolean` + `onClose: () => void`
- 条件渲染: `if (!open) return null`
- 遮罩层: `fixed inset-0 z-50 bg-black/50`
- 卡片: `bg-white rounded-2xl shadow-xl max-w-md mx-4 p-6`
- 点击遮罩关闭: overlay `onClick={onClose}` + card `e.stopPropagation()`
- 无动画、无 focus trap、无 Escape 键处理、无 portal

#### 2.1.2 现有数据编辑模式

**模式A — ConfigPanel DataTabContent** (`ConfigPanel.tsx:195-431`)

右侧面板数据标签页的现有编辑方式：
- 输入数据: 从上游节点 stepOutputs 获取，展示为 textarea
- 输出数据: 当前节点输出，展示为 textarea
- 特殊处理: `ai-vision` 的 results 数组使用卡片式展示
- 自定义字段: 支持添加自定义 key-value 对
- 保存/取消: 有修改时显示保存按钮，调用 `onSaveStepOutput`

**模式B — ExecutionDataPage CardView** (`pages/ExecutionDataPage.tsx`)

执行数据页面的卡片视图：
- 表格视图 + 卡片视图切换
- 每个字段一个 textarea
- 上一个/下一个节点导航
- 保存/还原按钮

**模式C — NodeDetailRenderers** (`pages/DashboardPage/NodeDetailRenderers.tsx`)

Dashboard 的只读渲染器（无法编辑，但布局参考价值高）：
- `ImageGrid`: 图片缩略图网格 (CSS Grid)
- `SpecTable`: 规格参数键值表
- `BulletList`: 有序列表
- `ConfigInfo`: 配置信息键值对
- `GenericDataSection`: 通用数据展示
- `NodeDetailRenderer`: 每个节点类型的专用渲染器 (switch/case)

#### 2.1.3 设计系统

**Tailwind 配置** (`tailwind.config.js`):

```js
colors: {
  surface: 'var(--color-surface)',       // #fff / #000 (dark)
  'surface-alt': 'var(--color-surface-alt)', // #f9fafb / #0a0a0a
  border: 'var(--color-border)',         // #e5e7eb / #1f1f1f
  'text-primary': 'var(--color-text-primary)', // #111827 / #f5f5f5
  'text-secondary': 'var(--color-text-secondary)', // #6b7280
}
```

**主题色系统**: 项目重写了 `blue-*` Tailwind 类，映射到 `--accent-*` CSS 变量。支持5种主题色: 默认(蓝)、靛蓝、紫罗兰、翡翠绿、橙色。**所有新组件必须使用 `blue-*` 类才能参与主题系统。**

**深色模式**: `darkMode: 'class'`，通过 `.dark` 类切换。

**常用样式约定:**
- 主按钮: `bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors`
- 次按钮: `text-gray-500 border border-gray-200 rounded-lg text-sm hover:bg-gray-50`
- 输入框: `w-full px-2 py-1 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400`
- Section标题: `text-xs font-semibold text-gray-500 uppercase tracking-wide`
- 节点类别颜色: `nodeColorMap` (blue/purple/orange/green/red/gray)

**无外部UI库**: 不使用 Radix、shadcn、Ant Design、Headless UI 等。所有组件纯 Tailwind 手工构建。

### 2.2 节点数据结构分析

#### 2.2.1 FieldDef 类型系统

**文件**: `packages/frontend/src/engine/types.ts:4-10`

```typescript
interface FieldDef {
  type: 'string' | 'number' | 'boolean' | 'select' | 'string[]' | 'secret' | 'object';
  label: string;
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
}
```

outputSchema 中实际使用的类型: `string`, `number`, `boolean`, `string[]`, `object`
(configSchema 额外使用 `select`, `secret`)

#### 2.2.2 全部节点输出数据清单

##### 流程控制节点

| 节点ID | 标签 | outputSchema | 实际返回 |
|--------|------|-------------|---------|
| `start` | 开始节点 | `{}` (空) | `{}` |
| `end` | 结束节点 | `{}` (空) | `{}` |

##### 浏览器/爬虫节点

**open-amazon** — 打开亚马逊商品页面

| 字段 | schema类型 | 实际类型 | 示例值 |
|------|-----------|---------|--------|
| pageUrl | string | string | `"https://amazon.com/dp/B0CXYZ1234"` |
| pageTitle | string | string | `"Sony WH-1000XM5..."` |
| pageLoaded | boolean | boolean | `true` |

**extract-info** — 提取商品信息 (mock)

| 字段 | schema类型 | 实际类型 | 示例值 |
|------|-----------|---------|--------|
| title | string | string | `"Sony WH-1000XM5..."` |
| price | number | number | `349.99` |
| rating | number | number | `4.7` |
| images | string[] | string[] | `["https://..."]` |
| ~~currency~~ | 未声明 | string | `"USD"` |
| ~~reviewCount~~ | 未声明 | number | `12483` |
| ~~description~~ | 未声明 | string | `"Industry-leading..."` |
| ~~mainImage~~ | 未声明 | string | `"https://...jpg"` |
| ~~brand~~ | 未声明 | string | `"Sony"` |
| ~~asin~~ | 未声明 | string | `"B0CXYZ1234"` |

> 注意: mock executor 返回了6个未在 outputSchema 中声明的字段。编辑器需要能显示 schema 之外的字段。

**gigab2b-crawl** — GigaB2B 爬虫

| 字段 | schema类型 | 实际类型 | 示例值 |
|------|-----------|---------|--------|
| runId | string | string | `"abc123..."` |
| externalId | string | string\|undefined | 产品外部ID |
| title | string | string | 商品标题 |
| price | number | number\|undefined | `29.99` |
| currency | string | string | `"USD"` |
| description | string | string | 商品描述 |
| images | string[] | string[] | `["https://..."]` |
| specifications | object | object\|undefined | `{Weight: "250g", ...}` |

**open-shopify** — 打开 Amazon 后台

| 字段 | schema类型 | 实际类型 |
|------|-----------|---------|
| shopDomain | string | string |
| loginStatus | string | string |
| ~~adminUrl~~ | 未声明 | string |
| ~~isLoggedIn~~ | 未声明 | boolean |

**fill-info** — 填写商品信息

| 字段 | schema类型 | 实际类型 |
|------|-----------|---------|
| filledTitle | string | string |
| filledPrice | string | string |
| ~~filledDescription~~ | 未声明 | string |
| ~~vendor~~ | 未声明 | string |
| ~~productType~~ | 未声明 | string |
| ~~tags~~ | 未声明 | string[] |
| ~~inventoryTracked~~ | 未声明 | boolean |
| ~~quantity~~ | 未声明 | number |

**upload-images** — 上传商品图片

| 字段 | schema类型 | 实际类型 |
|------|-----------|---------|
| uploadedCount | number | number |
| imageUrls | string[] | string[] |
| ~~thumbnailGenerated~~ | 未声明 | boolean |

**publish** — 发布商品

| 字段 | schema类型 | 实际类型 |
|------|-----------|---------|
| publishedUrl | string | string |
| publishStatus | string | string |
| ~~publishedAt~~ | 未声明 | string (ISO) |
| ~~visibility~~ | 未声明 | string |

##### 数据节点

**amazon-search** — Amazon 竞品搜索

| 字段 | schema类型 | 实际类型 | 说明 |
|------|-----------|---------|------|
| keyword | string | string | 搜索关键词 |
| asins | string[] | string[] | 竞品ASIN列表 |
| links | string[] | string[] | 商品链接列表 |
| total | number | number | 总数 |

**amazon-product** — Amazon 商品详情

| 字段 | schema类型 | 实际类型 | 说明 |
|------|-----------|---------|------|
| asin | string | string | ASIN |
| title | string | string | 标题 |
| brand | string | string | 品牌 |
| price | string | string | 价格 |
| rating | string | string | 评分 |
| bulletPoints | string[] | string[] | 卖点列表 |
| longDescription | string | string | 长描述 |
| images | string[] | string[] | 图片 |
| specifications | string[] | string[] | 规格 (对象转字符串数组) |
| bestSellersRank | string[] | string[] | 排名 |

> 特殊: `specifications` 在 gigab2b-crawl 中是 `object`，在 amazon-product 中是 `string[]`。编辑器需要根据实际数据类型自动判断。

**xiyouzhaoci-keywords** — 西柚找词 - 关键词挖掘

| 字段 | schema类型 | 实际类型 | 说明 |
|------|-----------|---------|------|
| asin | string | string | ASIN |
| keywords | string[] | string[] | 关键词列表 |
| totalKeywords | number | number | 总数 |
| topKeyword | string | string | Top关键词 |
| csvPath | string | string | CSV路径 |
| rawKeywords | **string** (声明) | **object[]** (实际!) | 关键词详情数组 |
| title | string | string\|undefined | 竞品标题 (透传) |
| brand | string | string\|undefined | 竞品品牌 (透传) |
| price | string | string\|undefined | 竞品价格 (透传) |
| bulletPoints | string[] | string[]\|undefined | 竞品卖点 (透传) |
| longDescription | string | string\|undefined | 竞品长描述 (透传) |

> **关键差异**: `rawKeywords` 声明为 `string` 但实际返回 `object[]` (每个元素包含 rank, keyword, searchVolume, searchVolumeTrend, trafficShare, rankingPosition, difficulty, clickRate, conversionRate)。编辑器必须在运行时检测实际类型。

**view-runs** — 查看运行记录

| 字段 | schema类型 | 实际类型 | 说明 |
|------|-----------|---------|------|
| runs | string[] | string[] | 运行记录列表 (管道分隔) |
| total | number | number | 总数 |

**http-request** — HTTP请求

| 字段 | schema类型 | 实际类型 |
|------|-----------|---------|
| status | number | number |
| data | object | object (JSON响应) |
| headers | object | object |

**send-email** — 发送邮件通知

| 字段 | schema类型 | 实际类型 |
|------|-----------|---------|
| sent | boolean | boolean |
| messageId | string | string |

##### AI节点

**ai-optimize** — AI 优化商品文案

| 字段 | schema类型 | 实际类型 | 说明 |
|------|-----------|---------|------|
| optimizedTitle | string | string | 优化标题 |
| optimizedDescription | string | string | 优化描述 |
| optimizedBulletPoints | string[] | string[] | 优化卖点 |
| optimizedLongDescription | string | string | 优化长描述 |
| seoKeywords | string[] | string[] | SEO关键词 |
| competitorAnalysis | string | string | 竞品分析 |
| response | string | string | 原始AI回复 |
| chatgptTitle | string | string\|undefined | ChatGPT标题 (仅parallel模式) |
| chatgptDescription | string | string\|undefined | ChatGPT描述 (仅parallel) |
| chatgptKeywords | string[] | string[]\|undefined | ChatGPT关键词 (仅parallel) |
| chatgptResponse | string | string\|undefined | ChatGPT回复 (仅parallel) |

**ai-vision** — AI 图片识别

| 字段 | schema类型 | 实际类型 | 说明 |
|------|-----------|---------|------|
| results | string[] | string[] | 识别结果列表 |
| firstResult | string | string | 首条结果 |
| imageCount | number | number | 图片数量 |
| runId | string | string\|undefined | 运行ID |

#### 2.2.3 数据类型统计

| 数据类型 | 涉及字段数 | 代表性字段 |
|---------|-----------|-----------|
| string | ~30 | title, brand, asin, description, response |
| number | ~10 | price, rating, total, imageCount |
| boolean | ~5 | pageLoaded, sent, isLoggedIn |
| string[] | ~12 | images, keywords, bulletPoints, asins, links |
| object | ~3 | specifications, HTTP data, HTTP headers |
| object[] | 1 | rawKeywords |

### 2.3 数据流与状态管理

#### 2.3.1 状态存储

**文件**: `packages/frontend/src/types.ts:71-76`

```typescript
interface StepOutput {
  nodeId: string;
  nodeLabel: string;
  data: Record<string, unknown>;  // ← 核心数据，所有编辑操作的目标
  summary: string;
}
```

`WorkflowState.stepOutputs: Record<string, StepOutput>` 以 nodeId 为 key 存储每个节点的输出。

#### 2.3.2 数据保存链路

```
用户修改数据
  → NodeDataModal.handleSave()
  → props.onSave(nodeId, localData)
  → App.tsx: updateStepOutput(nodeId, data)
  → useWorkflowState.updateStepOutput (hooks/useWorkflowState.ts:241)
      → engineRef.current.updateOutput(nodeId, data)  // 更新 DataBus (内存)
      → setState: stepOutputs[nodeId].data = data     // 更新 React 状态
```

这条链路已存在于 `useWorkflowState.ts` 的 `updateStepOutput` 函数中，无需新增。

#### 2.3.3 数据传播影响

修改某节点输出后的影响范围：

| 场景 | 影响 |
|------|------|
| 工作流未执行完成 | 下游节点执行时从 DataBus 读取最新数据 |
| 工作流已执行完成 | 仅更新显示数据，不影响已完成节点 |
| 用户执行 "从当前节点测试" | 下游节点使用 DataBus 中的最新数据 |

---

## 三、架构设计

### 3.1 组件层次结构

```
App.tsx
  └── WorkflowPage.tsx
        └── Canvas.tsx
              └── WorkflowNode.tsx    ← 触发点1: "编辑数据" 图标按钮
        └── ConfigPanel.tsx
              └── DataTabContent     ← 触发点2: "弹窗编辑" 按钮
  └── NodeDataModal.tsx              ← 弹窗组件 (与 UpgradeModal 同级)
        ├── ModalHeader.tsx          ← 头部: 节点名 / 输入输出切换 / 关闭
        ├── OutputSchemaEditor.tsx   ← 根据 outputSchema 分发编辑器
        │     ├── ProductNodeTemplate    ← 商品节点布局
        │     ├── AINodeTemplate         ← AI节点布局
        │     ├── DataNodeTemplate       ← 数据节点布局
        │     ├── BrowserNodeTemplate    ← 浏览器节点布局
        │     ├── UtilityNodeTemplate    ← 工具节点布局
        │     └── GenericNodeTemplate    ← 通用兜底布局
        │           ├── StringEditor
        │           ├── NumberEditor
        │           ├── BooleanEditor
        │           ├── StringArrayEditor
        │           ├── ObjectEditor
        │           ├── ObjectArrayEditor
        │           ├── ImageGalleryEditor
        │           └── GenericEditor
        └── ModalFooter.tsx          ← 底部: 修改状态 / 取消 / 保存
```

### 3.2 新增文件清单 (21个)

```
packages/frontend/src/components/
├── fieldEditors/                        # 通用字段编辑器
│   ├── StringEditor.tsx                 # 字符串编辑器
│   ├── NumberEditor.tsx                 # 数字编辑器
│   ├── BooleanEditor.tsx                # 开关编辑器
│   ├── StringArrayEditor.tsx            # 字符串数组编辑器 (标签/芯片)
│   ├── ObjectEditor.tsx                 # 对象键值对编辑器
│   ├── ObjectArrayEditor.tsx            # 对象数组表格编辑器
│   ├── ImageGalleryEditor.tsx           # 图片画廊编辑器
│   ├── GenericEditor.tsx                # 兜底通用编辑器
│   └── index.ts                         # 统一导出
├── NodeDataModal/                       # 弹窗组件
│   ├── NodeDataModal.tsx                # 弹窗主组件
│   ├── ModalHeader.tsx                  # 头部
│   ├── ModalFooter.tsx                  # 底部
│   ├── OutputSchemaEditor.tsx           # Schema 分发器
│   └── index.ts                         # 统一导出
└── nodeTemplates/                       # 节点布局模板
    ├── ProductNodeTemplate.tsx          # 商品节点
    ├── AINodeTemplate.tsx               # AI节点
    ├── DataNodeTemplate.tsx             # 数据节点
    ├── BrowserNodeTemplate.tsx          # 浏览器节点
    ├── UtilityNodeTemplate.tsx          # 工具节点
    ├── GenericNodeTemplate.tsx          # 通用兜底
    └── index.ts                         # 模板映射 + 统一导出
```

### 3.3 修改文件清单 (5个)

| 文件 | 行号区域 | 变更说明 |
|------|---------|---------|
| `components/WorkflowNode.tsx` | 116-123 | 新增 `onEditData` prop, success 时显示编辑图标按钮 |
| `components/ConfigPanel.tsx` | 11-23 | 新增 `onOpenDataModal` prop, DataTab 添加弹窗编辑按钮 |
| `components/Canvas.tsx` | 6-18 | 新增 `onEditNodeData` prop, 透传给 WorkflowNode |
| `pages/WorkflowPage.tsx` | 9-23 | 新增 `onEditNodeData` prop, 透传给 Canvas 和 ConfigPanel |
| `App.tsx` | 41-53 | 新增 `editModalNode` state, 挂载 NodeDataModal |

---

## 四、详细设计

### 4.1 弹窗 UX 设计

#### 4.1.1 触发方式

**触发点1: 节点卡片编辑按钮** (主要)

在 `WorkflowNode.tsx` 的 step 节点区域 (第116-123行)，当 `status === 'success'` 时，在状态徽章旁显示一个编辑图标按钮：

```
节点卡片
  [图标] 节点名称 / 描述    [编辑图标] [状态徽章]
```

使用 `e.stopPropagation()` 防止触发节点选中事件。

**触发点2: ConfigPanel 数据标签** (辅助)

在 ConfigPanel DataTabContent 的节点信息标题旁添加 "弹窗编辑" 文字按钮：

```
[节点名称]                    [弹窗编辑]
```

#### 4.1.2 弹窗布局

```
┌──────────────────────────────────────────────────────────────┐
│  遮罩层: fixed inset-0 z-50 bg-black/50                       │
│                                                               │
│  ┌────────────────────────────────────────────────────┐       │
│  │ ModalHeader                                         │       │
│  │ [图标] 商品信息提取           [输出数据] [输入数据] [X] │       │
│  ├────────────────────────────────────────────────────┤       │
│  │                                                    │       │
│  │ 可滚动内容区域                                       │       │
│  │ max-h-[calc(100vh-140px)] overflow-y-auto           │       │
│  │                                                    │       │
│  │ ┌────────────────────────────────────────────────┐ │       │
│  │ │ Section: 基本信息                              │ │       │
│  │ │ 标题: [_______________________________]       │ │       │
│  │ │ 品牌: [____________] ASIN: [____________]     │ │       │
│  │ │ 价格: [______]  评分: [______]                 │ │       │
│  │ └────────────────────────────────────────────────┘ │       │
│  │                                                    │       │
│  │ ┌────────────────────────────────────────────────┐ │       │
│  │ │ Section: 商品图片                              │ │       │
│  │ │ [img1] [img2] [img3] [img4] [img5]           │ │       │
│  │ │ [+ 添加图片URL]                                │ │       │
│  │ └────────────────────────────────────────────────┘ │       │
│  │                                                    │       │
│  │ ┌────────────────────────────────────────────────┐ │       │
│  │ │ Section: 规格参数                              │ │       │
│  │ │ 重量  │ 250g              [x]                  │ │       │
│  │ │ 材质  │ Premium           [x]                  │ │       │
│  │ │ [+ 添加键值对]                                 │ │       │
│  │ └────────────────────────────────────────────────┘ │       │
│  │                                                    │       │
│  │ ... 更多 sections ...                               │       │
│  │                                                    │       │
│  ├────────────────────────────────────────────────────┤       │
│  │ ModalFooter                                         │       │
│  │ 有 3 项未保存修改           [取消] [保存修改]       │       │
│  └────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

#### 4.1.3 响应式行为

| 断点 | 弹窗样式 |
|------|---------|
| 桌面 (>1024px) | `max-w-4xl mx-auto rounded-2xl max-h-[90vh]` 居中 |
| 平板 (768-1024px) | `max-w-2xl mx-4 rounded-2xl` |
| 移动 (<768px) | `inset-0 w-full h-full rounded-none` 全屏 |

#### 4.1.4 键盘快捷键

| 快捷键 | 行为 |
|--------|------|
| `Escape` | 关闭弹窗 (有未保存修改时弹出确认) |
| `Ctrl/Cmd + S` | 保存修改并关闭 |
| `Tab` | 字段间切换焦点 |

#### 4.1.5 动画效果

```css
/* 遮罩淡入 */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-backdrop-in { animation: fadeIn 200ms ease-out; }

/* 卡片滑入 */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-modal-in { animation: slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1); }
```

### 4.2 字段编辑器详细设计

#### 4.2.1 通用接口

```typescript
interface FieldEditorProps {
  label: string;              // 字段显示标签 (来自 FieldDef.label)
  value: unknown;             // 当前值
  onChange: (value: unknown) => void;  // 值更新回调
  fieldName: string;          // 字段名 (用于日志/调试)
  disabled?: boolean;         // 是否只读
}
```

#### 4.2.2 StringEditor

**逻辑**:
- `String(value).length < 80`: 渲染 `<input type="text">`
- `String(value).length >= 80`: 渲染 `<textarea>`，默认3行，可展开

**样式** (沿用 ConfigPanel):
```
输入框: w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
       focus:outline-none focus:ring-2 focus:ring-blue-500
       dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200
标签: text-xs text-gray-500 mb-1 dark:text-gray-400
```

**展开/收起**: 长文本默认3行，点击 "展开 (剩余 N 字)" 切换全高度。

#### 4.2.3 NumberEditor

- `<input type="number" step={...}>`
- step 策略: `price` → 0.01, `rating` → 0.1, 其他 → 1
- 样式与 StringEditor 单行一致

#### 4.2.4 BooleanEditor

纯 CSS toggle switch:

```
关闭: [   ●─────] bg-gray-300
开启: [─────●   ] bg-blue-600
```

```tsx
<button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
  ${value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
    ${value ? 'translate-x-6' : 'translate-x-1'}`} />
</button>
```

#### 4.2.5 StringArrayEditor

**渲染形式**: 芯片/标签列表

```
标签: SEO 关键词 (4项)

[wireless headphones ×] [noise cancelling ×] [premium sound ×] [over-ear ×]

[输入新关键词..._______________] [+ 添加]
```

**交互**:
- 单击芯片: 选中 (高亮边框)
- 双击芯片: 进入 inline 编辑模式 (芯片变为 input)
- × 按钮: 删除该项
- 输入框回车 / 点击 "+ 添加": 添加新项
- 拖拽排序: 第一版不实现

**芯片样式**:
```
正常: text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200
      dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300
删除: hover:border-red-300 hover:bg-red-50
编辑中: ring-2 ring-blue-400 bg-white
```

#### 4.2.6 ObjectEditor

**渲染形式**: 键值对表格

```
标签: 规格参数

┌──────────────┬──────────────────────────────┬────┐
│ 重量          │ 250g                         │ ×  │
├──────────────┼──────────────────────────────┼────┤
│ 材质          │ Premium Aluminum             │ ×  │
├──────────────┼──────────────────────────────┼────┤
│ 防水等级      │ IPX4                          │ ×  │
└──────────────┴──────────────────────────────┴────┘
[+ 添加键值对]
```

- key 列: 160px 固定宽 `<input>`
- value 列: 自适应宽 `<input>`
- 每行末尾: 删除按钮

#### 4.2.7 ObjectArrayEditor

**渲染形式**: 可滚动表格 (针对 rawKeywords)

```
标签: 完整关键词数据 (50项)

┌──────┬──────────────────┬──────┬─────────┬──────┬───┐
│ #    │ 关键词            │ 搜索量 │ 趋势     │ 难度  │ × │
├──────┼──────────────────┼──────┼─────────┼──────┼───┤
│ 1    │ wireless...      │ 121K │ ↑       │ 45   │ × │
│ 2    │ noise canc...    │ 89K  │ →       │ 38   │ × │
│ ...  │                  │      │         │      │   │
└──────┴──────────────────┴──────┴─────────┴──────┴───┘
                  max-h-[300px] overflow-y-auto
[+ 添加行]
```

- 列名自动从数组首元素 keys 提取
- 单元格: 可编辑 input
- 最大高度 300px，超出滚动
- 行号自动生成

#### 4.2.8 ImageGalleryEditor

**渲染形式**: 缩略图网格

```
标签: 商品图片 (5张)

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│          │ │          │ │          │ │          │ │          │
│  [img1]  │ │  [img2]  │ │  [img3]  │ │  [img4]  │ │  [img5]  │
│          │ │          │ │          │ │          │ │          │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤
│ https://.│ │ https://.│ │ https://.│ │ https://.│ │ https://.│
│ ───────  │ │ ───────  │ │ ───────  │ │ ───────  │ │ ───────  │
│ [✎] [×] │ │ [✎] [×] │ │ [✎] [×] │ │ [✎] [×] │ │ [✎] [×] │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

[输入图片URL...___________________________] [+ 添加]
```

**网格**: `grid grid-cols-3 sm:grid-cols-4 gap-3`
**缩略图**: 64x64 `<img>`, `object-cover`, `loading="lazy"`
**加载失败**: `onError` → 显示灰色占位符 + 图片图标
**交互**:
- 点击缩略图: 新标签页打开原图 (`window.open(url, '_blank')`)
- 编辑按钮 (✎): 展开/折叠 URL 编辑 input
- 删除按钮 (×): hover 时显示，红色圆形背景
- 添加: input + 添加按钮

**自动检测**: 字段名在 `['images', 'imageUrls', 'uploadedImages']` 时自动使用此编辑器。

#### 4.2.9 GenericEditor (兜底)

无法匹配类型时退化为 textarea + JSON 格式化显示。与现有 ConfigPanel 行为一致。

### 4.3 节点专用模板设计

#### 4.3.1 ProductNodeTemplate — 商品节点

**适用**: `gigab2b-crawl`, `amazon-product`, `extract-info`

```
┌─ Section: 基本信息 ──────────────────────────────────────┐
│                                                          │
│  标题                                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Premium Wireless Noise Cancelling Headphones...    │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  品牌 [Sony________]  ASIN [B0CXYZ1234___]                │
│  价格 [349.99______]  评分 [4.7________]                  │
│  货币 [USD________]                                      │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─ Section: 商品图片 ──────────────────────────────────────┐
│                                                          │
│  [img1] [img2] [img3] [img4] [img5]                     │
│  [+] 添加图片URL                                         │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─ Section: 规格参数 ──────────────────────────────────────┐
│                                                          │
│  ┌──────────────┬─────────────────────┬──┐              │
│  │ 重量          │ 250g               │ ×│              │
│  │ 材质          │ Premium Aluminum   │ ×│              │
│  └──────────────┴─────────────────────┴──┘              │
│  [+] 添加键值对                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─ Section: 描述信息 ──────────────────────────────────────┐
│                                                          │
│  商品描述                                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Experience unparalleled noise cancellation...      │  │
│  │ (可展开)                                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  商品卖点                                                 │
│  [Industry-leading noise cancellation ×]                  │
│  [30-hour battery life ×]                                │
│  [Multipoint connection ×]                               │
│  [+] 添加                                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**节点差异处理**:
- `gigab2b-crawl`: specifications 是 object → ObjectEditor
- `amazon-product`: specifications 是 string[] → StringArrayEditor; 额外 bestSellersRank
- `extract-info`: 额外 mainImage (StringEditor), reviewCount (NumberEditor), description (长文本)

#### 4.3.2 AINodeTemplate — AI节点

**ai-optimize**:

```
Section: Claude 优化结果
  optimizedTitle: StringEditor (多行)
  optimizedDescription: StringEditor (长文本，可展开)
  optimizedBulletPoints: StringArrayEditor
  optimizedLongDescription: StringEditor (长文本)

Section: ChatGPT 优化结果 (仅 parallel 模式显示)
  chatgptTitle, chatgptDescription, chatgptKeywords, chatgptResponse

Section: SEO 关键词
  seoKeywords: StringArrayEditor

Section: 竞品分析
  competitorAnalysis: StringEditor (长文本)

Section: 原始AI回复 (默认折叠)
  response / chatgptResponse: StringEditor (长文本)
```

**ai-vision**:

```
Section: 识别信息
  imageCount: NumberEditor (只读)
  runId: StringEditor (只读)

Section: 识别结果
  results: StringArrayEditor (每条结果可独立编辑)
  firstResult: StringEditor (长文本)
```

#### 4.3.3 DataNodeTemplate — 数据节点

**amazon-search**:

```
Section: 搜索信息
  keyword: StringEditor
  total: NumberEditor

Section: 竞品列表
  asins: StringArrayEditor
  links: StringArrayEditor
```

**xiyouzhaoci-keywords**:

```
Section: 基本信息
  asin: StringEditor (只读)
  totalKeywords: NumberEditor (只读)
  topKeyword: StringEditor

Section: 关键词列表
  keywords: StringArrayEditor

Section: 完整关键词数据 (默认折叠)
  rawKeywords: ObjectArrayEditor (表格)
```

#### 4.3.4 BrowserNodeTemplate / UtilityNodeTemplate

这些节点字段较少 (2-6个)，直接按 outputSchema 顺序渲染对应编辑器，无需特殊分组。

#### 4.3.5 GenericNodeTemplate — 通用兜底

按 outputSchema 遍历所有字段，根据 FieldDef.type 选择对应编辑器。对于未在 schema 中声明的额外字段，使用 GenericEditor (textarea JSON)。

**图片字段自动检测逻辑**:
```typescript
const IMAGE_FIELDS = ['images', 'imageUrls', 'uploadedImages'];
if (IMAGE_FIELDS.includes(fieldName) && Array.isArray(value)) {
  return <ImageGalleryEditor ... />;
}
```

### 4.4 弹窗状态管理

```typescript
// NodeDataModal 内部状态
const [localData, setLocalData] = useState<Record<string, unknown>>({});
const [originalData, setOriginalData] = useState<Record<string, unknown>>({});
const [activeView, setActiveView] = useState<'input' | 'output'>('output');

// 打开时深拷贝
useEffect(() => {
  if (open && nodeId && stepOutputs[nodeId]) {
    const snapshot = JSON.parse(JSON.stringify(stepOutputs[nodeId].data));
    setLocalData(snapshot);
    setOriginalData(snapshot);
    setActiveView('output');
  }
}, [open, nodeId, stepOutputs]);

// 字段更新
const onFieldChange = (fieldName: string, value: unknown) => {
  setLocalData(prev => ({ ...prev, [fieldName]: value }));
};

// 脏检测
const hasChanges = JSON.stringify(localData) !== JSON.stringify(originalData);

// 保存
const handleSave = () => {
  if (nodeId) onSave(nodeId, localData);
  onClose();
};
```

---

## 五、实施步骤

### 第一阶段: 基础编辑器 (优先)

1. `GenericEditor.tsx` — 兜底编辑器
2. `StringEditor.tsx` — 字符串编辑器
3. `NumberEditor.tsx` — 数字编辑器
4. `BooleanEditor.tsx` — 开关编辑器
5. `fieldEditors/index.ts` — 统一导出

### 第二阶段: 复合类型编辑器

6. `StringArrayEditor.tsx` — 标签/芯片编辑器
7. `ObjectEditor.tsx` — 键值对编辑器
8. `ImageGalleryEditor.tsx` — 图片画廊编辑器
9. `ObjectArrayEditor.tsx` — 对象数组表格编辑器

### 第三阶段: 弹窗组件

10. `ModalHeader.tsx` — 头部组件
11. `ModalFooter.tsx` — 底部组件
12. `OutputSchemaEditor.tsx` — Schema 分发器
13. `GenericNodeTemplate.tsx` — 通用模板
14. `NodeDataModal.tsx` — 弹窗主组件
15. `NodeDataModal/index.ts` — 导出

### 第四阶段: 节点模板

16. `ProductNodeTemplate.tsx` — 商品节点
17. `AINodeTemplate.tsx` — AI节点
18. `DataNodeTemplate.tsx` — 数据节点
19. `BrowserNodeTemplate.tsx` — 浏览器节点
20. `UtilityNodeTemplate.tsx` — 工具节点
21. `nodeTemplates/index.ts` — 导出 + 映射

### 第五阶段: 集成接入

22. 修改 `WorkflowNode.tsx` — 添加编辑按钮
23. 修改 `ConfigPanel.tsx` — 添加弹窗编辑入口
24. 修改 `Canvas.tsx` — 透传 props
25. 修改 `WorkflowPage.tsx` — 透传 props
26. 修改 `App.tsx` — 挂载弹窗组件

### 第六阶段: 打磨

27. 深色模式适配 (所有新组件)
28. 移动端全屏适配测试
29. 动画效果添加
30. 键盘快捷键测试

---

## 六、潜在风险与应对

### 6.1 Schema 与实际数据不一致

**问题**: 多个 mock executor 返回了未在 outputSchema 中声明的字段 (如 extract-info 多了6个字段)。

**应对**: GenericNodeTemplate 在渲染完 schema 声明的字段后，检测 `data` 中是否存在 schema 之外的字段，如有则追加 GenericEditor 显示。

### 6.2 rawKeywords 类型不匹配

**问题**: `xiyouzhaoci-keywords` 的 rawKeywords 声明为 `string` 但实际是 `object[]`。

**应对**: OutputSchemaEditor 在选择编辑器时，不依赖 schema 声明类型，而是**运行时检查实际值的类型** (`Array.isArray(value) && typeof value[0] === 'object'` → ObjectArrayEditor)。

### 6.3 图片加载失败

**问题**: 部分 URL 可能失效或受跨域限制。

**应对**: `<img onError>` 回退到灰色占位符，不阻塞编辑流程。

### 6.4 大数据量性能

**问题**: rawKeywords 可能有 50+ 条记录。

**应对**: 表格区域 `max-h-[300px] overflow-y-auto`，使用虚拟列表或分页 (第一版用滚动即可)。

### 6.5 保存与执行冲突

**问题**: 用户在弹窗编辑时，工作流可能正在执行，stepOutputs 被回调更新。

**应对**: 执行中时禁用保存按钮 (检查 `executing` 状态)。

---

## 七、验证清单

| # | 验证项 | 预期结果 |
|---|--------|---------|
| 1 | 完整工作流执行后，点击成功节点编辑按钮 | 弹窗打开，数据按类型正确渲染 |
| 2 | 修改 string 字段并保存 | ConfigPanel 数据标签页同步更新 |
| 3 | 修改 number/boolean 字段并保存 | 数据类型保持正确 |
| 4 | StringArrayEditor 添加/删除关键词 | 数组长度正确变化，保存后持久化 |
| 5 | ImageGalleryEditor 显示缩略图 | 图片加载显示，加载失败显示占位符 |
| 6 | ImageGalleryEditor 添加/删除 URL | 数组更新正确 |
| 7 | ObjectEditor 添加/删除键值对 | 对象结构正确 |
| 8 | ObjectArrayEditor 编辑 rawKeywords | 表格数据更新正确 |
| 9 | 切换输入/输出视图 | 显示对应数据 (输入只读) |
| 10 | 有修改时关闭弹窗 | 弹出确认对话框 |
| 11 | Ctrl+S 保存 | 弹窗关闭，数据更新 |
| 12 | Escape 关闭 | 正常关闭或弹出确认 |
| 13 | 移动端弹窗 | 全屏显示，可正常操作 |
| 14 | 深色模式 | 所有新组件颜色正确 |
| 15 | 节点模板分区 | 商品节点显示基本信息/图片/规格/描述分区 |
| 16 | Schema 之外的字段 | 额外字段使用 GenericEditor 显示 |
