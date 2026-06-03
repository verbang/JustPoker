## Why

当多名玩家以不同筹码量全下时，底池会被拆分为主池和多个边池。当前前端仅显示一个总底池数字（`gameState.pot`），玩家无法区分哪些筹码自己有资格赢取、哪些属于边池。这在多人全下场景下容易造成困惑，降低游戏体验。

## What Changes

- 后端在每次玩家操作后实时计算并更新 `GameState.sidePots`，而非仅在摊牌时计算
- 前端 `GameTable` 组件接收并展示主池 + 边池结构，替代原来的单一底池数字
- 当仅存在主池（无边池）时，保持原有显示方式不变

## Capabilities

### New Capabilities
- `side-pot-display`: 游戏过程中实时展示主池和边池结构，让玩家清楚每个底池的金额

### Modified Capabilities

## Impact

- **后端**：`game.engine.ts` — 在 `playerAction`、`progressPhase`、`startGame` 等状态变更点调用 `PotCalculator.calculatePots()` 更新 `sidePots`
- **前端**：`GameTable.vue` — 新增边池展示逻辑；`RoomView.vue` — 传递 `sidePots` prop
- **共享类型**：无需修改，`GameState.sidePots` 和 `SidePot` 类型已存在
