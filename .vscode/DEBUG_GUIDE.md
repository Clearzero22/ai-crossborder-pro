# VS Code 调试指南

## 🚀 快速开始

### 1. 启动开发服务器

**方式一：使用 VS Code 任务面板**
1. 按 `Ctrl+Shift+P`
2. 输入 `Tasks: Run Task`
3. 选择以下任务之一：
   - `npm: dev` - 同时启动前后端（推荐）
   - `npm: dev:frontend` - 仅前端
   - `npm: dev:backend` - 仅后端

**方式二：使用终端**
```bash
npm run dev          # 同时启动所有服务
npm run dev:frontend # 仅前端 (port 5173)
npm run dev:backend  # 仅后端 (port 3456)
```

### 2. 启动调试

按 `F5` 或点击左侧调试图标，选择配置：

#### 常用调试配置

| 配置 | 用途 | 快捷键 |
|------|------|--------|
| `Debug Frontend (Chrome)` | 调试前端页面 | `F5` |
| `Debug Backend (API Server)` | 调试后端 API | `F5` |
| `Debug Full Stack (All)` | 同时调试前后端 | `F5` |
| `Debug Electron Main` | 调试 Electron 主进程 | `F5` |
| `Debug Electron Renderer` | 调试 Electron 渲染进程 | `F5` |

## 🎯 调试场景

### 场景 1：调试前端工作流执行

1. 启动 `Debug Frontend (Chrome)`
2. 在代码中设置断点：
   ```typescript
   // packages/frontend/src/plugins/index.ts
   async execute(ctx) {
     // 在这里设置断点
     const images = (ctx.input.images || []) as string[];
     console.log('[Debug] Images:', images); // 查看图片数据
   }
   ```
3. 在浏览器中操作工作流
4. 执行会在断点处暂停

### 场景 2：调试后端 API

1. 启动 `Debug Backend (API Server)`
2. 在代码中设置断点：
   ```typescript
   // packages/backend/src/api-server.ts
   app.post('/api/ai/recognize', async (c) => {
     // 在这里设置断点
     const body = await c.req.json();
     console.log('[Debug] Request:', body);
   });
   ```
3. 前端调用 API 时会在断点处暂停

### 场景 3：调试 Electron 应用

1. 启动 `Debug Electron (Main + Renderer)`
2. 这个复合配置会同时启动：
   - Electron 主进程调试
   - 渲染进程调试（Chrome DevTools）
3. 在两个进程中都可以设置断点

### 场景 4：调试 Build 版本问题

**比较 Dev 和 Build 的差异：**

1. **Dev 版本调试：**
   ```bash
   npm run dev
   # 然后启动 Debug Frontend 或 Debug Backend
   ```

2. **Build 版本调试：**
   ```bash
   npm run build:win
   # 运行打包后的应用
   ./packages/electron/release19/win-unpacked/AI-CrossBorder-Pro.exe
   ```

3. **查看日志输出：**
   - Windows: 打开命令行运行 exe，查看控制台输出
   - macOS/Linux: 在终端运行，查看 stdout

## 🛠️ 调试技巧

### 1. 条件断点

右键点击行号，选择 "Edit Breakpoint"，输入条件：
```javascript
// 只在 images 为空时暂停
images.length === 0

// 只在特定节点执行时暂停
ctx.nodeId === 'ai-vision'
```

### 2. 日志断点

右键点击行号，选择 "Add Logpoint"，输入消息：
```javascript
Images count: {images.length}, Node: {ctx.nodeId}
```

### 3. 监视表达式

在调试面板的 "Watch" 中添加：
```javascript
ctx.input
ctx.config
images.length
process.env.DATA_DIR
```

### 4. 调试控制台命令

在 Debug Console 中执行：
```javascript
// 查看全局变量
JSON.stringify(ctx.allOutputs)

// 调用函数
fetch('/api/health').then(r => r.json()).then(console.log)

// 查看环境变量
process.env
```

## 🔥 针对路径问题的调试

### 问题：Build 版本找不到图片文件

**步骤 1：在关键位置添加断点**

```typescript
// packages/frontend/src/plugins/index.ts
// 第 403 行附近
async execute(ctx) {
  // 断点 1: 查看输入数据
  const images = (ctx.input.images || []) as string[];
  debugger; // 或设置断点

  // 断点 2: 查看 filePath
  const filePath = placeholderImagePath;
  debugger;

  // 断点 3: 查看 API 调用
  const resp = await fetch('/api/ai/recognize', {...});
}
```

**步骤 2：比较 Dev 和 Build 的差异**

| 检查项 | Dev 值 | Build 值 |
|--------|--------|----------|
| `images` 数组 | 实际图片路径 | ? |
| `filePath` | 硬编码路径 | 相同 |
| `process.env.DATA_DIR` | 项目目录 | 用户数据目录 |
| API 响应 | 成功 | 失败 |

**步骤 3：后端断点**

```typescript
// packages/backend/src/api-server.ts
app.post('/api/ai/recognize', async (c) => {
  const body = await c.req.json();
  debugger; // 断点 1

  const vision = await createVisionService(db);
  debugger; // 断点 2

  const result = await vision.recognize(body.image, ...);
  debugger; // 断点 3
});
```

## 📋 常见问题

### Q1: 前端断点不生效？

**解决：**
1. 确保使用 Chrome/Edge 调试配置
2. 检查 sourcemap 是否生成（vite.config.ts）
3. 重启调试会话

### Q2: 后端断点不生效？

**解决：**
1. 确保使用 tsx watch 模式
2. 检查是否正确附加到进程
3. 使用 `debugger;` 语句强制断点

### Q3: Electron 调试无法连接？

**解决：**
1. 确保启动了 `--remote-debugging-port=9223`
2. 先启动 Main 调试，再启动 Renderer 调试
3. 使用复合配置 "Debug Electron (Main + Renderer)"

### Q4: 如何调试网络请求？

**前端：**
- Chrome DevTools → Network 面板
- 查看请求/响应详情

**后端：**
- 在 API handler 中设置断点
- 或使用 console.log 输出请求详情

## 🎓 进阶技巧

### 使用调试配置变量

在 `launch.json` 中使用变量：
```json
{
  "env": {
    "DEBUG": "true",
    "DATA_DIR": "${workspaceFolder}/test-data"
  }
}
```

### 多进程调试

同时调试多个进程：
1. 先启动 Backend 调试
2. 再启动 Frontend 调试
3. 在 "Call Stack" 中切换进程

### 性能分析

使用 Chrome DevTools Performance 面板：
1. 打开 DevTools (F12)
2. 切换到 Performance 面板
3. 点击录制按钮
4. 执行工作流
5. 查看性能瓶颈

---

**提示：** 按 `Ctrl+Shift+D` 快速打开调试面板