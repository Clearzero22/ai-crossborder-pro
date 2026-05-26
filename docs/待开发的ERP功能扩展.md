# 跨境电商 AI 自动化 — ERP 功能扩展规划

## 当前系统能力基线

### 已有能力

| 模块 | 状态 | 说明 |
|------|------|------|
| 工作流编辑器 | 端到端可用 | 可视化节点编排、拖拽、配置、执行 |
| GigaB2B 爬虫 | 端到端可用 | 商品抓取、数据清洗、存储 |
| AI 图片识别 | 端到端可用 | Qwen/OpenAI/Claude/Gemini 多 Provider，9 种识别模板 |
| Amazon 搜索 | 端到端可用 | Playwright 关键词搜索，返回 ASIN 列表 |
| Amazon 产品抓取 | 端到端可用 | 完整商品信息提取（标题/价格/图片/描述/规格等） |
| 关键词挖掘 | 端到端可用 | 西有找词 Amazon 关键词数据（搜索量/难度/流量等） |
| AI 文案优化 | 端到端可用 | Gemini/ChatGPT Listing 优化（标题/五点/长描述/SEO关键词） |
| 模板市场 | 端到端可用 | 6 个预定义模板 |
| AI Provider 管理 | 端到端可用 | 配置/测试/热重载 4 个 AI 提供商 |
| 工作流执行引擎 | 端到端可用 | 自动/手动模式、数据链路、日志、中止 |

### 现有数据库表

| 表名 | 用途 |
|------|------|
| `crawler_runs` | 爬虫执行记录 |
| `raw_data` | 原始 HTML/JSON 数据 |
| `staging_data` | 半结构化解析数据 |
| `clean_products` | 标准化商品数据（source/external_id/title/price/description/images/specifications） |
| `ai_recognition_results` | AI 识别结果 |
| `workflow_executions` | 工作流执行记录 |
| `workflow_step_records` | 步骤级执行数据 |
| `workflow_execution_logs` | 执行日志 |
| `settings` | 键值配置存储 |
| `profiles` | 浏览器配置文件 |

### 缺失的 ERP 核心模块

当前系统本质上是"选品 + AI 工具"，缺少完整的电商运营链路：**商品管理 → 采购 → 库存 → 订单 → 物流 → 财务 → CRM → 广告**。

---

## 一、商品管理（Product Management）

> 优先级: P0（核心基础模块）

ERP 的基础模块，将爬虫抓取的临时数据转化为可管理的商品档案。

### 1.1 新增数据库表

#### `products` — 主商品表

```sql
CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  sku           TEXT NOT NULL,
  name          TEXT NOT NULL,
  source        TEXT,                    -- 商品来源（手动/1688/Amazon/爬虫导入）
  source_url    TEXT,                    -- 原始链接
  source_id     TEXT,                    -- 来源平台的商品 ID
  category_id   INT REFERENCES product_categories(id),
  brand         TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',  -- draft/active/inactive/archived
  cost_price    NUMERIC(10,2),           -- 采购成本
  sale_price    NUMERIC(10,2),           -- 售价
  currency      TEXT DEFAULT 'USD',
  description   TEXT,
  short_desc    TEXT,                    -- 短描述
  attributes    JSONB,                   -- 自定义属性
  weight        NUMERIC(8,2),            -- 重量(kg)
  dimensions    JSONB,                   -- 长/宽/高 {l, w, h, unit}
  tags          TEXT[],                  -- 标签数组
  platform_map  JSONB,                   -- 多平台 SKU 映射 {"amazon": "B0xxx", "shopify": "123456"}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sku)
);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_source ON products(source);
```

#### `product_variants` — 商品变体表

```sql
CREATE TABLE product_variants (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_sku   TEXT NOT NULL,
  attributes    JSONB NOT NULL,          -- {"颜色": "红色", "尺寸": "XL"}
  price         NUMERIC(10,2),
  cost_price    NUMERIC(10,2),
  stock         INT DEFAULT 0,
  barcode       TEXT,                    -- 条形码/EAN/UPC
  image_url     TEXT,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(variant_sku);
```

#### `product_images` — 商品图片表

```sql
CREATE TABLE product_images (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  type          TEXT DEFAULT 'gallery',  -- main/a_plus/gallery/lifestyle/infographic
  alt_text      TEXT,
  sort_order    INT DEFAULT 0,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_images_product ON product_images(product_id);
```

#### `product_categories` — 商品分类表

