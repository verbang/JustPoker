## ADDED Requirements

### Requirement: 游戏中离开房间的处理

当玩家在游戏中主动离开房间时，系统 SHALL 自动触发弃牌逻辑，清理游戏状态，并正确推进游戏流程。

#### Scenario: 当前行动玩家离开

- **WHEN** 当前行动玩家发送 LEAVE_ROOM 事件
- **THEN** 系统 SHALL：
  1. 清除该玩家的行动超时计时器
  2. 调用 forceFold() 将该玩家标记为弃牌
  3. 检查游戏是否结束（只剩1名未弃牌玩家）
  4. 如果游戏继续，安排下一个玩家的行动超时
  5. 从 roomPlayers 中移除该玩家
  6. 广播 ROOM_UPDATE 和 PLAYER_LEFT 事件

#### Scenario: 非当前行动玩家离开

- **WHEN** 非当前行动玩家发送 LEAVE_ROOM 事件
- **THEN** 系统 SHALL：
  1. 调用 forceFold() 将该玩家标记为弃牌
  2. 检查游戏是否结束（只剩1名未弃牌玩家）
  3. 从 roomPlayers 中移除该玩家
  4. 广播 ROOM_UPDATE 和 PLAYER_LEFT 事件

#### Scenario: 弃牌后游戏结束

- **WHEN** 玩家离开导致只剩1名未弃牌玩家
- **THEN** 系统 SHALL 调用 handleGameFinished()，将底池分配给剩余玩家

#### Scenario: 弃牌后游戏继续

- **WHEN** 玩家离开后仍有2名及以上未弃牌玩家
- **THEN** 系统 SHALL 继续游戏，按正常流程推进

### Requirement: 准备阶段离开房间的处理

当玩家在准备阶段离开房间时，系统 SHALL 取消倒计时（如正在进行），释放座位，并正确通知其他玩家。

#### Scenario: 倒计时进行中离开

- **WHEN** 玩家在倒计时进行中发送 LEAVE_ROOM 事件
- **THEN** 系统 SHALL：
  1. 取消倒计时（清除 countdowns Map 中的定时器）
  2. 广播 COUNTDOWN_START 事件（带 count: null 表示取消）
  3. 将房间内所有玩家的状态重置为 'seated'（包括离开玩家以外的其他玩家）
  4. 释放该玩家的座位
  5. 从 roomPlayers 中移除该玩家
  6. 广播 ROOM_UPDATE 和 PLAYER_LEFT 事件

#### Scenario: 倒计时未进行时离开

- **WHEN** 玩家在准备阶段但无倒计时时发送 LEAVE_ROOM 事件
- **THEN** 系统 SHALL：
  1. 释放该玩家的座位
  2. 从 roomPlayers 中移除该玩家
  3. 广播 ROOM_UPDATE 和 PLAYER_LEFT 事件

### Requirement: 未选座离开房间的处理

当未选座玩家离开房间时，系统 SHALL 简单移除玩家记录。

#### Scenario: 未选座玩家离开

- **WHEN** 玩家状态为 'joined' 且发送 LEAVE_ROOM 事件
- **THEN** 系统 SHALL：
  1. 从 roomPlayers 中移除该玩家
  2. 广播 ROOM_UPDATE 和 PLAYER_LEFT 事件

### Requirement: 房主离开时的房主转移

当房主离开房间时，系统 SHALL 将房主权限转移给房间内其他玩家。

#### Scenario: 房主离开且房间有其他玩家

- **WHEN** 房主发送 LEAVE_ROOM 事件且房间内有其他玩家
- **THEN** 系统 SHALL 按照座位次序将 hostId 转移给下一个座位的玩家（座位号大于当前房主的最小座位号，如果不存在则从最小座位号开始）

#### Scenario: 房主离开且房间无其他玩家

- **WHEN** 房主发送 LEAVE_ROOM 事件且房间内无其他玩家
- **THEN** 系统 SHALL 不设置新房主，房间将在2分钟后被清理定时器删除

### Requirement: 离开事件的正确通知

系统 SHALL 在玩家离开时正确通知其他玩家，区分主动离开和断线重连。

#### Scenario: 主动离开通知

- **WHEN** 玩家主动发送 LEAVE_ROOM 事件
- **THEN** 系统 SHALL 广播 PLAYER_LEFT 事件，包含 userId 和 reason: 'leave'

#### Scenario: 断线超时离开通知

- **WHEN** 玩家断线超时后被移除
- **THEN** 系统 SHALL 广播 PLAYER_LEFT 事件，包含 userId 和 reason: 'timeout'

### Requirement: 离开玩家在比分板上的显示

当玩家离开房间后，系统 SHALL 在比分板上保留该玩家的信息，使用灰色字体显示，以便其他玩家了解游戏历史。

#### Scenario: 游戏中玩家离开后的比分板显示

- **WHEN** 玩家在游戏中离开（弃牌）
- **THEN** 比分板 SHALL 保留该玩家的昵称、筹码数和状态，字体颜色置灰，状态显示为"已离开"

#### Scenario: 非游戏中玩家离开后的比分板显示

- **WHEN** 玩家在非游戏状态离开
- **THEN** 比分板 SHALL 移除该玩家的信息（因为没有游戏历史需要保留）
