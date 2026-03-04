/**
 * PDF 生成服务
 * 作者: JoyCode
 * 创建日期: 2026-03-04
 * 描述: 将 Markdown 文档转换为 PDF 文件，支持 Mermaid 图表渲染
 */

import puppeteer from 'puppeteer';
import { marked } from 'marked';
import hljs from 'highlight.js';

/**
 * Markdown 转 HTML 配置
 */
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {
        // 忽略高亮错误
      }
    }
    return code;
  },
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
  const htmlContent = marked(content);
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    /* 基础样式 */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
      line-height: 1.8;
      color: #333;
      padding: 40px 60px;
      font-size: 14px;
    }
    
    /* 标题样式 */
    h1 {
      font-size: 28px;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 12px;
      margin: 30px 0 20px;
      color: #1f2937;
    }
    
    h2 {
      font-size: 22px;
      margin: 28px 0 16px;
      color: #374151;
      border-left: 4px solid #6366f1;
      padding-left: 12px;
    }
    
    h3 {
      font-size: 18px;
      margin: 24px 0 12px;
      color: #4b5563;
    }
    
    h4 {
      font-size: 16px;
      margin: 20px 0 10px;
      color: #6b7280;
    }
    
    /* 段落和列表 */
    p {
      margin: 12px 0;
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
      background-color: #1f2937;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    
    code {
      font-family: "JetBrains Mono", "Fira Code", Consolas, Monaco, monospace;
      font-size: 13px;
    }
    
    pre code {
      color: #e5e7eb;
    }
    
    /* 行内代码 */
    :not(pre) > code {
      background-color: #f3f4f6;
      color: #ef4444;
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
    }
    
    /* 表格 */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
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
    
    /* Mermaid 图表容器 */
    .mermaid {
      margin: 20px 0;
      padding: 20px;
      background-color: #f8fafc;
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }
    
    /* 警告框 */
    .warning {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 16px 0;
    }
    
    /* 分页控制 */
    h1, h2, h3 {
      page-break-after: avoid;
    }
    
    pre, table, .mermaid {
      page-break-inside: avoid;
    }
    
    /* 文档头部信息 */
    .doc-header {
      text-align: center;
      padding: 20px 0 40px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 30px;
    }
    
    .doc-header h1 {
      border: none;
      padding: 0;
      margin: 0 0 10px;
    }
    
    .doc-meta {
      color: #6b7280;
      font-size: 13px;
    }
    
    /* 目录样式 */
    .toc {
      background-color: #f9fafb;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 20px 0;
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
  </style>
</head>
<body>
  <div id="content">${htmlContent}</div>
  
  <script>
    // 初始化 Mermaid 并渲染所有图表
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      },
      er: {
        useMaxWidth: true
      }
    });
    
    // 等待 Mermaid 渲染完成后标记页面已就绪
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.documentReady = true;
      }, 1000);
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
    // 启动 Puppeteer 浏览器
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    });
    
    const page = await browser.newPage();
    
    // 设置页面内容
    const html = generateHtmlTemplate(title, markdownContent);
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    // 等待 Mermaid 图表渲染完成
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // 等待 mermaid 渲染
        const checkReady = () => {
          if (window.documentReady || document.querySelectorAll('.mermaid').length === 0) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        setTimeout(checkReady, 500);
      });
    });
    
    // 额外等待确保图表完全渲染
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
        <div style="font-size: 10px; text-align: center; width: 100%; color: #9ca3af;">
          ${title} - DeepWiki Analyzer
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #9ca3af;">
          第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页
        </div>
      `,
    });
    
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