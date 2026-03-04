/**
 * 分析引擎核心服务
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 更新日期: 2026-03-04
 * 描述: 编排各分析阶段的 Prompt 调用，生成毕业论文级别的技术文档
 */

import fs from 'fs/promises';
import path from 'path';
import { chatWithSystem, withRetry } from '../utils/llm.js';
import { collectFiles, readFileContent, cleanupDir, getRepoInfo } from './gitService.js';
import { AnalysisStages } from './taskManager.js';
import {
  introductionPrompt,
  requirementAnalysisPrompt,
  systemDesignPrompt,
  implementationPrompt,
  testingPrompt,
  summaryPrompt,
  thesisQaPrompt,
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
          content: content.slice(0, 8000),
        });
      }
    }
    
    // 配置文件
    if (KEY_FILES.config.some((c) => basename.includes(c))) {
      const content = await readFileContent(file.path);
      if (content) {
        result.config.push({
          name: file.relativePath,
          content: content.slice(0, 5000),
        });
      }
    }
    
    // README
    if (KEY_FILES.readme.includes(basename)) {
      const content = await readFileContent(file.path);
      if (content) {
        result.readme.push({
          name: file.relativePath,
          content: content.slice(0, 10000),
        });
      }
    }
  }

  // 提取核心代码文件（按扩展名取前几个，增加数量以支持深度分析）
  const coreExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'go', 'rs', 'vue'];
  const sampledFiles = {};

  // 定义关键目录优先级
  const priorityDirs = ['src/', 'server/', 'app/', 'lib/', 'core/', 'services/', 'controllers/', 'routes/', 'models/', 'api/', 'views/', 'components/'];

  for (const file of fileInfo.files) {
    if (coreExts.includes(file.extension)) {
      // 跳过测试文件和配置文件
      if (file.relativePath.includes('test') || 
          file.relativePath.includes('spec') || 
          file.relativePath.includes('.config.') ||
          file.relativePath.includes('node_modules')) {
        continue;
      }
      
      if (!sampledFiles[file.extension]) {
        sampledFiles[file.extension] = [];
      }
      
      // 优先读取关键目录下的文件，增加到每个扩展名最多10个文件
      const isPriority = priorityDirs.some(dir => file.relativePath.startsWith(dir));
      const maxFiles = 10;
      
      if (sampledFiles[file.extension].length < maxFiles) {
        const content = await readFileContent(file.path, 20000);
        if (content) {
          sampledFiles[file.extension].push({
            name: file.relativePath,
            content: content.slice(0, 12000), // 增加内容长度
            isPriority,
          });
        }
      }
    }
  }

  // 按优先级排序，关键目录的文件放前面
  for (const ext of Object.keys(sampledFiles)) {
    sampledFiles[ext].sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));
    result.core.push(...sampledFiles[ext]);
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
  console.log(`[Analyzer] Prompt 长度: ${prompt.length} 字符`);
  
  const systemPrompt = `你是一位资深的计算机科学教授和技术文档写作专家。你的任务是根据提供的代码仓库信息，撰写毕业论文级别的技术文档。

要求：
1. 输出必须是学术论文风格，语言严谨、逻辑清晰、论述充分
2. 使用规范的学术表达方式，避免口语化
3. 内容要深入、全面，体现专业的技术理解
4. 图表要规范，使用 mermaid 语法
5. 代码示例要详尽，解释要清晰
6. 每个章节都要有明确的小结
7. 保持客观、中立的学术态度

请直接输出 Markdown 格式的文档内容，不要包含其他解释。`;
  
  const result = await withRetry(
    () => chatWithSystem(systemPrompt, prompt),
    2, // 重试 2 次
    3000 // 间隔 3 秒
  );
  
  console.log(`[Analyzer] 阶段 ${stageName} 完成，输出长度: ${result.length} 字符`);
  return result;
}

