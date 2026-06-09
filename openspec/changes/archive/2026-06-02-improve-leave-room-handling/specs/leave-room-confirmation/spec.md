## ADDED Requirements

### Requirement: 离开房间确认弹窗

当玩家点击"离开"按钮时，系统 SHALL 显示确认弹窗，防止误操作。弹窗内容 SHALL 根据玩家当前状态和游戏状态显示差异化提示文案。

#### Scenario: 游戏中离开确认

- **WHEN** 玩家状态为 'playing' 且游戏状态为 'playing'
- **THEN** 显示确认弹窗，文案为"正在游戏中，确定离开吗？已投入的筹码将不会退还"

#### Scenario: 准备阶段离开确认

- **WHEN** 玩家状态为 'ready' 且游戏未开始
- **THEN** 显示确认弹窗，文案为"确定离开房间吗？"

#### Scenario: 已选座未准备离开确认

- **WHEN** 玩家状态为 'seated'
- **THEN** 显示确认弹窗，文案为"确定离开房间吗？"

#### Scenario: 未选座离开确认

- **WHEN** 玩家状态为 'joined'（未选座）
- **THEN** 显示确认弹窗，文案为"确定离开房间吗？"

#### Scenario: 用户取消离开

- **WHEN** 用户在确认弹窗中点击"取消"
- **THEN** 系统 SHALL 保持当前状态，不执行任何操作

#### Scenario: 用户确认离开

- **WHEN** 用户在确认弹窗中点击"确定"
- **THEN** 系统 SHALL 执行离开房间流程：发送 LEAVE_ROOM 事件、清除本地状态、跳转到首页
