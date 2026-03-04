/**
 * 分析 API 路由
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 更新日期: 2026-03-04
 * 描述: 提供仓库分析的 REST API 接口，支持 MD 和 PDF 下载
 */

import express from 'express';
import { taskManager, TaskStatus } from '../services/taskManager.js';
import { cloneRepository, isValidGiteeUrl, extractRepoName } from '../services/gitService.js';
import { analyzeRepository } from '../services/analyzerService.js';
import { AnalysisStages } from '../services/taskManager.js';
import { generatePdf } from '../services/pdfService.js';

const router = express.Router();

/**
 * POST /api/analyze
 * 提交分析任务
 */
router.post('/analyze', async (req, res) => {
  try {
    const { repoUrl } = req.body;

    // 验证参数
    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: '缺少仓库 URL 参数',
      });
    }

    // 验证 URL 格式
    if (!isValidGiteeUrl(repoUrl)) {
      return res.status(400).json({
        success: false,
        error: '无效的 Gitee 仓库 URL，仅支持公开的 Gitee 仓库（格式：https://gitee.com/用户名/仓库名）',
      });
    }

    // 创建任务
    const task = taskManager.createTask(repoUrl);

    // 异步执行分析
    executeAnalysisAsync(task.taskId, repoUrl);

    // 立即返回任务 ID
    res.json({
      success: true,
      taskId: task.taskId,
      message: '分析任务已创建',
    });
  } catch (error) {
    console.error('[API] 创建分析任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '创建分析任务失败',
    });
  }
});

/**
 * 异步执行分析流程
 * @param {string} taskId - 任务 ID
 * @param {string} repoUrl - 仓库 URL
 */
async function executeAnalysisAsync(taskId, repoUrl) {
  let repoPath = null;

  try {
    // 更新进度回调
    const onProgress = (stage, progress, description) => {
      taskManager.updateProgress(taskId, stage, progress, description);
    };

    // 阶段 1: 克隆仓库
    onProgress(AnalysisStages.CLONING.name, AnalysisStages.CLONING.progress, AnalysisStages.CLONING.description);
    
    const cloneResult = await cloneRepository(repoUrl, taskId);
    repoPath = cloneResult.path;
    const repoName = cloneResult.name;

    // 更新任务状态
    taskManager.startProcessing(taskId, repoPath, repoName);

    // 执行分析
    const result = await analyzeRepository(repoPath, repoName, repoUrl, onProgress);

    // 标记完成
    taskManager.completeTask(taskId, result);
  } catch (error) {
    console.error(`[API] 分析任务 ${taskId} 失败:`, error);
    
    // 标记失败
    taskManager.failTask(taskId, error.message || '分析过程发生错误');
    
    // 清理临时目录
    if (repoPath) {
      try {
        const { cleanupDir } = await import('../services/gitService.js');
        await cleanupDir(repoPath);
      } catch {
        // 忽略清理错误
      }
    }
  }
}

/**
 * GET /api/status/:taskId
 * 查询任务状态
 */
router.get('/status/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const task = taskManager.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    // 返回任务状态
    res.json({
      success: true,
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      stage: task.stage,
      stageDescription: task.stageDescription,
      repoName: task.repoName,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });
  } catch (error) {
    console.error('[API] 查询任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '查询任务状态失败',
    });
  }
});

/**
 * GET /api/result/:taskId
 * 获取分析结果
 */
router.get('/result/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const task = taskManager.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    if (task.status !== TaskStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: '任务尚未完成',
        status: task.status,
        progress: task.progress,
      });
    }

    // 返回分析结果
    res.json({
      success: true,
      taskId: task.taskId,
      repoName: task.repoName,
      content: task.result,
    });
  } catch (error) {
    console.error('[API] 获取分析结果失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分析结果失败',
    });
  }
});

/**
 * GET /api/download/:taskId
 * 下载 Markdown 文件
 */
router.get('/download/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const task = taskManager.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    if (task.status !== TaskStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: '任务尚未完成',
        status: task.status,
        progress: task.progress,
      });
    }

    // 设置响应头
    const filename = `${task.repoName || 'analysis'}-${new Date().toISOString().split('T')[0]}.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 返回文件内容
    res.send(task.result);
  } catch (error) {
    console.error('[API] 下载文件失败:', error);
    res.status(500).json({
      success: false,
      error: '下载文件失败',
    });
  }
});

/**
 * GET /api/stats
 * 获取任务统计
 */
router.get('/stats', (req, res) => {
  try {
    const stats = taskManager.getStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[API] 获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败',
    });
  }
});

/**
 * GET /api/pdf/:taskId
 * 下载 PDF 文件
 */
router.get('/pdf/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = taskManager.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    if (task.status !== TaskStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: '任务尚未完成',
        status: task.status,
        progress: task.progress,
      });
    }

    // 生成 PDF
    const title = task.repoName || '代码分析文档';
    console.log(`[API] 开始生成 PDF: ${taskId}`);
    
    const pdfBuffer = await generatePdf(title, task.result);
    
    // 设置响应头
    const filename = `${task.repoName || 'analysis'}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // 返回 PDF 文件
    res.send(pdfBuffer);
    console.log(`[API] PDF 生成完成: ${filename}`);
  } catch (error) {
    console.error('[API] PDF 生成失败:', error);
    res.status(500).json({
      success: false,
      error: `PDF 生成失败: ${error.message}`,
    });
  }
});

/**
 * DELETE /api/task/:taskId
 * 删除任务
 */
router.delete('/task/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const task = taskManager.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在',
      });
    }

    taskManager.removeTask(taskId);

    res.json({
      success: true,
      message: '任务已删除',
    });
  } catch (error) {
    console.error('[API] 删除任务失败:', error);
    res.status(500).json({
      success: false,
      error: '删除任务失败',
    });
  }
});

export default router;