/**
 * 执行完整分析流程（论文级别）
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

  console.log(`[Analyzer] 开始分析仓库: ${repoName}`);

  // 阶段 1: 收集文件信息
  progress(AnalysisStages.COLLECTING.name, AnalysisStages.COLLECTING.progress, AnalysisStages.COLLECTING.description);
  
  const fileInfo = await collectFiles(repoPath);
  const keyFiles = await extractKeyFiles(fileInfo, repoPath);
  const primaryLanguage = detectPrimaryLanguage(fileInfo.byExtension);
  const directoryTree = generateDirectoryTree(fileInfo.dirs, fileInfo.files);

  console.log(`[Analyzer] 收集到 ${fileInfo.totalFiles} 个文件，主要语言: ${primaryLanguage}`);

  // 准备公共数据
  const depContent = keyFiles.dependencies
    .map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n') || '(未找到依赖配置文件)';
  
  const coreContent = keyFiles.core
    .slice(0, 15)
    .map((f) => `### ${f.name}\n\`\`\`${path.extname(f.name).slice(1) || 'javascript'}\n${f.content}\n\`\`\``)
    .join('\n\n---\n\n') || '(未找到核心代码文件)';
  
  const readmeContent = keyFiles.readme
    .map((f) => f.content)
    .join('\n\n') || '(未找到 README 文件)';
  
  const configContent = keyFiles.config
    .map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n') || '(未找到配置文件)';

  const sourceStructure = fileInfo.dirs
    .filter((d) => !d.startsWith('.') && !d.includes('node_modules'))
    .slice(0, 100)
    .join('\n');

  // 收集 API 路由文件
  const apiFiles = fileInfo.files.filter((f) => 
    f.relativePath.includes('route') || 
    f.relativePath.includes('controller') ||
    f.relativePath.includes('api') ||
    f.relativePath.includes('router')
  );
  
  const apiContent = await Promise.all(
    apiFiles.slice(0, 8).map(async (f) => {
      const content = await readFileContent(f.path, 10000);
      return content ? `### ${f.relativePath}\n\`\`\`${f.extension}\n${content}\n\`\`\`` : '';
    })
  );
  const combinedApiContent = apiContent.filter(Boolean).join('\n\n');

  // 收集数据库文件
  const dbFiles = fileInfo.files.filter((f) => 
    f.relativePath.includes('model') ||
    f.relativePath.includes('entity') ||
    f.relativePath.includes('schema') ||
    f.relativePath.includes('migration') ||
    f.extension === 'sql' ||
    f.extension === 'prisma'
  );
  
  const dbContent = await Promise.all(
    dbFiles.slice(0, 8).map(async (f) => {
      const content = await readFileContent(f.path, 10000);
      return content ? `### ${f.relativePath}\n\`\`\`\n${content}\n\`\`\`` : '';
    })
  );
  const combinedDbContent = dbContent.filter(Boolean).join('\n\n') || '(未找到数据库相关文件)';

  // 存储各章节内容
  let chapter1 = '';
  let chapter2 = '';
  let chapter3 = '';
  let chapter4 = '';
  let chapter5 = '';
  let chapter6 = '';
  let qaSection = '';

  // ========== 第1章：绪论 ==========
  progress('chapter1', 10, '正在生成第1章：绪论...');
  
  const introPrompt = assemblePrompt(introductionPrompt, {
    projectName: repoName,
    language: primaryLanguage,
    readmeContent: readmeContent,
    directoryTree: directoryTree || '(空目录)',
    dependencyFiles: depContent,
  });
  
  chapter1 = await executeAnalysisStage(introPrompt, '第1章 绪论');

  // ========== 第2章：系统需求分析 ==========
  progress('chapter2', 25, '正在生成第2章：系统需求分析...');
  
  const reqPrompt = assemblePrompt(requirementAnalysisPrompt, {
    projectName: repoName,
    language: primaryLanguage,
    sourceStructure: sourceStructure || '(未找到源代码目录)',
    coreFiles: coreContent,
    readmeContent: readmeContent,
  });
  
  chapter2 = await executeAnalysisStage(reqPrompt, '第2章 系统需求分析');

  // ========== 第3章：系统设计 ==========
  progress('chapter3', 40, '正在生成第3章：系统设计...');
  
  const designPrompt = assemblePrompt(systemDesignPrompt, {
    projectName: repoName,
    language: primaryLanguage,
    sourceStructure: sourceStructure || '(未找到源代码目录)',
    coreFiles: coreContent,
    dependencyFiles: depContent,
    databaseFiles: combinedDbContent,
  });
  
  chapter3 = await executeAnalysisStage(designPrompt, '第3章 系统设计');

  // ========== 第4章：系统实现 ==========
  progress('chapter4', 55, '正在生成第4章：系统实现...');
  
  const implPrompt = assemblePrompt(implementationPrompt, {
    projectName: repoName,
    language: primaryLanguage,
    sourceStructure: sourceStructure || '(未找到源代码目录)',
    coreFiles: coreContent,
    apiFiles: combinedApiContent || '(未找到 API 路由文件)',
    environmentInfo: configContent,
  });
  
  chapter4 = await executeAnalysisStage(implPrompt, '第4章 系统实现');

  // ========== 第5章：系统测试 ==========
  progress('chapter5', 70, '正在生成第5章：系统测试...');
  
  const testPrompt = assemblePrompt(testingPrompt, {
    projectName: repoName,
    language: primaryLanguage,
    coreFiles: coreContent.slice(0, 20000),
    apiInfo: combinedApiContent.slice(0, 10000) || '(未找到 API 信息)',
  });
  
  chapter5 = await executeAnalysisStage(testPrompt, '第5章 系统测试');

  // ========== 第6章：总结与展望 ==========
  progress('chapter6', 85, '正在生成第6章：总结与展望...');
  
  const summaryPromptText = assemblePrompt(summaryPrompt, {
    projectName: repoName,
    techStack: keyFiles.dependencies.map((f) => path.basename(f.name)).join(', ') || primaryLanguage,
    mainFeatures: chapter2.slice(0, 2000),
    architecture: chapter3.slice(0, 2000),
  });
  
  chapter6 = await executeAnalysisStage(summaryPromptText, '第6章 总结与展望');

  // ========== 答辩问题 ==========
  progress(AnalysisStages.QA.name, AnalysisStages.QA.progress, AnalysisStages.QA.description);
  
  const qaPromptText = assemblePrompt(thesisQaPrompt, {
    projectName: repoName,
    techStack: keyFiles.dependencies.map((f) => path.basename(f.name)).join(', ') || primaryLanguage,
    mainFeatures: chapter2.slice(0, 2000),
    architecture: chapter3.slice(0, 2000),
  });
  
  qaSection = await executeAnalysisStage(qaPromptText, '答辩问题');

  // 阶段: 整合文档
  progress(AnalysisStages.INTEGRATING.name, AnalysisStages.INTEGRATING.progress, AnalysisStages.INTEGRATING.description);
  
  // 组装最终文档（论文格式）
  const finalDocument = `# ${repoName} 系统分析与设计文档

> **文档类型**: 毕业论文级别技术文档
> **生成工具**: DeepWiki Analyzer
> **生成时间**: ${new Date().toLocaleString('zh-CN')}
> **项目仓库**: ${repoUrl}
> **主要语言**: ${primaryLanguage}

---

## 文档目录

- [第1章 绪论](#第1章-绪论)
  - [1.1 项目背景](#11-项目背景)
  - [1.2 项目目的和意义](#12-项目目的和意义)
  - [1.3 国内外研究现状](#13-国内外研究现状)
  - [1.4 项目主要功能](#14-项目主要功能)
  - [1.5 技术选型概述](#15-技术选型概述)
- [第2章 系统需求分析](#第2章-系统需求分析)
  - [2.1 需求概述](#21-需求概述)
  - [2.2 功能需求分析](#22-功能需求分析)
  - [2.3 用例分析](#23-用例分析)
  - [2.4 非功能需求分析](#24-非功能需求分析)
  - [2.5 可行性分析](#25-可行性分析)
- [第3章 系统设计](#第3章-系统设计)
  - [3.1 系统架构设计](#31-系统架构设计)
  - [3.2 功能模块设计](#32-功能模块设计)
  - [3.3 数据库设计](#33-数据库设计)
  - [3.4 接口设计](#34-接口设计)
  - [3.5 详细设计](#35-详细设计)
- [第4章 系统实现](#第4章-系统实现)
  - [4.1 开发环境搭建](#41-开发环境搭建)
  - [4.2 核心功能实现](#42-核心功能实现)
  - [4.3 界面实现](#43-界面实现)
  - [4.4 数据库实现](#44-数据库实现)
  - [4.5 接口实现](#45-接口实现)
- [第5章 系统测试](#第5章-系统测试)
  - [5.1 测试概述](#51-测试概述)
  - [5.2 测试环境](#52-测试环境)
  - [5.3 功能测试](#53-功能测试)
  - [5.4 性能测试](#54-性能测试)
  - [5.5 兼容性测试](#55-兼容性测试)
- [第6章 总结与展望](#第6章-总结与展望)
  - [6.1 工作总结](#61-工作总结)
  - [6.2 创新点](#62-创新点)
  - [6.3 不足与改进](#63-不足与改进)
  - [6.4 未来展望](#64-未来展望)
- [附录：答辩问题及参考答案](#附录答辩问题及参考答案)

---

${chapter1}

---

${chapter2}

---

${chapter3}

---

${chapter4}

---

${chapter5}

---

${chapter6}

---

# 附录：答辩问题及参考答案

${qaSection}

---

## 参考文献

[1] 本文档基于项目源代码自动分析生成
[2] 技术文档参考计算机软件工程相关标准

---

**文档说明**

本文档由 DeepWiki Analyzer 自动生成，包含项目完整的系统分析与设计内容，可作为毕业论文的技术参考文档使用。文档内容基于项目源代码进行深度分析，涵盖了需求分析、系统设计、系统实现、系统测试等完整软件开发流程。

如需进一步完善，建议：
1. 补充具体的项目背景数据和引用
2. 添加实际的测试数据和截图
3. 根据实际情况调整技术细节描述
4. 补充用户调研和反馈数据

---

*本文档生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

  // 清理临时目录
  progress('cleanup', 99, '正在清理临时文件...');
  await cleanupDir(repoPath);

  console.log(`[Analyzer] 分析完成，文档总长度: ${finalDocument.length} 字符`);
  
  return finalDocument;
}

export default {
  analyzeRepository,
};