```sql
CREATE TABLE product_categories (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  parent_id     INT REFERENCES product_categories(id),
  sort_order    INT DEFAULT 0,
  platform      TEXT,                    -- 适用于哪个平台
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `product_tags` — 标签表

```sql
CREATE TABLE product_tags (
  id            SERIAL PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  color         TEXT,                    -- 标签颜色
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_tag_mapping (
  product_id    INT REFERENCES products(id) ON DELETE CASCADE,
  tag_id        INT REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
```

### 1.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `product-create` | 创建商品档案 | 从爬虫/AI 数据创建商品记录，支持自动生成 SKU |
| `product-update` | 更新商品信息 | 批量更新商品字段（标题/价格/状态等） |
| `product-variant-generate` | AI 生成变体 | 根据属性自动生成变体组合（颜色 x 尺寸） |
| `product-deduplicate` | 智能去重 | AI 相似度匹配，合并重复商品 |
| `product-export` | 导出商品 | 导出为 CSV/Excel 格式 |
| `product-image-process` | 图片处理 | 批量裁剪/去水印/压缩/生成白底图 |

### 1.3 新增 API 接口

```
GET    /api/products                    # 商品列表（分页/搜索/筛选）
GET    /api/products/:id                # 商品详情（含变体/图片）
POST   /api/products                    # 创建商品
PUT    /api/products/:id                # 更新商品
DELETE /api/products/:id                # 删除商品（软删除）
GET    /api/products/:id/variants       # 变体列表
POST   /api/products/:id/variants       # 添加变体
PUT    /api/products/:id/variants/:vid  # 更新变体
POST   /api/products/batch              # 批量操作
POST   /api/products/export             # 导出
POST   /api/products/import             # 导入 CSV/Excel
GET    /api/products/categories         # 分类树
GET    /api/products/stats              # 商品统计
```

### 1.4 与现有系统的衔接

```
gigab2b-crawl ──→ product-create  ──→ products 表
amazon-product ──→ product-create  ──→ products 表
ai-optimize ────→ product-update  ──→ 回写优化后文案
ai-vision ──────→ product-image-process ──→ 图片处理
clean_products ──→ product-import  ──→ 历史数据迁移
```

---

## 二、采购管理（Procurement）

> 优先级: P0（核心链路）

跨境电商从 1688/供应商采购商品的核心流程。

### 2.1 新增数据库表

#### `suppliers` — 供应商档案

```sql
CREATE TABLE suppliers (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  platform        TEXT,                    -- 1688/alibaba/custom
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_wechat  TEXT,
  contact_email   TEXT,
  address         TEXT,
  rating          INT DEFAULT 0,          -- 1-5 评分
  payment_terms   TEXT,                    -- 付款方式（月结/预付/货到付款）
  bank_info       JSONB,                   -- 银行账户信息（加密存储）
  notes           TEXT,
  status          TEXT DEFAULT 'active',  -- active/inactive/blacklisted
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `supplier_products` — 供应商商品关联

```sql
CREATE TABLE supplier_products (
  id              SERIAL PRIMARY KEY,
  supplier_id     INT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id      INT REFERENCES products(id) ON DELETE SET NULL,
  supplier_sku    TEXT,
  supplier_url    TEXT,
  cost_price      NUMERIC(10,2),
  moq             INT DEFAULT 1,          -- 最小起订量
  lead_time_days  INT DEFAULT 7,          -- 交货天数
  sample_price    NUMERIC(10,2),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sp_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_sp_product ON supplier_products(product_id);
```

#### `purchase_orders` — 采购单

```sql
CREATE TABLE purchase_orders (
  id              SERIAL PRIMARY KEY,
  po_number       TEXT UNIQUE NOT NULL,   -- 采购单号（自动生成）
  supplier_id     INT NOT NULL REFERENCES suppliers(id),
  status          TEXT DEFAULT 'draft',   -- draft/submitted/confirmed/shipped/partial/received/cancelled
  total_amount    NUMERIC(12,2),
  currency        TEXT DEFAULT 'CNY',
  notes           TEXT,
  order_date      TIMESTAMPTZ,
  expected_date   TIMESTAMPTZ,            -- 预计到货日期
  received_date   TIMESTAMPTZ,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
```

#### `purchase_order_items` — 采购明细

```sql
CREATE TABLE purchase_order_items (
  id              SERIAL PRIMARY KEY,
  po_id           INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      INT REFERENCES products(id),
  variant_id      INT REFERENCES product_variants(id),
  supplier_sku    TEXT,
  product_name    TEXT,
  quantity        INT NOT NULL,
  unit_cost       NUMERIC(10,2),
  total_cost      NUMERIC(12,2),
  received_qty    INT DEFAULT 0,
  quality_note    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_poi_po ON purchase_order_items(po_id);
```

### 2.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `supplier-search-1688` | 1688 采购搜索 | 搜索 1688 商品和供应商列表 |
| `supplier-product-crawl` | 供应商商品抓取 | 抓取 1688 商品详情（价格/MOQ/规格） |
| `supplier-compare` | AI 供应商对比 | AI 对比多个供应商（价格/评分/交期/质量） |
| `supplier-image-download` | 图片下载去水印 | 批量下载 1688 商品图片并去水印 |
| `purchase-order-create` | 生成采购单 | 根据选品结果自动生成采购单 |
| `low-stock-trigger` | 低库存触发 | 库存低于阈值时触发补货工作流 |
| `supplier-inquiry` | AI 询价 | AI 生成询价消息 |

### 2.3 新增 API 接口

```
GET    /api/suppliers                  # 供应商列表
POST   /api/suppliers                  # 创建供应商
PUT    /api/suppliers/:id              # 更新供应商
DELETE /api/suppliers/:id              # 删除供应商
GET    /api/suppliers/:id/products     # 供应商商品列表

GET    /api/purchase-orders            # 采购单列表
POST   /api/purchase-orders            # 创建采购单
PUT    /api/purchase-orders/:id        # 更新采购单
PUT    /api/purchase-orders/:id/status # 更新状态
GET    /api/purchase-orders/:id        # 采购单详情
POST   /api/purchase-orders/:id/receive # 确认收货
```

### 2.4 与现有系统的衔接

```
xiyouzhaoci-keywords ──→ 搜索量判断采购需求
amazon-search ────────→ 确认竞品供货情况
ai-optimize ──────────→ 竞品分析辅助采购定价
supplier-search-1688 ─→ 采购搜索（新节点）
purchase-order-create ─→ 自动生成采购单
low-stock-trigger ────→ 触发补货工作流
```

---

## 三、订单管理（Order Management）

> 优先级: P0（核心链路）

对接电商平台订单，实现统一管理。

### 3.1 新增数据库表

#### `orders` — 订单主表

```sql
CREATE TABLE orders (
  id                SERIAL PRIMARY KEY,
  order_number      TEXT UNIQUE NOT NULL,
  platform_order_id TEXT NOT NULL,       -- 平台原始订单号
  platform          TEXT NOT NULL,       -- amazon/shopify/ebay/tiktok
  customer_name     TEXT,
  customer_email    TEXT,
  customer_phone    TEXT,
  shipping_address  JSONB,               -- 收货地址
  item_count        INT DEFAULT 0,
  total_amount      NUMERIC(12,2),
  currency          TEXT DEFAULT 'USD',
  status            TEXT DEFAULT 'pending',  -- pending/paid/shipped/delivered/cancelled/returned
  payment_status    TEXT DEFAULT 'pending',  -- pending/paid/refunded/partially_refunded
  shipping_status   TEXT DEFAULT 'pending',  -- pending/shipped/in_transit/delivered
  order_date        TIMESTAMPTZ,
  payment_date      TIMESTAMPTZ,
  shipped_date      TIMESTAMPTZ,
  delivered_date    TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_platform ON orders(platform);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date DESC);
CREATE INDEX idx_orders_payment ON orders(payment_status);
```

#### `order_items` — 订单明细

```sql
CREATE TABLE order_items (
  id                SERIAL PRIMARY KEY,
  order_id          INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  platform_item_id  TEXT,
  product_id        INT REFERENCES products(id),
  sku               TEXT,
  product_name      TEXT,
  quantity          INT NOT NULL,
  unit_price        NUMERIC(10,2),
  total_price       NUMERIC(12,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_oi_order ON order_items(order_id);
```

#### `order_fulfillments` — 发货履约

```sql
CREATE TABLE order_fulfillments (
  id                SERIAL PRIMARY KEY,
  order_id          INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier           TEXT,
  tracking_number   TEXT,
  shipping_method   TEXT,
  weight            NUMERIC(8,2),
  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  status            TEXT DEFAULT 'pending'
);
CREATE INDEX idx_of_order ON order_fulfillments(order_id);
```

#### `order_returns` — 退货退款

```sql
CREATE TABLE order_returns (
  id                SERIAL PRIMARY KEY,
  order_id          INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason            TEXT,
  status            TEXT DEFAULT 'requested',  -- requested/approved/processing/completed/rejected
  refund_amount     NUMERIC(10,2),
  refund_currency   TEXT,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);
```

### 3.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `order-sync` | 同步订单 | 从 Amazon/Shopify/eBay 拉取最新订单 |
| `order-auto-fulfill` | 自动发货 | 对接物流 API 自动生成面单发货 |
| `order-alert` | 异常订单提醒 | 超时未发货/退款/地址异常时预警 |
| `order-status-update` | 更新订单状态 | 同步物流状态到电商平台 |
| `order-export` | 导出订单 | 导出为 CSV/Excel |

### 3.3 新增 API 接口

```
GET    /api/orders                      # 订单列表（分页/搜索/筛选）
GET    /api/orders/:id                  # 订单详情
PUT    /api/orders/:id/status           # 更新订单状态
POST   /api/orders/sync                 # 手动触发同步
GET    /api/orders/stats                # 订单统计
POST   /api/orders/export               # 导出订单
GET    /api/orders/returns              # 退货列表
PUT    /api/orders/returns/:id          # 处理退货
```

---

## 四、库存管理（Inventory Management）

> 优先级: P0（核心链路）

管理多仓库库存，支持 FBA 同步。

### 4.1 新增数据库表

#### `warehouses` — 仓库档案

```sql
CREATE TABLE warehouses (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  code          TEXT UNIQUE,             -- 仓库编码
  country       TEXT,
  address       TEXT,
  type          TEXT DEFAULT 'local',    -- local/overseas/fba/third_party
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `inventory` — 库存主表

```sql
CREATE TABLE inventory (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        INT REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id      INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  available_qty     INT NOT NULL DEFAULT 0,  -- 可用库存
  reserved_qty      INT NOT NULL DEFAULT 0,  -- 预留库存（已下单未发货）
  in_transit_qty    INT NOT NULL DEFAULT 0,  -- 在途库存
  damaged_qty       INT NOT NULL DEFAULT 0,  -- 损坏库存
  reorder_point     INT DEFAULT 0,            -- 补货点
  reorder_qty       INT DEFAULT 0,            -- 补货数量
  last_counted_at   TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id, COALESCE(variant_id, 0))
);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
```

#### `inventory_movements` — 库存流水

```sql
CREATE TABLE inventory_movements (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id),
  variant_id    INT REFERENCES product_variants(id),
  warehouse_id  INT NOT NULL REFERENCES warehouses(id),
  type          TEXT NOT NULL,          -- in/out/transfer/adjust/correction
  quantity      INT NOT NULL,           -- 正数为入库，负数为出库
  reference_id  TEXT,                    -- 关联单号（采购单号/订单号/调拨单号）
  reason        TEXT,
  operator      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX idx_movements_date ON inventory_movements(created_at DESC);
```

#### `fba_inventory` — FBA 库存同步

```sql
CREATE TABLE fba_inventory (
  id                SERIAL PRIMARY KEY,
  asin              TEXT NOT NULL,
  fnsku             TEXT,
  seller_sku        TEXT,
  warehouse_code    TEXT,
  afn_quantity      INT DEFAULT 0,      -- FBA 可用数量
  afn_reserved      INT DEFAULT 0,      -- FBA 预留数量
  mfn_quantity      INT DEFAULT 0,      -- 自发货数量
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fba_asin ON fba_inventory(asin);
```

### 4.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `inventory-sync-fba` | 同步 FBA 库存 | 从 Amazon SP-API 拉取 FBA 库存数据 |
| `inventory-adjust` | 库存调整 | 盘点差异调整 |
| `inventory-transfer` | 跨仓调拨 | 在不同仓库间转移库存 |
| `low-stock-alert` | 低库存预警 | 库存低于补货点时触发通知 |

### 4.3 新增 API 接口

```
GET    /api/inventory                   # 库存列表（支持按仓库/商品筛选）
POST   /api/inventory/adjust            # 库存调整
POST   /api/inventory/transfer          # 跨仓调拨
GET    /api/inventory/movements         # 库存流水
GET    /api/inventory/alerts            # 低库存预警列表
GET    /api/warehouses                  # 仓库列表
POST   /api/warehouses                  # 创建仓库
PUT    /api/warehouses/:id              # 更新仓库
GET    /api/inventory/fba               # FBA 库存
POST   /api/inventory/fba/sync          # 同步 FBA 库存
GET    /api/inventory/stats             # 库存统计（总价值/周转率等）
```

---

## 五、物流管理（Logistics/Shipping）

> 优先级: P1（重要模块）

管理发货和物流跟踪。

### 5.1 新增数据库表

#### `shipping_templates` — 物流模板

```sql
CREATE TABLE shipping_templates (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  carrier             TEXT NOT NULL,       -- 承运商
  service_type        TEXT,                -- 快递/空运/海运/铁路
  origin_country      TEXT,
  destination_countries TEXT[],
  base_weight_kg      NUMERIC(8,2),
  base_cost           NUMERIC(10,2),
  per_kg_cost         NUMERIC(8,2),
  estimated_days      INT,                 -- 预计天数
  status              TEXT DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `shipments` — 发货记录

```sql
CREATE TABLE shipments (
  id              SERIAL PRIMARY KEY,
  shipment_number TEXT UNIQUE NOT NULL,
  order_id        INT REFERENCES orders(id),
  carrier         TEXT,
  service_type    TEXT,
  tracking_number TEXT,
  status          TEXT DEFAULT 'pending',  -- pending/picked_up/in_transit/customs/out_for_delivery/delivered/returned
  origin          JSONB,                  -- 发货地
  destination     JSONB,                  -- 目的地
  weight_kg       NUMERIC(8,2),
  dimensions      JSONB,
  declared_value  NUMERIC(12,2),
  shipping_cost   NUMERIC(10,2),
  currency        TEXT DEFAULT 'USD',
  notes           TEXT,
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
```

#### `shipment_events` — 物流轨迹

```sql
CREATE TABLE shipment_events (
  id              SERIAL PRIMARY KEY,
  shipment_id     INT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status          TEXT,
  location        TEXT,
  description     TEXT,
  event_time      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_events_shipment ON shipment_events(shipment_id);
```

### 5.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `shipping-rate-compare` | 运费对比 | 对比多家物流商报价，自动选择最优 |
| `shipping-label-create` | 生成面单 | 调用物流 API 生成运单/面单 |
| `tracking-sync` | 同步物流轨迹 | 自动更新物流状态 |
| `shipping-cost-calc` | 运费计算 | 根据重量/尺寸/目的地计算运费 |
| `shipping-notify` | 发货通知 | 发货后自动通知买家 |

---

## 六、财务管理（Financial Management）

> 优先级: P1（重要模块）

利润核算和费用管理。

### 6.1 新增数据库表

#### `transactions` — 收支流水

```sql
CREATE TABLE transactions (
  id              SERIAL PRIMARY KEY,
  type            TEXT NOT NULL,          -- income/expense/refund
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT DEFAULT 'USD',
  exchange_rate   NUMERIC(10,6),
  category        TEXT,                    -- sales/cost/shipping/ad/platform_fee/refund/other
  order_id        INT REFERENCES orders(id),
  reference_id    TEXT,
  description     TEXT,
  transaction_date TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_trans_type ON transactions(type);
CREATE INDEX idx_trans_category ON transactions(category);
CREATE INDEX idx_trans_date ON transactions(transaction_date DESC);
```

#### `settlements` — 平台结算

```sql
CREATE TABLE settlements (
  id              SERIAL PRIMARY KEY,
  platform        TEXT NOT NULL,
  settlement_id   TEXT,                    -- 平台结算单号
  period_start    DATE,
  period_end      DATE,
  gross_sales     NUMERIC(14,2),
  refunds         NUMERIC(14,2),
  platform_fees   NUMERIC(14,2),
  shipping_credits NUMERIC(14,2),
  other_income    NUMERIC(14,2),
  net_payout      NUMERIC(14,2),
  currency        TEXT,
  status          TEXT DEFAULT 'pending',  -- pending/processed
  deposited_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_settlements_platform ON settlements(platform);
CREATE INDEX idx_settlements_period ON settlements(period_start);
```

#### `expenses` — 费用记录

```sql
CREATE TABLE expenses (
  id              SERIAL PRIMARY KEY,
  category        TEXT NOT NULL,          -- ad/shipping/procurement/warehouse/tool/subscription/other
  sub_category    TEXT,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT DEFAULT 'USD',
  vendor          TEXT,
  description     TEXT,
  expense_date    DATE NOT NULL,
  attachment_url  TEXT,                    -- 凭证/发票
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
```

#### `profit_reports` — 利润报表

```sql
CREATE TABLE profit_reports (
  id              SERIAL PRIMARY KEY,
  period_type     TEXT NOT NULL,          -- daily/weekly/monthly
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  revenue         NUMERIC(14,2),
  cogs            NUMERIC(14,2),          -- 销售成本
  shipping_cost   NUMERIC(14,2),
  ad_spend        NUMERIC(14,2),
  platform_fees   NUMERIC(14,2),
  other_expenses  NUMERIC(14,2),
  net_profit      NUMERIC(14,2),
  profit_rate     NUMERIC(5,2),           -- 利润率(%)
  order_count     INT,
  avg_order_value NUMERIC(10,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_type, period_start)
);
```

### 6.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `profit-calculate` | 利润计算 | 自动计算单品/订单利润（售价-成本-运费-佣金-广告费） |
| `settlement-sync` | 同步结算 | 同步 Amazon/Shopify 结算数据 |
| `expense-categorize` | AI 费用分类 | AI 自动分类费用 |
| `profit-alert` | 利润预警 | 利润率低于阈值时预警 |
| `financial-report-generate` | 生成财务报表 | 定时生成日报/周报/月报 |

### 6.3 与现有系统的衔接

```
clean_products.price      ──→ 售价数据
purchase_orders           ──→ 采购成本
shipments.shipping_cost   ──→ 运费
order_returns             ──→ 退款
profit-calculate          ──→ 自动计算: 售价 - 采购成本 - 运费 - 平台佣金 - 广告费
```

---

## 七、客户管理（CRM）

> 优先级: P2（增值模块）

评论分析和客户消息管理。

### 7.1 新增数据库表

#### `customers` — 客户档案

```sql
CREATE TABLE customers (
  id                  SERIAL PRIMARY KEY,
  platform            TEXT,
  platform_customer_id TEXT,
  name                TEXT,
  email               TEXT,
  phone               TEXT,
  country             TEXT,
  first_order_at      TIMESTAMPTZ,
  last_order_at       TIMESTAMPTZ,
  total_orders        INT DEFAULT 0,
  total_spent         NUMERIC(12,2) DEFAULT 0,
  lifetime_value      NUMERIC(12,2) DEFAULT 0,
  tags                TEXT[],
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customers_platform ON customers(platform);
CREATE INDEX idx_customers_email ON customers(email);
```

#### `reviews` — 评论管理

```sql
CREATE TABLE reviews (
  id                SERIAL PRIMARY KEY,
  platform          TEXT NOT NULL,
  platform_review_id TEXT,
  product_id        INT REFERENCES products(id),
  product_asin      TEXT,
  customer_name     TEXT,
  rating            INT CHECK (rating BETWEEN 1 AND 5),
  title             TEXT,
  content           TEXT,
  review_date       DATE,
  images            TEXT[],
  response          TEXT,
  response_date     TIMESTAMPTZ,
  sentiment         TEXT,                   -- positive/neutral/negative（AI 分析结果）
  keywords          TEXT[],                 -- AI 提取的关键词
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_sentiment ON reviews(sentiment);
```

#### `customer_messages` — 站内信/消息

```sql
CREATE TABLE customer_messages (
  id                SERIAL PRIMARY KEY,
  platform          TEXT NOT NULL,
  platform_msg_id   TEXT,
  customer_id       INT REFERENCES customers(id),
  order_id          INT REFERENCES orders(id),
  direction         TEXT NOT NULL,          -- inbound/outbound
  subject           TEXT,
  body              TEXT NOT NULL,
  status            TEXT DEFAULT 'unread',  -- unread/read/replied/closed
  message_date      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_customer ON customer_messages(customer_id);
CREATE INDEX idx_messages_status ON customer_messages(status);
```

### 7.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `review-fetch` | 抓取评论 | 批量抓取 Amazon 商品评论 |
| `review-analyze` | AI 评论分析 | 情感分析/痛点提取/改进建议 |
| `review-reply` | AI 评论回复 | AI 自动生成评论回复 |
| `review-alert` | 差评预警 | 1-2 星差评自动通知 |
| `customer-message-reply` | AI 消息回复 | AI 生成客服回复 |
| `review-summary` | 评论汇总报告 | 按商品汇总评论分析结果 |

### 7.3 与现有系统的衔接

```
ai-vision          ──→ 分析评论中的图片（包装/质量问题）
ai-optimize        ──→ 根据评论反馈优化 Listing
amazon-product     ──→ 获取商品 ASIN 关联评论
review-analyze     ──→ 反馈到 ai-optimize 改进文案
```

---

## 八、广告管理（Advertising/PPC）

> 优先级: P2（增值模块）

Amazon Ads 和多平台广告管理。

### 8.1 新增数据库表

#### `ad_campaigns` — 广告活动

```sql
CREATE TABLE ad_campaigns (
  id                SERIAL PRIMARY KEY,
  platform          TEXT NOT NULL,
  campaign_id       TEXT,                   -- 平台广告活动 ID
  campaign_name     TEXT NOT NULL,
  campaign_type     TEXT,                   -- sponsored_products/sponsored_brands/sponsored_display
  targeting_type    TEXT,                   -- auto/manual/category/product/keyword
  budget_daily      NUMERIC(10,2),
  budget_total      NUMERIC(12,2),
  bid_strategy      TEXT,                   -- dynamic_up/down/fix
  status            TEXT DEFAULT 'enabled',  -- enabled/paused/archived
  start_date        DATE,
  end_date          DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ad_campaigns_platform ON ad_campaigns(platform);
CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status);
```

#### `ad_groups` — 广告组

```sql
CREATE TABLE ad_groups (
  id                SERIAL PRIMARY KEY,
  campaign_id       INT NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  platform_group_id TEXT,
  name              TEXT NOT NULL,
  default_bid       NUMERIC(8,2),
  status            TEXT DEFAULT 'enabled',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ad_groups_campaign ON ad_groups(campaign_id);
```

#### `ad_keywords` — 广告关键词

```sql
CREATE TABLE ad_keywords (
  id                SERIAL PRIMARY KEY,
  ad_group_id       INT NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
  keyword           TEXT NOT NULL,
  match_type        TEXT DEFAULT 'broad',  -- broad/phrase/exact
  bid               NUMERIC(8,2),
  status            TEXT DEFAULT 'enabled',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_adk_group ON ad_keywords(ad_group_id);
```

#### `ad_performance` — 广告表现数据

```sql
CREATE TABLE ad_performance (
  id                SERIAL PRIMARY KEY,
  campaign_id       INT REFERENCES ad_campaigns(id),
  ad_group_id       INT REFERENCES ad_groups(id),
  keyword_id        INT REFERENCES ad_keywords(id),
  date              DATE NOT NULL,
  impressions       INT DEFAULT 0,
  clicks            INT DEFAULT 0,
  ctr               NUMERIC(6,4),          -- 点击率
  spend             NUMERIC(10,2) DEFAULT 0,
  cpc               NUMERIC(8,2),          -- 平均点击成本
  orders            INT DEFAULT 0,
  sales             NUMERIC(12,2) DEFAULT 0,
  acos              NUMERIC(6,2),          -- 广告销售成本比
  roas              NUMERIC(10,2),          -- 广告回报率
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, ad_group_id, keyword_id, date)
);
CREATE INDEX idx_adperf_date ON ad_performance(date DESC);
CREATE INDEX idx_adperf_campaign ON ad_performance(campaign_id);
```

### 8.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `ad-keyword-research` | 广告关键词研究 | 结合 xiyouzhaoci 数据筛选高价值广告词 |
| `ad-bid-optimize` | AI 出价优化 | 根据 ACoS 目标自动调整出价 |
| `ad-performance-sync` | 同步广告数据 | 拉取 Amazon Ads 每日表现数据 |
| `ad-budget-alert` | 广告预算预警 | 日预算耗尽/ACoS 超标预警 |
| `ad-neg-keyword` | 否定关键词 | AI 自动识别无效搜索词添加为否定词 |

### 8.3 与现有系统的衔接

```
xiyouzhaoci-keywords ──→ 天然的广告关键词来源（搜索量/点击率/转化率）
amazon-search ────────→ 竞品广告位数据参考
ai-optimize ──────────→ 生成广告标题和文案
ad-keyword-research ──→ 结合关键词挖掘数据
```

---

## 九、数据看板与报表（Analytics）

> 优先级: P2（增值模块）

### 9.1 新增功能模块

| 功能 | 数据来源 | 展示内容 |
|------|---------|---------|
| **销售总览** | orders + settlements | 日/周/月销售额、订单量、客单价、同比增长趋势 |
| **商品表现排行** | orders + products | Top 畅销/滞销商品、销量/销售额/利润排行 |
| **平台数据对比** | orders (group by platform) | Amazon/Shopify/eBay 多平台销售对比 |
| **利润分析** | profit_reports | 按商品/平台/时段的利润分析、利润率趋势 |
| **广告效果** | ad_performance | ACoS/TACoS/RoAS 趋势、关键词表现排行 |
| **库存健康度** | inventory + movements | 库存周转率、缺货率、滞销率、补货建议 |
| **竞品监控** | amazon-product (定时抓取) | 竞品价格变动、Listing 修改、新品上架 |
| **AI 使用统计** | ai_recognition_results | AI 调用次数、Token 消耗、各模型使用比例 |

### 9.2 新增工作流节点

| 节点 ID | 标签 | 功能描述 |
|---------|------|---------|
| `report-generate` | 生成报表 | 定时生成日报/周报/月报 |
| `report-distribute` | 分发报表 | 自动发送报表到邮箱/企微/飞书/Slack |
| `anomaly-detect` | AI 异常检测 | 检测销售/流量/库存异常波动并预警 |
| `competitor-monitor` | 竞品监控 | 定时抓取竞品价格和 Listing 变化 |

### 9.3 新增 API 接口

```
GET  /api/dashboard/sales-overview      # 销售总览
GET  /api/dashboard/product-ranking     # 商品排行
GET  /api/dashboard/platform-compare   # 平台对比
GET  /api/dashboard/profit-analysis    # 利润分析
GET  /api/dashboard/ad-performance     # 广告效果
GET  /api/dashboard/inventory-health   # 库存健康度
GET  /api/dashboard/anomalies          # 异常检测
GET  /api/reports/generate             # 生成报表
POST /api/reports/schedule             # 定时报表计划
```

---

## 十、多平台对接（Platform Integration）

> 优先级: P3（扩展模块）

### 10.1 平台对接规划

| 平台 | API 类型 | 对接能力 | 优先级 |
|------|---------|---------|--------|
| **Amazon SP-API** | REST (OAuth2) | 订单/FBA库存/广告/结算/报表 | P0 |
| **Shopify Admin API** | REST (OAuth2) | 商品/订单/库存/Webhook | P1 |
| **eBay REST API** | REST (OAuth2) | 商品/订单/物流 | P2 |
| **TikTok Shop API** | REST | 商品/订单/达人合作 | P2 |
| **1688 开放平台** | REST | 商品搜索/供应商/下单 | P1 |
| **Temu Seller API** | REST | 供货/订单 | P3 |
| **Wish API** | REST | 商品/订单 | P3 |
| **AliExpress API** | REST | 商品/订单/物流 | P3 |

### 10.2 物流 API 对接

| 物流商 | API 能力 | 优先级 |
|--------|---------|--------|
| **递四方 (4PX)** | 面单生成/轨迹查询/运费报价 | P1 |
| **云途物流** | 面单生成/轨迹查询 | P1 |
| **燕文物流** | 面单生成/轨迹查询 | P2 |
| **跨境通** | 综合物流服务 | P2 |
| **Amazon Buy Shipping** | 亚马逊官方物流 | P1 |

### 10.3 通知渠道对接

| 渠道 | 用途 | 优先级 |
|------|------|--------|
| **Email (SMTP)** | 订单通知/报表/预警 | P0 |
| **企业微信** | 团队消息推送 | P1 |
| **飞书** | 团队消息推送 | P1 |
| **Slack** | 国际团队通知 | P2 |
| **钉钉** | 团队消息推送 | P2 |
| **Telegram Bot** | 个人通知 | P2 |

---

## 实现优先级路线图

```
阶段 1（1-2 月）— 核心 ERP
├── 商品管理（products/variants/images/categories）
├── 订单同步（Amazon SP-API 订单拉取）
├── 库存管理（多仓库/库存流水）
└── 修复现有 CRITICAL Bug

阶段 2（2-3 月）— 采购与物流
├── 采购管理（供应商/采购单/入库）
├── 1688 对接（商品搜索/供应商抓取）
├── 物流管理（面单/轨迹/运费）
└── 邮件通知（SMTP 真实实现）

阶段 3（3-4 月）— 财务与 CRM
├── 财务管理（收支/结算/利润报表）
├── 评论管理（抓取/AI分析/回复）
├── 数据看板（销售/库存/利润）
└── AI 对话功能实现

阶段 4（4-6 月）— 广告与扩展
├── 广告管理（关键词/出价/效果分析）
├── Shopify 对接
├── 工作流引擎增强（条件分支/循环/并行）
└── 企微/飞书通知对接
```

---

## 备注

- 所有新表均需同步编写 SQLite 和 PostgreSQL 两个版本的 Schema
- 所有 API 接口需考虑鉴权（当前系统无任何认证）
- 数据库操作需使用事务确保数据一致性
- 图片/文件存储建议使用本地文件系统 + OSS/S3（可选）
- 多平台对接需要各平台开发者账号和 API 密钥
