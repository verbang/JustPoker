## 1. 后端：实时计算 sidePots

- [x] 1.1 在 `GameEngine` 中提取 `updateSidePots(state)` 辅助方法，调用 `PotCalculator.calculatePots()` 更新 `state.sidePots`
- [x] 1.2 在 `playerAction()` 返回前调用 `updateSidePots`
- [x] 1.3 在 `progressPhase()` 中调用 `updateSidePots`
- [x] 1.4 在 `startGame()` 初始状态构建后调用 `updateSidePots`
- [x] 1.5 在 `forceFold()` 返回前调用 `updateSidePots`
- [x] 1.6 在 `dealRemainingCardsAndShowdown()` 中调用 `updateSidePots`（展示最终底池结构）

## 2. 前端：底池展示组件改造

- [x] 2.1 `RoomView.vue`：提取 `sidePots` 和 `mainPotAmount` computed，传递给 `GameTable`
- [x] 2.2 `GameTable.vue`：新增 `sidePots` 和 `mainPotAmount` props
- [x] 2.3 `GameTable.vue`：改造底池展示模板，`sidePots` 非空时显示主池 + 边池逐行，为空时保持原样
- [x] 2.4 `GameTable.vue`：为边池文字添加 CSS 样式（稍小于主池字号，区分层级）

## 3. 测试

- [x] 3.1 补充 `game.engine.test.ts`：验证玩家全下后 `sidePots` 被正确填充
- [x] 3.2 补充 `game.engine.test.ts`：验证阶段切换后 `sidePots` 仍正确
