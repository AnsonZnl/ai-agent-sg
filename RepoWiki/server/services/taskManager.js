/**
 * 任务管理服务
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 描述: 管理分析任务的状态、进度和结果
 */

import { v4 as uuidv4 } from 'uuid';

// 任务状态枚举
export const TaskStatus = {
  PENDING: 'pending',       // 等待处理
  PROCESSING: 'processing', // 处理中
  COMPLETED: 'completed',   // 已完成
  FAILED: 'failed',         // 失败
};

// 分析阶段定义
export const AnalysisStages = {
  CLONING: { name: 'cloning', progress: 5, description: '正在克隆仓库...' },
  COLLECTING: { name: 'collecting', progress: 10, description: '正在收集文件信息...' },
  DIRECTORY: { name: 'directory', progress: 20, description: '正在分析目录结构...' },
  ARCHITECTURE: { name: 'architecture', progress: 35, description: '正在分析技术架构...' },
  ENVIRONMENT: { name: 'environment', progress: 45, description: '正在分析开发环境...' },
  MODULE: { name: 'module', progress: 60, description: '正在分析功能模块...' },
  DATABASE: { name: 'database', progress: 75, description: '正在分析数据库结构...' },
  QA: { name: 'qa', progress: 90, description: '正在生成答辩问题...' },
  INTEGRATING: { name: 'integrating', progress: 95, description: '正在整合文档...' },
  COMPLETED: { name: 'completed', progress: 100, description: '分析完成' },
};

/**
 * 任务管理器类
 * 使用内存 Map 存储任务状态
 */
class TaskManager {
  constructor() {
    // 任务存储
    this.tasks = new Map();
    // 最大任务数（防止内存溢出）
    this.maxTasks = 100;
    // 任务超时时间（毫秒）
    this.taskTimeout = 30 * 60 * 1000; // 30分钟
  }

  /**
   * 创建新任务
   * @param {string} repoUrl - 仓库 URL
   * @returns {Object} 任务对象
   */
  createTask(repoUrl) {
    // 清理过期任务
    this.cleanupExpiredTasks();

    // 检查任务数量限制
    if (this.tasks.size >= this.maxTasks) {
      this.removeOldestTask();
    }

    const taskId = uuidv4();
    const task = {
      taskId,
      repoUrl,
      status: TaskStatus.PENDING,
      progress: 0,
      stage: 'initialized',
      stageDescription: '任务已创建',
      repoPath: null,
      repoName: null,
      result: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(taskId, task);
    console.log(`[TaskManager] 创建任务: ${taskId}`);

    return task;
  }

  /**
   * 获取任务
   * @param {string} taskId - 任务 ID
   * @returns {Object|null} 任务对象
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 更新任务状态
   * @param {string} taskId - 任务 ID
   * @param {Object} updates - 更新内容
   * @returns {Object|null} 更新后的任务对象
   */
  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }

    // 合并更新
    Object.assign(task, updates, { updatedAt: new Date() });
    this.tasks.set(taskId, task);

    return task;
  }

  /**
   * 更新任务进度
   * @param {string} taskId - 任务 ID
   * @param {string} stage - 当前阶段
   * @param {number} progress - 进度百分比
   * @param {string} description - 阶段描述
   */
  updateProgress(taskId, stage, progress, description) {
    this.updateTask(taskId, {
      stage,
      progress,
      stageDescription: description,
    });

    console.log(`[TaskManager] 任务 ${taskId} 进度: ${progress}% - ${description}`);
  }

  /**
   * 标记任务开始处理
   * @param {string} taskId - 任务 ID
   * @param {string} repoPath - 仓库路径
   * @param {string} repoName - 仓库名称
   */
  startProcessing(taskId, repoPath, repoName) {
    this.updateTask(taskId, {
      status: TaskStatus.PROCESSING,
      repoPath,
      repoName,
      stage: 'processing',
      stageDescription: '正在分析仓库...',
    });
  }

  /**
   * 标记任务完成
   * @param {string} taskId - 任务 ID
   * @param {string} result - 分析结果（Markdown 文档）
   */
  completeTask(taskId, result) {
    this.updateTask(taskId, {
      status: TaskStatus.COMPLETED,
      progress: 100,
      stage: 'completed',
      stageDescription: '分析完成',
      result,
    });

    console.log(`[TaskManager] 任务 ${taskId} 完成`);
  }

  /**
   * 标记任务失败
   * @param {string} taskId - 任务 ID
   * @param {string} error - 错误信息
   */
  failTask(taskId, error) {
    this.updateTask(taskId, {
      status: TaskStatus.FAILED,
      stage: 'failed',
      stageDescription: '分析失败',
      error: typeof error === 'string' ? error : error.message,
    });

    console.error(`[TaskManager] 任务 ${taskId} 失败:`, error);
  }

  /**
   * 删除任务
   * @param {string} taskId - 任务 ID
   */
  removeTask(taskId) {
    this.tasks.delete(taskId);
    console.log(`[TaskManager] 删除任务: ${taskId}`);
  }

  /**
   * 获取所有任务
   * @returns {Array} 任务列表
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * 清理过期任务
   */
  cleanupExpiredTasks() {
    const now = Date.now();
    const expiredIds = [];

    for (const [taskId, task] of this.tasks) {
      const age = now - task.updatedAt.getTime();
      if (age > this.taskTimeout) {
        expiredIds.push(taskId);
      }
    }

    for (const taskId of expiredIds) {
      this.removeTask(taskId);
    }

    if (expiredIds.length > 0) {
      console.log(`[TaskManager] 清理过期任务: ${expiredIds.length} 个`);
    }
  }

  /**
   * 删除最旧的任务
   */
  removeOldestTask() {
    let oldestId = null;
    let oldestTime = Date.now();

    for (const [taskId, task] of this.tasks) {
      if (task.createdAt.getTime() < oldestTime) {
        oldestTime = task.createdAt.getTime();
        oldestId = taskId;
      }
    }

    if (oldestId) {
      this.removeTask(oldestId);
    }
  }

  /**
   * 获取任务统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const stats = {
      total: this.tasks.size,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const task of this.tasks.values()) {
      stats[task.status]++;
    }

    return stats;
  }
}

// 导出单例实例
export const taskManager = new TaskManager();

export default taskManager;