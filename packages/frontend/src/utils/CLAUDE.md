# 这个目录包含了项目的工具函数，提供了套餐权限检查和音效播放功能

### 📋 目录结构
```
utils/
├── planGuard.ts     ← 套餐权限检查工具
└── playSound.ts     ← 音效播放工具
```
## 1️⃣ planGuard.ts - 套餐权限检查工具
### 🎯 核心功能
函数 功能 checkFeatureLimit() 检查功能是否可用 calculateUsagePercent() 计算使用百分比 isNearLimit() 检查是否接近限制 getDaysUntilExpiry() 计算到期天数 isExpired() 检查是否已过期

### 💡 函数详解 checkFeatureLimit()
```
checkFeatureLimit(
  plan: PlanResponse | null,
  feature: string
): FeatureCheckResult
```
检查流程：

1. 无套餐数据 → 允许
2. 订阅已过期 → 不允许
3. 订阅已取消 → 不允许
4. 工作流执行次数检查 → 用完则不允许
5. 功能权限检查 → 不包含则不允许
6. 所有检查通过 → 允许 calculateUsagePercent()
```
calculateUsagePercent(plan: PlanResponse | null): number
```
计算当前使用量占总配额的百分比，四舍五入。
 isNearLimit()
```
isNearLimit(plan: PlanResponse | null, threshold = 80): boolean
```
检查是否达到阈值（默认 80%）。
 getDaysUntilExpiry()
```
getDaysUntilExpiry(plan: PlanResponse | null): number
```
计算距离套餐过期还有多少天。
 isExpired()
```
isExpired(plan: PlanResponse | null): boolean
```
检查套餐是否已过期（状态过期 或 到期天数为 0）。

## 2️⃣ playSound.ts - 音效播放工具
### 🔊 核心功能
函数 功能 playNodeComplete() 节点完成音效 playWorkflowComplete() 工作流完成音效 playError() 错误音效

### 💡 技术实现 Web Audio API
使用原生 Web Audio API，零依赖：

```
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}
``` 移动端兼容
在用户首次交互时恢复 AudioContext（移动端浏览器要求）：

```
document.addEventListener('touchstart', resumeAudio, { once: true });
document.addEventListener('touchend', resumeAudio, { once: true });
document.addEventListener('click', resumeAudio, { once: true });
``` 音效详情
音效 频率序列 波形 节点完成 880Hz → 1100Hz 正弦波 工作流完成 523Hz → 659Hz → 784Hz 正弦波 错误 300Hz → 250Hz 方波

## 🎨 工具设计亮点
### 1️⃣ 零依赖音效
使用 Web Audio API 原生实现，无需额外库。

### 2️⃣ 完整的权限检查
订阅状态、使用次数、功能权限三重检查。

### 3️⃣ 移动端兼容
处理移动端浏览器的 AudioContext 限制。

### 4️⃣ 优雅的错误处理
音效播放失败时静默处理，不影响用户体验。

## 💡 使用示例
### planGuard.ts
```
import { checkFeatureLimit } from '@/utils/planGuard';

const result = checkFeatureLimit(plan, 'workflow-execution');
if (!result.allowed) {
  alert(result.reason);
}
```
### playSound.ts
```
import { playNodeComplete, playWorkflowComplete, playError } from '@/utils/
playSound';

// 节点完成
playNodeComplete();

// 工作流完成
playWorkflowComplete();

// 错误
playError();
```
这个目录提供了实用的工具函数，支持套餐权限管理和用户体验优化！