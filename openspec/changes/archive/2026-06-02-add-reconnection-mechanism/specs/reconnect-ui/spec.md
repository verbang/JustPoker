## ADDED Requirements

### Requirement: 断线状态覆盖层
系统 SHALL 在检测到 Socket.io 连接断开时，在 RoomView 上显示全屏覆盖层。覆盖层 SHALL 阻止用户进行任何游戏操作。覆盖层 SHALL 显示断线状态信息和重连倒计时。

#### Scenario: 连接断开时显示覆盖层
- **WHEN** Socket.io 连接状态变为断开（`disconnect` 事件触发）
- **THEN** 系统 SHALL 在 RoomView 上显示全屏覆盖层，包含"连接断开"提示和重连倒计时（30 秒）

#### Scenario: 重连成功时隐藏覆盖层
- **WHEN** Socket.io 重新连接成功（`connect` 事件触发），且服务端确认重连成功（收到游戏状态或 `PLAYER_JOINED` reconnected: true）
- **THEN** 系统 SHALL 隐藏覆盖层，恢复游戏界面交互

### Requirement: 重连超时处理
系统 SHALL 在 30 秒重连窗口超时后，显示超时提示并引导用户返回首页。

#### Scenario: 重连超时
- **WHEN** 断线后超过 30 秒未成功重连
- **THEN** 系统 SHALL 显示"重连超时"提示，并提供"返回首页"按钮

#### Scenario: 点击返回首页
- **WHEN** 用户在重连超时后点击"返回首页"按钮
- **THEN** 系统 SHALL 清除 localStorage 中的身份信息，导航回首页

### Requirement: 重连过程状态反馈
系统 SHALL 在重连过程中向用户提供清晰的状态反馈。

#### Scenario: 重连中状态
- **WHEN** Socket.io 正在尝试重连（`reconnect_attempt` 事件触发）
- **THEN** 系统 SHALL 在覆盖层显示"正在重连..."状态和当前尝试次数

#### Scenario: 重连失败状态
- **WHEN** Socket.io 重连尝试失败（`reconnect_failed` 事件触发）
- **THEN** 系统 SHALL 在覆盖层显示"重连失败，请检查网络连接"提示
