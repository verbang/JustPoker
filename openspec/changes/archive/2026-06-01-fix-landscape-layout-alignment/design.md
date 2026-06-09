## Context

JustPoker 游戏有两种布局模式：横屏和竖屏。横屏模式下，游戏桌面分为左右两列：
- 左侧：牌桌、玩家、手牌（`.table-zone`）
- 右侧：表情面板、比分板、牌型参考（`.control-zone`）

当前使用 CSS Grid 布局，`align-items` 默认值为 `stretch`，导致两列被拉伸到相同高度。当右侧内容展开时，左侧牌桌会随之下移。

## Goals / Non-Goals

**Goals:**
- 修复横屏模式下左侧元素的顶部对齐问题
- 确保右侧内容展开时，左侧牌桌保持顶部位置不变

**Non-Goals:**
- 不改变竖屏模式的布局
- 不改变游戏逻辑或功能

## Decisions

### 修改 CSS `align-items` 属性

**决策：** 在横屏媒体查询中，将 `.game-layout` 的 `align-items` 从 `stretch` 改为 `start`

**理由：**
- `align-items: stretch` 会导致两列被拉伸到相同高度
- `align-items: start` 使两列顶部对齐，各自保持自然高度
- 这是最简单、最小化的修复方案

**备选方案：**
1. 使用 `align-self: start` 单独设置左侧列 — 但 `align-items: start` 更简洁
2. 使用 Flexbox 替代 Grid — 改动过大，不必要

## Risks / Trade-offs

### 风险 1：右侧内容超出视口
**风险：** 当右侧内容（比分板 + 牌型参考）高度超过视口时，可能会被截断
**缓解：** 右侧 `.control-zone` 已设置 `overflow-y: auto`，可以滚动查看

### 风险 2：左侧内容超出视口
**风险：** 左侧牌桌高度固定（`min(560px, 100%)`），在小屏幕横屏模式下可能超出
**缓解：** 媒体查询中已设置 `height: 100%` 和 `min-height: 0`，确保适应容器
