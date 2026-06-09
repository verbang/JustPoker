# 赢家主动亮牌功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当其他玩家全部弃牌时，赢家可以选择是否亮牌展示自己的手牌给所有人看。

**Architecture:** 服务端新增 `REVEAL_CARDS` socket 事件。游戏结束时，服务端暂存赢家手牌数据（带 30 秒 TTL）。赢家点击"亮牌"按钮后，客户端发送 `REVEAL_CARDS` 事件，服务端广播赢家手牌给房间内所有人。超时未操作则自动盖牌（不展示）。

**Tech Stack:** Vue 3 + TypeScript + Socket.io + Express

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `shared/constants/socket.constants.ts` | 修改 | 新增 `REVEAL_CARDS` 和 `CARDS_REVEALED` 事件 |
| `shared/types/game.types.ts` | 修改 | 新增 `isFoldWin` 字段 |
| `server/src/modules/game/game.engine.ts` | 修改 | `finishGame` 设置 `isFoldWin: true` |
| `server/src/services/socket.service.ts` | 修改 | 暂存赢家数据、处理 `REVEAL_CARDS`、超时清理 |
| `client/src/services/socket.ts` | 修改 | 新增 `revealCards` 和 `onCardsRevealed` 方法 |
| `client/src/views/RoomView.vue` | 修改 | 判断弃牌获胜、显示亮牌按钮、处理超时 |
| `client/src/components/game/GameTable.vue` | 修改 | 传递 `canReveal` 和 `onReveal` 给 PlayerSeat |
| `client/src/components/game/PlayerSeat.vue` | 修改 | 显示"亮牌"按钮 |

---

### Task 1: 新增 Socket 事件和类型定义

**Files:**
- Modify: `shared/constants/socket.constants.ts`
- Modify: `shared/types/game.types.ts`

- [ ] **Step 1: 新增 Socket 事件常量**

在 `shared/constants/socket.constants.ts` 中添加两个新事件：

```typescript
// 客户端 → 服务器
REVEAL_CARDS: 'reveal-cards',

// 服务器 → 客户端
CARDS_REVEALED: 'cards-revealed',
```

完整文件应为：

```typescript
export const SOCKET_EVENTS = {
  // 客户端 → 服务器
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  SELECT_SEAT: 'select-seat',
  PLAYER_READY: 'player-ready',
  PLAYER_ACTION: 'player-action',
  SEND_EMOJI: 'send-emoji',
  REBUY: 'rebuy',
  TIP_PLAYER: 'tip-player',
  REVEAL_CARDS: 'reveal-cards',

  // 服务器 → 客户端
  ROOM_UPDATE: 'room-update',
  COUNTDOWN_START: 'countdown-start',
  GAME_START: 'game-start',
  GAME_UPDATE: 'game-update',
  GAME_OVER: 'game-over',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  NEW_EMOJI: 'new-emoji',
  ERROR: 'error',
  REBUY_REQUIRED: 'rebuy-required',
  TIP_RECEIVED: 'tip-received',
  CARDS_REVEALED: 'cards-revealed',
} as const;
```

- [ ] **Step 2: 在 GameState 类型中新增 isFoldWin 字段**

在 `shared/types/game.types.ts` 的 `GameState` 接口中添加：

```typescript
isFoldWin?: boolean;  // 是否为弃牌获胜（其他玩家全部弃牌）
```

在 `winnerIds` 字段之后添加即可。

- [ ] **Step 3: TypeScript 类型检查**

Run: `cd D:/1-New/JustPoker/justpoker/client && npx vue-tsc --noEmit`
Expected: 无错误输出

---

### Task 2: 服务端 finishGame 设置 isFoldWin 标志

**Files:**
- Modify: `server/src/modules/game/game.engine.ts:568-583`

- [ ] **Step 1: 修改 finishGame 方法**

在 `finishGame` 返回的 GameState 中添加 `isFoldWin: true`：

```typescript
private finishGame(state: GameState, winnerId: string): GameState {
  const totalPot = state.pot;

  const updatedPlayers = state.players.map(p => ({
    ...p,
    chips: p.userId === winnerId ? p.chips + totalPot : p.chips,
  }));

  return {
    ...state,
    players: updatedPlayers,
    status: 'finished',
    winnerId,
    winnerIds: [winnerId],
    isFoldWin: true,
  };
}
```

