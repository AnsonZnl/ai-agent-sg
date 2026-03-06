/**
 * 一键启动脚本
 * 作者: JoyCode
 * 创建日期: 2026-03-06
 * 描述: 智能检测依赖并启动 DeepWiki Analyzer 服务
 */

import { spawn, execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { platform } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const clientDir = resolve(rootDir, 'client');

// 配置 - 从 .env 文件读取端口，确保与服务器配置一致
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(rootDir, '.env') });

const SERVER_PORT = parseInt(process.env.PORT, 10) || 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * 打印带颜色的消息
 * @param {string} message - 消息内容
 * @param {string} color - 颜色代码
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 打印标题
 * @param {string} title - 标题内容
 */
function printTitle(title) {
  console.log('');
  print('╔════════════════════════════════════════╗', 'cyan');
  print(`║  ${title.padEnd(36)}  ║`, 'cyan');
  print('╚════════════════════════════════════════╝', 'cyan');
  console.log('');
}

/**
 * 检查 node_modules 是否存在且有效
 * @param {string} dir - 目录路径
 * @returns {boolean} 是否已安装
 */
function isDependenciesInstalled(dir) {
  const nodeModulesPath = resolve(dir, 'node_modules');
  
  if (!existsSync(nodeModulesPath)) {
    return false;
  }
  
  // 检查 node_modules 是否有内容
  try {
    const stats = statSync(nodeModulesPath);
    if (!stats.isDirectory()) {
      return false;
    }
    // 检查是否包含一些核心包
    return existsSync(resolve(nodeModulesPath, '.package-lock.json')) || 
           existsSync(resolve(nodeModulesPath, 'express'));
  } catch {
    return false;
  }
}

/**
 * 执行命令
 * @param {string} command - 命令
 * @param {string} cwd - 工作目录
 * @param {boolean} inherit - 是否继承输出
 * @returns {Promise<void>}
 */
function executeCommand(command, cwd, inherit = true) {
  return new Promise((resolvePromise, reject) => {
    const isWindows = platform() === 'win32';
    const shell = isWindows ? true : '/bin/bash';
    
    const childProcess = spawn(command, [], {
      cwd,
      shell,
      stdio: inherit ? 'inherit' : 'pipe',
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`));
      }
    });
    
    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 安装根目录依赖
 */
async function installRootDependencies() {
  print('📦 正在安装根目录依赖...', 'yellow');
  await executeCommand('npm install', rootDir);
  print('✅ 根目录依赖安装完成', 'green');
}

/**
 * 安装前端依赖
 */
async function installClientDependencies() {
  print('📦 正在安装前端依赖...', 'yellow');
  await executeCommand('npm install', clientDir);
  print('✅ 前端依赖安装完成', 'green');
}

/**
 * 构建前端
 */
async function buildClient() {
  print('🔨 正在构建前端...', 'yellow');
  await executeCommand('npm run build', clientDir);
  print('✅ 前端构建完成', 'green');
}

/**
 * 打开浏览器
 */
function openBrowser() {
  const isWindows = platform() === 'win32';
  const isMac = platform() === 'darwin';
  
  try {
    if (isWindows) {
      execSync(`start ${SERVER_URL}`, { stdio: 'ignore' });
    } else if (isMac) {
      execSync(`open ${SERVER_URL}`, { stdio: 'ignore' });
    } else {
      // Linux
      execSync(`xdg-open ${SERVER_URL}`, { stdio: 'ignore' });
    }
    print(`🌐 浏览器已打开: ${SERVER_URL}`, 'green');
  } catch (error) {
    print(`⚠️  无法自动打开浏览器，请手动访问: ${SERVER_URL}`, 'yellow');
  }
}

/**
 * 启动服务器
 */
function startServer() {
  print('🚀 正在启动服务器...', 'yellow');
  console.log('');
  
  const isWindows = platform() === 'win32';
  const shell = isWindows ? true : '/bin/bash';
  
  // 使用 spawn 启动服务器，继承输出
  const serverProcess = spawn('node', ['server/index.js'], {
    cwd: rootDir,
    shell,
    stdio: 'inherit',
  });
  
  // 延迟打开浏览器，等待服务器启动
  setTimeout(() => {
    openBrowser();
  }, 2000);
  
  // 处理进程退出
  serverProcess.on('error', (error) => {
    print(`❌ 服务器启动失败: ${error.message}`, 'red');
    process.exit(1);
  });
  
  // 处理中断信号
  process.on('SIGINT', () => {
    print('\n👋 正在关闭服务器...', 'yellow');
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });
}

/**
 * 主函数
 */
async function main() {
  printTitle('DeepWiki Analyzer 一键启动');
  
  let needsInstall = false;
  let needsBuild = false;
  
  // 检查根目录依赖
  print('🔍 检查根目录依赖...', 'blue');
  if (!isDependenciesInstalled(rootDir)) {
    print('  ❌ 根目录依赖未安装', 'red');
    needsInstall = true;
  } else {
    print('  ✅ 根目录依赖已安装', 'green');
  }
  
  // 检查前端依赖
  print('🔍 检查前端依赖...', 'blue');
  if (!isDependenciesInstalled(clientDir)) {
    print('  ❌ 前端依赖未安装', 'red');
    needsInstall = true;
    needsBuild = true;
  } else {
    print('  ✅ 前端依赖已安装', 'green');
  }
  
  // 检查前端构建产物
  const clientDistPath = resolve(clientDir, 'dist');
  if (!existsSync(clientDistPath)) {
    print('🔍 检测到前端未构建', 'yellow');
    needsBuild = true;
  }
  
  console.log('');
  
  // 安装依赖
  if (needsInstall) {
    printTitle('安装依赖');
    
    if (!isDependenciesInstalled(rootDir)) {
      await installRootDependencies();
    }
    
    if (!isDependenciesInstalled(clientDir)) {
      await installClientDependencies();
    }
    
    console.log('');
  }
  
  // 构建前端
  if (needsBuild) {
    printTitle('构建前端');
    await buildClient();
    console.log('');
  }
  
  // 启动服务器
  printTitle('启动服务');
  startServer();
}

// 运行主函数
main().catch((error) => {
  print(`\n❌ 启动失败: ${error.message}`, 'red');
  process.exit(1);
});