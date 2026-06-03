## ADDED Requirements

### Requirement: 游戏过程中实时计算 sidePots

`GameEngine` SHALL 在每次游戏状态变更（玩家操作、阶段切换、开局）后，调用 `PotCalculator.calculatePots()` 更新 `GameState.sidePots`。

#### Scenario: 玩家全下后 sidePots 更新
- **WHEN** 玩家 A 全下 100，玩家 B 和 C 各跟注 200
- **THEN** `GameState.sidePots` 包含一个边池，金额为 200，有资格玩家为 B 和 C

#### Scenario: 无全下时 sidePots 为空
- **WHEN** 所有玩家均未全下，下注金额相同
- **THEN** `GameState.sidePots` 为空数组

### Requirement: 前端展示主池和边池

`GameTable` 组件 SHALL 在 `sidePots` 非空时，以主池 + 边池的逐行形式展示底池结构。

#### Scenario: 存在边池时显示多行
- **WHEN** `sidePots.length > 0`
- **THEN** 第一行显示 "主池: {mainPot}"，后续每行显示 "边池: {sidePot.amount}"

#### Scenario: 无边池时保持原有显示
- **WHEN** `sidePots.length === 0`
- **THEN** 显示 "底池: {pot}"，与当前行为一致

### Requirement: 边池数据通过 props 传递

`RoomView` SHALL 将 `gameState.sidePots` 和主池金额传递给 `GameTable` 组件。

#### Scenario: RoomView 传递 sidePots
- **WHEN** `gameState` 更新
- **THEN** `GameTable` 接收 `sidePots` 数组和主池金额作为 props
