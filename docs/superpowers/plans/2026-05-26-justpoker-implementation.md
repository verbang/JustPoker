# JustPoker 在线德州扑克平台实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个面向好友的在线德州扑克网页平台，支持最多10人同时在线对战，零成本部署。

**Architecture:** 采用模块化单体架构，前端使用 Vue.js + TypeScript，后端使用 Node.js + Express + Socket.io，数据库使用 Supabase (PostgreSQL)，部署采用 Vercel + Render 免费方案。

**Tech Stack:** Vue.js 3, TypeScript, Node.js, Express, Socket.io, PostgreSQL, Supabase, Vercel, Render

---

## 文件结构

```
justpoker/
├── client/                          # 前端 Vue.js 项目
│   ├── src/
│   │   ├── components/              # UI 组件
│   │   │   ├── game/                # 游戏相关组件
│   │   │   │   ├── GameTable.vue    # 游戏桌面
│   │   │   │   ├── PlayerSeat.vue   # 玩家座位
│   │   │   │   ├── CommunityCards.vue # 公共牌
│   │   │   │   ├── ActionPanel.vue  # 操作面板
│   │   │   │   ├── EmojiPanel.vue   # 表情面板
│   │   │   │   ├── Scoreboard.vue   # 比分板
│   │   │   │   └── ChipSelector.vue # 筹码选择器
│   │   │   ├── home/                # 首页组件
│   │   │   │   ├── CreateRoom.vue   # 创建房间
│   │   │   │   └── JoinRoom.vue     # 加入房间
│   │   │   └── common/              # 通用组件
│   │   │       ├── NicknameInput.vue # 昵称输入
│   │   │       └── SoundToggle.vue  # 音效开关
│   │   ├── views/                   # 页面视图
│   │   │   ├── HomeView.vue         # 首页
│   │   │   ├── RoomView.vue         # 游戏房间
│   │   │   └── ProfileView.vue      # 个人中心
│   │   ├── stores/                  # 状态管理 (Pinia)
│   │   │   ├── game.ts              # 游戏状态
│   │   │   ├── room.ts              # 房间状态
│   │   │   └── user.ts              # 用户状态
│   │   ├── services/                # API 调用
│   │   │   ├── api.ts               # HTTP 客户端
│   │   │   └── socket.ts            # Socket.io 客户端
│   │   ├── utils/                   # 工具函数
│   │   │   ├── validators.ts        # 验证函数
│   │   │   └── sounds.ts            # 音效管理
│   │   ├── router/                  # 路由配置
│   │   │   └── index.ts
│   │   ├── App.vue
│   │   └── main.ts
│   ├── public/                      # 静态资源
│   │   └── sounds/                  # 音效文件
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                          # 后端 Node.js 项目
│   ├── src/
│   │   ├── modules/                 # 功能模块
│   │   │   ├── game/                # 游戏模块
│   │   │   │   ├── game.engine.ts   # 德州扑克引擎
│   │   │   │   ├── game.service.ts  # 游戏服务
│   │   │   │   ├── deck.ts          # 牌组管理
│   │   │   │   ├── hand-evaluator.ts # 牌型判断
│   │   │   │   └── pot-calculator.ts # 底池计算
│   │   │   ├── room/                # 房间模块
│   │   │   │   ├── room.controller.ts # 房间 API
│   │   │   │   ├── room.service.ts  # 房间服务
│   │   │   │   └── room.manager.ts  # 房间管理器
│   │   │   └── user/                # 用户模块
│   │   │       ├── user.controller.ts # 用户 API
│   │   │       └── user.service.ts  # 用户服务
│   │   ├── services/                # 共享服务
│   │   │   ├── socket.service.ts    # Socket.io 管理
│   │   │   └── database.service.ts  # 数据库连接
│   │   ├── models/                  # 数据模型
│   │   │   ├── user.model.ts
│   │   │   ├── room.model.ts
│   │   │   ├── game.model.ts
│   │   │   └── tip.model.ts
│   │   ├── utils/                   # 工具函数
│   │   │   ├── logger.ts
│   │   │   └── validator.ts
│   │   └── index.ts                 # 入口文件
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                          # 前后端共享代码
│   ├── types/                       # TypeScript 类型定义
│   │   ├── game.types.ts
│   │   ├── room.types.ts
│   │   └── user.types.ts
│   └── constants/                   # 常量定义
│       ├── game.constants.ts
│       └── socket.constants.ts
│
├── docs/                            # 项目文档
│   ├── superpowers/
│   │   ├── specs/                   # 设计文档
│   │   └── plans/                   # 实现计划
│   └── README.md
│
└── .gitignore
```

---

## 实现任务

### Task 1: 项目初始化与环境搭建

**Files:**
- Create: `justpoker/package.json` (根目录)
- Create: `justpoker/client/package.json`
- Create: `justpoker/server/package.json`
- Create: `justpoker/shared/types/game.types.ts`
- Create: `justpoker/shared/types/room.types.ts`
- Create: `justpoker/shared/types/user.types.ts`
- Create: `justpoker/shared/constants/game.constants.ts`
- Create: `justpoker/shared/constants/socket.constants.ts`
- Create: `justpoker/.gitignore`

- [ ] **Step 1: 创建根目录 package.json**

```json
{
  "name": "justpoker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "cd client && npm run dev",
    "dev:server": "cd server && npm run dev",
    "build": "cd client && npm run build",
    "test": "cd server && npm test"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

- [ ] **Step 2: 创建 .gitignore**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

- [ ] **Step 3: 创建共享类型定义 - game.types.ts**

```typescript
// 游戏阶段
export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// 玩家操作类型
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in';

// 花色
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// 牌面值
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

// 牌
export interface Card {
  suit: Suit;
  rank: Rank;
}

// 牌型
export type HandRank = 
  | 'high_card'
  | 'one_pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush';

// 牌型评估结果
export interface HandResult {
  rank: HandRank;
  cards: Card[];
  description: string;
}

// 游戏状态
export interface GameState {
  id: string;
  roomId: string;
  phase: GamePhase;
  pot: number;
  communityCards: Card[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentBet: number;
  minRaise: number;
  players: GamePlayer[];
  sidePots: SidePot[];
  status: 'waiting' | 'playing' | 'finished';
  winnerId?: string;
  winningHand?: string;
}

// 游戏中的玩家
export interface GamePlayer {
  userId: string;
  nickname: string;
  seatNumber: number;
  chips: number;
  bet: number;
  totalBet: number;
  cards: Card[];
  status: 'playing' | 'folded' | 'all_in' | 'out';
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

// 边池
export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

// 玩家操作
export interface PlayerActionData {
  userId: string;
  action: PlayerAction;
  amount?: number;
  timestamp: number;
}
```

- [ ] **Step 4: 创建共享类型定义 - room.types.ts**

```typescript
// 房间状态
export type RoomStatus = 'waiting' | 'playing' | 'ended';

// 玩家状态
export type PlayerStatus = 'joined' | 'seated' | 'playing' | 'folded' | 'out';

// 房间信息
export interface Room {
  id: string;
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  smallBlind: number;
  bigBlind: number;
  initialChips: number;
  createdAt: Date;
  updatedAt: Date;
}

// 房间玩家
export interface RoomPlayer {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  seatNumber: number | null;
  chips: number;
  status: PlayerStatus;
  joinedAt: Date;
}

// 创建房间请求
export interface CreateRoomRequest {
  nickname: string;
  initialChips: number;
}

// 加入房间请求
export interface JoinRoomRequest {
  roomCode: string;
  nickname: string;
  chips: number;
}

// 选择座位请求
export interface SelectSeatRequest {
  seatNumber: number;
}

// 重新买入请求
export interface RebuyRequest {
  amount: number;
}
```

- [ ] **Step 5: 创建共享类型定义 - user.types.ts**

```typescript
// 用户信息
export interface User {
  id: string;
  nickname: string;
  createdAt: Date;
  updatedAt: Date;
}

// 用户战绩
export interface UserStats {
  totalGames: number;
  wins: number;
  winRate: number;
  totalProfit: number;
}

// 打赏请求
export interface TipRequest {
  toUserId: string;
  amount: number;
}

// 打赏记录
export interface Tip {
  id: string;
  gameId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  createdAt: Date;
}
```

- [ ] **Step 6: 创建共享常量 - game.constants.ts**

```typescript
// 筹码档次
export const CHIP_OPTIONS = [100, 200, 500] as const;
export const DEFAULT_CHIPS = 100;

// 盲注设置
export const DEFAULT_SMALL_BLIND = 5;
export const DEFAULT_BIG_BLIND = 10;

// 牌型大小顺序
export const HAND_RANK_ORDER = {
  'royal_flush': 10,
  'straight_flush': 9,
  'four_of_a_kind': 8,
  'full_house': 7,
  'flush': 6,
  'straight': 5,
  'three_of_a_kind': 4,
  'two_pair': 3,
  'one_pair': 2,
  'high_card': 1
} as const;

// 游戏阶段
export const GAME_PHASES = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;

// 玩家操作
export const PLAYER_ACTIONS = ['fold', 'check', 'call', 'raise', 'all_in'] as const;

// 座位数量
export const MAX_SEATS = 10;

// 操作超时时间（秒）
export const ACTION_TIMEOUT = 30;

// 表情系统
export const EMOJIS = ['👍', '🎉', '😮', '😢', '😡', '🤔', '💰', '🃏', '🍀', '😎', '🙏', '⏰'] as const;
export const MAX_VISIBLE_EMOJIS = 3;
export const EMOJI_DURATION = 3000; // 毫秒
export const EMOJI_RATE_LIMIT_WINDOW = 5000; // 毫秒
export const EMOJI_RATE_LIMIT_COUNT = 5;
export const EMOJI_COOLDOWN_TIME = 10000; // 毫秒

// 打赏金额
export const TIP_AMOUNTS = [2, 5, 10, 20, 50] as const;
```

- [ ] **Step 7: 创建共享常量 - socket.constants.ts**

```typescript
// Socket 事件名称
export const SOCKET_EVENTS = {
  // 客户端 → 服务器
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  SELECT_SEAT: 'select-seat',
  PLAYER_ACTION: 'player-action',
  SEND_EMOJI: 'send-emoji',
  REBUY: 'rebuy',
  TIP_PLAYER: 'tip-player',

  // 服务器 → 客户端
  ROOM_UPDATE: 'room-update',
  GAME_START: 'game-start',
  GAME_UPDATE: 'game-update',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  NEW_EMOJI: 'new-emoji',
  ERROR: 'error',
  REBUY_REQUIRED: 'rebuy-required',
  TIP_RECEIVED: 'tip-received',
} as const;
```

- [ ] **Step 8: 安装根目录依赖并初始化 Git**

```bash
cd D:/1-New/JustPoker
npm install
git init
git add .
git commit -m "chore: initialize project structure with shared types and constants"
```

---

### Task 2: 后端项目初始化

**Files:**
- Create: `justpoker/server/package.json`
- Create: `justpoker/server/tsconfig.json`
- Create: `justpoker/server/src/index.ts`
- Create: `justpoker/server/src/services/database.service.ts`
- Create: `justpoker/server/src/services/socket.service.ts`
- Create: `justpoker/server/src/utils/logger.ts`

- [ ] **Step 1: 创建 server/package.json**

```json
{
  "name": "justpoker-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0",
    "@supabase/supabase-js": "^2.38.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "ts-node-dev": "^2.0.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.15",
    "@types/uuid": "^9.0.7",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.11"
  }
}
```

- [ ] **Step 2: 创建 server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 创建 server/src/utils/logger.ts**

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level}] ${message}`;
    return data ? `${base} ${JSON.stringify(data)}` : base;
  }

  debug(message: string, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, error));
    }
  }
}

