# JustPoker 开发规范

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue.js 3 + TypeScript + Vite + Pinia |
| 后端 | Node.js + Express + Socket.io |
| 数据库 | Supabase (PostgreSQL)，本地开发使用内存存储 |
| 测试 | Jest (后端 51 个用例) |

## 项目结构

```
├── client/          # Vue.js 前端
├── server/          # Express 后端
├── shared/          # 前后端共享类型和常量（不要随意修改）
└── switch-env.bat   # 环境切换脚本（local / prod）
```

## 代码约定

### 语言

- 代码注释、commit message、文档使用**中文**
- 变量名、函数名、类型名使用**英文**（遵循 camelCase / PascalCase）
- 技术术语保留英文（如 Socket.io、TypeScript、Pinia）

### TypeScript

- **严禁使用 `any` 类型** — 所有代码必须使用具体类型或联合类型，禁止使用 `any` 逃避类型检查
- 前端 strict 模式，后端同理
- 共享类型定义在 `shared/types/`，常量在 `shared/constants/`
- 后端引用共享代码使用相对路径 `../../../shared/...`，不使用 `@shared/*` 别名

### Vue.js

- 使用 `<script setup lang="ts">` 语法
- 状态管理使用 Pinia（stores 在 `client/src/stores/`）
- 组件命名：游戏组件 `PascalCase.vue`，放在 `components/game/`；首页组件放 `components/home/`

### 后端模块

- 游戏引擎：`server/src/modules/game/`（deck、hand-evaluator、pot-calculator、game.engine）
- 房间管理：`server/src/modules/room/`（room.manager、room.service、room.controller）
- Socket 服务集成在 `server/src/services/socket.service.ts`，每个房间维护独立的 GameEngine 实例

### 测试

- 测试文件放在对应模块的 `__tests__/` 目录下
- 命名：`<模块名>.test.ts`
- 运行：`cd server && npm test`

### 开发流程

1. **实现思路先行** — 在编写任何代码之前，必须先简要说明实现思路，包括：采用什么方案、涉及哪些文件、可能的影响范围
2. **核心逻辑必须有测试** — 为游戏引擎、牌型评估、筹码计算、房间管理等核心逻辑编写单元测试，确保业务正确性
3. **主动暴露技术问题** — 遇到技术债或架构冲突时，必须主动说明问题，并提供至少两种解决方案供选择

## 环境配置

使用 `switch-env.bat` 切换环境：

- **local**：`client/.env` → localhost:3000，`server/.env` → CORS_ORIGIN=localhost:5173
- **prod**：`client/.env` → justpoker-api.onrender.com，`server/.env` → CORS_ORIGIN=just-poker.vercel.app

## 线上地址

| 服务 | 地址 |
|------|------|
| 前端 (Vercel) | https://just-poker.vercel.app |
| 后端 (Render) | https://justpoker-api.onrender.com |

## 注意事项

1. **不要硬编码线上地址** — 客户端 API/WebSocket 地址通过 `import.meta.env.VITE_API_BASE_URL` 和 `VITE_WS_URL` 读取
2. **Socket 事件名称** — 统一定义在 `shared/constants/socket.constants.ts`，新增事件必须在此处注册
3. **游戏状态** — GameEngine 集成在 SocketService 中，不要在 controller 中直接操作游戏逻辑
4. **Supabase** — 本地开发不需要配置 Supabase，后端自动降级为内存存储
5. **中文编码兼容** — 创建或修改文件时必须确保使用 UTF-8 编码保存，避免中文乱码。涉及中文内容的文件（如 `.vue`、`.ts`、`.md`、`.bat`、`.ps1`）写入时显式指定编码
6. **改动前自我审查** — 新增或修改代码后，必须自我审查：确认改动不会影响原本正常的 UI 显示或功能实现。涉及 UI 组件时，检查样式、布局、交互是否被波及；涉及业务逻辑时，检查上下游调用链是否受影响
7. **游戏规则文档同步** — 任何涉及游戏规则、玩法流程、下注/加注/全下、底池结算、牌型比较、房间开局、座位/Button/盲注轮转、行动超时等改动，必须同步更新 `gamerule.md`

## 部署

部署相关事宜参考 [deployment.md](./deployment.md)，包含架构概览、环境变量、重新部署流程等内容。

有部署相关的重要信息或变更时，必须同步更新 `deployment.md` 文件。
