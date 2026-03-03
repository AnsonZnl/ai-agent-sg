/**
 * 分析引擎核心服务
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 描述: 编排各分析阶段的 Prompt 调用，生成最终文档
 */

import fs from 'fs/promises';
import path from 'path';
import { chatWithSystem, withRetry } from '../utils/llm.js';
import { collectFiles, readFileContent, cleanupDir, getRepoInfo } from './gitService.js';
import { AnalysisStages } from './taskManager.js';
import {
  directoryAnalysisPrompt,
  architectureAnalysisPrompt,
  environmentAnalysisPrompt,
  moduleAnalysisPrompt,
  databaseAnalysisPrompt,
  qaGenerationPrompt,
  assemblePrompt,
} from '../prompts/index.js';

// 关键文件模式
const KEY_FILES = {
  dependencies: [
    'package.json',
    'requirements.txt',
    'go.mod',
    'pom.xml',
    'build.gradle',
    'Cargo.toml',
    'Gemfile',
    'composer.json',
  ],
  config: [
    '.env.example',
    'config.json',
    'config.yaml',
    'config.yml',
    'docker-compose.yml',
    'Dockerfile',
    '.dockerignore',
  ],
  readme: ['README.md', 'readme.md', 'README.rst', 'readme.rst'],
  database: [
    'schema.sql',
    'migrations/',
    'models/',
    'entities/',
    'prisma/schema.prisma',
  ],
};

/**
 * 生成目录树字符串
 * @param {string[]} dirs - 目录列表
 * @param {string[]} files - 文件列表
 * @returns {string} 目录树字符串
 */
function generateDirectoryTree(dirs, files, maxDepth = 4) {
  const lines = [];
  const tree = {};

  // 构建树结构
  for (const dir of dirs.slice(0, 200)) {
    const parts = dir.split(/[/\\]/).filter(Boolean);
    let current = tree;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  // 递归生成字符串
  function render(node, prefix = '', depth = 0) {
    if (depth > maxDepth) {
      return;
    }
    
    const entries = Object.keys(node).sort();
    for (let i = 0; i < entries.length; i++) {
      const isLast = i === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      lines.push(prefix + connector + entries[i]);
      
      if (Object.keys(node[entries[i]]).length > 0) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        render(node[entries[i]], newPrefix, depth + 1);
      }
    }
  }

  render(tree);
  return lines.join('\n');
}

/**
 * 检测主要语言
 * @param {Object} byExtension - 按扩展名分类的文件
 * @returns {string} 主要语言
 */
function detectPrimaryLanguage(byExtension) {
  const weights = {
    js: 1, jsx: 1, ts: 1.2, tsx: 1.2, vue: 1,
    py: 1.2,
    java: 1.3,
    go: 1.2,
    rs: 1.2,
    php: 1,
    rb: 1,
  };

  let maxScore = 0;
  let primaryLang = 'Unknown';

  for (const [ext, files] of Object.entries(byExtension)) {
    const score = (files.length || 0) * (weights[ext] || 0.5);
    if (score > maxScore) {
      maxScore = score;
      primaryLang = ext;
    }
  }

  // 映射扩展名到语言名
  const langMap = {
    js: 'JavaScript',
    jsx: 'JavaScript (React)',
    ts: 'TypeScript',
    tsx: 'TypeScript (React)',
    vue: 'Vue',
    py: 'Python',
    java: 'Java',
    go: 'Go',
    rs: 'Rust',
    php: 'PHP',
    rb: 'Ruby',
  };

  return langMap[primaryLang] || primaryLang;
}

/**
 * 提取关键文件内容
 * @param {Object} fileInfo - 文件信息对象
 * @param {string} repoPath - 仓库路径
 * @returns {Promise<Object>} 关键文件内容
 */
