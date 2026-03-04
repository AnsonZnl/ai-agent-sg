<template>
  <div class="app">
    <!-- 头部 -->
    <header class="header">
      <div class="container">
        <div class="header-content">
          <h1 class="logo">
            <span class="logo-icon">📚</span>
            DeepWiki Analyzer
          </h1>
          <p class="subtitle">智能代码仓库分析工具 - 自动生成技术文档</p>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="main">
      <div class="container">
        <!-- 输入区域 -->
        <section v-if="!taskId" class="input-section">
          <div class="card">
            <h2 class="section-title">输入仓库地址</h2>
            <p class="section-desc">
              输入 Gitee 公开仓库地址，AI 将自动分析代码并生成完整的技术文档
            </p>
            <div class="input-group">
              <input
                v-model="repoUrl"
                type="text"
                class="input"
                placeholder="https://gitee.com/用户名/仓库名"
                :disabled="isLoading"
                @keyup.enter="handleAnalyze"
              />
              <button
                class="btn btn-primary"
                :disabled="!repoUrl || isLoading"
                @click="handleAnalyze"
              >
                {{ isLoading ? "提交中..." : "开始分析" }}
              </button>
            </div>
            <div v-if="error" class="error-message">
              {{ error }}
            </div>
          </div>

          <!-- 使用说明 -->
          <div class="card features">
            <h3>生成的文档包含</h3>
            <ul class="feature-list">
              <li>📁 系统目录结构分析</li>
              <li>🏗️ 系统技术架构分析（含架构图）</li>
              <li>⚙️ 开发环境和运行环境分析</li>
              <li>📦 功能模块讲解（含流程图）</li>
              <li>🗄️ 数据库表结构和表关系（含 ER 图）</li>
              <li>❓ 常见答辩问题及答案</li>
            </ul>
          </div>
        </section>

        <!-- 进度区域 -->
        <section v-else-if="status !== 'completed'" class="progress-section">
          <div class="card">
            <h2 class="section-title">正在分析</h2>
            <p class="repo-name" v-if="taskInfo.repoName">
              {{ taskInfo.repoName }}
            </p>

            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${taskInfo.progress}%` }"
              ></div>
            </div>

            <div class="progress-info">
              <span class="progress-percent">{{ taskInfo.progress }}%</span>
              <span class="progress-stage">{{
                taskInfo.stageDescription || "准备中..."
              }}</span>
            </div>

            <div v-if="status === 'failed'" class="error-message">
              分析失败: {{ taskInfo.error }}
            </div>

            <div class="action-buttons">
              <button class="btn btn-secondary" @click="handleReset">
                重新开始
              </button>
            </div>
          </div>
        </section>

        <!-- 结果区域 -->
        <section v-else class="result-section">
          <div class="card result-header">
            <div class="result-title">
              <h2 class="section-title">分析完成</h2>
              <p class="repo-name" v-if="taskInfo.repoName">
                {{ taskInfo.repoName }}
              </p>
            </div>
            <div class="action-buttons">
              <a :href="downloadUrl" class="btn btn-success" download>
                📥 下载 MD
              </a>
              <button
                class="btn btn-primary"
                @click="handleDownloadPdf"
                :disabled="isPdfLoading"
              >
                {{ isPdfLoading ? "生成中..." : "📄 下载 PDF" }}
              </button>
              <button class="btn btn-secondary" @click="handleReset">
                分析新仓库
              </button>
            </div>
          </div>

          <div class="card">
            <div class="markdown-content" v-html="renderedContent"></div>
          </div>
        </section>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="container">
        <p>DeepWiki Analyzer - 由 AI 驱动的代码分析工具</p>
      </div>
    </footer>
  </div>
</template>

<script>
/**
 * DeepWiki Analyzer 前端主组件
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 描述: 实现 Markdown 预览、Mermaid 图表渲染和文件下载功能
 */
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from "vue";
import { marked } from "marked";
import hljs from "highlight.js";
import mermaid from "mermaid";
import "highlight.js/styles/github-dark.css";
import {
  submitAnalyze,
  getTaskStatus,
  getAnalyzeResult,
  getDownloadUrl,
  getPdfUrl,
} from "./services/api.js";

// Mermaid 初始化配置
mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
  er: {
    useMaxWidth: true,
  },
});

// 用于生成唯一 Mermaid 图表 ID
let mermaidId = 0;

// 配置 marked - 跳过 mermaid 代码块的高亮处理
marked.setOptions({
  highlight: function (code, lang) {
    // mermaid 代码块不做语法高亮，保留原样
    if (lang === "mermaid") {
      return code;
    }
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {
        console.error(e);
      }
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

export default {
  name: "App",
  setup() {
    const repoUrl = ref("");
    const taskId = ref("");
    const status = ref("");
    const isLoading = ref(false);
    const error = ref("");
    const taskInfo = ref({
      progress: 0,
      stageDescription: "",
      repoName: "",
      error: "",
    });
    const result = ref("");
    const isPdfLoading = ref(false);
    let pollTimer = null;

    // 下载链接
    const downloadUrl = computed(() => {
      return taskId.value ? getDownloadUrl(taskId.value) : "";
    });

    // PDF 下载链接
    const pdfUrl = computed(() => {
      return taskId.value ? getPdfUrl(taskId.value) : "";
    });

    /**
     * 渲染 Mermaid 图表
     * 将页面中的 mermaid 代码块转换为 SVG 图形
     */
    const renderMermaidDiagrams = async () => {
      await nextTick();

      // 查找所有 mermaid 代码块
      const mermaidBlocks = document.querySelectorAll("code.language-mermaid");

      for (const block of mermaidBlocks) {
        try {
          const code = block.textContent;
          const id = `mermaid-${++mermaidId}`;

          // 使用 mermaid 渲染为 SVG
          const { svg } = await mermaid.render(id, code);

          // 创建容器并替换原代码块
          const container = document.createElement("div");
          container.className = "mermaid-container";
          container.innerHTML = svg;

          const pre = block.parentElement;
          if (pre && pre.tagName === "PRE") {
            pre.replaceWith(container);
          }
        } catch (e) {
          console.error("Mermaid 渲染失败:", e);
          // 保留原始代码块，显示错误信息
          block.parentElement.setAttribute("data-error", "图表渲染失败");
        }
      }
    };

    // 渲染后的内容
    const renderedContent = computed(() => {
      if (!result.value) return "";
      return marked(result.value);
    });

    // 监听渲染内容变化，触发 Mermaid 渲染
    watch(renderedContent, () => {
      nextTick(() => {
        renderMermaidDiagrams();
      });
    });

    // 提交分析
    const handleAnalyze = async () => {
      if (!repoUrl.value || isLoading.value) return;

      error.value = "";
      isLoading.value = true;

      try {
        const data = await submitAnalyze(repoUrl.value);
        taskId.value = data.taskId;
        status.value = "pending";
        taskInfo.value = {
          progress: 0,
          stageDescription: "任务已创建",
          repoName: "",
          error: "",
        };

        // 开始轮询状态
        startPolling();
      } catch (e) {
        error.value = e.message;
      } finally {
        isLoading.value = false;
      }
    };

    // 开始轮询
    const startPolling = () => {
      stopPolling();
      pollTimer = setInterval(async () => {
        try {
          const data = await getTaskStatus(taskId.value);
          status.value = data.status;
          taskInfo.value = {
            progress: data.progress,
            stageDescription: data.stageDescription,
            repoName: data.repoName,
            error: data.error,
          };

          // 完成时获取结果
          if (data.status === "completed") {
            stopPolling();
            await fetchResult();
          } else if (data.status === "failed") {
            stopPolling();
          }
        } catch (e) {
          console.error("轮询状态失败:", e);
        }
      }, 2000);
    };

    // 停止轮询
    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    // 获取结果
    const fetchResult = async () => {
      try {
        const data = await getAnalyzeResult(taskId.value);
        result.value = data.content;
      } catch (e) {
        console.error("获取结果失败:", e);
      }
    };

    // 重置
    const handleReset = () => {
      stopPolling();
      taskId.value = "";
      status.value = "";
      repoUrl.value = "";
      result.value = "";
      error.value = "";
      isPdfLoading.value = false;
      taskInfo.value = {
        progress: 0,
        stageDescription: "",
        repoName: "",
        error: "",
      };
    };

    /**
     * 处理 PDF 下载
     * 调用后端 API 生成并下载 PDF 文件
     */
    const handleDownloadPdf = async () => {
      if (!taskId.value || isPdfLoading.value) return;

      isPdfLoading.value = true;

      try {
        // 直接打开 PDF 下载链接
        window.open(pdfUrl.value, "_blank");
      } catch (e) {
        console.error("PDF 下载失败:", e);
        error.value = "PDF 下载失败，请稍后重试";
      } finally {
        // 延迟重置加载状态，给用户反馈时间
        setTimeout(() => {
          isPdfLoading.value = false;
        }, 1000);
      }
    };

    // 组件卸载时清理
    onUnmounted(() => {
      stopPolling();
    });

    return {
      repoUrl,
      taskId,
      status,
      isLoading,
      isPdfLoading,
      error,
      taskInfo,
      result,
      downloadUrl,
      pdfUrl,
      renderedContent,
      handleAnalyze,
      handleReset,
      handleDownloadPdf,
    };
  },
};
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.header {
  background: linear-gradient(135deg, var(--primary-color) 0%, #818cf8 100%);
  color: white;
  padding: 40px 0;
}

.header-content {
  text-align: center;
}

.logo {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.logo-icon {
  font-size: 36px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
}

/* 主内容 */
.main {
  flex: 1;
  padding: 40px 0;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-desc {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.repo-name {
  color: var(--primary-color);
  font-weight: 500;
  margin-bottom: 16px;
}

/* 输入区域 */
.input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.input-group .input {
  flex: 1;
}

.error-message {
  color: var(--error-color);
  font-size: 14px;
  margin-top: 8px;
}

/* 功能列表 */
.features {
  margin-top: 20px;
}

.features h3 {
  font-size: 18px;
  margin-bottom: 16px;
}

.feature-list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.feature-list li {
  padding: 12px 16px;
  background-color: var(--bg-color);
  border-radius: 8px;
  font-size: 14px;
}

/* 进度区域 */
.progress-section .card {
  max-width: 600px;
  margin: 0 auto;
}

.progress-bar {
  margin: 20px 0 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.progress-percent {
  font-weight: 600;
  color: var(--primary-color);
}

.progress-stage {
  color: var(--text-secondary);
}

/* 结果区域 */
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 页脚 */
.footer {
  background-color: var(--card-bg);
  border-top: 1px solid var(--border-color);
  padding: 20px 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Mermaid 图表容器 */
:deep(.mermaid-container) {
  margin: 16px 0;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 8px;
  overflow-x: auto;
  text-align: center;
}

:deep(.mermaid-container svg) {
  max-width: 100%;
  height: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .header {
    padding: 30px 0;
  }

  .logo {
    font-size: 24px;
  }

  .logo-icon {
    font-size: 28px;
  }

  .subtitle {
    font-size: 14px;
  }

  .main {
    padding: 24px 0;
  }

  .section-title {
    font-size: 20px;
  }

  .input-group {
    flex-direction: column;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-buttons {
    width: 100%;
  }

  .action-buttons .btn {
    flex: 1;
  }
}
</style>