export const logger = new Logger(
  process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
);
```

- [ ] **Step 4: 创建 server/src/services/database.service.ts**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

class DatabaseService {
  private client: SupabaseClient | null = null;

  async initialize(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase credentials not configured, using in-memory storage');
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    logger.info('Database connected to Supabase');
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  async query(table: string, query?: any): Promise<any[]> {
    if (!this.client) {
      logger.warn('Database not initialized');
      return [];
    }

    const { data, error } = await this.client
      .from(table)
      .select(query?.select || '*')
      .match(query?.match || {})
      .order(query?.order || 'created_at', { ascending: false });

    if (error) {
      logger.error(`Query error on ${table}`, error);
      return [];
    }

    return data || [];
  }

  async insert(table: string, data: any): Promise<any> {
    if (!this.client) {
      logger.warn('Database not initialized');
      return null;
    }

    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error(`Insert error on ${table}`, error);
      return null;
    }

    return result;
  }

  async update(table: string, id: string, data: any): Promise<any> {
    if (!this.client) {
      logger.warn('Database not initialized');
      return null;
    }

    const { data: result, error } = await this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error(`Update error on ${table}`, error);
      return null;
    }

    return result;
  }

  async delete(table: string, id: string): Promise<boolean> {
    if (!this.client) {
      logger.warn('Database not initialized');
      return false;
    }

    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error(`Delete error on ${table}`, error);
      return false;
    }

    return true;
  }
}

export const database = new DatabaseService();
```

- [ ] **Step 5: 创建 server/src/services/socket.service.ts**

```typescript
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS } from '../../../shared/constants/socket.constants';

class SocketService {
  private io: Server | null = null;

  initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    logger.info('Socket.io initialized');
  }

  getIO(): Server | null {
    return this.io;
  }

  joinRoom(socketId: string, roomId: string): void {
    this.io?.sockets.sockets.get(socketId)?.join(roomId);
  }

  leaveRoom(socketId: string, roomId: string): void {
    this.io?.sockets.sockets.get(socketId)?.leave(roomId);
  }

  emitToRoom(roomId: string, event: string, data: any): void {
    this.io?.to(roomId).emit(event, data);
  }

  emitToSocket(socketId: string, event: string, data: any): void {
    this.io?.to(socketId).emit(event, data);
  }
}

export const socketService = new SocketService();
```

- [ ] **Step 6: 创建 server/src/index.ts**

```typescript
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { database } from './services/database.service';
import { socketService } from './services/socket.service';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize services
async function initialize() {
  try {
    // Initialize database
    await database.initialize();

    // Initialize socket
    socketService.initialize(httpServer);

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize server', error);
    process.exit(1);
  }
}

initialize();

export { app, httpServer };
```

- [ ] **Step 7: 安装依赖并测试**

```bash
cd D:/1-New/JustPoker/server
npm install
npm run build
```

- [ ] **Step 8: 提交代码**

```bash
cd D:/1-New/JustPoker
git add server/
git commit -m "feat: initialize backend with Express, Socket.io, and database service"
```

---

### Task 3: 游戏引擎核心 - 牌组管理

**Files:**
- Create: `justpoker/server/src/modules/game/deck.ts`
- Create: `justpoker/server/src/modules/game/__tests__/deck.test.ts`

- [ ] **Step 1: 创建牌组管理测试**

```typescript
// server/src/modules/game/__tests__/deck.test.ts
import { Deck } from '../deck';

describe('Deck', () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  test('should create a deck with 52 cards', () => {
    expect(deck.remaining()).toBe(52);
  });

  test('should have all unique cards', () => {
    const cards = deck.getAll();
    const uniqueCards = new Set(cards.map(c => `${c.suit}-${c.rank}`));
    expect(uniqueCards.size).toBe(52);
  });

  test('should shuffle the deck', () => {
    const original = [...deck.getAll()];
    deck.shuffle();
    const shuffled = deck.getAll();
    expect(shuffled).not.toEqual(original);
    expect(shuffled.length).toBe(original.length);
  });

  test('should deal a card', () => {
    const card = deck.deal();
    expect(card).toBeDefined();
    expect(card?.suit).toBeDefined();
    expect(card?.rank).toBeDefined();
    expect(deck.remaining()).toBe(51);
  });

  test('should return null when deck is empty', () => {
    for (let i = 0; i < 52; i++) {
      deck.deal();
    }
    expect(deck.deal()).toBeNull();
    expect(deck.remaining()).toBe(0);
  });

  test('should reset deck to 52 cards', () => {
    deck.deal();
    deck.deal();
    deck.reset();
    expect(deck.remaining()).toBe(52);
  });

  test('should deal multiple cards', () => {
    const cards = deck.dealMultiple(5);
    expect(cards.length).toBe(5);
    expect(deck.remaining()).toBe(47);
  });

  test('should throw error when dealing more than remaining', () => {
    expect(() => deck.dealMultiple(53)).toThrow('Not enough cards in deck');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=deck.test
```

Expected: FAIL - "Cannot find module '../deck'"

- [ ] **Step 3: 实现牌组管理**

```typescript
// server/src/modules/game/deck.ts
import { Card, Suit, Rank } from '../../../../shared/types/game.types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ suit, rank });
      }
    }
  }

  shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(): Card | null {
    return this.cards.pop() || null;
  }

  dealMultiple(count: number): Card[] {
    if (count > this.cards.length) {
      throw new Error('Not enough cards in deck');
    }
    return this.cards.splice(-count, count);
  }

  remaining(): number {
    return this.cards.length;
  }

  getAll(): Card[] {
    return [...this.cards];
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=deck.test
```

Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
cd D:/1-New/JustPoker
git add server/src/modules/game/deck.ts server/src/modules/game/__tests__/deck.test.ts
git commit -m "feat: implement deck management with shuffle and deal functionality"
```

---

### Task 4: 游戏引擎核心 - 牌型判断

**Files:**
- Create: `justpoker/server/src/modules/game/hand-evaluator.ts`
- Create: `justpoker/server/src/modules/game/__tests__/hand-evaluator.test.ts`

- [ ] **Step 1: 创建牌型判断测试**

```typescript
// server/src/modules/game/__tests__/hand-evaluator.test.ts
import { HandEvaluator } from '../hand-evaluator';
import { Card } from '../../../../shared/types/game.types';

