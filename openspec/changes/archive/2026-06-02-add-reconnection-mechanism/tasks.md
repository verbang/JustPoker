## 1. 客户端身份持久化

- [x] 1.1 在 `client/src/stores/user.ts` 中增加 localStorage 持久化：`setUser` 时写入 localStorage，增加 `loadUser` 方法从 localStorage 读取
- [x] 1.2 在 `client/src/App.vue` 或路由守卫中调用 `loadUser`，应用初始化时恢复身份
- [x] 1.3 在 `client/src/views/RoomView.vue` 中，用户主动离开房间时清除 localStorage

## 2. 客户端 Socket.io 重连逻辑

- [x] 2.1 在 `client/src/services/socket.ts` 的 `connect` 事件处理中，检查 localStorage 是否有有效身份和房间信息，如果有则自动发送 `join-room`
- [x] 2.2 在 `client/src/services/socket.ts` 中增加重连状态管理：暴露 `isReconnecting`、`reconnectAttempt`、`reconnectFailed` 等状态
- [x] 2.3 在 `client/src/views/RoomView.vue` 中监听 Socket.io 重连事件（`reconnect_attempt`、`reconnect_failed`），更新 UI 状态

## 3. 重连 UI 组件

- [x] 3.1 创建 `client/src/components/game/ReconnectOverlay.vue` 全屏覆盖层组件，包含断线提示、倒计时、重连中状态
- [x] 3.2 在 `RoomView.vue` 中集成 `ReconnectOverlay`，根据 Socket 连接状态控制显示/隐藏
- [x] 3.3 实现重连超时（30 秒）处理：显示超时提示和"返回首页"按钮
- [x] 3.4 点击"返回首页"时清除 localStorage 身份信息并导航回首页

## 4. 服务端非游戏状态重连支持

- [x] 4.1 在 `server/src/services/socket.service.ts` 的 `disconnect` 处理中，为非游戏状态的玩家也创建 `disconnectedPlayers` 记录和 30 秒超时计时器
- [x] 4.2 在 `server/src/modules/room/room.manager.ts` 中确保非游戏状态的房间在玩家断线后保持 30 秒不被清理
- [x] 4.3 编写服务端重连逻辑的单元测试：游戏中重连、等待中重连、超时移除

## 5. 共享类型和常量

- [x] 5.1 在 `shared/types/room.types.ts` 中可能需要增加 `disconnected` 玩家状态类型（如需要）
- [x] 5.2 在 `shared/constants/socket.constants.ts` 中检查是否需要新增重连相关事件常量

## 6. 测试和验证

- [ ] 6.1 编写客户端 localStorage 持久化的单元测试
- [ ] 6.2 手动测试：刷新页面后能自动重连恢复游戏状态
- [ ] 6.3 手动测试：网络断开后重连，UI 正确显示断线/重连中/重连成功状态
- [ ] 6.4 手动测试：30 秒超时后正确弃牌并显示超时提示
- [x] 6.5 运行 `cd server && npm test` 确保现有测试通过