注意：`showdown` 方法（第 475-513 行）不需要设置 `isFoldWin`，因为它是正常摊牌路径。

- [ ] **Step 2: 运行后端测试**

Run: `cd D:/1-New/JustPoker/justpoker/server && npm test`
Expected: 所有测试通过

---

### Task 3: 服务端暂存赢家数据并处理 REVEAL_CARDS 事件

**Files:**
- Modify: `server/src/services/socket.service.ts`

- [ ] **Step 1: 新增 pendingReveals Map**

在 `SocketService` 类的属性区域（约第 27 行 `emojiRateLimits` 之后）添加：

```typescript
// 暂存弃牌获胜的赢家数据，等待亮牌操作
private pendingReveals: Map<string, { userId: string; cards: Card[]; roomCode: string; timer: NodeJS.Timeout }> = new Map();
```

- [ ] **Step 2: 在 handleGameFinished 中暂存赢家数据**

在 `handleGameFinished` 方法中，当 `gameState.isFoldWin` 为 true 时，暂存赢家手牌。在 `this.gameEngines.delete(roomCode)` 之前添加逻辑：

```typescript
private handleGameFinished(roomCode: string, gameState: GameState): void {
  this.clearActionTimeout(roomCode);

  // Update player chips and reset status
  gameState.players.forEach(p => {
    const roomPlayers = roomService.getRoomPlayers(roomCode);
    const roomPlayer = roomPlayers.find(rp => rp.userId === p.userId);
    if (roomPlayer) {
      roomPlayer.chips = p.chips;
      if (p.chips > 0) {
        roomService.getRoomManager().updatePlayerStatus(roomCode, p.userId, 'seated');
      } else {
        roomService.getRoomManager().updatePlayerStatus(roomCode, p.userId, 'out');
      }
    }
  });
  this.dealerSeatNumbers.set(roomCode, gameState.players[gameState.dealerIndex]?.seatNumber ?? 1);

  // 弃牌获胜时暂存赢家数据，等待亮牌操作
  if (gameState.isFoldWin && gameState.winnerId) {
    const winner = gameState.players.find(p => p.userId === gameState.winnerId);
    if (winner && winner.cards && winner.cards.length >= 2) {
      const timer = setTimeout(() => {
        this.pendingReveals.delete(roomCode);
        logger.info(`房间 ${roomCode} 赢家亮牌超时，自动盖牌`);
      }, 30000);
      this.pendingReveals.set(roomCode, {
        userId: gameState.winnerId,
        cards: winner.cards,
        roomCode,
        timer,
      });
    }
  }

  // Clean up game state
  this.gameEngines.delete(roomCode);
  this.gameStates.delete(roomCode);

  // Broadcast final state
  const players = roomService.getRoomPlayers(roomCode);
  this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
  this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_OVER, {
    winnerId: gameState.winnerId,
    winnerIds: gameState.winnerIds || (gameState.winnerId ? [gameState.winnerId] : []),
    isFoldWin: gameState.isFoldWin,
  });

  logger.info(`Game finished in room ${roomCode}, winner: ${gameState.winnerId}`);
}
```

- [ ] **Step 3: 注册 REVEAL_CARDS 事件处理器**

在 `initialize` 方法中，其他 socket 事件注册之后（`REBUY` 事件之后）添加：

```typescript
// 赢家亮牌
socket.on(SOCKET_EVENTS.REVEAL_CARDS, (data: { roomCode: string }) => {
  const userId = socket.data.userId as string;
  const pending = this.pendingReveals.get(data.roomCode);

  if (!pending || pending.userId !== userId) {
    this.emitToUser(userId, SOCKET_EVENTS.ERROR, { message: '当前无法亮牌' });
    return;
  }

  // 清除超时定时器
  clearTimeout(pending.timer);
  this.pendingReveals.delete(data.roomCode);

  // 广播亮牌数据给房间内所有人
  this.emitToRoom(data.roomCode, SOCKET_EVENTS.CARDS_REVEALED, {
    userId,
    cards: pending.cards,
  });

  logger.info(`房间 ${data.roomCode} 赢家 ${userId} 亮牌`);
});
```

- [ ] **Step 4: 在房间清理时清除 pendingReveals**

在 `cleanupRoomGameState` 方法末尾添加：

```typescript
// 清理该房间的待亮牌数据
const pending = this.pendingReveals.get(roomCode);
if (pending) {
  clearTimeout(pending.timer);
  this.pendingReveals.delete(roomCode);
}
```

