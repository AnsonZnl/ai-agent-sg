/**
 * DeepWiki Analyzer 服务入口
 * 作者: JoyCode
 * 创建日期: 2026-03-03
 * 描述: Express 服务器主入口，配置中间件和路由
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from './utils/config.js';
import analyzeRouter from './routes/analyze.js';

// 获取当前目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 创建 Express 应用
const app = express();

// 验证配置
try {
  validateConfig();
} catch (error) {
  console.error('配置验证失败，请检查 .env 文件');
  process.exit(1);
}

// 中间件配置
app.use(cors()); // 启用 CORS
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码请求体

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// API 路由
app.use('/api', analyzeRouter);

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 静态文件服务（前端构建产物）
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// SPA 路由回退（所有非 API 路由返回 index.html）
app.get('*', (req, res) => {
  // 如果是 API 路由但未匹配，返回 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'API 路由不存在',
    });
  }
  
  // 返回前端 index.html
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(500).send('服务器错误');
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
  });
});

// 启动服务器
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║      DeepWiki Analyzer 已启动          ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  地址: http://localhost:${PORT.toString().padEnd(15)}   ║`);
  console.log(`║  模型: ${config.openai.modelName.padEnd(26)} ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('API 接口:');
  console.log(`  POST http://localhost:${PORT}/api/analyze    - 提交分析任务`);
  console.log(`  GET  http://localhost:${PORT}/api/status/:id - 查询任务状态`);
  console.log(`  GET  http://localhost:${PORT}/api/result/:id - 获取分析结果`);
  console.log(`  GET  http://localhost:${PORT}/api/download/:id - 下载文档`);
  console.log(`  GET  http://localhost:${PORT}/api/pdf/:id    - 下载 PDF`);
  console.log('');
});

// 配置服务器超时 - 大文档生成需要更长时间
server.timeout = 600000; // 10 分钟
server.keepAliveTimeout = 650000; // 稍大于 timeout
server.headersTimeout = 660000; // 稍大于 keepAliveTimeout

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});

export default app;