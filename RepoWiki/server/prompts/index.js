/**
 * Prompt 模板模块
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 描述: 各分析阶段的 Prompt 模板定义
 */

/**
 * 目录结构分析 Prompt
 * 分析项目的目录结构和组织方式
 */
export const directoryAnalysisPrompt = `你是一位专业的代码架构分析师。请分析以下项目的目录结构，并生成详细的结构分析报告。

## 项目信息
- 项目名称: {projectName}
- 主要语言: {language}

## 目录结构
\`\`\`
{directoryTree}
\`\`\`

## 要求
1. 分析目录组织方式和设计理念
2. 识别入口文件（如 index.js、main.go、app.py 等）
3. 说明各主要目录的职责
4. 标注配置文件目录和资源文件目录
5. 使用 mermaid graph TB 生成目录结构图

## 输出格式（Markdown）

### 1. 目录结构概览
[简要描述项目的目录组织方式]

### 2. 核心目录说明
[列出主要目录及其职责]

### 3. 入口文件分析
[识别并说明入口文件]

### 4. 目录结构图
\`\`\`mermaid
graph TB
    [生成 mermaid 目录结构图]
\`\`\`

请直接输出 Markdown 内容，不要包含其他解释。`;

/**
 * 技术架构分析 Prompt
 * 识别项目的技术栈和架构模式
 */
export const architectureAnalysisPrompt = `你是一位专业的技术架构分析师。请分析以下项目的技术栈和架构设计。

## 项目信息
- 项目名称: {projectName}

## 依赖配置文件
{dependencyFiles}

## 关键代码文件
{keyFiles}

## 要求
1. 识别使用的编程语言
2. 分析使用的框架和库
3. 判断架构模式（MVC、微服务、单体应用、前后端分离等）
4. 分析技术依赖关系
5. 使用 mermaid graph TB 生成技术架构图

## 输出格式（Markdown）

### 1. 技术栈概览
[列出主要技术和版本]

### 2. 框架和库分析
[分析主要框架和核心库的使用]

### 3. 架构模式
[描述项目的架构模式和设计理念]

### 4. 技术架构图
\`\`\`mermaid
graph TB
    [生成 mermaid 技术架构图，展示各层关系]
\`\`\`

请直接输出 Markdown 内容，不要包含其他解释。`;

/**
 * 开发环境分析 Prompt
 * 分析项目的开发环境和运行环境配置
 */
export const environmentAnalysisPrompt = `你是一位专业的 DevOps 工程师。请分析以下项目的开发环境和运行环境配置。

## 项目信息
- 项目名称: {projectName}

## 配置文件内容
{configFiles}

## 环境变量示例
{envExample}

## 要求
1. 列出运行环境版本要求
2. 说明必要的开发工具
3. 解析环境变量配置
4. 提供启动命令
5. 说明数据库初始化步骤（如有）

## 输出格式（Markdown）

### 1. 运行环境要求
[列出 Node.js/Python/Java 等环境版本]

### 2. 依赖工具
[列出数据库、Redis、消息队列等依赖]

### 3. 环境变量配置
[列出需要配置的环境变量及其说明]

### 4. 安装和启动
\`\`\`bash
# 安装依赖
[安装命令]

# 开发模式启动
[启动命令]

# 生产模式启动
[生产命令]
\`\`\`

### 5. 数据库初始化
[数据库配置和初始化步骤，如无则说明]

请直接输出 Markdown 内容，不要包含其他解释。`;

/**
 * 功能模块分析 Prompt
 * 分析项目的核心功能模块
 */
export const moduleAnalysisPrompt = `你是一位专业的业务架构分析师。请分析以下项目的功能模块和业务逻辑。

## 项目信息
- 项目名称: {projectName}
- 主要语言: {language}

## 源代码结构
{sourceStructure}

## 核心代码文件
{coreFiles}

## 要求
1. 识别并分类核心功能模块
2. 描述每个模块的职责
3. 分析模块间的调用关系
4. 为核心模块生成 mermaid 流程图
5. 识别 API 接口（如有）

## 输出格式（Markdown）

### 1. 模块概览
[列出所有识别到的功能模块]

### 2. 核心模块详解

#### 模块1: [模块名称]
- **职责**: [描述]
- **关键文件**: [列出文件]
- **依赖模块**: [列出依赖]

\`\`\`mermaid
flowchart TD
    [生成该模块的业务流程图]
\`\`\`

[重复以上格式描述其他模块]

### 3. 模块依赖关系
\`\`\`mermaid
graph LR
    [生成模块间依赖关系图]
\`\`\`

### 4. API 接口列表
[如有 API，列出接口路径和说明]

请直接输出 Markdown 内容，不要包含其他解释。`;

