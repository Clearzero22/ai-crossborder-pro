# Electron 自动更新功能 — 开发经验总结

> 本次记录 2026-05-19 实现 Electron 自动更新功能的完整经验，涵盖技术选型、踩坑过程和最佳实践。

---

## 1. 技术选型

### 方案对比

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| `electron-updater` | electron-builder 原生集成，自动生成 `latest.yml`，内置版本比较和 blockmap | 额外依赖 | **采用** |
| 直接调用 GitHub API | 零依赖，完全可控 | 需自行实现版本比较、下载管理 | 不采用 |
| `electron-forge` + `electron-updater` | 配置更简洁 | 引入 forge 重量级工具链 | 不采用 |

**结论：** `electron-updater` 是 electron-builder 生态的标准方案，私有仓库 + GitHub Releases 场景下是最省事的选择。

---

## 2. 踩坑记录

### 坑 1：`electron-store` v11 API 变更

**现象：** TypeScript 编译报错 `Property 'get' does not exist on type 'ElectronStore'`。

**原因：** `electron-store` v11 继承 `Conf` v15，类型声明方式变化，构造函数参数通过 `Except<ConfigOptions<T>>` 约束，与文档示例不兼容。

**解决：** 放弃 `electron-store`，改用原生 `fs.readFileSync` / `fs.writeFileSync` 操作 JSON 文件。仅需要一个 `skippedVersion` 字段，用不到完整的键值存储库。

**教训：** 对版本敏感的依赖（大版本升级）要提前检查 changelog，不要假设 API 不变。

### 坑 2：dev 模式下 `electron-updater` 跳过检查

**现象：** 终端日志 `Skip checkForUpdates because application is not packed and dev update config is not forced`。

**原因：** `electron-updater` 默认在 `!app.isPackaged` 时跳过更新检查，防止开发时误触发。

**解决：** 设置 `autoUpdater.forceDevUpdateConfig = true`，并在 dev 模式下手动调用 `setFeedURL()` 配置 GitHub provider（因为 dev 模式没有 `app-update.yml` 文件）。

```typescript
autoUpdater.forceDevUpdateConfig = true;
if (!app.isPackaged) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Clearzero22',
    repo: 'ai-crossborder-pro',
    token: process.env.GH_TOKEN,
  });
}
```

### 坑 3：私有仓库 `No published versions on GitHub`

**现象：** `Error: No published versions on GitHub`。

**原因：** 私有仓库访问需要认证。`electron-updater` 调用 GitHub API 检查 Releases 时，未携带 Token 会导致 404。

**解决：** 在 `setFeedURL` 中传入 `token: process.env.GH_TOKEN`。

### 坑 4：Release 发布为草稿（draft）

**现象：** Release 文件存在，但 `GET /repos/:owner/:repo/releases/latest` 返回 404。

**原因：** `electron-builder` 默认将 Release 创建为 `draft: true`，草稿 Release 不会出现在 latest API 中。

**解决：** 在 `electron-builder.yml` 中设置 `releaseType: release`：

```yaml
publish:
  provider: github
  owner: Clearzero22
  repo: ai-crossborder-pro
  releaseType: release
```

### 坑 5：`currentVersion` 是只读属性

**现象：** TypeScript 报错 `Cannot assign to 'currentVersion' because it is a read-only property`。

**原因：** `electron-updater` v6 中 `autoUpdater.currentVersion` 是只读 getter。

**解决：** 删除 `autoUpdater.currentVersion = app.getVersion()` 赋值，不需要手动设置。

### 坑 6：`vite-env.d.ts` 全局类型声明不生效

**现象：** `window.electronAPI` 报错 `Property 'electronAPI' does not exist on type 'Window'`。

**原因：** `declare global` 在没有 `export` 的 `.d.ts` 文件中是全局脚本，TypeScript 使用 `moduleResolution: bundler` 时不会正确处理。

**解决：** 在文件末尾添加 `export {};` 将其变为外部模块。

### 坑 7：构建目录被锁定

**现象：** `remove app.asar: The process cannot access the file because it is being used by another process`。

**原因：** 上一次运行的 Electron 进程未完全退出，锁住了 `release5/app.asar`。

**解决：** 更换输出目录（`release5` → `release6`），并杀掉残留进程。长期方案是在 `prebuild` 脚本中更可靠地清理。

