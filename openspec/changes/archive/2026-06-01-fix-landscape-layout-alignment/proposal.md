## Why

横屏模式下，游戏桌面的左侧元素（牌桌、玩家、手牌）没有顶部对齐。当右侧的比分板和牌型参考面板展开时，左侧牌桌会随之下移，影响用户体验。

## What Changes

- 修改横屏模式下 `.game-layout` 的 `align-items` 属性，从 `stretch` 改为 `start`
- 确保左侧 `.table-zone` 和右侧 `.control-zone` 在横屏模式下顶部对齐

## Capabilities

### New Capabilities

- `landscape-layout-alignment`: 横屏模式下游戏桌面的布局对齐功能

### Modified Capabilities

（无现有能力的变更）

## Impact

- 受影响文件：`client/src/views/RoomView.vue`
- 受影响区域：横屏模式下的 CSS 布局样式
- 影响范围：仅影响横屏模式下的布局显示，不影响竖屏模式
