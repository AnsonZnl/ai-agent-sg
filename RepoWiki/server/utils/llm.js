/**
 * LLM 工具封装模块
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 描述: 封装 LangChain ChatOpenAI 客户端，提供统一的 LLM 调用接口
 */

import { ChatOpenAI } from '@langchain/openai';
import { config } from './config.js';

/**
 * 创建 LLM 客户端实例
 * @param {Object} options - 可选的配置覆盖
 * @returns {ChatOpenAI} LLM 客户端实例
 */
export function createLLM(options = {}) {
  const baseURL = options.baseURL || config.openai.baseURL;
  
  return new ChatOpenAI({
    model: options.modelName || config.openai.modelName,
    temperature: options.temperature ?? 0,
    maxTokens: options.maxTokens || 4000,
    apiKey: config.openai.apiKey,
    configuration: {
      baseURL: baseURL,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
    },
    timeout: options.timeout || 120000, // 2分钟超时
    maxRetries: options.maxRetries || 2,
  });
}

// 默认 LLM 实例
let defaultLLM = null;

/**
 * 获取默认 LLM 实例（单例模式）
 * @returns {ChatOpenAI} 默认 LLM 实例
 */
export function getLLM() {
  if (!defaultLLM) {
    defaultLLM = createLLM();
  }
  return defaultLLM;
}

/**
 * 调用 LLM 进行文本生成
 * @param {string} prompt - 输入提示词
 * @param {Object} options - 可选配置
 * @returns {Promise<string>} 生成的文本
 */
export async function generateText(prompt, options = {}) {
  const llm = options.llm || getLLM();
  
  try {
    const response = await llm.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error('LLM 调用失败:', error.message);
    throw new Error(`LLM 调用失败: ${error.message}`);
  }
}

/**
 * 使用 System Prompt 进行对话
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userMessage - 用户消息
 * @param {Object} options - 可选配置
 * @returns {Promise<string>} 生成的文本
 */
export async function chatWithSystem(systemPrompt, userMessage, options = {}) {
  const llm = options.llm || getLLM();
  
  try {
    const { HumanMessage, SystemMessage } = await import('@langchain/core/messages');
    
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage),
    ];
    
    const response = await llm.invoke(messages);
    return response.content;
  } catch (error) {
    console.error('LLM 对话失败:', error.message);
    throw new Error(`LLM 对话失败: ${error.message}`);
  }
}

/**
 * 带重试的 LLM 调用
 * @param {Function} fn - 要执行的异步函数
 * @param {number} retries - 重试次数
 * @param {number} delay - 重试间隔（毫秒）
 * @returns {Promise<any>} 函数执行结果
 */
export async function withRetry(fn, retries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`LLM 调用失败 (尝试 ${i + 1}/${retries}):`, error.message);
      
      if (i < retries - 1) {
        // 指数退避
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

export default {
  createLLM,
  getLLM,
  generateText,
  chatWithSystem,
  withRetry,
};