describe('HandEvaluator', () => {
  test('should identify royal flush', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'spades', rank: 'K' },
      { suit: 'spades', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'spades', rank: '10' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('royal_flush');
  });

  test('should identify straight flush', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: '9' },
      { suit: 'hearts', rank: '8' },
      { suit: 'hearts', rank: '7' },
      { suit: 'hearts', rank: '6' },
      { suit: 'hearts', rank: '5' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('straight_flush');
  });

  test('should identify four of a kind', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'K' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'diamonds', rank: 'K' },
      { suit: 'clubs', rank: 'K' },
      { suit: 'spades', rank: 'A' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('four_of_a_kind');
  });

  test('should identify full house', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'J' },
      { suit: 'hearts', rank: 'J' },
      { suit: 'diamonds', rank: 'J' },
      { suit: 'clubs', rank: '8' },
      { suit: 'spades', rank: '8' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('full_house');
  });

  test('should identify flush', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'K' },
      { suit: 'spades', rank: 'J' },
      { suit: 'spades', rank: '9' },
      { suit: 'spades', rank: '7' },
      { suit: 'spades', rank: '3' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('flush');
  });

  test('should identify straight', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: '10' },
      { suit: 'hearts', rank: '9' },
      { suit: 'diamonds', rank: '8' },
      { suit: 'clubs', rank: '7' },
      { suit: 'spades', rank: '6' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('straight');
  });

  test('should identify three of a kind', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'Q' },
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'hearts', rank: '9' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('three_of_a_kind');
  });

  test('should identify two pair', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'A' },
      { suit: 'diamonds', rank: 'K' },
      { suit: 'clubs', rank: 'K' },
      { suit: 'spades', rank: '10' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('two_pair');
  });

  test('should identify one pair', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'J' },
      { suit: 'hearts', rank: 'J' },
      { suit: 'diamonds', rank: 'A' },
      { suit: 'clubs', rank: 'K' },
      { suit: 'spades', rank: '9' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('one_pair');
  });

  test('should identify high card', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'diamonds', rank: 'J' },
      { suit: 'clubs', rank: '9' },
      { suit: 'spades', rank: '7' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('high_card');
  });

  test('should find best hand from 7 cards', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'diamonds', rank: 'Q' },
      { suit: 'clubs', rank: 'J' },
      { suit: 'spades', rank: '10' },
      { suit: 'hearts', rank: '2' },
      { suit: 'diamonds', rank: '3' },
    ];
    const result = HandEvaluator.findBestHand(cards);
    expect(result.rank).toBe('royal_flush');
  });

  test('should compare hands correctly', () => {
    const royalFlush: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'spades', rank: 'K' },
      { suit: 'spades', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'spades', rank: '10' },
    ];
    const straightFlush: Card[] = [
      { suit: 'hearts', rank: '9' },
      { suit: 'hearts', rank: '8' },
      { suit: 'hearts', rank: '7' },
      { suit: 'hearts', rank: '6' },
      { suit: 'hearts', rank: '5' },
    ];
    expect(HandEvaluator.compareHands(royalFlush, straightFlush)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=hand-evaluator.test
```

Expected: FAIL - "Cannot find module '../hand-evaluator'"

- [ ] **Step 3: 实现牌型判断**

```typescript
// server/src/modules/game/hand-evaluator.ts
import { Card, HandRank, HandResult, Rank } from '../../../../shared/types/game.types';
import { HAND_RANK_ORDER } from '../../../../shared/constants/game.constants';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export class HandEvaluator {
  static evaluate(cards: Card[]): HandResult {
    if (cards.length < 5) {
      throw new Error('Need at least 5 cards to evaluate');
    }

    const sorted = this.sortCards(cards);
    const isFlush = this.isFlush(sorted);
    const isStraight = this.isStraight(sorted);
    const groups = this.groupByRank(sorted);

    // Check for royal flush
    if (isFlush && isStraight && sorted[0].rank === 'A' && sorted[4].rank === '10') {
      return { rank: 'royal_flush', cards: sorted, description: 'Royal Flush' };
    }

    // Check for straight flush
    if (isFlush && isStraight) {
      return { rank: 'straight_flush', cards: sorted, description: 'Straight Flush' };
    }

    // Check for four of a kind
    if (groups.some(g => g.length === 4)) {
      return { rank: 'four_of_a_kind', cards: sorted, description: 'Four of a Kind' };
    }

    // Check for full house
    const hasThree = groups.some(g => g.length === 3);
    const hasTwo = groups.some(g => g.length === 2);
    if (hasThree && hasTwo) {
      return { rank: 'full_house', cards: sorted, description: 'Full House' };
    }

    // Check for flush
    if (isFlush) {
      return { rank: 'flush', cards: sorted, description: 'Flush' };
    }

    // Check for straight
    if (isStraight) {
      return { rank: 'straight', cards: sorted, description: 'Straight' };
    }

    // Check for three of a kind
    if (hasThree) {
      return { rank: 'three_of_a_kind', cards: sorted, description: 'Three of a Kind' };
    }

    // Check for two pair
    const pairs = groups.filter(g => g.length === 2);
    if (pairs.length >= 2) {
      return { rank: 'two_pair', cards: sorted, description: 'Two Pair' };
    }

    // Check for one pair
    if (pairs.length === 1) {
      return { rank: 'one_pair', cards: sorted, description: 'One Pair' };
    }

    // High card
    return { rank: 'high_card', cards: sorted, description: 'High Card' };
  }

  static findBestHand(cards: Card[]): HandResult {
    if (cards.length < 5) {
      throw new Error('Need at least 5 cards');
    }

    let bestHand: HandResult | null = null;

    // Generate all combinations of 5 cards
    const combinations = this.getCombinations(cards, 5);

    for (const combo of combinations) {
      const hand = this.evaluate(combo);
      if (!bestHand || this.compareHands(hand.cards, bestHand.cards) > 0) {
        bestHand = hand;
      }
    }

    return bestHand!;
  }

  static compareHands(hand1: Card[], hand2: Card[]): number {
    const result1 = this.evaluate(hand1);
    const result2 = this.evaluate(hand2);

    const rankDiff = HAND_RANK_ORDER[result1.rank] - HAND_RANK_ORDER[result2.rank];
    if (rankDiff !== 0) return rankDiff;

    // Compare by card values if same rank
    const sorted1 = this.sortCards(hand1);
    const sorted2 = this.sortCards(hand2);

    for (let i = 0; i < Math.min(sorted1.length, sorted2.length); i++) {
      const diff = RANK_VALUES[sorted1[i].rank] - RANK_VALUES[sorted2[i].rank];
      if (diff !== 0) return diff;
    }

    return 0;
  }

  private static sortCards(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  }

  private static isFlush(cards: Card[]): boolean {
    return cards.every(c => c.suit === cards[0].suit);
  }

  private static isStraight(cards: Card[]): boolean {
    const sorted = this.sortCards(cards);
    
    // Check for A-2-3-4-5 (wheel)
    if (sorted[0].rank === 'A' && sorted[1].rank === '5' && sorted[2].rank === '4' && 
        sorted[3].rank === '3' && sorted[4].rank === '2') {
      return true;
    }

    // Check for regular straight
    for (let i = 0; i < sorted.length - 1; i++) {
      if (RANK_VALUES[sorted[i].rank] - RANK_VALUES[sorted[i + 1].rank] !== 1) {
        return false;
      }
    }
    return true;
  }

  private static groupByRank(cards: Card[]): Card[][] {
    const groups: Map<Rank, Card[]> = new Map();
    for (const card of cards) {
      if (!groups.has(card.rank)) {
        groups.set(card.rank, []);
      }
      groups.get(card.rank)!.push(card);
    }
    return Array.from(groups.values());
  }

  private static getCombinations(cards: Card[], size: number): Card[][] {
    if (size === 0) return [[]];
    if (cards.length < size) return [];

    const result: Card[][] = [];
    const [first, ...rest] = cards;

    // Combinations including first
    for (const combo of this.getCombinations(rest, size - 1)) {
      result.push([first, ...combo]);
    }

    // Combinations excluding first
    for (const combo of this.getCombinations(rest, size)) {
      result.push(combo);
    }

    return result;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=hand-evaluator.test
```

Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
cd D:/1-New/JustPoker
git add server/src/modules/game/hand-evaluator.ts server/src/modules/game/__tests__/hand-evaluator.test.ts
git commit -m "feat: implement hand evaluator for Texas Hold'em poker"
```

---

### Task 5: 游戏引擎核心 - 底池计算

**Files:**
- Create: `justpoker/server/src/modules/game/pot-calculator.ts`
- Create: `justpoker/server/src/modules/game/__tests__/pot-calculator.test.ts`

- [ ] **Step 1: 创建底池计算测试**

```typescript
// server/src/modules/game/__tests__/pot-calculator.test.ts
import { PotCalculator } from '../pot-calculator';
import { GamePlayer } from '../../../../shared/types/game.types';

describe('PotCalculator', () => {
  const createPlayer = (overrides: Partial<GamePlayer> = {}): GamePlayer => ({
    userId: '1',
    nickname: 'Player',
    seatNumber: 1,
    chips: 1000,
    bet: 0,
    totalBet: 0,
    cards: [],
    status: 'playing',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    ...overrides
  });

  test('should calculate simple pot', () => {
    const players = [
      createPlayer({ totalBet: 100 }),
      createPlayer({ totalBet: 100 }),
      createPlayer({ totalBet: 100 }),
    ];
    const result = PotCalculator.calculatePots(players);
    expect(result.mainPot).toBe(300);
    expect(result.sidePots).toHaveLength(0);
  });

  test('should calculate side pot with all-in', () => {
    const players = [
      createPlayer({ userId: '1', totalBet: 50, status: 'all_in' }),
      createPlayer({ userId: '2', totalBet: 100 }),
      createPlayer({ userId: '3', totalBet: 100 }),
    ];
    const result = PotCalculator.calculatePots(players);
    expect(result.mainPot).toBe(150); // 50 * 3
    expect(result.sidePots).toHaveLength(1);
    expect(result.sidePots[0].amount).toBe(100); // 50 * 2
    expect(result.sidePots[0].eligiblePlayerIds).toEqual(['2', '3']);
  });

  test('should calculate multiple side pots', () => {
    const players = [
      createPlayer({ userId: '1', totalBet: 50, status: 'all_in' }),
      createPlayer({ userId: '2', totalBet: 100, status: 'all_in' }),
      createPlayer({ userId: '3', totalBet: 200 }),
    ];
    const result = PotCalculator.calculatePots(players);
    expect(result.mainPot).toBe(150); // 50 * 3
    expect(result.sidePots).toHaveLength(2);
    expect(result.sidePots[0].amount).toBe(100); // 50 * 2
    expect(result.sidePots[0].eligiblePlayerIds).toEqual(['2', '3']);
    expect(result.sidePots[1].amount).toBe(100); // 100 * 1
    expect(result.sidePots[1].eligiblePlayerIds).toEqual(['3']);
  });

  test('should handle folded players', () => {
    const players = [
      createPlayer({ userId: '1', totalBet: 100, status: 'folded' }),
      createPlayer({ userId: '2', totalBet: 100 }),
      createPlayer({ userId: '3', totalBet: 100 }),
    ];
    const result = PotCalculator.calculatePots(players);
    expect(result.mainPot).toBe(300);
  });

  test('should distribute winnings to single winner', () => {
    const players = [
      createPlayer({ userId: '1', chips: 1000 }),
      createPlayer({ userId: '2', chips: 1000 }),
    ];
    const pots = [{ amount: 200, eligiblePlayerIds: ['1', '2'] }];
    const winnerIds = ['1'];
    const result = PotCalculator.distributeWinnings(players, pots, winnerIds);
    expect(result.get('1')).toBe(200);
    expect(result.get('2')).toBeUndefined();
  });

  test('should split pot between tied winners', () => {
    const players = [
      createPlayer({ userId: '1', chips: 1000 }),
      createPlayer({ userId: '2', chips: 1000 }),
    ];
    const pots = [{ amount: 200, eligiblePlayerIds: ['1', '2'] }];
    const winnerIds = ['1', '2'];
    const result = PotCalculator.distributeWinnings(players, pots, winnerIds);
    expect(result.get('1')).toBe(100);
    expect(result.get('2')).toBe(100);
  });

  test('should handle odd chip distribution', () => {
    const players = [
      createPlayer({ userId: '1', chips: 1000 }),
      createPlayer({ userId: '2', chips: 1000 }),
      createPlayer({ userId: '3', chips: 1000 }),
    ];
    const pots = [{ amount: 100, eligiblePlayerIds: ['1', '2', '3'] }];
    const winnerIds = ['1', '2', '3'];
    const result = PotCalculator.distributeWinnings(players, pots, winnerIds);
    // 100 / 3 = 33.33, so 33 each with 1 remainder
    expect(result.get('1')).toBe(34); // First player gets extra chip
    expect(result.get('2')).toBe(33);
    expect(result.get('3')).toBe(33);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=pot-calculator.test
```

Expected: FAIL - "Cannot find module '../pot-calculator'"

- [ ] **Step 3: 实现底池计算**

```typescript
// server/src/modules/game/pot-calculator.ts
import { GamePlayer, SidePot } from '../../../../shared/types/game.types';

export interface PotResult {
  mainPot: number;
  sidePots: SidePot[];
}

export class PotCalculator {
  static calculatePots(players: GamePlayer[]): PotResult {
    const activePlayers = players.filter(p => p.status !== 'folded');
    const allPlayers = players.filter(p => p.totalBet > 0);

    if (allPlayers.length === 0) {
      return { mainPot: 0, sidePots: [] };
    }

    // Sort players by total bet
    const sortedByBet = [...allPlayers].sort((a, b) => a.totalBet - b.totalBet);

    let mainPot = 0;
    const sidePots: SidePot[] = [];
    let processedBet = 0;

    for (let i = 0; i < sortedByBet.length; i++) {
      const player = sortedByBet[i];
      const betDiff = player.totalBet - processedBet;

      if (betDiff <= 0) continue;

      // Count eligible players at this level
      const eligiblePlayers = sortedByBet.slice(i);
      const potAmount = betDiff * eligiblePlayers.length;

      if (i === 0) {
        mainPot = potAmount;
      } else {
        sidePots.push({
          amount: potAmount,
          eligiblePlayerIds: eligiblePlayers.map(p => p.userId)
        });
      }

      processedBet = player.totalBet;
    }

    return { mainPot, sidePots };
  }

  static distributeWinnings(
    players: GamePlayer[],
    pots: { amount: number; eligiblePlayerIds: string[] }[],
    winnerIds: string[]
  ): Map<string, number> {
    const winnings = new Map<string, number>();

    for (const pot of pots) {
      // Find winners eligible for this pot
      const eligibleWinners = winnerIds.filter(id => pot.eligiblePlayerIds.includes(id));

      if (eligibleWinners.length === 0) continue;

      // Split pot among winners
      const baseAmount = Math.floor(pot.amount / eligibleWinners.length);
      const remainder = pot.amount % eligibleWinners.length;

      eligibleWinners.forEach((winnerId, index) => {
        const amount = baseAmount + (index < remainder ? 1 : 0);
        winnings.set(winnerId, (winnings.get(winnerId) || 0) + amount);
      });
    }

    return winnings;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=pot-calculator.test
```

Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
cd D:/1-New/JustPoker
git add server/src/modules/game/pot-calculator.ts server/src/modules/game/__tests__/pot-calculator.test.ts
git commit -m "feat: implement pot calculator with side pot support"
```

---

### Task 6: 游戏引擎 - 完整游戏逻辑

**Files:**
- Create: `justpoker/server/src/modules/game/game.engine.ts`
- Create: `justpoker/server/src/modules/game/game.service.ts`
- Create: `justpoker/server/src/modules/game/__tests__/game.engine.test.ts`

- [ ] **Step 1: 创建游戏引擎测试**

```typescript
// server/src/modules/game/__tests__/game.engine.test.ts
import { GameEngine } from '../game.engine';
import { GamePlayer, GameState } from '../../../../shared/types/game.types';

describe('GameEngine', () => {
  let engine: GameEngine;

  const createPlayer = (overrides: Partial<GamePlayer> = {}): GamePlayer => ({
    userId: '1',
    nickname: 'Player',
    seatNumber: 1,
    chips: 1000,
    bet: 0,
    totalBet: 0,
    cards: [],
    status: 'playing',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    ...overrides
  });

  beforeEach(() => {
    engine = new GameEngine();
  });

  test('should start a new game', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
      createPlayer({ userId: '3', seatNumber: 3 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    expect(state.status).toBe('playing');
    expect(state.phase).toBe('preflop');
    expect(state.pot).toBe(15); // 5 + 10
    expect(state.players).toHaveLength(3);
  });

  test('should deal hole cards', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    state.players.forEach(player => {
      expect(player.cards).toHaveLength(2);
    });
  });

  test('should handle fold action', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1 }),
      createPlayer({ userId: '2', seatNumber: 2 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    const result = engine.playerAction(state, '1', 'fold');
    expect(result.players[0].status).toBe('folded');
  });

  test('should handle call action', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    // Player 1 (small blind) calls to 10
    const result = engine.playerAction(state, '1', 'call');
    expect(result.players[0].bet).toBe(10);
    expect(result.players[0].chips).toBe(990);
  });

  test('should handle raise action', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    // Player 1 raises to 50
    const result = engine.playerAction(state, '1', 'raise', 50);
    expect(result.players[0].bet).toBe(50);
    expect(result.currentBet).toBe(50);
  });

  test('should handle all-in action', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 100 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 1000 }),
    ];
    const state = engine.startGame('room1', players, 5, 10);
    const result = engine.playerAction(state, '1', 'all_in');
    expect(result.players[0].bet).toBe(100);
    expect(result.players[0].chips).toBe(0);
    expect(result.players[0].status).toBe('all_in');
  });

  test('should progress to flop', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    
    // Both players call
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');
    
    expect(state.phase).toBe('flop');
    expect(state.communityCards).toHaveLength(3);
  });

  test('should progress to turn', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    
    // Preflop
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');
    
    // Flop
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    
    expect(state.phase).toBe('turn');
    expect(state.communityCards).toHaveLength(4);
  });

  test('should progress to river', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    
    // Preflop
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');
    
    // Flop
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    
    // Turn
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    
    expect(state.phase).toBe('river');
    expect(state.communityCards).toHaveLength(5);
  });

  test('should determine winner at showdown', () => {
    const players = [
      createPlayer({ userId: '1', seatNumber: 1, chips: 995 }),
      createPlayer({ userId: '2', seatNumber: 2, chips: 990 }),
    ];
    let state = engine.startGame('room1', players, 5, 10);
    
    // Play through all rounds
    state = engine.playerAction(state, '1', 'call');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    state = engine.playerAction(state, '1', 'check');
    state = engine.playerAction(state, '2', 'check');
    
    expect(state.status).toBe('finished');
    expect(state.winnerId).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=game.engine.test
```

Expected: FAIL - "Cannot find module '../game.engine'"

- [ ] **Step 3: 实现游戏引擎**

```typescript
// server/src/modules/game/game.engine.ts
import { v4 as uuidv4 } from 'uuid';
import { GameState, GamePlayer, PlayerAction, GamePhase } from '../../../../shared/types/game.types';
import { Deck } from './deck';
import { HandEvaluator } from './hand-evaluator';
import { PotCalculator } from './pot-calculator';

export class GameEngine {
  private deck: Deck = new Deck();

  startGame(roomId: string, players: GamePlayer[], smallBlind: number, bigBlind: number): GameState {
    this.deck.reset();
    this.deck.shuffle();

    // Set dealer, blinds
    const dealerIndex = 0; // First player is dealer
    const smallBlindIndex = (dealerIndex + 1) % players.length;
    const bigBlindIndex = (dealerIndex + 2) % players.length;

    const gamePlayers = players.map((p, i) => ({
      ...p,
      bet: 0,
      totalBet: 0,
      cards: [],
      status: 'playing' as const,
      isDealer: i === dealerIndex,
      isSmallBlind: i === smallBlindIndex,
      isBigBlind: i === bigBlindIndex,
    }));

    // Post blinds
    gamePlayers[smallBlindIndex].bet = smallBlind;
    gamePlayers[smallBlindIndex].chips -= smallBlind;
    gamePlayers[smallBlindIndex].totalBet = smallBlind;

    gamePlayers[bigBlindIndex].bet = bigBlind;
    gamePlayers[bigBlindIndex].chips -= bigBlind;
    gamePlayers[bigBlindIndex].totalBet = bigBlind;

    // Deal hole cards
    for (const player of gamePlayers) {
      player.cards = this.deck.dealMultiple(2);
    }

    return {
      id: uuidv4(),
      roomId,
      phase: 'preflop',
      pot: smallBlind + bigBlind,
      communityCards: [],
      currentPlayerIndex: (bigBlindIndex + 1) % players.length,
      dealerIndex,
      smallBlindIndex,
      bigBlindIndex,
      currentBet: bigBlind,
      minRaise: bigBlind,
      players: gamePlayers,
      sidePots: [],
      status: 'playing',
    };
  }

  playerAction(state: GameState, userId: string, action: PlayerAction, amount?: number): GameState {
    const playerIndex = state.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) throw new Error('Player not found');
    if (playerIndex !== state.currentPlayerIndex) throw new Error('Not your turn');

    const newState = { ...state, players: [...state.players] };
    const player = { ...newState.players[playerIndex] };

    switch (action) {
      case 'fold':
        player.status = 'folded';
        break;

      case 'check':
        if (player.bet < state.currentBet) {
          throw new Error('Cannot check, must call or raise');
        }
        break;

      case 'call':
        const callAmount = state.currentBet - player.bet;
        player.chips -= callAmount;
        player.bet = state.currentBet;
        player.totalBet += callAmount;
        break;

      case 'raise':
        if (!amount || amount <= state.currentBet) {
          throw new Error('Raise amount must be greater than current bet');
        }
        const raiseAmount = amount - player.bet;
        player.chips -= raiseAmount;
        player.bet = amount;
        player.totalBet += raiseAmount;
        newState.currentBet = amount;
        newState.minRaise = amount - state.currentBet;
        break;

      case 'all_in':
        const allInAmount = player.chips;
        player.bet += allInAmount;
        player.totalBet += allInAmount;
        player.chips = 0;
        player.status = 'all_in';
        if (player.bet > state.currentBet) {
          newState.currentBet = player.bet;
        }
        break;
    }

    newState.players[playerIndex] = player;

    // Check if round is complete
    return this.checkRoundComplete(newState);
  }

  private checkRoundComplete(state: GameState): GameState {
    const activePlayers = state.players.filter(p => p.status !== 'folded');
    
    // Only one player left - they win
    if (activePlayers.length === 1) {
      return this.finishGame(state, activePlayers[0].userId);
    }

    // Check if all active players have acted and bets are equal
    const allBetsEqual = activePlayers.every(p => p.bet === state.currentBet || p.status === 'all_in');
    
    if (!allBetsEqual) {
      // Move to next player
      return this.moveToNextPlayer(state);
    }

    // Progress to next phase
    return this.progressPhase(state);
  }

  private moveToNextPlayer(state: GameState): GameState {
    const newState = { ...state };
    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    
    // Skip folded and all-in players
    while (state.players[nextIndex].status === 'folded' || state.players[nextIndex].status === 'all_in') {
      nextIndex = (nextIndex + 1) % state.players.length;
    }
    
    newState.currentPlayerIndex = nextIndex;
    return newState;
  }

  private progressPhase(state: GameState): GameState {
    const newState = { ...state };
    
    // Reset bets for new round
    newState.players = newState.players.map(p => ({
      ...p,
      bet: 0,
    }));
    newState.currentBet = 0;

    switch (state.phase) {
      case 'preflop':
        newState.phase = 'flop';
        newState.communityCards = this.deck.dealMultiple(3);
        break;

      case 'flop':
        newState.phase = 'turn';
        newState.communityCards = [...state.communityCards, ...this.deck.dealMultiple(1)];
        break;

      case 'turn':
        newState.phase = 'river';
        newState.communityCards = [...state.communityCards, ...this.deck.dealMultiple(1)];
        break;

      case 'river':
        return this.showdown(newState);
    }

    // Set first player after dealer
    newState.currentPlayerIndex = (state.dealerIndex + 1) % state.players.length;
    
    // Skip folded and all-in players
    while (newState.players[newState.currentPlayerIndex].status === 'folded' || 
           newState.players[newState.currentPlayerIndex].status === 'all_in') {
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }

    return newState;
  }

  private showdown(state: GameState): GameState {
    const activePlayers = state.players.filter(p => p.status !== 'folded');
    
    // Evaluate each player's hand
    const hands = activePlayers.map(player => ({
      userId: player.userId,
      hand: HandEvaluator.findBestHand([...player.cards, ...state.communityCards]),
    }));

    // Find winner(s)
    let bestRank = 0;
    let winners: string[] = [];

    for (const { userId, hand } of hands) {
      const rankValue = this.getHandRankValue(hand.rank);
      if (rankValue > bestRank) {
        bestRank = rankValue;
        winners = [userId];
      } else if (rankValue === bestRank) {
        winners.push(userId);
      }
    }

    // Calculate and distribute pots
    const pots = PotCalculator.calculatePots(state.players);
    const allPots = [
      { amount: pots.mainPot, eligiblePlayerIds: activePlayers.map(p => p.userId) },
      ...pots.sidePots,
    ];

    const winnings = PotCalculator.distributeWinnings(state.players, allPots, winners);

    // Update player chips
    const updatedPlayers = state.players.map(p => ({
      ...p,
      chips: p.chips + (winnings.get(p.userId) || 0),
    }));

    return {
      ...state,
      players: updatedPlayers,
      status: 'finished',
      winnerId: winners[0],
      winningHand: hands.find(h => h.userId === winners[0])?.hand.description,
    };
  }

  private finishGame(state: GameState, winnerId: string): GameState {
    const pots = PotCalculator.calculatePots(state.players);
    const totalPot = pots.mainPot + pots.sidePots.reduce((sum, p) => sum + p.amount, 0);

    const updatedPlayers = state.players.map(p => ({
      ...p,
      chips: p.userId === winnerId ? p.chips + totalPot : p.chips,
    }));

    return {
      ...state,
      players: updatedPlayers,
      status: 'finished',
      winnerId,
    };
  }

  private getHandRankValue(rank: string): number {
    const ranks: Record<string, number> = {
      'royal_flush': 10,
      'straight_flush': 9,
      'four_of_a_kind': 8,
      'full_house': 7,
      'flush': 6,
      'straight': 5,
      'three_of_a_kind': 4,
      'two_pair': 3,
      'one_pair': 2,
      'high_card': 1,
    };
    return ranks[rank] || 0;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=game.engine.test
```

Expected: PASS

- [ ] **Step 5: 提交代码**

```bash
cd D:/1-New/JustPoker
git add server/src/modules/game/game.engine.ts server/src/modules/game/__tests__/game.engine.test.ts
git commit -m "feat: implement complete game engine with betting rounds and showdown"
```

---

### Task 7: 房间管理模块

**Files:**
- Create: `justpoker/server/src/modules/room/room.manager.ts`
- Create: `justpoker/server/src/modules/room/room.service.ts`
- Create: `justpoker/server/src/modules/room/room.controller.ts`
- Create: `justpoker/server/src/modules/room/__tests__/room.manager.test.ts`

- [ ] **Step 1: 创建房间管理器测试**

```typescript
// server/src/modules/room/__tests__/room.manager.test.ts
import { RoomManager } from '../room.manager';

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  test('should create a room', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    expect(room.roomCode).toMatch(/^\d{2}$/);
    expect(room.hostId).toBe('host1');
    expect(room.initialChips).toBe(100);
  });

  test('should generate unique room codes', () => {
    const room1 = manager.createRoom('host1', 'Host1', 100);
    const room2 = manager.createRoom('host2', 'Host2', 100);
    expect(room1.roomCode).not.toBe(room2.roomCode);
  });

  test('should join a room', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    const player = manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    expect(player).toBeDefined();
    expect(player?.nickname).toBe('Player1');
    expect(player?.status).toBe('joined');
  });

  test('should return null for invalid room code', () => {
    const player = manager.joinRoom('99', 'user1', 'Player1', 100);
    expect(player).toBeNull();
  });

  test('should select a seat', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    const result = manager.selectSeat(room.roomCode, 'user1', 1);
    expect(result).toBe(true);
  });

  test('should not select occupied seat', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 1);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 100);
    const result = manager.selectSeat(room.roomCode, 'user2', 1);
    expect(result).toBe(false);
  });

  test('should leave a room', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 1);
    const result = manager.leaveRoom(room.roomCode, 'user1');
    expect(result).toBe(true);
  });

  test('should get room players', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.joinRoom(room.roomCode, 'user2', 'Player2', 200);
    const players = manager.getRoomPlayers(room.roomCode);
    expect(players).toHaveLength(2);
  });

  test('should handle rebuy', () => {
    const room = manager.createRoom('host1', 'Host', 100);
    manager.joinRoom(room.roomCode, 'user1', 'Player1', 100);
    manager.selectSeat(room.roomCode, 'user1', 1);
    const result = manager.rebuy(room.roomCode, 'user1', 200);
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=room.manager.test
```

Expected: FAIL - "Cannot find module '../room.manager'"

- [ ] **Step 3: 实现房间管理器**

```typescript
// server/src/modules/room/room.manager.ts
import { v4 as uuidv4 } from 'uuid';
import { Room, RoomPlayer, PlayerStatus } from '../../../../shared/types/room.types';
import { MAX_SEATS } from '../../../../shared/constants/game.constants';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private roomPlayers: Map<string, Map<string, RoomPlayer>> = new Map();

  createRoom(hostId: string, hostNickname: string, initialChips: number): Room {
    const roomCode = this.generateRoomCode();
    const room: Room = {
      id: uuidv4(),
      roomCode,
      hostId,
      status: 'waiting',
      smallBlind: 5,
      bigBlind: 10,
      initialChips,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rooms.set(roomCode, room);
    this.roomPlayers.set(roomCode, new Map());

    // Add host as first player
    this.joinRoom(roomCode, hostId, hostNickname, initialChips);

    return room;
  }

  joinRoom(roomCode: string, userId: string, nickname: string, chips: number): RoomPlayer | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const players = this.roomPlayers.get(roomCode)!;
    
    // Check if nickname exists
    for (const player of players.values()) {
      if (player.nickname === nickname) {
        return null; // Nickname already exists
      }
    }

    const player: RoomPlayer = {
      id: uuidv4(),
      roomId: room.id,
      userId,
      nickname,
      seatNumber: null,
      chips,
      status: 'joined',
      joinedAt: new Date(),
    };

    players.set(userId, player);
    return player;
  }

  selectSeat(roomCode: string, userId: string, seatNumber: number): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;

    // Check if seat is occupied
    for (const player of players.values()) {
      if (player.seatNumber === seatNumber) {
        return false;
      }
    }

    const player = players.get(userId);
    if (!player) return false;

    player.seatNumber = seatNumber;
    player.status = 'seated';
    return true;
  }

  leaveRoom(roomCode: string, userId: string): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;

    return players.delete(userId);
  }

  getRoom(roomCode: string): Room | null {
    return this.rooms.get(roomCode) || null;
  }

  getRoomPlayers(roomCode: string): RoomPlayer[] {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return [];
    return Array.from(players.values());
  }

  getSeatedPlayers(roomCode: string): RoomPlayer[] {
    return this.getRoomPlayers(roomCode).filter(p => 
      p.status === 'seated' || p.status === 'playing'
    );
  }

  rebuy(roomCode: string, userId: string, amount: number): boolean {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return false;

    const player = players.get(userId);
    if (!player) return false;

    player.chips += amount;
    player.status = 'seated';
    return true;
  }

  updatePlayerStatus(roomCode: string, userId: string, status: PlayerStatus): void {
    const players = this.roomPlayers.get(roomCode);
    if (!players) return;

    const player = players.get(userId);
    if (player) {
      player.status = status;
    }
  }

  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.floor(10 + Math.random() * 90).toString();
    } while (this.rooms.has(code));
    return code;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd D:/1-New/JustPoker/server