async function extractKeyFiles(fileInfo, repoPath) {
  const result = {
    dependencies: [],
    config: [],
    readme: [],
    database: [],
    core: [],
  };

  // 提取依赖文件
  for (const file of fileInfo.files) {
    const basename = path.basename(file.relativePath);
    
    // 依赖文件
    if (KEY_FILES.dependencies.includes(basename)) {
      const content = await readFileContent(file.path);
      if (content) {
        result.dependencies.push({
          name: file.relativePath,
          content: content.slice(0, 5000), // 限制长度
        });
      }
    }
    
    // 配置文件
    if (KEY_FILES.config.some((c) => basename.includes(c))) {
      const content = await readFileContent(file.path);
      if (content) {
        result.config.push({
          name: file.relativePath,
          content: content.slice(0, 3000),
        });
      }
    }
    
    // README
    if (KEY_FILES.readme.includes(basename)) {
      const content = await readFileContent(file.path);
      if (content) {
        result.readme.push({
          name: file.relativePath,
          content: content.slice(0, 5000),
        });
      }
    }
  }

  // 提取核心代码文件（按扩展名取前几个）
  const coreExts = ['js', 'ts', 'py', 'java', 'go', 'rs'];
  const sampledFiles = {};

  for (const file of fileInfo.files) {
    if (coreExts.includes(file.extension)) {
      if (!sampledFiles[file.extension]) {
        sampledFiles[file.extension] = [];
      }
      if (sampledFiles[file.extension].length < 3) {
        const content = await readFileContent(file.path, 10000);
        if (content) {
          sampledFiles[file.extension].push({
            name: file.relativePath,
            content: content.slice(0, 5000),
          });
        }
      }
    }
  }

  for (const files of Object.values(sampledFiles)) {
    result.core.push(...files);
  }

  return result;
}

/**
 * 执行单个分析阶段
 * @param {string} prompt - Prompt 内容
 * @param {string} stageName - 阶段名称
 * @returns {Promise<string>} 分析结果
 */
async function executeAnalysisStage(prompt, stageName) {
  console.log(`[Analyzer] 执行分析阶段: ${stageName}`);
  
  const systemPrompt = '你是一位专业的代码分析专家。请按照用户的要求分析项目，并生成结构化的 Markdown 文档。输出必须是纯 Markdown 格式，不要包含其他解释。';
  
  const result = await withRetry(
    () => chatWithSystem(systemPrompt, prompt),
    2, // 重试 2 次
    2000 // 间隔 2 秒
  );
  
  return result;
}

/**
 * 执行完整分析流程
 * @param {string} repoPath - 仓库路径
 * @param {string} repoName - 仓库名称
 * @param {string} repoUrl - 仓库 URL
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 分析结果（Markdown 文档）
 */
