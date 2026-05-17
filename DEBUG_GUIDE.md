# 节点功能调试指南

**更新时间：** 2026-05-17  
**项目：** AI CrossBorder Pro

---

## 📋 调试准备

### 前置条件
✅ 后端服务运行在 http://localhost:3456  
✅ 前端界面运行在 http://localhost:5173  
✅ 浏览器数据目录已配置：`~/.node-plawright-test/chrome-profile/automation`

### 调试工具
```bash
# 进入后端目录
cd packages/backend

# 查看 API 日志
# 后端终端会显示详细的执行日志
```

---

## 🔧 按类别调试节点

### 1️⃣ 浏览器自动化节点（蓝色）

#### 1.1 GigaB2B 爬虫节点

**测试方法：**
```bash
cd packages/backend
npm run test:gigab2b
```

**预期结果：**
- 成功抓取商品数据
- 保存到数据库
- 返回商品标题、价格、描述、图片等

**调试要点：**
- 检查网络连接
- 确认商品链接可访问
- 查看浏览器是否正常打开

---

#### 1.2 Amazon 竞品搜索节点

**测试方法：**
```bash
cd packages/backend
# Playwright 版本（推荐）
npx tsx test-playwright-amazon-search.ts

# 或者测试原始搜索服务
npm run test:amazon:search
```

**预期结果：**
- 返回竞品 ASIN 列表
- 返回竞品链接列表
- 搜索关键词匹配结果

**调试要点：**
- 检查反爬虫页面
- 验证搜索框定位
- 确认数据提取逻辑

---

#### 1.3 Amazon 商品详情节点

**测试方法：**
```bash
cd packages/backend
npm run test:amazon:product

# 测试多个商品
npm run test:amazon:multiple-products

# 完整流程测试

npm run test:amazon:complete
```

**预期结果：**
- 抓取完整商品信息
- 提取标题、价格、品牌、评分
- 获取五点描述和长描述
- 提取规格参数

**调试要点：**
- ASIN 验证
- 页面加载超时
- 数据提取选择器

---

#### 1.4 西柚找词关键词挖掘节点

**测试方法：**
```bash
cd packages/backend
npm run test:xiyouzhaoci
```

**预期结果：**
- 抓取关键词搜索量数据
- 获取竞争度指标
- 生成 CSV 备份文件
- 返回结构化关键词数据

**调试要点：**
- 西柚找词登录状态
- 数据表格定位
- CSV 生成路径

---

### 2️⃣ AI 处理节点（紫色）

#### 2.1 AI 图片识别节点

**测试方法：**
```bash
cd packages/backend
# 准备测试图片
# 然后通过前端界面测试该节点
```

**API 端点：**
```bash
curl -X POST http://localhost:3456/api/ai/recognize \
  -H "Content-Type: application/json" \
  -d '{"image":"path/to/image.jpg","templateId":"extract-search-keywords"}'
```

**预期结果：**
- 识别图片中的商品信息
- 提取搜索关键词
- 生成结构化结果

**调试要点：**
- 图片路径正确性
- AI 模型加载状态
- API 密钥配置

---

#### 2.2 AI 优化商品文案节点

**测试方法：**
```bash
# 通过前端界面工作流测试
# 或直接调用 API

curl -X POST http://localhost:3456/api/gemini/upload \
  -H "Content-Type: application/json" \
  -d '{"prompt":"优化这个商品标题","filePath":"path/to/image.jpg"}'
```

**预期结果：**
- 生成优化后的标题
- 提供五点描述建议
- 给出 SEO 关键词
- 竞品分析总结

**调试要点：**
- 提示词模板
- Gemini/ChatGPT API 连接
- 响应解析逻辑

---

### 3️⃣ 数据处理节点（橙色）

#### 3.1 查看运行记录节点

**测试方法：**
```bash
curl http://localhost:3456/api/runs?limit=10
```

**预期结果：**
- 返回最近运行记录
- 显示抓取状态
- 提供商品数量统计

**调试要点：**
- 数据库连接状态
- 查询性能
- 数据格式验证

---

#### 3.2 HTTP 请求节点

**测试方法：**
```bash
# 通过前端界面测试
# 或使用 curl

curl -X POST http://localhost:3456/api/test \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.example.com","method":"GET"}'
```

**预期结果：**
- 成功发送 HTTP 请求
- 返回响应数据
- 正确解析 JSON 响应

**调试要点：**
- URL 可访问性
- 请求头配置
- 超时处理

---

### 4️⃣ 流程控制节点

#### 4.1 开始/结束节点

**测试方法：**
- 这些是控制节点，在完整工作流中自动执行

**预期结果：**
- 工作流正常启动
- 节点状态正确更新

**调试要点：**
- 工作流引擎状态
- 节点执行顺序

---

## 📊 完整工作流测试

### 测试流程：商品信息采集 → AI 优化

1. **前端界面测试**
   - 访问 http://localhost:5173
   - 创建新工作流
   - 添加：GigaB2B 爬虫 → AI 识别 → Amazon 搜索 → 商品详情 → 西柚找词 → AI 优化
   - 配置节点参数
   - 执行工作流

2. **监控执行**
   - 查看每个节点的执行状态
   - 检查输出数据
   - 查看错误日志

---

## 🐛 常见问题排查

### 问题 1：浏览器启动失败

**症状：** 执行超时，浏览器未打开

**解决：**
```bash
# 检查 Playwright 安装
cd packages/backend
npx playwright install chromium

# 检查浏览器数据目录权限
ls -la ~/.node-plawright-test/chrome-profile/automation
```

---

### 问题 2：API 连接失败

**症状：** 前端节点执行失败，显示网络错误

**解决：**
```bash
# 检查后端服务状态
curl http://localhost:3456/api/health

# 检查端口占用
lsof -ti:3456
```

---

### 问题 3：反爬虫检测

**症状：** 页面重定向到验证页面

**解决：**
- 使用有头模式（headless: false）
- 手动完成验证
- 使用已登录的浏览器数据目录

---

### 问题 4：数据库连接失败

**症状：** 保存数据时出错

**解决：**
```bash
# 检查 PostgreSQL 是否运行
docker-compose ps

# 重启数据库
docker-compose restart
```

---

## 📈 性能优化建议

### 1. 浏览器复用
- 使用持久化上下文
- 共享登录状态
- 避免重复启动

### 2. 并发处理
- 使用并行节点执行
- 合理设置超时时间
- 实现任务队列

### 3. 缓存策略
- 缓存已抓取数据
- 设置合理的过期时间
- 减少重复请求

---

## 🎯 调试检查清单

### 单节点调试
- [ ] 节点配置正确
- [ ] 输入数据有效
- [ ] 输出格式符合预期
- [ ] 错误处理完善

### 工作流调试
- [ ] 节点连接正确
- [ ] 数据传递无误
- [ ] 执行顺序正确
- [ ] 异常处理有效

### 系统调试
- [ ] 后端服务正常
- [ ] 前端界面可访问
- [ ] 数据库连接稳定
- [ ] 浏览器配置正确

---

## 📝 调试日志分析

### 日志位置
- **后端日志：** 终端输出
- **前端日志：** 浏览器控制台
- **数据库日志：** docker-compose logs

### 日志级别
- `info` - 正常执行信息
- `success` - 操作成功
- `error` - 错误信息
- `warn` - 警告信息

---

## 🚀 下一步

1. 按照上述顺序逐个测试节点
2. 记录每个节点的执行结果
3. 收集错误日志
4. 优化节点配置
5. 构建完整工作流

如有问题，请检查相关测试脚本或查看 API 文档。