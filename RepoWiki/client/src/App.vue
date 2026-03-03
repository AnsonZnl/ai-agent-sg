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
                📥 下载文档
              </a>
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
import { ref, computed, watch, onUnmounted } from "vue";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import {
  submitAnalyze,
  getTaskStatus,
  getAnalyzeResult,
  getDownloadUrl,
} from "./services/api.js";

// 配置 marked
marked.setOptions({
  highlight: function (code, lang) {
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
    let pollTimer = null;

    // 下载链接
    const downloadUrl = computed(() => {
      return taskId.value ? getDownloadUrl(taskId.value) : "";
    });

    // 渲染后的内容
    const renderedContent = computed(() => {
      if (!result.value) return "";
      return marked(result.value);
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
      taskInfo.value = {
        progress: 0,
        stageDescription: "",
        repoName: "",
        error: "",
      };
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
      error,
      taskInfo,
      result,
      downloadUrl,
      renderedContent,
      handleAnalyze,
      handleReset,
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