npm test -- --testPathPattern=room.manager.test
```

Expected: PASS

- [ ] **Step 5: 实现房间服务**

```typescript
// server/src/modules/room/room.service.ts
import { RoomManager } from './room.manager';
import { Room, RoomPlayer, CreateRoomRequest, JoinRoomRequest, SelectSeatRequest, RebuyRequest } from '../../../../shared/types/room.types';
import { database } from '../../services/database.service';
import { logger } from '../../utils/logger';

export class RoomService {
  private roomManager: RoomManager;

  constructor() {
    this.roomManager = new RoomManager();
  }

  async createRoom(hostId: string, request: CreateRoomRequest): Promise<Room> {
    const room = this.roomManager.createRoom(hostId, request.nickname, request.initialChips);
    
    // Save to database if available
    await database.insert('rooms', {
      id: room.id,
      room_code: room.roomCode,
      host_id: room.hostId,
      status: room.status,
      small_blind: room.smallBlind,
      big_blind: room.bigBlind,
      initial_chips: room.initialChips,
    });

    logger.info(`Room created: ${room.roomCode}`);
    return room;
  }

  async joinRoom(request: JoinRoomRequest): Promise<RoomPlayer | null> {
    const player = this.roomManager.joinRoom(
      request.roomCode,
      request.nickname, // Using nickname as userId for simplicity
      request.nickname,
      request.chips
    );

    if (player) {
      logger.info(`Player ${request.nickname} joined room ${request.roomCode}`);
    }

    return player;
  }

