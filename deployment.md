# JustPoker 部署文档

## 架构概览

```
用户浏览器 → Vercel (前端静态资源) → Render (后端 API + WebSocket) → Supabase (数据库)
```

| 服务 | 平台 | 地址 |
|------|------|------|
| 前端 | Vercel | https://just-poker.vercel.app |
| 后端 | Render | https://justpoker-api.onrender.com |
| 数据库 | Supabase | 项目面板中查看 |

---

## 前端 (Vercel)

- **框架**: Vue.js 3 + TypeScript + Vite
- **源码目录**: `justpoker/client/`
- **构建命令**: `npm run build`（Vercel 自动检测 Vite）
- **输出目录**: `dist`
- **关键配置**: `client/vercel.json` 中配置了 rewrites 代理 API 请求

### 注意事项

1. Vercel 不支持 WebSocket 代理，因此前端直接连接 Render 后端地址
2. 后端地址硬编码在 `client/src/services/socket.ts` 和 `client/src/services/api.ts` 中
3. 如更换后端地址，需同步修改这两个文件

---

## 后端 (Render)

- **框架**: Node.js + Express + Socket.io
- **源码目录**: `justpoker/server/`
- **构建命令**: `cd server && npm install && npm run build`
- **启动命令**: `cd server && npm start`
- **TypeScript 版本**: 锁定为 5.2.2（避免 baseUrl 弃用问题）

### 环境变量

| Key | Value | 说明 |
|-----|-------|------|
| `SUPABASE_URL` | Supabase Project URL | 数据库连接 |
| `SUPABASE_ANON_KEY` | Supabase anon key | 数据库认证 |
| `NODE_ENV` | `production` | 生产模式 |
| `PORT` | `10000` | Render 服务端口 |
| `CORS_ORIGIN` | `https://just-poker.vercel.app` | 允许的前端域名 |

### 已解决的部署问题

- **TS5101 baseUrl 弃用**: 已将所有 `@shared/*` 导入改为相对路径，移除了 `baseUrl` 和 `paths`
- **TS7016 缺少类型声明**: 已在 tsconfig.json 中设置 `noImplicitAny: false`
- **tsc-alias 依赖**: 已从 build 命令中移除，不再需要

---

## 数据库 (Supabase)

- **地址**: Supabase 控制台 → 项目 → Table Editor
- **建表脚本**: `justpoker/supabase-schema.sql`

### 表结构

| 表名 | 说明 |
|------|------|
| `rooms` | 房间信息（房间号、状态、盲注设置等） |
| `room_players` | 房间内玩家（昵称、座位、筹码、状态等） |
| `game_records` | 游戏记录（赢家、牌型、底池等） |

### 迁移记录

- `rooms.game_type`: 游戏类型字段，默认 `texas-holdem`，用于区分德州扑克和 Catch Mid 房间。生产库部署 Catch Mid 房间创建前，需要执行：

```sql
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS game_type VARCHAR(30) DEFAULT 'texas-holdem';
```

---

## 重新部署流程

### 后端更新

1. 推送代码到 GitHub `master` 分支
2. Render 会自动部署，或手动点击 **Manual Deploy** → **Deploy latest commit**

### 前端更新

1. 推送代码到 GitHub `master` 分支
2. Vercel 会自动部署，或手动点击 **Redeploy**

### 更换后端地址

1. 修改 `client/src/services/socket.ts` 中的 `backendUrl`
2. 修改 `client/src/services/api.ts` 中的 `baseURL`
3. 修改 Render 环境变量 `CORS_ORIGIN` 为新的前端地址
4. 修改 `render.yaml` 中的 `CORS_ORIGIN`

---

## 本地开发

```bash
cd justpoker
npm run dev          # 同时启动前端和后端
npm run dev:client   # 仅启动前端 (localhost:5173)
npm run dev:server   # 仅启动后端 (localhost:3000)
```

本地开发时后端 CORS 设置为 `*`，允许任意来源访问。
