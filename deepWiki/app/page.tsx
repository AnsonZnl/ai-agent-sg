'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HistoryList from '@/components/HistoryList'

export default function HomePage() {
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repoUrl.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '请求失败')
        return
      }

      router.push(`/wiki/${data.id}`)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">DeepWiki</h1>
            <p className="text-xs text-gray-500">智能仓库文档生成器</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            理解任意开源仓库
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            输入 GitHub 或 Gitee 仓库链接，AI 自动分析代码结构，生成包含架构图、流程图的完整技术 Wiki
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-16">
          <div className="flex gap-2 shadow-sm">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  处理中
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  生成 Wiki
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
          )}
          <p className="mt-3 text-xs text-gray-400 text-center">
            支持 GitHub、Gitee、GitLab 等公开仓库
          </p>
        </form>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: '🏗️',
              title: '架构分析',
              desc: '自动识别技术栈，生成系统架构图',
            },
            {
              icon: '📊',
              title: 'Mermaid 图表',
              desc: '流程图、时序图、架构图一键生成',
            },
            {
              icon: '⬇️',
              title: '导出下载',
              desc: '支持 Markdown 和 PDF 格式下载',
            },
          ].map((f) => (
            <div key={f.title} className="text-center p-6 bg-white border border-gray-200 rounded-xl">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-gray-800 mb-1">{f.title}</div>
              <div className="text-sm text-gray-500">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* History */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">历史记录</h3>
          <HistoryList />
        </div>
      </main>
    </div>
  )
}
