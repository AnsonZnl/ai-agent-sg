import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

export function createLLM() {
  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
    modelName: process.env.MODEL_NAME || 'qwen-plus',
    temperature: 0.3,
    maxTokens: 8000,
  })
}

const SYSTEM_PROMPT = `你是一位专业的技术文档工程师，擅长分析代码仓库并生成高质量的技术 Wiki 文档。
请使用中文输出，格式为 Markdown，图表使用 Mermaid 语法。
要求：
1. 结构清晰，层次分明
2. 流程图、架构图使用 Mermaid 的 graph TD 或 flowchart TD 语法
3. 时序图使用 Mermaid 的 sequenceDiagram 语法
4. 所有 Mermaid 代码块必须用 \`\`\`mermaid 开头
5. 内容专业、准确，基于实际代码分析`

export async function analyzeRepo(
  repoUrl: string,
  repoName: string,
  fileTree: string,
  fileContents: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const llm = createLLM()

  const prompt = `请分析以下 Git 仓库并生成完整的技术 Wiki 文档。

**仓库信息：**
- URL: ${repoUrl}
- 名称: ${repoName}

**文件目录结构：**
\`\`\`
${fileTree.slice(0, 3000)}
\`\`\`

**核心文件内容：**
${fileContents.slice(0, 15000)}

---

请生成包含以下章节的完整 Wiki 文档：

# ${repoName} - 技术 Wiki

## 1. 项目概述
简介、背景、用途

## 2. 技术栈
列出所用技术、框架、语言、依赖库

## 3. 系统架构
整体架构描述 + Mermaid 架构图（graph TD）

## 4. 核心模块解析
逐一介绍各核心模块的职责、实现方式

## 5. 关键业务流程
主要业务流程说明 + Mermaid 流程图（flowchart TD）

## 6. 数据流 / 时序图
关键交互时序 + Mermaid 时序图（sequenceDiagram）

## 7. 目录结构说明
各目录职责说明

## 8. 快速上手
如何运行、配置、部署

## 9. 扩展与贡献
如何扩展、二次开发建议`

  const stream = await llm.stream([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(prompt),
  ])

  let fullContent = ''
  for await (const chunk of stream) {
    const text = typeof chunk.content === 'string' ? chunk.content : ''
    if (text) {
      fullContent += text
      onChunk(text)
    }
  }

  return fullContent
}
