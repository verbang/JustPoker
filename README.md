# JustPoker - 在线德州扑克平台

一个面向好友的在线德州扑克网页平台，支持最多10人同时在线对战。

## 技术栈

- **前端**: Vue.js 3 + TypeScript + Vite
- **后端**: Node.js + Express + Socket.io
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel (前端) + Render (后端)

## 快速开始

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装客户端依赖
cd client && npm install

# 安装服务端依赖
cd ../server && npm install
```

### 开发模式

```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
npm run dev:client  # 前端 http://localhost:5173
npm run dev:server  # 后端 http://localhost:3000
```

### 构建

```bash
# 构建前端
cd client && npm run build

# 构建后端
cd ../server && npm run build
```

### 测试

```bash
# 运行后端测试
cd server && npm test
```

## 项目结构

```
justpoker/
├── client/                     # 前端 Vue.js 项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/           # 游戏组件
│   │   │   │   ├── GameTable.vue       # 游戏桌面（第一视角布局）
│   │   │   │   ├── PlayerSeat.vue      # 玩家座位（含表情动画、牌型显示）
│   │   │   │   ├── CommunityCards.vue   # 公共牌（花色着色）
│   │   │   │   ├── ActionPanel.vue     # 操作面板（弃牌/过牌/跟注/加注/全下）
│   │   │   │   ├── EmojiPanel.vue      # 表情选择面板
│   │   │   │   ├── Scoreboard.vue      # 比分板
│   │   │   │   ├── SeatSelection.vue   # 座位选择（圆桌布局）
│   │   │   │   └── HandDisplay.vue     # 手牌牌型提示
│   │   │   ├── home/           # 首页组件
│   │   │   └── common/         # 通用组件
│   │   ├── views/              # 页面视图
│   │   ├── stores/             # 状态管理 (Pinia)
│   │   ├── services/           # API 和 Socket 服务
│   │   └── utils/
│   │       ├── sounds.ts       # 音效管理
│   │       └── handEvaluator.ts # 前端牌型评估器
│   └── public/                 # 静态资源
│
├── server/                     # 后端 Node.js 项目
│   ├── src/
│   │   ├── modules/
│   │   │   ├── game/           # 游戏引擎
│   │   │   │   ├── game.engine.ts      # 德州扑克引擎
│   │   │   │   ├── deck.ts             # 牌组管理
│   │   │   │   ├── hand-evaluator.ts   # 牌型判断
│   │   │   │   └── pot-calculator.ts   # 底池计算
│   │   │   ├── room/           # 房间管理
│   │   │   │   ├── room.manager.ts     # 房间管理器
│   │   │   │   ├── room.service.ts     # 房间服务层
│   │   │   │   └── room.controller.ts  # REST API
│   │   │   └── user/           # 用户管理
│   │   ├── services/
│   │   │   ├── socket.service.ts  # Socket.io 服务（集成 GameEngine）
│   │   │   └── database.service.ts # Supabase 客户端
│   │   └── __tests__/          # 51 个测试用例
│   └── package.json
│
├── shared/                     # 前后端共享代码
│   ├── types/                  # TypeScript 类型定义
│   └── constants/              # 常量定义
│
└── docs/                       # 项目文档
    └── superpowers/specs/      # 设计文档
```

## 核心功能

- ✅ 完整的德州扑克规则（弃牌/过牌/跟注/加注/全下）
- ✅ 好友间房间系统（房间号/邀请链接）
- ✅ 实时游戏交互（Socket.io）
- ✅ 表情系统（12个预设表情，头顶漂浮动画，冷却机制）
- ✅ 用户昵称系统
- ✅ 筹码管理系统（100/200/500 档次，重新买入）
- ✅ 打赏功能（2/5/10/20/50）
- ✅ 音效系统（10个音效：游戏开始、发牌、下注、加注、全下、弃牌、胜利、轮到行动、按钮、离开）
- ✅ 战绩统计
- ✅ 第一视角牌桌布局（当前玩家固定底部）
- ✅ 手牌牌型实时提示（翻牌后显示当前最佳牌型）
- ✅ 花色颜色区分（红桃/方块红色，黑桃/梅花黑色）
- ✅ 庄位/大小盲位标识（D/SB/BB 徽章）
- ✅ 自动开始（2人入座后自动开局）
- ✅ 圆桌座位选择界面

## 环境变量

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

必要的环境变量：
- `SUPABASE_URL` - Supabase 项目 URL
- `SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `PORT` - 服务器端口（默认 3000）
- `CORS_ORIGIN` - 允许的跨域来源

## 部署

详见 `docs/superpowers/specs/2026-05-26-justpoker-design.md` 中的部署架构章节。

---

## ⚠️ Git 代理配置说明

**当前项目已配置 Git 代理，以确保能够正常连接 GitHub。**

如果你在 `git push` 或 `git pull` 时遇到连接失败问题，请检查并配置 Git 代理：

### 查看当前代理配置

```bash
git config --global --list | grep -i proxy
```

### 配置代理（如果未配置）

```bash
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

### 取消代理配置（如果不需要）

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

**当前配置的代理地址：** `http://127.0.0.1:7897`

> 请根据你的实际代理地址修改上述命令中的 `127.0.0.1:7897`。

---

## 开发说明

### 本地开发

后端支持**无 Supabase 运行**（内存存储），本地开发无需配置数据库。

```bash
# 启动前后端
npm run dev

# 或分别启动
npm run dev:client  # 前端 http://localhost:5173
npm run dev:server  # 后端 http://localhost:3000
```

### 关键设计决策

1. **GameEngine 集成在 SocketService 中** — 每个房间维护独立的 GameEngine 实例和 GameState，游戏状态通过 Socket 广播
2. **前端牌型评估器** — `client/src/utils/handEvaluator.ts` 复制了服务端 `HandEvaluator` 的核心逻辑，用于实时显示当前最佳牌型
3. **第一视角布局** — `GameTable` 重排玩家数组使当前玩家始终在底部，其他玩家按顺时针相对位置排列
4. **房主自动落座** — `RoomManager.createRoom` 自动调用 `selectSeat(hostId, 1)`
5. **表情冷却** — 前端维护时间戳数组，5秒内发5个才触发10秒冷却

### 测试

```bash
# 后端 51 个测试用例
cd server && npm test
```

### 路径别名

- 后端 `@shared/*` → `../shared/*`（通过 `tsconfig-paths` 解析）
- 前端 `@/*` → `src/*`（通过 Vite 配置）

---

## 许可证

MIT
