好的！让我为你详细分析 styles/index.css 这个主样式文件：

## 🎨 styles/index.css 文件详解
这是项目的 全局样式文件 ，基于 Tailwind CSS 构建，支持主题切换、自定义强调色等功能。

## 📋 文件结构概览
### 1️⃣ Tailwind CSS 基础导入
```
@tailwind base;
@tailwind components;
@tailwind utilities;
```
### 2️⃣ 亮色主题（默认）CSS 变量 🎨 表面颜色
```
:root {
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
}
``` 🌈 强调色系统（5 种可选）
主题 data-primary 值 主色 蓝色（默认） - #3b82f6 靛蓝 indigo #6366f1 紫罗兰 violet #8b5cf6 祖母绿 emerald #10b981 橙色 orange #f97316

每种颜色都有完整的 9 级色阶（50-900）。

### 3️⃣ Tailwind 蓝色类覆盖
通过 CSS 变量覆盖 Tailwind 的 blue-* 类，实现主题色动态切换：

```
.bg-blue-50 { background: var(--accent-50); }
.bg-blue-500 { background: var(--accent-500); }
.text-blue-600 { color: var(--accent-600); }
/* ... 更多覆盖 */
```
### 4️⃣ 深色主题（纯黑风格） 🎭 深色 CSS 变量
```
.dark {
  --color-surface: #000000;
  --color-surface-alt: #0a0a0a;
  --color-border: #1f1f1f;
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a3a3a3;
  --color-text-tertiary: #525252;
}
``` 🔄 完整的 Tailwind 类覆盖
包括：

- 背景色（ .bg-white → #000000 ）
- 文字色（ .text-gray-900 → #f5f5f5 ）
- 边框色（ .border-gray-200 → #1f1f1f ）
- 阴影（ .shadow-md → 更深的阴影）
- 悬停状态（ .hover\:bg-gray-50 → #141414 ）
- 渐变（ .from-blue-500 → #2563eb ）
### 5️⃣ 自定义组件样式 🔗 节点连接器
```
.node-connector::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -24px;
  width: 2px;
  height: 24px;
  background: #E5E7EB;
  transform: translateX(-50%);
  z-index: 0;
}
``` 📦 节点卡片
```
.node-card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  transition: all 0.2s ease;
}

.node-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.node-card--running {
  border-color: var(--accent-500);
  animation: node-pulse 1.5s ease-in-out infinite;
}
``` ⚙️ 工作流连线
```
.workflow-line {
  position: absolute;
  left: 50%;
  top: 100%;
  width: 2px;
  height: 32px;
  background: linear-gradient(to bottom, #D1D5DB, #D1D5DB);
  transform: translateX(-50%);
}
```
### 6️⃣ 动画定义 🔄 节点脉冲动画
```
@keyframes node-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
}
``` 🌀 加载旋转动画
```
@keyframes spin {
  to { transform: rotate(360deg); }
}
```
### 7️⃣ 渐变预设
提供了 8 种渐变背景类：

```
.gradient-blue { background: linear-gradient(135deg, var(--accent-500) 0%, var
(--accent-600) 100%); }
.gradient-purple { background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); }
.gradient-green { ... }
.gradient-orange { ... }
.gradient-red { ... }
.gradient-cyan { ... }
.gradient-pink { ... }
.gradient-indigo { ... }
```
### 8️⃣ 其他实用样式 📝 自定义复选框
```
.custom-checkbox {
  appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid #D1D5DB;
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.custom-checkbox:checked {
  background: var(--accent-500);
  border-color: var(--accent-500);
}
``` 🧭 左侧导航
```
.left-nav-item:hover { background: #F3F4F6; }
.left-nav-item.active {
  background: var(--accent-50);
  color: var(--accent-600);
  border-right: 3px solid var(--accent-500);
}
``` 📱 移动端优化
```
@media (hover: none) {
  .node-card:hover {
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
    transform: none;
  }
}
``` 🔒 隐藏滚动条
```
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```
## 🎯 设计亮点
### 1️⃣ CSS 变量驱动
所有主题色都通过 CSS 变量定义，易于切换和维护。

### 2️⃣ 完整的深色主题
不是简单的反色，而是精心设计的纯黑深色模式。

### 3️⃣ 5 种强调色可选
通过 data-primary 属性可以动态切换主题色。

### 4️⃣ 丰富的自定义组件
节点连接器、工作流连线、自定义复选框等。

### 5️⃣ 流畅的动画
节点脉冲、加载旋转、卡片悬停效果。

## 🎨 如何使用主题切换
```
// 切换主题色
document.documentElement.setAttribute('data-primary', 'emerald');

// 切换深色模式
document.documentElement.classList.add('dark');
```
这个文件是整个项目的样式核心，提供了完整的主题系统和组件样式！