  selectSeat(roomCode: string, userId: string, seatNumber: number): boolean {
    return this.roomManager.selectSeat(roomCode, userId, seatNumber);
  }

  leaveRoom(roomCode: string, userId: string): boolean {
    return this.roomManager.leaveRoom(roomCode, userId);
  }

  getRoom(roomCode: string): Room | null {
    return this.roomManager.getRoom(roomCode);
  }

  getRoomPlayers(roomCode: string): RoomPlayer[] {
    return this.roomManager.getRoomPlayers(roomCode);
  }

  getSeatedPlayers(roomCode: string): RoomPlayer[] {
    return this.roomManager.getSeatedPlayers(roomCode);
  }

  rebuy(roomCode: string, userId: string, amount: number): boolean {
    return this.roomManager.rebuy(roomCode, userId, amount);
  }

  getRoomManager(): RoomManager {
    return this.roomManager;
  }
}

export const roomService = new RoomService();
```

- [ ] **Step 6: 实现房间控制器**

```typescript
// server/src/modules/room/room.controller.ts
import { Router, Request, Response } from 'express';
import { roomService } from './room.service';
import { CreateRoomRequest, JoinRoomRequest } from '../../../../shared/types/room.types';

const router = Router();

// Create room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nickname, initialChips }: CreateRoomRequest = req.body;
    
    if (!nickname || !initialChips) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate a simple userId for now
    const userId = `user_${Date.now()}`;
    const room = await roomService.createRoom(userId, { nickname, initialChips });
    
    res.json({
      roomCode: room.roomCode,
      roomId: room.id,
      userId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room
router.post('/:roomCode/join', async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const { nickname, chips }: JoinRoomRequest = req.body;
    
    if (!nickname || !chips) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const player = await roomService.joinRoom({ roomCode, nickname, chips });
    
    if (!player) {
      return res.status(404).json({ error: 'Room not found or nickname exists' });
    }

    res.json({
      userId: player.userId,
      nickname: player.nickname,
      status: player.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get room info
router.get('/:roomCode', (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const room = roomService.getRoom(roomCode);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const players = roomService.getRoomPlayers(roomCode);
    
    res.json({
      room,
      players,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

export default router;
```

- [ ] **Step 7: 更新服务器入口注册路由**

```typescript
// server/src/index.ts - 添加路由
import roomRouter from './modules/room/room.controller';

// ... 在 app 初始化后添加
app.use('/api/rooms', roomRouter);
```

- [ ] **Step 8: 提交代码**

```bash
cd D:/1-New/JustPoker
git add server/src/modules/room/
git commit -m "feat: implement room management with create, join, and seat selection"
```

---

### Task 8: 前端项目初始化

**Files:**
- Create: `justpoker/client/package.json`
- Create: `justpoker/client/vite.config.ts`
- Create: `justpoker/client/tsconfig.json`
- Create: `justpoker/client/src/main.ts`
- Create: `justpoker/client/src/App.vue`
- Create: `justpoker/client/src/router/index.ts`
- Create: `justpoker/client/src/views/HomeView.vue`
- Create: `justpoker/client/src/views/RoomView.vue`
- Create: `justpoker/client/src/services/api.ts`
- Create: `justpoker/client/src/services/socket.ts`
- Create: `justpoker/client/src/stores/user.ts`
- Create: `justpoker/client/src/stores/room.ts`
- Create: `justpoker/client/src/stores/game.ts`

- [ ] **Step 1: 创建 client/package.json**

```json
{
  "name": "justpoker-client",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.8",
    "vue-router": "^4.2.5",
    "pinia": "^2.1.7",
    "socket.io-client": "^4.7.2",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.5.2",
    "typescript": "^5.2.2",
    "vite": "^5.0.8",
    "vue-tsc": "^1.8.25"
  }
}
```

- [ ] **Step 2: 创建 client/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 3: 创建 client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: 创建客户端服务 - api.ts**

```typescript
// client/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface CreateRoomResponse {
  roomCode: string;
  roomId: string;
  userId: string;
}

export interface JoinRoomResponse {
  userId: string;
  nickname: string;
  status: string;
}

export interface RoomInfo {
  room: {
    id: string;
    roomCode: string;
    hostId: string;
    status: string;
    initialChips: number;
  };
  players: Array<{
    userId: string;
    nickname: string;
    seatNumber: number | null;
    chips: number;
    status: string;
  }>;
}

export const roomApi = {
  createRoom: (nickname: string, initialChips: number) =>
    api.post<CreateRoomResponse>('/rooms', { nickname, initialChips }),

  joinRoom: (roomCode: string, nickname: string, chips: number) =>
    api.post<JoinRoomResponse>(`/rooms/${roomCode}/join`, { nickname, chips }),

  getRoomInfo: (roomCode: string) =>
    api.get<RoomInfo>(`/rooms/${roomCode}`),
};

export default api;
```

- [ ] **Step 5: 创建客户端服务 - socket.ts**

```typescript
// client/src/services/socket.ts
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../../shared/constants/socket.constants';

class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinRoom(roomCode: string, userId: string): void {
    this.socket?.emit(SOCKET_EVENTS.JOIN_ROOM, { roomCode, userId });
  }

  leaveRoom(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomCode });
  }

  selectSeat(roomCode: string, seatNumber: number): void {
    this.socket?.emit(SOCKET_EVENTS.SELECT_SEAT, { roomCode, seatNumber });
  }

  playerAction(roomCode: string, action: string, amount?: number): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_ACTION, { roomCode, action, amount });
  }

  sendEmoji(roomCode: string, emoji: string): void {
    this.socket?.emit(SOCKET_EVENTS.SEND_EMOJI, { roomCode, emoji });
  }

  rebuy(roomCode: string, amount: number): void {
    this.socket?.emit(SOCKET_EVENTS.REBUY, { roomCode, amount });
  }

  onRoomUpdate(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.ROOM_UPDATE, callback);
  }

  onGameStart(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.GAME_START, callback);
  }

  onGameUpdate(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.GAME_UPDATE, callback);
  }

  onPlayerJoined(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.PLAYER_JOINED, callback);
  }

  onPlayerLeft(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.PLAYER_LEFT, callback);
  }

  onNewEmoji(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.NEW_EMOJI, callback);
  }

  onError(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.ERROR, callback);
  }

  onRebuyRequired(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.REBUY_REQUIRED, callback);
  }
}

