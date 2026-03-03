/**
 * API 调用服务
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 */

const API_BASE = '/api';

/**
 * 提交分析任务
 * @param {string} repoUrl - 仓库 URL
 * @returns {Promise<Object>} 任务信息
 */
export async function submitAnalyze(repoUrl) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repoUrl }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || '提交分析任务失败');
  }

  return data;
}

/**
 * 查询任务状态
 * @param {string} taskId - 任务 ID
 * @returns {Promise<Object>} 任务状态
 */
export async function getTaskStatus(taskId) {
  const response = await fetch(`${API_BASE}/status/${taskId}`);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || '查询任务状态失败');
  }

  return data;
}

/**
 * 获取分析结果
 * @param {string} taskId - 任务 ID
 * @returns {Promise<Object>} 分析结果
 */
export async function getAnalyzeResult(taskId) {
  const response = await fetch(`${API_BASE}/result/${taskId}`);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || '获取分析结果失败');
  }

  return data;
}

/**
 * 获取下载链接
 * @param {string} taskId - 任务 ID
 * @returns {string} 下载链接
 */
export function getDownloadUrl(taskId) {
  return `${API_BASE}/download/${taskId}`;
}

/**
 * 获取任务统计
 * @returns {Promise<Object>} 统计信息
 */
export async function getStats() {
  const response = await fetch(`${API_BASE}/stats`);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || '获取统计信息失败');
  }

  return data;
}

export default {
  submitAnalyze,
  getTaskStatus,
  getAnalyzeResult,
  getDownloadUrl,
  getStats,
};