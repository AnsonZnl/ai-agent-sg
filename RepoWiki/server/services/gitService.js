/**
 * Git 仓库克隆服务
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 描述: 使用 simple-git 实现 Gitee 仓库克隆和管理
 */

import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../utils/config.js';

// 跳过的目录列表
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  'tmp',
  'temp',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  'env',
]);

// 跳过的文件模式
const SKIP_FILES = [
  /\.(lock|lockfile)$/,          // 锁文件
  /\.(log|tmp)$/,                 // 日志和临时文件
  /\.(png|jpg|jpeg|gif|ico|svg|webp)$/,  // 图片文件
  /\.(mp4|mp3|wav|avi|mov)$/,     // 媒体文件
  /\.(zip|tar|gz|rar|7z)$/,       // 压缩文件
  /\.(exe|dll|so|dylib|bin)$/,    // 可执行文件
  /\.(woff|woff2|ttf|eot)$/,       // 字体文件
  /\.min\.(js|css)$/,             // 压缩文件
];

// 代码文件扩展名
const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte',
  'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp',
  'rb', 'php', 'swift', 'kt', 'scala',
  'json', 'yaml', 'yml', 'toml', 'xml',
  'md', 'txt', 'rst',
  'sql', 'prisma', 'graphql', 'proto',
  'sh', 'bash', 'zsh', 'bat',
  'dockerfile', 'makefile', 'cmake',
]);

/**
 * 验证 Gitee URL 格式
 * @param {string} url - 仓库 URL
 * @returns {boolean} 是否为有效的 Gitee URL
 */
export function isValidGiteeUrl(url) {
  const giteePattern = /^https?:\/\/(www\.)?gitee\.com\/[\w-]+\/[\w.-]+(\.git)?$/;
  return giteePattern.test(url);
}

/**
 * 从 URL 提取仓库名称
 * @param {string} url - 仓库 URL
 * @returns {string} 仓库名称
 */
export function extractRepoName(url) {
  const match = url.match(/gitee\.com\/[\w-]+\/([\w.-]+)(\.git)?$/);
  return match ? match[1].replace(/\.git$/, '') : 'unknown-repo';
}

/**
 * 确保目录存在
 * @param {string} dir - 目录路径
 */
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * 克隆 Git 仓库
 * @param {string} repoUrl - 仓库 URL
 * @param {string} taskId - 任务 ID
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<{path: string, name: string}>} 克隆结果
 */
export async function cloneRepository(repoUrl, taskId, onProgress = null) {
  // 验证 URL
  if (!isValidGiteeUrl(repoUrl)) {
    throw new Error('无效的 Gitee 仓库 URL，仅支持公开的 Gitee 仓库');
  }

  const repoName = extractRepoName(repoUrl);
  const clonePath = path.join(config.repo.tempDir, `${taskId}-${repoName}`);

  // 确保临时目录存在
  await ensureDir(config.repo.tempDir);

  // 如果目录已存在，先删除
  try {
    await fs.rm(clonePath, { recursive: true, force: true });
  } catch {
    // 忽略删除失败
  }

  if (onProgress) {
    onProgress('正在克隆仓库...');
  }

  try {
    const git = simpleGit();
    await git.clone(repoUrl, clonePath, ['--depth', '1']);

    return {
      path: clonePath,
      name: repoName,
    };
  } catch (error) {
    // 清理失败的克隆
    try {
      await fs.rm(clonePath, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
    throw new Error(`克隆仓库失败: ${error.message}`);
  }
}

/**
 * 获取仓库基本信息
 * @param {string} repoPath - 仓库路径
 * @returns {Promise<Object>} 仓库信息
 */
export async function getRepoInfo(repoPath) {
  const git = simpleGit(repoPath);
  
  try {
    const log = await git.log(['-1']);
    const remotes = await git.getRemotes(true);
    const status = await git.status();

    return {
      lastCommit: log.latest,
      remotes,
      branch: status.current || 'main',
    };
  } catch (error) {
    console.warn('获取仓库信息失败:', error.message);
    return null;
  }
}

/**
 * 遍历目录并收集文件信息
 * @param {string} dir - 目录路径
 * @param {string} basePath - 基础路径
 * @param {number} maxFiles - 最大文件数
 * @returns {Promise<Object>} 文件信息
 */
export async function collectFiles(dir, basePath = '', maxFiles = 500) {
  const result = {
    files: [],
    dirs: [],
    totalFiles: 0,
    totalSize: 0,
    byExtension: {},
  };

  async function walk(currentDir, relativePath) {
    if (result.totalFiles >= maxFiles) {
      return;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        // 跳过特定目录
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        result.dirs.push(relPath);
        await walk(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase().slice(1);
        
        // 检查是否应跳过该文件
        const shouldSkip = SKIP_FILES.some((pattern) => pattern.test(entry.name));
        if (shouldSkip) {
          continue;
        }

        try {
          const stat = await fs.stat(fullPath);
          
          // 限制单个文件大小（最大 500KB）
          if (stat.size > 500 * 1024) {
            continue;
          }

          result.files.push({
            path: fullPath,
            relativePath: relPath,
            name: entry.name,
            extension: ext,
            size: stat.size,
          });

          result.totalFiles++;
          result.totalSize += stat.size;

          // 按扩展名分类
          if (!result.byExtension[ext]) {
            result.byExtension[ext] = [];
          }
          result.byExtension[ext].push(relPath);
        } catch {
          // 忽略无法访问的文件
        }
      }
    }
  }

  await walk(dir, basePath || '');

  return result;
}

/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @param {number} maxSize - 最大读取大小（字节）
 * @returns {Promise<string|null>} 文件内容
 */
export async function readFileContent(filePath, maxSize = 100 * 1024) {
  try {
    const stat = await fs.stat(filePath);
    
    if (stat.size > maxSize) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.warn(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 清理临时目录
 * @param {string} dir - 目录路径
 */
export async function cleanupDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
    console.log(`已清理临时目录: ${dir}`);
  } catch (error) {
    console.warn(`清理目录失败: ${dir}`, error.message);
  }
}

export default {
  isValidGiteeUrl,
  extractRepoName,
  cloneRepository,
  getRepoInfo,
  collectFiles,
  readFileContent,
  cleanupDir,
  SKIP_DIRS,
  CODE_EXTENSIONS,
};