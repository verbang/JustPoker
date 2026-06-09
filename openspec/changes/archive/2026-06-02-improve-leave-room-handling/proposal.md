## Why

当前"离开房间"功能存在严重的边界问题：玩家可以在游戏中直接离开而不经过确认，导致已投入底池的筹码无法正确处理，游戏状态可能被破坏。此外，离开时未考虑不同游戏阶段（未选座、已选座、已准备、游戏中）的差异化处理，可能导致座位残留、倒计时异常等问题。完善离开房间机制对于保证游戏公平性和用户体验至关重要。

## What Changes

- **客户端**：离开按钮增加确认弹窗，根据游戏状态显示不同的提示文案
- **服务端**：LEAVE_ROOM 事件处理器增加游戏状态判断逻辑
  - 游戏中离开：自动弃牌（forceFold）、清除行动超时、推进游戏流程
  - 准备阶段离开：取消倒计时（如正在进行）、释放座位
  - 未选座离开：简单移除
- **房主转移**：房主离开时将 hostId 转移给房间内其他玩家
- **状态同步**：离开时确保正确通知其他玩家，区分主动离开和断线重连

## Capabilities

### New Capabilities
- `leave-room-confirmation`: 客户端离开房间确认弹窗功能，根据游戏状态显示差异化提示
- `leave-room-game-cleanup`: 服务端离开房间时的游戏状态清理逻辑，包括弃牌、筹码处理、游戏推进

### Modified Capabilities
- `client-reconnect`: 需要区分"主动离开"和"断线"两种离开方式，确保重连机制不干扰主动离开流程

## Impact

- **前端文件**：
  - `client/src/views/RoomView.vue`：修改 handleLeaveRoom() 函数
  - 可能需要新增确认弹窗组件（或使用现有 UI 组件）
- **后端文件**：
  - `server/src/services/socket.service.ts`：修改 LEAVE_ROOM 事件处理器
  - `server/src/modules/room/room.manager.ts`：可能需要增加房主转移逻辑
- **共享类型**：
  - `shared/constants/socket.constants.ts`：可能需要新增离开相关事件
- **测试**：
  - 需要为新的离开逻辑编写单元测试
- **文档**：
  - `justpoker/gamerule.md`：需要同步更新游戏规则文档
