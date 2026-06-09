## MODIFIED Requirements

### Requirement: 断线重连机制

当玩家断线时，系统 SHALL 提供30秒重连窗口，期间保留玩家状态和座位。重连成功后，玩家 SHALL 恢复到断线前的状态。

**变更说明**：需要区分"主动离开"和"断线"两种情况，确保主动离开不触发重连等待。

#### Scenario: 游戏中断线

- **WHEN** 玩家在游戏中断开连接
- **THEN** 系统 SHALL：
  1. 将玩家加入 disconnectedPlayers Map
  2. 设置30秒重连超时
  3. 广播 PLAYER_LEFT 事件，包含 userId 和 reconnecting: true
  4. 保留玩家在 roomPlayers 中的状态

#### Scenario: 游戏中断线超时

- **WHEN** 玩家断线超过30秒未重连
- **THEN** 系统 SHALL：
  1. 调用 handlePlayerDisconnect() 自动弃牌
  2. 从 roomPlayers 中移除玩家
  3. 广播 PLAYER_LEFT 事件，包含 userId 和 reason: 'timeout'

#### Scenario: 主动离开不触发重连

- **WHEN** 玩家主动发送 LEAVE_ROOM 事件
- **THEN** 系统 SHALL：
  1. 不将玩家加入 disconnectedPlayers Map
  2. 直接从 roomPlayers 中移除玩家
  3. 广播 PLAYER_LEFT 事件，包含 userId 和 reason: 'leave'

#### Scenario: 非游戏状态断线

- **WHEN** 玩家在非游戏状态断开连接
- **THEN** 系统 SHALL：
  1. 将玩家加入 disconnectedPlayers Map
  2. 设置30秒重连超时
  3. 广播 PLAYER_LEFT 事件，包含 userId 和 reconnecting: true

#### Scenario: 非游戏状态断线超时

- **WHEN** 玩家在非游戏状态断线超过30秒未重连
- **THEN** 系统 SHALL：
  1. 从 roomPlayers 中移除玩家
  2. 广播 PLAYER_LEFT 事件，包含 userId 和 reason: 'timeout'
