# JustPoker

一个支持多人在线的扑克游戏平台，包含德扑（Texas Hold'em）和抓兔（Catch Middle）两种游戏模式。

## 游戏模式

### 德扑（Texas Hold'em）

经典德州扑克，2-10 人对局：

- 标准 52 张牌，Dealer/Button/盲注自动轮转
- 四条下注街：Preflop → Flop → Turn → River
- 完整的 All-in 与边池（Side Pot）计算
- 最小加注步长 5 筹码，不完整 All-in 加注锁定
- 摊牌时自动评估最佳牌型（从 7 张中选 5 张）
- 弃牌胜出后，胜者可在 30 秒内选择是否亮牌

### 抓兔（Catch Middle）

德州扑克变种，3-4 人对局，5 轮定胜负：

- 54 张牌（含大小王作为万能牌）
- 每轮发 5 张手牌，玩家选 2 张与公共牌组合成 3 张牌型
- 第 4 轮公共牌暗发（盲牌），第 5 轮自动结算剩余手牌
- 结算规则：最大牌型为"头家"，最小为"尾家"，中间玩家需向两家同时赔付
- 炸弹（三条）翻倍结算，多人持炸弹时倍率叠加

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue.js 3 + TypeScript + Vite + Pinia |
| 后端 | Node.js + Express + Socket.io |
| 数据库 | Supabase（PostgreSQL），本地开发自动降级为内存存储 |
| 测试 | Jest（51 个后端测试用例） |

## 项目结构

```
justpoker/
├── client/                # Vue.js 前端
│   └── src/
│       ├── components/    # 组件（game/ home/ common/）
│       ├── stores/        # Pinia 状态管理
│       ├── services/      # API 和 Socket 服务
│       ├── utils/         # 工具函数（音效、牌型评估）
│       └── views/         # 页面视图
├── server/                # Express 后端
│   └── src/
│       ├── modules/
│       │   ├── game/          # 德扑引擎（牌组、牌型评估、底池计算）
│       │   ├── catch-mid/     # 抓兔引擎（牌组、牌型评估、结算）
│       │   └── room/          # 房间管理（创建、加入、清理）
│       └── services/          # Socket 服务、数据库服务
├── shared/                # 前后端共享
│   ├── types/             # TypeScript 类型定义
│   ├── constants/         # 常量（Socket 事件、游戏参数）
│   └── utils/             # 共享工具（牌型评估）
├── gamerule.md            # 游戏规则文档
├── deployment.md          # 部署文档
└── switch-env.bat         # 环境切换脚本
```

## 本地开发

### 环境要求

- Node.js 18+
- npm

### 启动

```bash
# 进入项目目录
cd justpoker

# 安装依赖
cd client && npm install
cd ../server && npm install
cd ..

# 同时启动前后端
npm run dev
```

前端默认运行在 `http://localhost:5173`，后端默认运行在 `http://localhost:3000`。

### 其他命令

```bash
npm run dev:client    # 仅启动前端
npm run dev:server    # 仅启动后端
npm test              # 运行后端测试（Jest）
npm run build         # 构建前端
```

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

### 环境切换

运行 `switch-env.bat` 可在本地开发和线上环境之间切换配置：

- **local**：连接 localhost
- **prod**：连接 Vercel + Render

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


## 核心特性

- **房间系统**：两位数房间号（10-99），支持密码房间，房主离开自动转移，空房间自动清理
- **断线重连**：30 秒重连窗口，行动计时器自动暂停/恢复，重连后完整恢复游戏状态
- **音效系统**：11 种音效（发牌、下注、加注、全下、弃牌、胜利等）
- **表情互动**：12 种表情动画，带冷却和频率限制
- **响应式布局**：适配横屏/竖屏，支持移动端触控操作
- **实时通信**：Socket.io 双向通信，支持多标签页检测

## 测试

后端包含 10 个测试文件，覆盖：

- 牌组操作（洗牌、发牌）
- 牌型评估（德扑 10 种牌型 + 抓兔 7 种牌型）
- 底池计算（主池、边池）
- 游戏引擎完整流程
- 房间管理与断线重连

```bash
cd server && npm test
```

## 音效

https://freesound.org/
https://www.tosound.com/


## 文档

- [游戏规则](justpoker/gamerule.md) — 德扑和抓兔的完整规则说明
- [部署文档](justpoker/deployment.md) — 架构、环境变量、部署流程
