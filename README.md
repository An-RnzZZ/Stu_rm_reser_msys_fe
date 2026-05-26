# 自习室预约管理系统

基于 Vue 3 + Vite + TypeScript 构建的自习室座位预约管理平台，支持用户预约、签到签退、违规管理等功能，并提供管理员后台。

## 技术栈

| 类型 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 构建工具 | Vite 7 |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia + Vuex |
| 路由 | Vue Router 4 |
| HTTP 请求 | Axios |
| 动画 | GSAP + Three.js |
| 样式 | Sass |
| 代码规范 | ESLint + Prettier |

## 功能模块

### 用户端

- 登录 / 注册
- 首页概览
- 座位预约
- 我的预约（查看 / 取消）
- 签到 / 签退
- 违规记录查看

### 管理端

- 数据仪表盘
- 用户管理
- 预约管理
- 座位管理
- 建筑 / 区域管理
- 签到记录
- 违规管理
- 申诉处理
- 操作日志

## 快速开始

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- npm >= 9

### 安装与运行

```bash
# 进入项目目录
cd stu-web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 环境变量

项目在 `stu-web/` 目录下提供了 `.env.development` 和 `.env.production` 文件，用于配置不同环境的 API 地址等变量。

## 项目结构

```
stu-web/
├── public/                 # 静态资源
├── src/
│   ├── api/                # API 接口封装
│   ├── assets/             # 资源文件（图片、样式等）
│   ├── router/             # 路由配置
│   ├── store/              # Vuex 状态管理
│   ├── stores/             # Pinia 状态管理
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   ├── views/              # 页面组件
│   │   ├── admin/          # 管理后台页面
│   │   └── ...             # 用户端页面
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── .env.development        # 开发环境变量
├── .env.production         # 生产环境变量
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```
