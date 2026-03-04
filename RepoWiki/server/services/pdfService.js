/**
 * PDF 生成服务
 * 作者: JoyCode
 * 创建日期: 2026-03-04
 * 更新日期: 2026-03-04
 * 描述: 将 Markdown 文档转换为 PDF 文件，支持 Mermaid 图表渲染
 */

import puppeteer from 'puppeteer';
import { marked } from 'marked';
import hljs from 'highlight.js';

/**
 * 自定义渲染器，处理 Mermaid 代码块
 */
const renderer = new marked.Renderer();

// 重写代码块渲染，识别 mermaid 语言
renderer.code = function(code, language) {
  // 处理 mermaid 图表
  if (language === 'mermaid') {
    return `<div class="mermaid">${code}</div>`;
  }
  
  // 处理其他代码块，添加语法高亮
  if (language && hljs.getLanguage(language)) {
    try {
      const highlighted = hljs.highlight(code, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    } catch (e) {
      // 忽略高亮错误
    }
  }
  
  // 默认代码块
  return `<pre><code>${code}</code></pre>`;
};

// 配置 marked
marked.setOptions({
  renderer,
  breaks: true,
  gfm: true,
});

/**
 * 生成 PDF 文件的 HTML 模板
 * @param {string} title - 文档标题
 * @param {string} content - Markdown 内容
 * @returns {string} 完整的 HTML 页面
 */
function generateHtmlTemplate(title, content) {
  // 预处理：将 mermaid 代码块转换为 div
  let processedContent = content;
  
  // 转换 Markdown 为 HTML
  const htmlContent = marked(processedContent);
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* 基础样式 */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "SimSun", sans-serif;
      line-height: 1.8;
      color: #333;
      padding: 40px 50px;
      font-size: 14px;
    }
    
    /* 标题样式 */
    h1 {
      font-size: 26px;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 12px;
      margin: 30px 0 20px;
      color: #1f2937;
      page-break-after: avoid;
    }
    
    h2 {
      font-size: 20px;
      margin: 28px 0 16px;
      color: #374151;
      border-left: 4px solid #6366f1;
      padding-left: 12px;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 18px;
      margin: 24px 0 12px;
      color: #4b5563;
      page-break-after: avoid;
    }
    
    h4 {
      font-size: 16px;
      margin: 20px 0 10px;
      color: #6b7280;
      page-break-after: avoid;
    }
    
    h5 {
      font-size: 15px;
      margin: 18px 0 10px;
      color: #6b7280;
      page-break-after: avoid;
    }
    
    /* 段落和列表 */
    p {
      margin: 10px 0;
      text-align: justify;
    }
    
    ul, ol {
      margin: 12px 0;
      padding-left: 24px;
    }
    
    li {
      margin: 6px 0;
    }
    
    /* 代码块 */
    pre {
      background-color: #1e293b;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    
    code {
      font-family: "JetBrains Mono", "Fira Code", Consolas, Monaco, "Courier New", monospace;
      font-size: 13px;
    }
    
    pre code {
      color: #e5e7eb;
      background: none;
      padding: 0;
    }
    
    /* 行内代码 */
    :not(pre) > code {
      background-color: #f1f5f9;
      color: #dc2626;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    
    /* 引用块 */
    blockquote {
      border-left: 4px solid #6366f1;
      background-color: #f8fafc;
      padding: 12px 16px;
      margin: 16px 0;
      color: #6b7280;
      page-break-inside: avoid;
    }
    
    blockquote p {
      margin: 0;
    }
    
    /* 表格 */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      page-break-inside: avoid;
      font-size: 13px;
    }
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    /* 链接 */
    a {
      color: #6366f1;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* 水平线 */
    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }
    
    /* Mermaid 图表容器 - 关键样式 */
    .mermaid {
      margin: 24px 0;
      padding: 20px;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
      overflow-x: auto;
    }
    
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }
    
    /* 分页控制 */
    h1, h2, h3, h4, h5 {
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    pre, table, .mermaid, blockquote {
      page-break-inside: avoid;
    }
    
    /* 文档头部信息 */
    .doc-header {
      text-align: center;
      padding: 20px 0 40px;
      border-bottom: 2px solid #6366f1;
      margin-bottom: 30px;
    }
    
    .doc-header h1 {
      border: none;
      padding: 0;
      margin: 0 0 10px;
      font-size: 28px;
    }
    
    .doc-meta {
      color: #6b7280;
      font-size: 13px;
      margin-top: 10px;
    }
    
    /* 目录样式 */
    .toc {
      background-color: #f9fafb;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #e5e7eb;
    }
    
    .toc ul {
      list-style: none;
      padding-left: 0;
    }
    
    .toc li {
      margin: 6px 0;
    }
    
    .toc a {
      color: #4b5563;
    }
    
    /* 强调样式 */
    strong {
      color: #1f2937;
      font-weight: 600;
    }
    
    /* 高亮代码样式 */
    .hljs-keyword { color: #f472b6; }
    .hljs-string { color: #a5d6a7; }
    .hljs-number { color: #90caf9; }
    .hljs-function { color: #81d4fa; }
    .hljs-comment { color: #78909c; font-style: italic; }
    .hljs-class { color: #ffcb2f; }
    .hljs-variable { color: #e5e7eb; }
    .hljs-built_in { color: #81d4fa; }
    .hljs-title { color: #81d4fa; }
    
    /* 打印样式 */
    @media print {
      body {
        padding: 20px;
      }
      
      .mermaid {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${title}</h1>
    <div class="doc-meta">由 DeepWiki Analyzer 自动生成 | ${new Date().toLocaleDateString('zh-CN')}</div>
  </div>
  <div id="content">${htmlContent}</div>
  
  <!-- 使用 CDN 加载 Mermaid -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>
  <script>
    // 初始化 Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        useMaxWidth: true,
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65
      },
      er: {
        useMaxWidth: true
      },
      gantt: {
        useMaxWidth: true
      },
      journey: {
        useMaxWidth: true
      },
      gitgraph: {
        useMaxWidth: true
      }
    });
    
    // 等待所有 Mermaid 图表渲染完成
    function waitForMermaid() {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const mermaidDivs = document.querySelectorAll('.mermaid');
          let allRendered = true;
          
          mermaidDivs.forEach(div => {
            // 检查是否已渲染（包含 svg 元素）
            if (!div.querySelector('svg')) {
              allRendered = false;
            }
          });
          
          if (allRendered || mermaidDivs.length === 0) {
            clearInterval(checkInterval);
            // 额外等待确保渲染完成
            setTimeout(resolve, 500);
          }
        }, 100);
        
        // 最多等待 30 秒
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 30000);
      });
    }
    
    // 页面加载完成后等待 Mermaid 渲染
    window.addEventListener('load', async function() {
      await waitForMermaid();
      window.mermaidReady = true;
    });
  </script>
</body>
</html>`;
}

/**
 * 生成 PDF 文件
 * @param {string} title - 文档标题
 * @param {string} markdownContent - Markdown 内容
 * @returns {Promise<Buffer>} PDF 文件 Buffer
 */
export async function generatePdf(title, markdownContent) {
  let browser = null;
  
  try {
    console.log(`[PDF Service] 开始生成 PDF: ${title}`);
    
    // 启动 Puppeteer 浏览器
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
    
    const page = await browser.newPage();
    
    // 设置页面超时
    page.setDefaultTimeout(60000);
    
    // 生成 HTML 内容
    const html = generateHtmlTemplate(title, markdownContent);
    
    // 设置页面内容
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });
    
    // 等待 Mermaid 渲染完成
    console.log('[PDF Service] 等待 Mermaid 图表渲染...');
    await page.evaluate(async () => {
      // 等待 mermaidReady 标志
      await new Promise((resolve) => {
        const checkReady = setInterval(() => {
          if (window.mermaidReady) {
            clearInterval(checkReady);
            resolve();
          }
        }, 100);
        
        // 最多等待 30 秒
        setTimeout(() => {
          clearInterval(checkReady);
          resolve();
        }, 30000);
      });
    });
    
    // 额外等待确保所有图表渲染完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('[PDF Service] 开始生成 PDF 文件...');
    
    // 生成 PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #9ca3af; padding: 5px 0;">
          ${title} - DeepWiki Analyzer
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #9ca3af; padding: 5px 0;">
          第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页
        </div>
      `,
    });
    
    console.log(`[PDF Service] PDF 生成成功，大小: ${Math.round(pdfBuffer.length / 1024)}KB`);
    
    return pdfBuffer;
  } catch (error) {
    console.error('[PDF Service] PDF 生成失败:', error);
    throw new Error(`PDF 生成失败: ${error.message}`);
  } finally {
    // 关闭浏览器
    if (browser) {
      await browser.close();
    }
  }
}

export default {
  generatePdf,
};