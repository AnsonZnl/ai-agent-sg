import puppeteer from 'puppeteer'

export async function generatePDF(markdownContent: string, title: string): Promise<Buffer> {
  const executablePath = process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : undefined

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    const html = buildHtml(markdownContent, title)
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // 等待 Mermaid 图表渲染完成
    await page.waitForFunction(
      () => {
        const elements = document.querySelectorAll('.mermaid')
        return elements.length === 0 || Array.from(elements).every(el => el.querySelector('svg'))
      },
      { timeout: 15000 }
    )

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

function buildHtml(markdownContent: string, title: string): string {
  // 转义内容用于安全嵌入
  const escapedContent = markdownContent.replace(/`/g, '\\`').replace(/\$/g, '\\$')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { font-size: 2em; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; margin-top: 2em; }
    h3 { font-size: 1.2em; margin-top: 1.5em; }
    pre { background: #f6f8fa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; overflow-x: auto; }
    code { font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9em; }
    :not(pre) > code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    .mermaid { text-align: center; margin: 1.5em 0; }
    blockquote { border-left: 4px solid #e5e7eb; margin: 0; padding-left: 1em; color: #6b7280; }
  </style>
</head>
<body>
  <div id="content"></div>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default' });

    const rawContent = \`${escapedContent}\`;

    // 先用 marked 转换 markdown（跳过 mermaid 块）
    const renderer = new marked.Renderer();
    const originalCode = renderer.code.bind(renderer);
    renderer.code = function(code, lang) {
      if (lang === 'mermaid') {
        return '<div class="mermaid">' + (typeof code === 'object' ? code.text : code) + '</div>';
      }
      return originalCode(code, lang);
    };

    marked.use({ renderer });
    document.getElementById('content').innerHTML = marked.parse(rawContent);

    // 渲染 mermaid
    mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
  </script>
</body>
</html>`
}
