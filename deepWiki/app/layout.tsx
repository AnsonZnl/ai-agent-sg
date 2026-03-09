import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DeepWiki - 智能仓库文档生成器',
  description: '输入 GitHub/Gitee 仓库链接，自动生成技术 Wiki 文档',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
