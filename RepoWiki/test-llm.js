/**
 * LLM 连接测试脚本
 * 用于验证 API 配置是否正确
 */

import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';

async function testLLM() {
  console.log('=== LLM 连接测试 ===\n');
  
  // 打印配置信息
  console.log('配置信息:');
  console.log('  API Key:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
  console.log('  Base URL:', process.env.OPENAI_BASE_URL);
  console.log('  Model:', process.env.MODEL_NAME);
  console.log('');

  try {
    // 创建 LLM 实例
    const llm = new ChatOpenAI({
      model: process.env.MODEL_NAME || 'qwen-coder-turbo',
      temperature: 0,
      maxTokens: 100,
      apiKey: process.env.OPENAI_API_KEY,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
      },
      timeout: 30000,
    });

    console.log('正在测试 LLM 连接...');
    
    // 发送简单测试请求
    const response = await llm.invoke('你好，请回复"测试成功"四个字');
    
    console.log('\n✅ LLM 连接成功!');
    console.log('响应内容:', response.content);
    
  } catch (error) {
    console.log('\n❌ LLM 连接失败!');
    console.log('错误信息:', error.message);
    
    // 提供可能的解决方案
    console.log('\n可能的解决方案:');
    if (error.message.includes('Connection error')) {
      console.log('1. 检查网络连接是否正常');
      console.log('2. 检查 Base URL 是否正确');
      console.log('3. 如果是国内服务商，可能需要设置代理');
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('1. 检查 API Key 是否正确');
      console.log('2. 检查 API Key 是否已过期');
    }
    if (error.message.includes('404')) {
      console.log('1. 检查模型名称是否正确');
      console.log('2. 检查 Base URL 路径是否正确');
    }
  }
}

testLLM();