export async function analyzeRepository(repoPath, repoName, repoUrl, onProgress) {
  const progress = (stage, progressValue, description) => {
    if (onProgress) {
      onProgress(stage, progressValue, description);
    }
  };

  // 阶段 1: 收集文件信息
  progress(AnalysisStages.COLLECTING.name, AnalysisStages.COLLECTING.progress, AnalysisStages.COLLECTING.description);
  
  const fileInfo = await collectFiles(repoPath);
  const keyFiles = await extractKeyFiles(fileInfo, repoPath);
  const primaryLanguage = detectPrimaryLanguage(fileInfo.byExtension);
  const directoryTree = generateDirectoryTree(fileInfo.dirs, fileInfo.files);

  console.log(`[Analyzer] 收集到 ${fileInfo.totalFiles} 个文件，主要语言: ${primaryLanguage}`);

  // 阶段 2: 目录结构分析
  progress(AnalysisStages.DIRECTORY.name, AnalysisStages.DIRECTORY.progress, AnalysisStages.DIRECTORY.description);
  
  const directoryPrompt = assemblePrompt(directoryAnalysisPrompt, {
    projectName: repoName,
    language: primaryLanguage,
    directoryTree: directoryTree || '(空目录)',
  });
  
  const directoryAnalysis = await executeAnalysisStage(directoryPrompt, '目录分析');

  // 阶段 3: 技术架构分析
  progress(AnalysisStages.ARCHITECTURE.name, AnalysisStages.ARCHITECTURE.progress, AnalysisStages.ARCHITECTURE.description);
  
  const depContent = keyFiles.dependencies
    .map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n') || '(未找到依赖配置文件)';
  
  const coreContent = keyFiles.core
    .map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n') || '(未找到核心代码文件)';
  
  const architecturePrompt = assemblePrompt(architectureAnalysisPrompt, {
    projectName: repoName,
    dependencyFiles: depContent,
    keyFiles: coreContent,
  });
  
  const architectureAnalysis = await executeAnalysisStage(architecturePrompt, '架构分析');

  // 阶段 4: 开发环境分析
  progress(AnalysisStages.ENVIRONMENT.name, AnalysisStages.ENVIRONMENT.progress, AnalysisStages.ENVIRONMENT.description);
  
  const configContent = keyFiles.config
    .map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n') || '(未找到配置文件)';
  
  const readmeContent = keyFiles.readme
    .map((f) => f.content)
    .join('\n\n') || '(未找到 README 文件)';
  
  const environmentPrompt = assemblePrompt(environmentAnalysisPrompt, {
    projectName: repoName,
    configFiles: configContent,
    envExample: readmeContent,
  });
  
  const environmentAnalysis = await executeAnalysisStage(environmentPrompt, '环境分析');

  // 阶段 5: 功能模块分析
  progress(AnalysisStages.MODULE.name, AnalysisStages.MODULE.progress, AnalysisStages.MODULE.description);
  
  const sourceStructure = fileInfo.dirs
    .filter((d) => !d.startsWith('.') && !d.includes('node_modules'))
    .slice(0, 50)
    .join('\n');
  
  const modulePrompt = assemblePrompt(moduleAnalysisPrompt, {
    projectName: repoName,
    language: primaryLanguage,
    sourceStructure: sourceStructure || '(未找到源代码目录)',
    coreFiles: coreContent,
  });
  
  const moduleAnalysis = await executeAnalysisStage(modulePrompt, '模块分析');

  // 阶段 6: 数据库结构分析
  progress(AnalysisStages.DATABASE.name, AnalysisStages.DATABASE.progress, AnalysisStages.DATABASE.description);
  
  // 查找数据库相关文件
  const dbFiles = fileInfo.files.filter((f) => 
    f.relativePath.includes('model') ||
    f.relativePath.includes('entity') ||
    f.relativePath.includes('schema') ||
    f.relativePath.includes('migration') ||
    f.extension === 'sql' ||
    f.extension === 'prisma'
  );
  
  const dbContent = await Promise.all(
    dbFiles.slice(0, 5).map(async (f) => {
      const content = await readFileContent(f.path, 5000);
      return content ? `### ${f.relativePath}\n\`\`\`\n${content}\n\`\`\`` : '';
    })
  );
  
  const databasePrompt = assemblePrompt(databaseAnalysisPrompt, {
    projectName: repoName,
    databaseFiles: dbContent.filter(Boolean).join('\n\n') || '(未找到数据库相关文件)',
    modelFiles: '(从上方数据库文件中提取)',
  });
  
  const databaseAnalysis = await executeAnalysisStage(databasePrompt, '数据库分析');

  // 阶段 7: 答辩问题生成
  progress(AnalysisStages.QA.name, AnalysisStages.QA.progress, AnalysisStages.QA.description);
  
  // 提取技术栈信息
  const techStack = keyFiles.dependencies
    .map((f) => path.basename(f.name))
    .join(', ') || primaryLanguage;
  
  const qaPrompt = assemblePrompt(qaGenerationPrompt, {
    projectName: repoName,
    techStack,
    mainFeatures: moduleAnalysis.slice(0, 1000),
    architecture: architectureAnalysis.slice(0, 1000),
  });
  
  const qaAnalysis = await executeAnalysisStage(qaPrompt, '答辩问题');

  // 阶段 8: 整合文档
  progress(AnalysisStages.INTEGRATING.name, AnalysisStages.INTEGRATING.progress, AnalysisStages.INTEGRATING.description);
  
  // 组装最终文档
  const finalDocument = `# ${repoName} 代码解析文档

> 由 DeepWiki Analyzer 自动生成
> 生成时间: ${new Date().toLocaleString('zh-CN')}
> 仓库地址: ${repoUrl}

---

## 目录

1. [系统目录结构分析](#1-系统目录结构分析)
2. [系统技术架构分析](#2-系统技术架构分析)
3. [系统开发环境和运行环境分析](#3-系统开发环境和运行环境分析)
4. [系统功能模块讲解](#4-系统功能模块讲解)
5. [数据库表结构和表关系讲解](#5-数据库表结构和表关系讲解)
6. [常见答辩问题及答案](#6-常见答辩问题及答案)

---

## 1. 系统目录结构分析

${directoryAnalysis}

---

## 2. 系统技术架构分析

${architectureAnalysis}

---

## 3. 系统开发环境和运行环境分析

${environmentAnalysis}

---

## 4. 系统功能模块讲解

${moduleAnalysis}

---

## 5. 数据库表结构和表关系讲解

${databaseAnalysis}

---

## 6. 常见答辩问题及答案

${qaAnalysis}

---

*本文档由 DeepWiki Analyzer 自动生成，仅供参考。*
`;

  // 清理临时目录
  progress('cleanup', 99, '正在清理临时文件...');
  await cleanupDir(repoPath);

  return finalDocument;
}

export default {
  analyzeRepository,
};