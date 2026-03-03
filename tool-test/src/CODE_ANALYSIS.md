# tool-test 代码解析文档

作者: JoyCode  
日期: 2026-02-28  
描述: 本文档对 `tool-test/src` 目录下的 LangChain 示例代码进行详细解析，涵盖基础模型调用与进阶工具使用场景。

---

## 1. hello-langchain.mjs

### 1.1 功能简介

这是一个 **LangChain "Hello World"** 级别的基础示例。它的主要作用是验证环境配置（API Key、Base URL）是否正确，并展示最简单的模型调用流程。

### 1.2 核心代码流程

1.  **环境加载**:

    ```javascript
    import dotenv from "dotenv";
    dotenv.config();
    ```

    加载项目根目录下的 `.env` 文件，获取 `OPENAI_API_KEY` 等敏感配置。

2.  **模型初始化**:

    ```javascript
    const model = new ChatOpenAI({
      modelName: process.env.MODEL_NAME || "qwen-coder-turbo",
      // ...配置项
    });
    ```

    初始化 `ChatOpenAI` 客户端。这里虽然类名是 OpenAI，但通过配置 `baseURL`，可以兼容任何支持 OpenAI 接口规范的模型服务（如 DeepSeek, Qwen 等）。

3.  **直接调用**:
    ```javascript
    const response = await model.invoke("介绍下自己");
    ```
    `invoke` 是 LangChain 中最通用的调用方法，直接发送字符串提示词并等待结果。

---

## 2. tool-file-read.mjs

### 2.1 功能简介

这是一个**具备 Agent (智能体) 特性**的进阶示例。它展示了如何让大模型突破“纯文本生成”的限制，通过**调用本地工具**（Tool Calling）来与外部环境交互。

具体场景：让 AI 读取本地文件系统中的代码文件，并对其进行解释。这模拟了一个简单的“代码助手”后端逻辑。

### 2.2 关键技术点

#### A. 自定义工具定义 (`readFileTool`)

脚本使用 `@langchain/core/tools` 和 `zod` 定义了一个工具：

```javascript
const readFileTool = tool(
  async ({ filePath }) => { ... }, // 1. 工具的具体实现（Node.js fs 模块）
  {
    name: 'read_file', // 2. 工具名称
    description: '...', // 3. 工具描述（Prompt 的一部分，告诉 AI 何时使用）
    schema: z.object({ filePath: z.string() }), // 4. 参数结构定义
  }
);
```

- **Zod Schema**: 强制模型输出符合 `{ filePath: "..." }` 结构的 JSON 参数，避免格式错误。

#### B. 工具绑定 (`bindTools`)

```javascript
const modelWithTools = model.bindTools(tools);
```

这一步将工具的元数据（名称、描述、参数格式）注入到模型的上下文中，使模型“知道”自己可以使用这个工具。

#### C. 手动实现的 Agent 循环

脚本没有使用 LangChain 高层的 AgentExecutor，而是手动实现了一个 ReAct (Reasoning + Acting) 循环，逻辑更透明：

1.  **初始请求**: 用户发送 "请读取 xxx 文件"。
2.  **模型决策**: 模型分析意图，返回一个 **ToolCall** 请求（而不是普通文本），表示“我需要运行 read_file 工具，参数是 xxx”。
3.  **本地执行**:
    ```javascript
    if (response.tool_calls.length > 0) {
      // 脚本捕获 ToolCall，在本地 Node.js 环境执行 fs.readFile
      const result = await tool.invoke(toolCall.args);
    }
    ```
4.  **上下文回填**: 将工具执行结果（文件内容）封装为 `ToolMessage`，追加到对话历史中。
5.  **二次生成**: 再次调用模型。此时模型拥有了文件的真实内容，从而生成最终的代码解释。

### 2.3 总结

这个脚本通过 **Prompt Engineering**（系统提示词）+ **Function Calling**（工具调用）+ **Native Code Execution**（本地文件读取），完成了一个完整的 AI 任务闭环。