/**
 * 数据库结构分析 Prompt
 * 分析项目的数据库表结构和关系
 */
export const databaseAnalysisPrompt = `你是一位专业的数据库架构师。请分析以下项目的数据库设计。

## 项目信息
- 项目名称: {projectName}

## 数据库相关文件
{databaseFiles}

## ORM/模型定义
{modelFiles}

## 要求
1. 解析数据库表结构
2. 说明字段含义和约束
3. 标注主键、外键、索引
4. 分析表之间的关系
5. 使用 mermaid erDiagram 生成 ER 图

## 输出格式（Markdown）

### 1. 数据库概览
[描述使用的数据库类型和整体设计]

### 2. 数据表结构

#### 表1: [表名]
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INT | PRIMARY KEY | 主键 |
| ... | ... | ... | ... |

[重复以上格式描述其他表]

### 3. 表关系说明
[描述表之间的关联关系]

### 4. ER 图
\`\`\`mermaid
erDiagram
    [生成 mermaid ER 图]
\`\`\`

### 5. 索引设计
[列出重要索引及其用途]

请直接输出 Markdown 内容，不要包含其他解释。`;

/**
 * 答辩问题生成 Prompt
 * 生成针对该项目的答辩问题和答案
 */
export const qaGenerationPrompt = `你是一位专业的项目答辩辅导专家。请根据以下项目信息生成答辩问题和参考答案。

## 项目信息
- 项目名称: {projectName}
- 技术栈: {techStack}
- 主要功能: {mainFeatures}

## 项目架构
{architecture}

## 要求
1. 生成 12-15 个答辩问题
2. 问题涵盖：技术选型、架构设计、功能实现、性能优化、安全考虑等
3. 每个问题提供详细的参考答案
4. 包含对比类问题（如"为什么选择 X 而不是 Y"）
5. 答案基于项目实际代码和技术栈

## 输出格式（Markdown）

### Q1: [问题]
**参考答案**:
[详细答案]

### Q2: [问题]
**参考答案**:
[详细答案]

[继续生成 12-15 个问题]

请直接输出 Markdown 内容，不要包含其他解释。`;

/**
 * 文档整合 Prompt
 * 整合所有分析结果生成最终文档
 */
export const documentIntegrationPrompt = `你是一位技术文档写作专家。请将以下分析内容整合为一份完整的技术分析文档。

## 项目信息
- 项目名称: {projectName}
- 仓库地址: {repoUrl}

## 分析内容
{analysisContent}

## 要求
1. 保持文档结构清晰，层次分明
2. 添加适当的过渡和总结
3. 确保格式统一、美观
4. 修正可能的格式错误
5. 添加文档元信息

## 输出格式

---
title: {projectName} 代码解析文档
author: DeepWiki Analyzer
date: {date}
---

# {projectName} 代码解析文档

## 项目简介
[基于分析内容生成项目简介]

## 目录
[自动生成目录]

[整合所有分析内容]

---

请直接输出完整的 Markdown 文档。`;

/**
 * 组装 Prompt
 * @param {string} template - 模板字符串
 * @param {Object} params - 参数对象
 * @returns {string} 组装后的 Prompt
 */
export function assemblePrompt(template, params) {
  let result = template;
  
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  }
  
  return result;
}

export default {
  directoryAnalysisPrompt,
  architectureAnalysisPrompt,
  environmentAnalysisPrompt,
  moduleAnalysisPrompt,
  databaseAnalysisPrompt,
  qaGenerationPrompt,
  documentIntegrationPrompt,
  assemblePrompt,
};