---

## 3. 架构设计经验

### 单一职责：updater.ts 独立模块

将更新逻辑完全隔离到 `updater.ts`，主进程只负责：
- 导入 `initAutoUpdater`、`skipVersion`、`downloadUpdate`、`installUpdate`、`checkForUpdates`
- 注册对应的 IPC handlers
- 在三个启动路径中调用 `initAutoUpdater`

**好处：** 主进程文件保持简洁，更新逻辑可独立测试和修改。

### IPC 设计：事件驱动 + 请求-响应

| 类型 | 场景 | 示例 |
|------|------|------|
| Main → Renderer（事件推送） | 异步通知 | `update-available`、`download-progress` |
| Renderer → Main（请求-响应） | 用户操作 | `download-update`、`check-for-updates` |

**好处：** 更新状态变化由主进程主动推送，渲染进程无需轮询。

### 前端组件分离

- `UpdateNotifier` — 顶部固定通知条，被动接收更新事件
- `SoftwareUpdateSection` — 设置页区块，用户主动触发检查

**好处：** 两处 UI 互不干扰，共享同一个 IPC 通道。

---

## 4. 发布流程经验

### GitHub Token 权限

Fine-grained token 需要：
- **Repository access:** 选定目标仓库（`Only select repositories`）
- **Contents:** `Read and write`（上传 Release 和 `latest.yml`）

Classic token 勾选 `repo` scope 即可，但 Fine-grained 更安全（仅限单个仓库）。

### `releaseType: release` 很重要

没有这个配置，electron-builder 默认创建 draft Release，用户端无法检测到更新。这是最容易遗漏的配置。

### `GH_TOKEN` 传递方式

- **构建时：** `GH_TOKEN=xxx npm run publish:win`（electron-builder 自动读取）
- **运行时（dev 模式）：** `set GH_TOKEN=xxx && npm run dev`（通过 `process.env.GH_TOKEN` 传入 `setFeedURL`）
- **生产模式：** 不需要，electron-builder 打包时将 `GH_TOKEN` 嵌入 `app-update.yml`... 实际上不会，生产模式依赖 `latest.yml` 中的公开 URL，私有仓库需要在 `setFeedURL` 中也配置 token。

---

## 5. 最佳实践

### 错误处理策略

所有更新相关错误均为静默处理（仅控制台日志），不打扰用户：
- 网络不可达 → 静默
- GitHub API 限流 → 静默
- 下载失败 → 静默，用户可手动重试
- Token 无效 → 静默

**理由：** 更新是辅助功能，不应该影响用户正常使用应用。

### 版本忽略机制

用户点击"稍后提醒"后，版本号持久化到 `userData/update-config.json`。下次启动时如果 GitHub 最新版本等于已忽略版本，不显示通知。用户只能在新版本发布后看到更新。

### 前端兼容浏览器

`window.electronAPI` 声明为可选（`electronAPI?`），前端组件通过 `if (!api) return` 优雅降级。开发时可在纯浏览器中运行，不依赖 Electron 环境。

### 更新检查超时

设置页手动检查有 15 秒超时，避免网络不佳时永久卡在"检查中"状态。

---

## 6. 如果重新实现

如果从零开始重做这个功能，我会：

1. **一开始就使用 fs 替代 electron-store** — 省去一个依赖和一个坑
2. **先配置好 releaseType: release** — 这是发布流程的核心配置
3. **先在 electron-builder.yml 配好 publish provider** — 再写任何代码
4. **dev 模式从一开始就配置 forceDevUpdateConfig + token** — 不要等到最后才调试
5. **设置页手动检查与启动自动检查共用同一套 IPC 通道** — 避免重复逻辑

---

## 7. 有用的命令速查

```bash
# 发布
set GH_TOKEN=github_pat_xxx
npm run publish:win

# 本地清理
npx kill-port 3456 5173

# 查看 Release 状态
curl -H "Authorization: Bearer $GH_TOKEN" \
  "https://api.github.com/repos/Clearzero22/ai-crossborder-pro/releases" \
  | grep -E '"tag_name"|"draft"'

# 删除更新配置（重置忽略版本）
rm "$APPDATA/@ai-crossborder/update-config.json"

# 查看更新日志（终端，不是 DevTools）
npm run dev 2>&1 | grep AutoUpdate
```
