/**
 * 环境配置加载和验证模块
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 描述: 加载和验证环境变量配置
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载 .env 文件（从项目根目录）
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 配置对象
 * 包含所有需要的环境变量配置
 */
export const config = {
  // OpenAI API 配置
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    modelName: process.env.MODEL_NAME || 'gpt-4o-mini',
  },

  // 服务配置
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
  },

  // 仓库配置
  repo: {
    // 临时目录路径
    tempDir: process.env.TEMP_DIR || path.resolve(__dirname, '../../temp'),
    // 最大仓库大小（MB）
    maxSize: parseInt(process.env.MAX_REPO_SIZE, 10) || 100,
    // 分析超时时间（毫秒）
    timeout: parseInt(process.env.ANALYSIS_TIMEOUT, 10) || 300000, // 5分钟
  },
};

/**
 * 验证必要配置项
 * @throws {Error} 如果缺少必要配置项
 */
export function validateConfig() {
  const errors = [];

  // 验证 API Key
  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY 未配置，请在 .env 文件中设置');
  }

  // 验证 Base URL
  if (!config.openai.baseURL) {
    errors.push('OPENAI_BASE_URL 未配置，请在 .env 文件中设置');
  }

  // 如果有错误，抛出异常
  if (errors.length > 0) {
    console.error('\n❌ 配置验证失败:\n');
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error('\n请复制 .env.example 为 .env 并填写必要的配置项\n');
    throw new Error('配置验证失败');
  }

  console.log('✅ 配置验证通过');
  console.log(`📋 模型: ${config.openai.modelName}`);
  console.log(`🔗 API 地址: ${config.openai.baseURL}`);
}

export default config;