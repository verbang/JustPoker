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
├── client/                 # 前端 Vue.js 项目
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── views/          # 页面视图
│   │   ├── stores/         # 状态管理 (Pinia)
│   │   ├── services/       # API 和 Socket 服务
│   │   └── utils/          # 工具函数
│   └── public/             # 静态资源
│
├── server/                 # 后端 Node.js 项目
│   ├── src/
│   │   ├── modules/        # 功能模块
│   │   │   ├── game/       # 游戏引擎
│   │   │   ├── room/       # 房间管理
│   │   │   └── user/       # 用户管理
│   │   ├── services/       # 服务层
│   │   └── utils/          # 工具函数
│   └── __tests__/          # 测试文件
│
├── shared/                 # 前后端共享代码
│   ├── types/              # TypeScript 类型定义
│   └── constants/          # 常量定义
│
└── docs/                   # 项目文档
```

## 核心功能

- ✅ 完整的德州扑克规则
- ✅ 好友间房间系统（房间号/邀请链接）
- ✅ 实时游戏交互（Socket.io）
- ✅ 表情系统（12个预设表情）
- ✅ 用户昵称系统
- ✅ 筹码管理系统
- ✅ 打赏功能
- ✅ 音效系统
- ✅ 战绩统计

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

## 许可证

MIT