- [ ] **Step 5: 运行后端测试**

Run: `cd D:/1-New/JustPoker/justpoker/server && npm test`
Expected: 所有测试通过

---

### Task 4: 客户端 Socket 服务新增方法

**Files:**
- Modify: `client/src/services/socket.ts`

- [ ] **Step 1: 新增 revealCards 和 onCardsRevealed 方法**

在 `SocketService` 类中（`onGameOver` 方法之后）添加：

```typescript
revealCards(roomCode: string): void {
  this.socket?.emit(SOCKET_EVENTS.REVEAL_CARDS, { roomCode });
}

onCardsRevealed(callback: (data: { userId: string; cards: Card[] }) => void): void {
  this.socket?.on(SOCKET_EVENTS.CARDS_REVEALED, callback);
}
```

确保文件顶部已导入 `Card` 类型（检查现有 import，如已有则无需重复）。

- [ ] **Step 2: TypeScript 类型检查**

Run: `cd D:/1-New/JustPoker/justpoker/client && npx vue-tsc --noEmit`
Expected: 无错误输出

---

### Task 5: RoomView 新增弃牌获胜判断和亮牌交互

**Files:**
- Modify: `client/src/views/RoomView.vue`

- [ ] **Step 1: 新增 isFoldWin 状态和 winnerCanReveal 计算属性**

在 `showdownMode` computed 之后添加：

```typescript
// 是否为弃牌获胜（只有赢家一人，其他玩家全部弃牌）
const isFoldWin = computed(() => lastGameState.value?.isFoldWin === true);

// 赢家是否可以主动亮牌（弃牌获胜 + 当前用户是赢家 + 尚未亮牌）
const winnerCanReveal = computed(() => {
  if (!isFoldWin.value) return false;
  if (!lastGameState.value?.winnerId) return false;
  if (lastGameState.value.winnerId !== userId.value) return false;
  if (revealedCards.value) return false;  // 已亮牌
  return true;
});

// 已亮牌的数据（由 CARDS_REVEALED 事件设置）
const revealedCards = ref<{ userId: string; cards: Card[] } | null>(null);
```

- [ ] **Step 2: 修改 showdownPlayers computed 支持弃牌获胜时的亮牌**

将 `showdownPlayers` computed 修改为支持两种场景：

```typescript
const showdownPlayers = computed(() => {
  const gs = lastGameState.value;
  if (!gs || gs.status !== 'finished') return new Map<string, ShowdownPlayerData>();

  // 场景 1：正常摊牌（2+ 未弃牌玩家）
  const activePlayers = gs.players.filter(p => p.status !== 'folded' && p.cards && p.cards.length >= 2);
  if (activePlayers.length >= 2) {
    const map = new Map<string, ShowdownPlayerData>();
    for (const gp of activePlayers) {
      const handResult = evaluateBestHand(gp.cards, gs.communityCards);
      map.set(gp.userId, {
        cards: gp.cards,
        handDescription: handResult?.description ?? '',
      });
    }
    return map;
  }

  // 场景 2：弃牌获胜 + 赢家已主动亮牌
  if (gs.isFoldWin && revealedCards.value) {
    const map = new Map<string, ShowdownPlayerData>();
    const handResult = evaluateBestHand(revealedCards.value.cards, gs.communityCards);
    map.set(revealedCards.value.userId, {
      cards: revealedCards.value.cards,
      handDescription: handResult?.description ?? '',
    });
    return map;
  }

  return new Map<string, ShowdownPlayerData>();
});
```

- [ ] **Step 3: 修改 onGameUpdate 清除亮牌状态**

在 `onGameUpdate` 的 `status === 'playing'` 分支中清除 `revealedCards`：

```typescript
if (data.status === 'playing') {
  lastWinnerIds.value = [];
  lastGameState.value = null;
  revealedCards.value = null;
}
```

- [ ] **Step 4: 注册 CARDS_REVEALED 事件监听**

在 `onMounted` 中（`onGameOver` 之后）添加：

```typescript
socketService.onCardsRevealed((data) => {
  revealedCards.value = data;
});
```

- [ ] **Step 5: 新增 handleRevealCards 函数**

在 `handleTip` 函数之后添加：

```typescript
function handleRevealCards() {
  socketService.revealCards(roomCode.value);
}
```

- [ ] **Step 6: 修改 GameTable 模板传递新 props**

