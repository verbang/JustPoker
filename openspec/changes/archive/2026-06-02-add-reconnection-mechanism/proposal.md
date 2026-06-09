## Why

用户在游戏过程中刷新页面、关闭浏览器、或网络波动断开后，会丢失所有游戏状态（userId 仅存储在 Pinia 内存中），导致无法重连回到正在进行的游戏。服务端已有 30 秒重连窗口机制，但客户端完全缺失持久化和重连逻辑，使得该机制形同虚设。断线重连是多人实时游戏的基本体验要求。

## What Changes

- 在客户端增加 userId 持久化（localStorage），使刷新/重新打开页面后可恢复身份
- 在客户端 Socket.io 连接恢复后自动发送 `join-room` 请求，利用服务端已有的重连窗口
- 在客户端增加重连状态管理（断线提示、重连中指示、超时处理）
- 扩展服务端重连机制：支持非游戏状态下的重连（当前仅游戏中的断线有 30 秒窗口）
- 在 RoomView 中增加重连 UI：断线提示条、重连中动画、超时后引导用户返回首页

## Capabilities

### New Capabilities
- `client-reconnect`: 客户端断线重连逻辑，包括 userId 持久化、Socket.io 重连后自动 join-room、重连状态管理
- `reconnect-ui`: 断线重连相关 UI 组件，包括断线提示条、重连中状态、超时引导

### Modified Capabilities

## Impact

- **前端核心文件**：
  - `client/src/stores/user.ts` — 增加 localStorage 持久化
  - `client/src/services/socket.ts` — 增加重连后自动 join-room 逻辑
  - `client/src/views/RoomView.vue` — 增加重连 UI 和状态处理
- **后端文件**：
  - `server/src/services/socket.service.ts` — 扩展重连窗口支持（非游戏状态）
  - `server/src/modules/room/room.manager.ts` — 可能需要增加非游戏状态下的房间保持逻辑
- **共享文件**：
  - `shared/constants/socket.constants.ts` — 可能新增重连相关事件
  - `shared/types/room.types.ts` — 可能增加重连状态类型
- **无 breaking changes** — 现有 API 和事件保持不变
