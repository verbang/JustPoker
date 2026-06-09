## ADDED Requirements

### Requirement: 客户端用户身份持久化
系统 SHALL 在用户创建/加入房间成功后，将 userId 和 nickname 存入 localStorage（key: `justpoker_user`）。系统 SHALL 在应用初始化时从 localStorage 读取已保存的身份信息。系统 SHALL 在用户主动离开房间时清除 localStorage 中的身份信息。

#### Scenario: 首次创建房间后身份持久化
- **WHEN** 用户成功创建房间，服务端返回 userId 和 roomCode
- **THEN** 系统 SHALL 将 `{ userId, nickname }` 写入 localStorage（key: `justpoker_user`）

#### Scenario: 首次加入房间后身份持久化
- **WHEN** 用户成功加入房间，服务端返回 userId 和 roomCode
- **THEN** 系统 SHALL 将 `{ userId, nickname }` 写入 localStorage（key: `justpoker_user`）

#### Scenario: 应用初始化时恢复身份
- **WHEN** 用户打开应用页面，localStorage 中存在有效的 `justpoker_user` 数据
- **THEN** 系统 SHALL 从 localStorage 读取 userId 和 nickname，恢复到 Pinia user store

#### Scenario: 用户主动离开房间时清除身份
- **WHEN** 用户主动离开房间（点击离开按钮）
- **THEN** 系统 SHALL 清除 localStorage 中的 `justpoker_user` 数据

### Requirement: Socket.io 重连后自动加入房间
系统 SHALL 在 Socket.io `connect` 事件触发时，检查是否存在有效的用户身份和房间信息。如果存在，系统 SHALL 自动发送 `join-room` 事件到服务端。服务端 SHALL 检查该 userId 是否在 `disconnectedPlayers` 中，如果是则恢复连接。

#### Scenario: 网络波动后自动重连
- **WHEN** Socket.io 连接断开后自动重连（`connect` 事件触发），且 localStorage 中存在有效的 userId 和 roomCode
- **THEN** 客户端 SHALL 自动发送 `join-room` 事件，包含 roomCode 和 userId

#### Scenario: 页面刷新后自动重连
- **WHEN** 用户刷新页面，Socket.io 建立新连接，且 localStorage 中存在有效的 userId 和 roomCode
- **THEN** 客户端 SHALL 自动发送 `join-room` 事件，包含 roomCode 和 userId

#### Scenario: 服务端识别重连用户
- **WHEN** 服务端收到 `join-room` 请求，且该 userId 存在于 `disconnectedPlayers` Map 中
- **THEN** 服务端 SHALL 清除断线记录，取消重连超时计时器，广播 `PLAYER_JOINED` 事件（reconnected: true），并向重连用户发送当前游戏状态

#### Scenario: 重连时不在断线列表中
- **WHEN** 服务端收到 `join-room` 请求，该 userId 不在 `disconnectedPlayers` 中，但房间存在且未满
- **THEN** 服务端 SHALL 将该用户作为新玩家加入房间（标准加入流程）

### Requirement: 服务端非游戏状态重连窗口
系统 SHALL 为非游戏状态下的断线玩家提供重连窗口（30 秒）。超时后 SHALL 将玩家从房间中移除。

#### Scenario: 等待房间中断线后重连
- **WHEN** 玩家在非游戏状态（等待/准备中）断开连接，且在 30 秒内重新连接
- **THEN** 服务端 SHALL 恢复该玩家的房间状态，广播 `PLAYER_JOINED` 事件

#### Scenario: 等待房间中断线后超时
- **WHEN** 玩家在非游戏状态断开连接，且超过 30 秒未重连
- **THEN** 服务端 SHALL 将该玩家从房间中移除，广播 `ROOM_UPDATE` 和 `PLAYER_LEFT` 事件
