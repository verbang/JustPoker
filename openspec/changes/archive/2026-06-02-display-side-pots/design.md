## Context

当前后端 `PotCalculator.calculatePots()` 仅在摊牌（showdown）时被调用，`GameState.sidePots` 在游戏过程中始终为 `[]`。前端 `GameTable.vue` 仅读取 `gameState.pot` 显示为单一数字。

后端基础设施已就绪：`PotCalculator` 可随时调用，`GameState` 已有 `sidePots: SidePot[]` 字段，Socket.io 每次操作后都会广播完整 `GameState`。

## Goals / Non-Goals

**Goals:**
- 游戏过程中实时计算并展示主池 + 边池结构
- 仅当存在边池时才改变显示方式，无边池时保持原有单行显示

**Non-Goals:**
- 不在底池旁标注各边池的有资格玩家（信息过载，桌面上空间有限）
- 不修改 `calculatePots` 的计算逻辑本身
- 不改变 `GameState.pot` 的累加行为（保持兼容）

## Decisions

### 1. 在 `playerAction` 返回前更新 `sidePots`

**选择：** 在 `GameEngine.playerAction()` 方法末尾、`checkRoundComplete` 返回结果后，调用 `PotCalculator.calculatePots()` 更新 `sidePots`。

**替代方案：** 在 `SocketService` 广播前计算 → 会把游戏逻辑泄漏到服务层，破坏职责分离。

**理由：** 引擎是游戏状态的唯一权威来源，状态更新应在引擎内部完成。

### 2. 在 `progressPhase` 和 `startGame` 中同步更新

**选择：** 在 `progressPhase()`（阶段切换时重置 `bet` 为 0）和 `startGame()`（初始状态）中也调用 `calculatePots`。

**理由：** 这些时刻也会改变游戏状态并广播给客户端，需要保持 `sidePots` 一致。

### 3. 前端展示方案：主池 + 边池逐行显示

**选择：** 当 `sidePots.length > 0` 时，显示为 "主池: X" + "边池: Y" 逐行排列；当 `sidePots` 为空时，保持原有 "底池: X" 样式。

**替代方案：** 始终显示 "主池 + 边池1 + 边池2 = 总计" → 大部分时候边池为 0，信息冗余。

**理由：** 仅在有意义时展示额外信息，减少视觉干扰。

## Risks / Trade-offs

- **性能：** 每次 `playerAction` 多一次 `calculatePots` 调用 → 排序 + 遍历，玩家数 ≤ 9，复杂度可忽略。
- **状态一致性：** `sidePots` 与 `pot` 可能短暂不一致（`pot` 是实时累加，`sidePots` 基于 `totalBet` 计算）→ 两者基于不同数据源，含义不同，不存在一致性问题。
