# DeepWiki Analyzer

<div align="center">

📚 **智能代码仓库分析工具**

自动将 Gitee 公开代码仓库整理为结构化的技术文档

[![Node.js](https://img.shields.io/badge/Node.js->=18.0.0-green.svg)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4+-blue.svg)](https://vuejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com/)
[![LangChain](https://img.shields.io/badge/LangChain-0.3+-orange.svg)](https://js.langchain.com/)

</div>

---

## ✨ 功能特性

- 🔍 **自动代码获取** - 输入 Gitee 仓库 URL，自动 Clone 并分析代码
- 📊 **结构化文档输出** - 生成完整的 Markdown 技术文档
- 🤖 **AI 驱动分析** - 基于 LangChain + OpenAI Compatible API
- ⚡ **异步处理** - 后台分析，实时进度反馈
- 🎨 **Web 界面** - Vue 3 SPA，支持预览和下载

### 📝 生成的文档内容

| 章节                   | 描述                                       |
| ---------------------- | ------------------------------------------ |
| 系统目录结构分析       | 目录层级、文件组织方式、mermaid 结构图     |
| 系统技术架构分析       | 技术栈、框架依赖、架构模式、mermaid 架构图 |
| 开发环境和运行环境分析 | 依赖版本、环境配置、启动命令               |
| 系统功能模块讲解       | 核心模块功能说明、mermaid 流程图           |
| 数据库表结构和表关系   | 表结构、字段说明、mermaid ER 图            |
| 常见答辩问题及答案     | 针对项目的 FAQ                             |

---

## 🛠️ 技术栈

| 层级 | 技术                                                    |
| ---- | ------------------------------------------------------- |
| 前端 | Vue 3 + Vite + marked + highlight.js                    |
| 后端 | Express + LangChain                                     |
| AI   | OpenAI Compatible API (支持 OpenAI/DeepSeek/通义千问等) |
| 工具 | simple-git (仓库克隆)                                   |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- Git

### 安装步骤

```bash
# 1. 进入项目目录
cd RepoWiki

# 2. 安装后端依赖
npm install

# 3. 安装前端依赖
cd client && npm install && cd ..

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写您的 API Key
```

### 配置说明

编辑 `.env` 文件：

```env
# OpenAI API 配置
OPENAI_API_KEY=your-api-key-here

# API 基础 URL（根据服务商选择）
# OpenAI:     https://api.openai.com/v1
# DeepSeek:   https://api.deepseek.com/v1
# 通义千问:    https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_BASE_URL=https://api.openai.com/v1

# 模型名称
# OpenAI:     gpt-4o, gpt-4o-mini
# DeepSeek:   deepseek-chat, deepseek-coder
# 通义千问:    qwen-turbo, qwen-plus, qwen-max
MODEL_NAME=gpt-4o-mini

# 服务端口
PORT=3000
```

### 运行项目

```bash
# 开发模式（前端 + 后端同时启动）
npm run dev

# 或者分别启动
npm run dev:server  # 后端服务 (端口 3000)
npm run dev:client  # 前端开发服务器 (端口 5173)

# 生产模式
npm run build       # 构建前端
npm start           # 启动后端服务
```

访问 **http://localhost:3000** 使用 Web 界面。

---

## 📡 API 接口

| 接口                    | 方法 | 说明         | 请求体/响应                              |
| ----------------------- | ---- | ------------ | ---------------------------------------- |
| `/api/analyze`          | POST | 提交分析任务 | `{repoUrl: string}` → `{taskId: string}` |
| `/api/status/:taskId`   | GET  | 查询任务状态 | → `{status, progress, stage, ...}`       |
| `/api/result/:taskId`   | GET  | 获取分析结果 | → `{content: string}`                    |
| `/api/download/:taskId` | GET  | 下载 MD 文件 | → 文件流                                 |
| `/api/stats`            | GET  | 获取任务统计 | → `{stats: {...}}`                       |

---

## 📁 项目结构

```
RepoWiki/
├── server/                     # 后端代码
│   ├── index.js               # Express 服务入口
│   ├── routes/
│   │   └── analyze.js         # API 路由
│   ├── services/
│   │   ├── gitService.js      # Git 仓库克隆服务
│   │   ├── analyzerService.js # 分析引擎核心
│   │   └── taskManager.js     # 任务管理服务
│   ├── prompts/
│   │   └── index.js           # Prompt 模板
│   └── utils/
│       ├── config.js          # 配置加载
│       └── llm.js             # LLM 工具封装
├── client/                     # 前端代码
│   ├── src/
│   │   ├── App.vue            # 根组件
│   │   ├── main.js            # 入口文件
│   │   ├── services/
│   │   │   └── api.js         # API 调用
│   │   └── styles/
│   │       └── main.css       # 全局样式
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env                        # 环境配置
├── .env.example               # 环境配置模板
├── package.json               # 后端依赖
└── README.md
```

---

## 🔧 开发说明

### 分析流程

```
用户输入 URL → 克隆仓库 → 收集文件信息
     ↓
目录分析 → 架构分析 → 环境分析 → 模块分析 → 数据库分析 → 答辩问题生成
     ↓
整合文档 → 返回结果
```

### 自定义 Prompt

可在 `server/prompts/index.js` 中修改各分析阶段的 Prompt 模板。

---

## 📄 License

MIT