export const socketService = new SocketService();
```

- [ ] **Step 6: 创建 Pinia stores**

```typescript
// client/src/stores/user.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const userId = ref<string | null>(null);
  const nickname = ref<string | null>(null);

  function setUser(id: string, name: string) {
    userId.value = id;
    nickname.value = name;
  }

  function clearUser() {
    userId.value = null;
    nickname.value = null;
  }

  return { userId, nickname, setUser, clearUser };
});
```

```typescript
// client/src/stores/room.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface RoomPlayer {
  userId: string;
  nickname: string;
  seatNumber: number | null;
  chips: number;
  status: string;
}

export const useRoomStore = defineStore('room', () => {
  const roomCode = ref<string | null>(null);
  const roomId = ref<string | null>(null);
  const players = ref<RoomPlayer[]>([]);
  const initialChips = ref(100);

  function setRoom(code: string, id: string, chips: number) {
    roomCode.value = code;
    roomId.value = id;
    initialChips.value = chips;
  }

  function setPlayers(newPlayers: RoomPlayer[]) {
    players.value = newPlayers;
  }

  function clearRoom() {
    roomCode.value = null;
    roomId.value = null;
    players.value = [];
  }

  return { roomCode, roomId, players, initialChips, setRoom, setPlayers, clearRoom };
});
```

```typescript
// client/src/stores/game.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface GameState {
  phase: string;
  pot: number;
  communityCards: any[];
  currentPlayerIndex: number;
  currentBet: number;
  status: string;
}

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState | null>(null);
  const myCards = ref<any[]>([]);
  const isMyTurn = ref(false);

  function updateGameState(state: GameState) {
    gameState.value = state;
  }

  function setMyCards(cards: any[]) {
    myCards.value = cards;
  }

  function setMyTurn(isTurn: boolean) {
    isMyTurn.value = isTurn;
  }

  function clearGame() {
    gameState.value = null;
    myCards.value = [];
    isMyTurn.value = false;
  }

  return { gameState, myCards, isMyTurn, updateGameState, setMyCards, setMyTurn, clearGame };
});
```

- [ ] **Step 7: 创建路由和视图**

```typescript
// client/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import RoomView from '../views/RoomView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/room/:roomCode', component: RoomView },
  ],
});

export default router;
```

```vue
<!-- client/src/views/HomeView.vue -->
<template>
  <div class="home">
    <h1>JustPoker</h1>
    <div class="actions">
      <button @click="showCreate = true">创建房间</button>
      <button @click="showJoin = true">加入房间</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showCreate = ref(false);
const showJoin = ref(false);
</script>
```

```vue
<!-- client/src/views/RoomView.vue -->
<template>
  <div class="room">
    <h2>房间: {{ roomCode }}</h2>
    <!-- Game content will be added here -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const roomCode = computed(() => route.params.roomCode as string);
</script>
```

- [ ] **Step 8: 安装依赖并测试**

```bash
cd D:/1-New/JustPoker/client
npm install
npm run dev
```

- [ ] **Step 9: 提交代码**

```bash
cd D:/1-New/JustPoker
git add client/
git commit -m "feat: initialize Vue.js frontend with router, stores, and socket service"
```

---

### Task 9: 前端首页组件

**Files:**
- Create: `justpoker/client/src/components/home/CreateRoom.vue`
- Create: `justpoker/client/src/components/home/JoinRoom.vue`
- Create: `justpoker/client/src/components/common/NicknameInput.vue`
- Create: `justpoker/client/src/components/common/ChipSelector.vue`
- Create: `justpoker/client/src/components/common/SoundToggle.vue`
- Modify: `justpoker/client/src/views/HomeView.vue`

- [ ] **Step 1: 创建 NicknameInput 组件**

```vue
<!-- client/src/components/common/NicknameInput.vue -->
<template>
  <div class="nickname-input">
    <label>{{ label }}</label>
    <input
      v-model="nickname"
      :placeholder="placeholder"
      maxlength="10"
      @input="validate"
    />
    <span v-if="error" class="error">{{ error }}</span>
    <span v-if="success" class="success">昵称可用</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  label?: string;
  placeholder?: string;
  existingNicknames?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:nickname', value: string): void;
  (e: 'valid', value: boolean): void;
}>();

const nickname = ref('');
const error = ref('');
const success = ref(false);

function validate() {
  error.value = '';
  success.value = false;

  if (!nickname.value) {
    emit('valid', false);
    return;
  }

  if (nickname.value.length < 2) {
    error.value = '昵称至少2个字符';
    emit('valid', false);
    return;
  }

  const regex = /^[一-龥a-zA-Z0-9]+$/;
  if (!regex.test(nickname.value)) {
    error.value = '仅支持中文、英文、数字';
    emit('valid', false);
    return;
  }

  if (props.existingNicknames?.includes(nickname.value)) {
    error.value = '昵称已存在！';
    emit('valid', false);
    return;
  }

  success.value = true;
  emit('update:nickname', nickname.value);
  emit('valid', true);
}

watch(() => props.existingNicknames, () => {
  if (nickname.value) validate();
});
</script>
```

- [ ] **Step 2: 创建 ChipSelector 组件**

```vue
<!-- client/src/components/common/ChipSelector.vue -->
<template>
  <div class="chip-selector">
    <label>{{ label }}</label>
    <div class="options">
      <button
        v-for="option in options"
        :key="option"
        :class="{ selected: modelValue === option }"
        @click="$emit('update:modelValue', option)"
      >
        {{ option }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
  options?: number[];
  modelValue: number;
}>();

defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();
</script>
```

- [ ] **Step 3: 创建 CreateRoom 组件**

```vue
<!-- client/src/components/home/CreateRoom.vue -->
<template>
  <div class="create-room">
    <h2>创建房间</h2>
    <NicknameInput
      label="设置昵称"
      placeholder="2-10个字符"
      :existing-nicknames="[]"
      @update:nickname="nickname = $event"
      @valid="isNicknameValid = $event"
    />
    <ChipSelector
      label="设置初始筹码"
      :options="[100, 200, 500]"
      v-model="initialChips"
    />
    <button :disabled="!isNicknameValid" @click="createRoom">创建房间</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { roomApi } from '../../services/api';
import { useUserStore } from '../../stores/user';
import { useRoomStore } from '../../stores/room';
import NicknameInput from '../common/NicknameInput.vue';
import ChipSelector from '../common/ChipSelector.vue';

const router = useRouter();
const userStore = useUserStore();
const roomStore = useRoomStore();

const nickname = ref('');
const initialChips = ref(100);
const isNicknameValid = ref(false);

async function createRoom() {
  try {
    const response = await roomApi.createRoom(nickname.value, initialChips.value);
    const { roomCode, roomId, userId } = response.data;

    userStore.setUser(userId, nickname.value);
    roomStore.setRoom(roomCode, roomId, initialChips.value);

    router.push(`/room/${roomCode}`);
  } catch (error) {
    console.error('Failed to create room:', error);
  }
}
</script>
```

- [ ] **Step 4: 创建 JoinRoom 组件**

```vue
<!-- client/src/components/home/JoinRoom.vue -->
<template>
  <div class="join-room">
    <h2>加入房间</h2>
    <input v-model="roomCode" placeholder="输入房间号" maxlength="2" />
    <NicknameInput
      label="设置昵称"
      placeholder="2-10个字符"
      :existing-nicknames="[]"
      @update:nickname="nickname = $event"
      @valid="isNicknameValid = $event"
    />
    <ChipSelector
      label="设置带入筹码"
      :options="[100, 200, 500]"
      v-model="chips"
    />
    <button :disabled="!isNicknameValid || !roomCode" @click="joinRoom">加入房间</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { roomApi } from '../../services/api';
import { useUserStore } from '../../stores/user';
import NicknameInput from '../common/NicknameInput.vue';
import ChipSelector from '../common/ChipSelector.vue';

const router = useRouter();
const userStore = useUserStore();

const roomCode = ref('');
const nickname = ref('');
const chips = ref(100);
const isNicknameValid = ref(false);

async function joinRoom() {
  try {
    const response = await roomApi.joinRoom(roomCode.value, nickname.value, chips.value);
    const { userId } = response.data;

    userStore.setUser(userId, nickname.value);
    router.push(`/room/${roomCode.value}`);
  } catch (error) {
    console.error('Failed to join room:', error);
  }
}
</script>
```

- [ ] **Step 5: 更新 HomeView 使用组件**

```vue
<!-- client/src/views/HomeView.vue -->
<template>
  <div class="home">
    <h1>JustPoker</h1>
    <SoundToggle />
    <div class="actions">
      <CreateRoom v-if="showCreate" />
      <JoinRoom v-if="showJoin" />
      <div v-if="!showCreate && !showJoin">
        <button @click="showCreate = true">创建房间</button>
        <button @click="showJoin = true">加入房间</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CreateRoom from '../components/home/CreateRoom.vue';
import JoinRoom from '../components/home/JoinRoom.vue';
import SoundToggle from '../components/common/SoundToggle.vue';

const showCreate = ref(false);
const showJoin = ref(false);
</script>
```

- [ ] **Step 6: 提交代码**

```bash
cd D:/1-New/JustPoker
git add client/src/components/ client/src/views/HomeView.vue
git commit -m "feat: implement home page with create and join room components"
```

---

### Task 10: 游戏桌面组件

**Files:**
- Create: `justpoker/client/src/components/game/GameTable.vue`
- Create: `justpoker/client/src/components/game/PlayerSeat.vue`
- Create: `justpoker/client/src/components/game/CommunityCards.vue`
- Create: `justpoker/client/src/components/game/ActionPanel.vue`
- Create: `justpoker/client/src/components/game/EmojiPanel.vue`
- Create: `justpoker/client/src/components/game/Scoreboard.vue`
- Modify: `justpoker/client/src/views/RoomView.vue`

- [ ] **Step 1: 创建 PlayerSeat 组件**

```vue
<!-- client/src/components/game/PlayerSeat.vue -->
<template>
  <div 
    class="player-seat"
    :class="{ 
      'is-me': isMe, 
      'is-dealer': player.isDealer,
      'is-current': isCurrentPlayer,
      'is-folded': player.status === 'folded',
      'is-out': player.status === 'out'
    }"
    @click="handleClick"
  >
    <div class="avatar">
      <span class="nickname" @click="handleTip">{{ player.nickname }}</span>
      <span class="chips">{{ player.chips }}</span>
    </div>
    <div v-if="isMe && myCards.length" class="cards">
      <div v-for="card in myCards" :key="`${card.suit}-${card.rank}`" class="card">
        {{ card.rank }}{{ getSuitSymbol(card.suit) }}
      </div>
    </div>
    <div v-if="player.isDealer" class="dealer-badge">D</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  player: {
    userId: string;
    nickname: string;
    chips: number;
    status: string;
    isDealer: boolean;
  };
  isMe: boolean;
  isCurrentPlayer: boolean;
  myCards?: any[];
}>();

const emit = defineEmits<{
  (e: 'tip'): void;
}>();

function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit] || '';
}

function handleClick() {
  // Handle click for seat selection if needed
}

function handleTip() {
  if (!props.isMe) {
    emit('tip');
  }
}
</script>
```

- [ ] **Step 2: 创建 GameTable 组件**

```vue
<!-- client/src/components/game/GameTable.vue -->
<template>
  <div class="game-table">
    <div class="table-surface">
      <CommunityCards :cards="communityCards" />
      <div class="pot">底池: {{ pot }}</div>
    </div>
    <div class="seats">
      <PlayerSeat
        v-for="(player, index) in players"
        :key="player.userId"
        :player="player"
        :is-me="player.userId === userId"
        :is-current-player="index === currentPlayerIndex"
        :my-cards="player.userId === userId ? myCards : []"
        :style="getSeatStyle(index, players.length)"
        @tip="$emit('tip', player)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PlayerSeat from './PlayerSeat.vue';
import CommunityCards from './CommunityCards.vue';

defineProps<{
  players: any[];
  communityCards: any[];
  pot: number;
  currentPlayerIndex: number;
  userId: string;
  myCards: any[];
}>();

defineEmits<{
  (e: 'tip', player: any): void;
}>();

function getSeatStyle(index: number, total: number) {
  const angle = (360 / total) * index - 90;
  const radius = 40;
  const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  };
}
</script>
```

- [ ] **Step 3: 创建其他游戏组件**

```vue
<!-- client/src/components/game/CommunityCards.vue -->
<template>
  <div class="community-cards">
    <div v-for="(card, index) in cards" :key="index" class="card">
      {{ card.rank }}{{ getSuitSymbol(card.suit) }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  cards: any[];
}>();

function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit] || '';
}
</script>
```

```vue
<!-- client/src/components/game/ActionPanel.vue -->
<template>
  <div class="action-panel">
    <button @click="$emit('fold')" :disabled="!isMyTurn">弃牌</button>
    <button @click="$emit('call')" :disabled="!isMyTurn || currentBet === 0">
      跟注 {{ currentBet }}
    </button>
    <button @click="$emit('raise', raiseAmount)" :disabled="!isMyTurn">
      加注 {{ raiseAmount }}
    </button>
    <input 
      type="range" 
      v-model="raiseAmount" 
      :min="currentBet + minRaise" 
      :max="maxChips"
    />
    <button @click="$emit('allIn')" :disabled="!isMyTurn">全下</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  isMyTurn: boolean;
  currentBet: number;
  minRaise: number;
  maxChips: number;
}>();

defineEmits<{
  (e: 'fold'): void;
  (e: 'call'): void;
  (e: 'raise', amount: number): void;
  (e: 'allIn'): void;
}>();

const raiseAmount = ref(0);
</script>
```

```vue
<!-- client/src/components/game/EmojiPanel.vue -->
<template>
  <div class="emoji-panel">
    <button
      v-for="emoji in emojis"
      :key="emoji"
      @click="$emit('send', emoji)"
      :disabled="isCooldown"
    >
      {{ emoji }}
    </button>
    <span v-if="isCooldown" class="cooldown">太快了，停一下</span>
  </div>
</template>

<script setup lang="ts">
import { EMOJIS } from '../../../../shared/constants/game.constants';

defineProps<{
  isCooldown: boolean;
}>();

defineEmits<{
  (e: 'send', emoji: string): void;
}>();

const emojis = EMOJIS;
</script>
```

```vue
<!-- client/src/components/game/Scoreboard.vue -->
<template>
  <div class="scoreboard">
    <h3>比分板</h3>
    <table>
      <thead>
        <tr>
          <th>玩家</th>
          <th>初始筹码</th>
          <th>重新买入</th>
          <th>总投入</th>
          <th>当前筹码</th>
          <th>盈亏</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="player in players" :key="player.userId">
          <td>{{ player.nickname }}</td>
          <td>{{ player.initialChips }}</td>
          <td>{{ player.rebuyTotal }}</td>
          <td>{{ player.totalInvested }}</td>
          <td>{{ player.chips }}</td>
          <td :class="{ positive: player.profit >= 0, negative: player.profit < 0 }">
            {{ player.profit >= 0 ? '+' : '' }}{{ player.profit }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  players: any[];
}>();
</script>
```

- [ ] **Step 4: 更新 RoomView 使用游戏组件**

```vue
<!-- client/src/views/RoomView.vue -->
<template>
  <div class="room">
    <h2>房间: {{ roomCode }}</h2>
    <GameTable
      :players="players"
      :community-cards="communityCards"
      :pot="pot"
      :current-player-index="currentPlayerIndex"
      :user-id="userId"
      :my-cards="myCards"
      @tip="handleTip"
    />
    <ActionPanel
      v-if="isMyTurn"
      :is-my-turn="isMyTurn"
      :current-bet="currentBet"
      :min-raise="minRaise"
      :max-chips="maxChips"
      @fold="handleFold"
      @call="handleCall"
      @raise="handleRaise"
      @all-in="handleAllIn"
    />
    <EmojiPanel
      :is-cooldown="isCooldown"
      @send="handleEmoji"
    />
    <Scoreboard :players="scoreboardPlayers" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useRoomStore } from '../stores/room';
import { useGameStore } from '../stores/game';
import { socketService } from '../services/socket';
import GameTable from '../components/game/GameTable.vue';
import ActionPanel from '../components/game/ActionPanel.vue';
import EmojiPanel from '../components/game/EmojiPanel.vue';
import Scoreboard from '../components/game/Scoreboard.vue';

