# 实现任务 - DeepWiki 代码仓库分析工具

## 任务概览

- 总任务数: 15
- 任务类别: 开发, 配置
- 更新日期: 2026-03-04

---

## 开发任务

### 环境搭建与配置

- [x] 1. 初始化项目结构和依赖配置

  - 创建项目根目录结构
  - 初始化 server/ 和 client/ 目录
  - 创建 .env.example 配置模板
  - 创建 package.json 定义项目依赖
  - 创建 README.md 项目说明文档
  - _需求: 需求 10 配置管理_
  - _状态: 已完成_

- [x] 2. 实现环境配置加载和验证
  - 创建环境变量加载模块
  - 验证必要配置项 (OPENAI_API_KEY, OPENAI_BASE_URL, MODEL_NAME)
  - 配置缺失时提供明确错误提示
  - _需求: 需求 10 配置管理_
  - _状态: 已完成_

### 后端开发

- [x] 3. 实现 LLM 工具封装模块

  - 封装 LangChain ChatOpenAI 客户端
  - 实现统一的 LLM 调用接口
  - 支持流式和非流式响应
  - 错误处理和重试机制
  - _需求: 需求 3 技术架构分析_
  - _状态: 已完成_

- [x] 4. 实现 Git 仓库克隆服务

  - 使用 simple-git 实现 Clone 功能
  - 验证 Gitee URL 格式
  - 创建临时目录存放代码
  - 获取仓库基本信息 (名称、描述、语言)
  - 实现临时目录清理功能
  - _需求: 需求 1 仓库代码获取_
  - _状态: 已完成_

- [x] 5. 实现文件分析和分类工具

  - 遍历目录结构
  - 跳过 node_modules、.git 等目录
  - 按文件类型分类 (代码、配置、文档等)
  - 限制单文件读取大小
  - 提取关键文件内容 (package.json, README 等)
  - _需求: 需求 2 目录结构分析_
  - _状态: 已完成_

- [x] 6. 实现 Prompt 模板模块

  - 创建目录分析 Prompt 模板
  - 创建技术架构分析 Prompt 模板
  - 创建功能模块分析 Prompt 模板 (含 mermaid 流程图生成指令)
  - 创建数据库结构分析 Prompt 模板 (含 ER 图生成指令)
  - 创建答辩问题生成 Prompt 模板
  - _需求: 需求 3-7 各分析模块_
  - _状态: 已完成_

- [x] 7. 实现分析引擎核心服务

  - 实现分阶段分析流程
  - 编排各分析阶段的 Prompt 调用
  - 实现进度回调机制
  - 整合各阶段分析结果
  - 生成最终 Markdown 文档
  - _需求: 需求 2-7 分析功能_
  - _状态: 已完成_

- [x] 8. 实现任务管理服务

  - 创建内存任务存储 (Map)
  - 实现任务状态管理 (pending/processing/completed/failed)
  - 实现进度更新机制
  - 支持并发任务处理
  - _需求: 需求 9 异步处理机制_
  - _状态: 已完成_

- [x] 9. 实现 REST API 路由

  - POST /api/analyze - 提交分析任务
  - GET /api/status/:taskId - 查询任务状态和进度
  - GET /api/result/:taskId - 获取分析结果
  - GET /api/download/:taskId - 下载 MD 文件
  - 实现请求参数验证和错误处理
  - _需求: 需求 8-9 Web 界面和异步处理_
  - _状态: 已完成_

- [x] 10. 创建 Express 服务入口
  - 配置 Express 中间件 (cors, json)
  - 注册 API 路由
  - 配置静态文件服务 (前端构建产物)
  - 启动 HTTP 服务器
  - _需求: 需求 8 Web 界面_
  - _状态: 已完成_

### 前端开发

- [x] 11. 实现 Vue 3 前端应用

  - 创建 Vue 3 + Vite 项目
  - 实现 RepoInput 组件 (URL 输入和提交)
  - 实现 ProgressPanel 组件 (进度条展示)
  - 实现 DocumentPreview 组件 (MD 预览，使用 marked + highlight.js)
  - 实现 DownloadButton 组件 (文件下载)
  - 实现 API 调用服务和轮询逻辑
  - 样式设计和响应式布局
  - _需求: 需求 8 Web 界面_
  - _状态: 已完成_

- [ ] 12. 集成 Mermaid 图表渲染

  - 安装 mermaid npm 依赖
  - 配置 Mermaid 初始化选项
  - 实现自动检测和渲染 mermaid 代码块
  - 处理渲染错误和超时
  - 支持多种图表类型 (flowchart, erDiagram, graph 等)
  - _需求: 需求 8 Web 界面_

- [ ] 13. 实现 PDF 下载功能
  - 后端：安装 Puppeteer 依赖
  - 后端：创建 PDF 生成服务 (server/services/pdfService.js)
  - 后端：实现 MD 转 HTML 并渲染 Mermaid 图表
  - 后端：添加 GET /api/pdf/:taskId 接口
  - 前端：添加 PDF 下载按钮
  - 前端：调用 PDF 下载 API
  - _需求: 需求 11 PDF 文档下载_

### 集成与测试

- [ ] 14. 更新项目依赖和配置

  - 更新 package.json 添加 mermaid 和 puppeteer 依赖
  - 更新 .env.example 添加 PDF 相关配置说明
  - 验证依赖安装正确
  - _需求: 需求 8、11_

- [ ] 15. 项目集成测试和文档完善
  - 编写启动脚本 (开发模式和生成模式)
  - 端到端功能测试
  - 完善 README.md 使用说明
  - 验证所有需求验收标准
  - 测试 PDF 下载功能
  - 测试 Mermaid 图表渲染
  - _需求: 全部需求_