```html
<GameTable
  ...existing props...
  :winner-can-reveal="winnerCanReveal"
  @reveal-cards="handleRevealCards"
/>
```

- [ ] **Step 7: TypeScript 类型检查**

Run: `cd D:/1-New/JustPoker/justpoker/client && npx vue-tsc --noEmit`
Expected: 无错误输出

---

### Task 6: GameTable 传递亮牌 props 给 PlayerSeat

**Files:**
- Modify: `client/src/components/game/GameTable.vue`

- [ ] **Step 1: 新增 props**

在 `defineProps` 中添加：

```typescript
winnerCanReveal?: boolean;
```

- [ ] **Step 2: 新增 emits**

在 `defineEmits` 中添加：

```typescript
(e: 'revealCards'): void;
```

- [ ] **Step 3: 修改 PlayerSeat 模板传递新 props**

在 PlayerSeat 组件上添加：

```html
:can-reveal="winnerCanReveal && player.userId === userId"
```

- [ ] **Step 4: 添加亮牌按钮到牌桌区域**

在 `.table-surface` 的 pot div 之后、winning-hand-banner 之前添加：

```html
<button
  v-if="winnerCanReveal"
  class="reveal-btn"
  type="button"
  @click="$emit('revealCards')"
>
  亮牌
</button>
```

- [ ] **Step 5: 添加亮牌按钮样式**

```css
.reveal-btn {
  padding: 6px 20px;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 8px rgba(255, 152, 0, 0.4);
  animation: reveal-btn-pulse 1.5s ease-in-out infinite;
}

.reveal-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 12px rgba(255, 152, 0, 0.6);
}

@keyframes reveal-btn-pulse {
  0%, 100% { box-shadow: 0 3px 8px rgba(255, 152, 0, 0.4); }
  50% { box-shadow: 0 3px 16px rgba(255, 152, 0, 0.7); }
}
```

在响应式媒体查询中添加：

```css
.reveal-btn {
  padding: 4px 14px;
  font-size: 12px;
}
```

- [ ] **Step 6: TypeScript 类型检查**

Run: `cd D:/1-New/JustPoker/justpoker/client && npx vue-tsc --noEmit`
Expected: 无错误输出

---

### Task 7: 验证完整功能

- [ ] **Step 1: 启动本地服务**

Run: `cd D:/1-New/JustPoker/justpoker && npm run dev`

- [ ] **Step 2: 测试弃牌获胜场景**

1. 两个浏览器标签页加入同一房间
2. 选座、准备
3. Preflop 阶段，其中一人直接弃牌
4. 验证：赢家看到"亮牌"按钮，按钮有脉冲动画
5. 赢家点击"亮牌"
6. 验证：两个标签页都看到赢家的底牌正面展示，有翻牌动画
7. 验证：牌型标签显示（如"高牌"、"一对"等）

- [ ] **Step 3: 测试超时盖牌场景**

1. 重复弃牌获胜场景
2. 赢家不点击"亮牌"，等待 30 秒
3. 验证：超时后"亮牌"按钮消失，赢家手牌不展示

- [ ] **Step 4: 测试正常摊牌不受影响**

1. 两个标签页跟注到河牌
2. 验证：正常摊牌流程不受影响，所有未弃牌玩家亮牌

- [ ] **Step 5: 测试下一局开始时状态清除**

1. 弃牌获胜后亮牌
2. 开始下一局
3. 验证：上一局的亮牌状态清除，新局正常进行

---

## 数据流总结

```
弃牌获胜场景：

服务端 finishGame()
  → 设置 isFoldWin: true
  → 暂存赢家手牌到 pendingReveals（30秒TTL）
  → 发送 GAME_UPDATE (status:'finished', isFoldWin:true)
  → 发送 GAME_OVER (isFoldWin:true)

客户端收到 GAME_UPDATE
  → lastGameState 保存（含 isFoldWin 标志）
  → winnerCanReveal = true（仅赢家）
  → 赢家看到"亮牌"按钮

赢家点击"亮牌"
  → 客户端发送 REVEAL_CARDS { roomCode }
  → 服务端从 pendingReveals 取出赢家数据
  → 服务端广播 CARDS_REVEALED { userId, cards }

所有客户端收到 CARDS_REVEALED
  → revealedCards 更新
  → showdownPlayers 计算（包含赢家）
  → 赢家手牌正面展示给所有人
```