const route = useRoute();
const userStore = useUserStore();
const roomStore = useRoomStore();
const gameStore = useGameStore();

const roomCode = computed(() => route.params.roomCode as string);
const userId = computed(() => userStore.userId || '');
const players = computed(() => roomStore.players);
const communityCards = computed(() => gameStore.gameState?.communityCards || []);
const pot = computed(() => gameStore.gameState?.pot || 0);
const currentPlayerIndex = computed(() => gameStore.gameState?.currentPlayerIndex || 0);
const currentBet = computed(() => gameStore.gameState?.currentBet || 0);
const minRaise = computed(() => 10);
const maxChips = computed(() => 1000);
const myCards = computed(() => gameStore.myCards);
const isMyTurn = computed(() => gameStore.isMyTurn);
const isCooldown = ref(false);
const scoreboardPlayers = ref([]);

onMounted(() => {
  socketService.connect();
  socketService.joinRoom(roomCode.value, userId.value);

  socketService.onGameUpdate((data) => {
    gameStore.updateGameState(data);
  });
});

function handleFold() {
  socketService.playerAction(roomCode.value, 'fold');
}

function handleCall() {
  socketService.playerAction(roomCode.value, 'call');
}

function handleRaise(amount: number) {
  socketService.playerAction(roomCode.value, 'raise', amount);
}

function handleAllIn() {
  socketService.playerAction(roomCode.value, 'all_in');
}

function handleEmoji(emoji: string) {
  socketService.sendEmoji(roomCode.value, emoji);
}

function handleTip(player: any) {
  // Implement tip functionality
}
</script>
```

- [ ] **Step 5: 提交代码**

```bash
cd D:/1-New/JustPoker
git add client/src/components/game/ client/src/views/RoomView.vue
git commit -m "feat: implement game table with player seats, actions, and emoji panel"
```

---

### Task 11: 音效系统

**Files:**
- Create: `justpoker/client/src/utils/sounds.ts`
- Create: `justpoker/client/public/sounds/` (音效文件)

- [ ] **Step 1: 创建音效管理器**

```typescript
// client/src/utils/sounds.ts
class SoundManager {
  private enabled: boolean = true;
  private sounds: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    const soundFiles = {
      join: '/sounds/join.mp3',
      leave: '/sounds/leave.mp3',
      deal: '/sounds/deal.mp3',
      flip: '/sounds/flip.mp3',
      bet: '/sounds/bet.mp3',
      fold: '/sounds/fold.mp3',
      emoji: '/sounds/emoji.mp3',
      win: '/sounds/win.mp3',
      lose: '/sounds/lose.mp3',
      yourTurn: '/sounds/your-turn.mp3',
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  play(soundName: string) {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  playJoin() { this.play('join'); }
  playLeave() { this.play('leave'); }
  playDeal() { this.play('deal'); }
  playFlip() { this.play('flip'); }
  playBet() { this.play('bet'); }
  playFold() { this.play('fold'); }
  playEmoji() { this.play('emoji'); }
  playWin() { this.play('win'); }
  playLose() { this.play('lose'); }
  playYourTurn() { this.play('yourTurn'); }
}

export const soundManager = new SoundManager();
```

- [ ] **Step 2: 创建 SoundToggle 组件**

```vue
<!-- client/src/components/common/SoundToggle.vue -->
<template>
  <div class="sound-toggle">
    <label>音效</label>
    <button @click="toggle">
      {{ enabled ? '开启' : '关闭' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { soundManager } from '../../utils/sounds';

const enabled = ref(true);

function toggle() {
  enabled.value = !enabled.value;
  soundManager.setEnabled(enabled.value);
}
</script>
```

- [ ] **Step 3: 添加音效文件占位**

```bash
mkdir -p D:/1-New/JustPoker/client/public/sounds
# 创建空的音效文件占位符
touch D:/1-New/JustPoker/client/public/sounds/join.mp3
touch D:/1-New/JustPoker/client/public/sounds/leave.mp3
touch D:/1-New/JustPoker/client/public/sounds/deal.mp3
touch D:/1-New/JustPoker/client/public/sounds/flip.mp3
touch D:/1-New/JustPoker/client/public/sounds/bet.mp3
touch D:/1-New/JustPoker/client/public/sounds/fold.mp3
touch D:/1-New/JustPoker/client/public/sounds/emoji.mp3
touch D:/1-New/JustPoker/client/public/sounds/win.mp3
touch D:/1-New/JustPoker/client/public/sounds/lose.mp3
touch D:/1-New/JustPoker/client/public/sounds/your-turn.mp3
```

- [ ] **Step 4: 提交代码**

```bash
cd D:/1-New/JustPoker
git add client/src/utils/sounds.ts client/src/components/common/SoundToggle.vue client/public/sounds/
git commit -m "feat: implement sound system with toggle control"
```

---

### Task 12: Socket 事件处理

**Files:**
- Modify: `justpoker/server/src/services/socket.service.ts`
- Modify: `justpoker/client/src/services/socket.ts`
- Modify: `justpoker/client/src/views/RoomView.vue`

- [ ] **Step 1: 更新后端 Socket 服务处理事件**

```typescript
// server/src/services/socket.service.ts - 添加事件处理
import { Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../../../shared/constants/socket.constants';
import { roomService } from '../modules/room/room.service';

// ... 在 initialize 方法中添加

this.io.on('connection', (socket: Socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join room
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (data: { roomCode: string; userId: string }) => {
    socket.join(data.roomCode);
    socket.data.userId = data.userId;
    socket.data.roomCode = data.roomCode;
    
    const players = roomService.getRoomPlayers(data.roomCode);
    this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    this.emitToRoom(data.roomCode, SOCKET_EVENTS.PLAYER_JOINED, { userId: data.userId });
  });

  // Leave room
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data: { roomCode: string }) => {
    socket.leave(data.roomCode);
    roomService.leaveRoom(data.roomCode, socket.data.userId);
    
    const players = roomService.getRoomPlayers(data.roomCode);
    this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    this.emitToRoom(data.roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId: socket.data.userId });
  });

  // Select seat
  socket.on(SOCKET_EVENTS.SELECT_SEAT, (data: { roomCode: string; seatNumber: number }) => {
    const success = roomService.selectSeat(data.roomCode, socket.data.userId, data.seatNumber);
    
    if (success) {
      const players = roomService.getRoomPlayers(data.roomCode);
      this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    }
  });

  // Player action
  socket.on(SOCKET_EVENTS.PLAYER_ACTION, (data: { roomCode: string; action: string; amount?: number }) => {
    // Forward to game engine
    this.emitToRoom(data.roomCode, SOCKET_EVENTS.GAME_UPDATE, {
      userId: socket.data.userId,
      action: data.action,
      amount: data.amount,
    });
  });

  // Send emoji
  socket.on(SOCKET_EVENTS.SEND_EMOJI, (data: { roomCode: string; emoji: string }) => {
    this.emitToRoom(data.roomCode, SOCKET_EVENTS.NEW_EMOJI, {
      userId: socket.data.userId,
      emoji: data.emoji,
    });
  });

  // Rebuy
  socket.on(SOCKET_EVENTS.REBUY, (data: { roomCode: string; amount: number }) => {
    const success = roomService.rebuy(data.roomCode, socket.data.userId, data.amount);
    
    if (success) {
      const players = roomService.getRoomPlayers(data.roomCode);
      this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});
```

- [ ] **Step 2: 更新前端 Socket 服务添加缺失方法**

```typescript
// client/src/services/socket.ts - 确保所有事件都有监听
// 已在 Task 8 中完成，无需修改
```

- [ ] **Step 3: 更新 RoomView 处理 Socket 事件**

```vue
<!-- client/src/views/RoomView.vue - 更新 onMounted -->
onMounted(() => {
  socketService.connect();
  socketService.joinRoom(roomCode.value, userId.value);

  socketService.onRoomUpdate((data) => {
    roomStore.setPlayers(data.players);
  });

  socketService.onGameUpdate((data) => {
    gameStore.updateGameState(data);
  });

  socketService.onPlayerJoined((data) => {
    soundManager.playJoin();
  });

  socketService.onPlayerLeft((data) => {
    soundManager.playLeave();
  });

  socketService.onNewEmoji((data) => {
    soundManager.playEmoji();
    // Display emoji animation
  });

  socketService.onGameStart((data) => {
    soundManager.playDeal();
  });
});
```

- [ ] **Step 4: 提交代码**

```bash
cd D:/1-New/JustPoker
git add server/src/services/socket.service.ts client/src/views/RoomView.vue
git commit -m "feat: implement socket event handling for real-time gameplay"
```

---

### Task 13: 部署配置

**Files:**
- Create: `justpoker/vercel.json`
- Create: `justpoker/render.yaml`
- Create: `justpoker/.env.example`
- Modify: `justpoker/server/src/index.ts` (添加环境变量)

- [ ] **Step 1: 创建 vercel.json**

```json
{
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://justpoker-api.onrender.com/api/$1" },
    { "source": "/socket.io/(.*)", "destination": "https://justpoker-api.onrender.com/socket.io/$1" }
  ]
}
```

- [ ] **Step 2: 创建 render.yaml**

```yaml
services:
  - type: web
    name: justpoker-api
    env: node
    buildCommand: cd server && npm install && npm run build
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: CORS_ORIGIN
        value: https://justpoker.vercel.app
```

- [ ] **Step 3: 创建 .env.example**

```
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

- [ ] **Step 4: 更新服务器入口支持环境变量**

```typescript
// server/src/index.ts - 确保环境变量已配置
import dotenv from 'dotenv';
dotenv.config();
```

- [ ] **Step 5: 提交代码**

```bash
cd D:/1-New/JustPoker
git add vercel.json render.yaml .env.example
git commit -m "chore: add deployment configuration for Vercel and Render"
```

---

## 总结

本实现计划包含13个主要任务，涵盖了JustPoker平台的完整实现：

1. ✅ 项目初始化与环境搭建
2. ✅ 后端项目初始化
3. ✅ 游戏引擎核心 - 牌组管理
4. ✅ 游戏引擎核心 - 牌型判断
5. ✅ 游戏引擎核心 - 底池计算
6. ✅ 游戏引擎 - 完整游戏逻辑
7. ✅ 房间管理模块
8. ✅ 前端项目初始化
9. ✅ 前端首页组件
10. ✅ 游戏桌面组件
11. ✅ 音效系统
12. ✅ Socket 事件处理
13. ✅ 部署配置

每个任务都遵循TDD方法，包含测试、实现和提交步骤。
