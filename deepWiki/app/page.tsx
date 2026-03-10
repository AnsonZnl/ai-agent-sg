'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import HistoryList from '@/components/HistoryList'

const PROGRESS_STEPS = [
  { label: '克隆仓库', duration: 15 },
  { label: '解析文件结构', duration: 10 },
  { label: 'AI 分析代码', duration: 50 },
  { label: '生成 Wiki 文档', duration: 20 },
  { label: '完成', duration: 5 },
]

export default function HomePage() {
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [wikiId, setWikiId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 模拟进度推进（基于预估时长）
  useEffect(() => {
    if (!loading) return

    let current = 0
    let step = 0
    let stepProgress = 0
    const totalWeight = PROGRESS_STEPS.reduce((s, p) => s + p.duration, 0)

    progressRef.current = setInterval(() => {
      if (step >= PROGRESS_STEPS.length - 1) return
      stepProgress += 1
      const stepDuration = PROGRESS_STEPS[step].duration * 2 // 每 500ms tick
      if (stepProgress >= stepDuration) {
        step = Math.min(step + 1, PROGRESS_STEPS.length - 2)
        setStepIndex(step)
        stepProgress = 0
      }
      // 计算总进度（最多到 90%，真实完成才到 100%）
      let done = 0
      for (let i = 0; i < step; i++) done += PROGRESS_STEPS[i].duration
      const pct = Math.min(
        ((done + stepProgress / 2) / totalWeight) * 90,
        88
      )
      current = pct
      setProgress(Math.round(pct))
    }, 500)

    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [loading])

  // 轮询后端状态
  useEffect(() => {
    if (!wikiId) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/wiki/${wikiId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'done') {
          clearInterval(pollRef.current!)
          if (progressRef.current) clearInterval(progressRef.current)
          setStepIndex(PROGRESS_STEPS.length - 1)
          setProgress(100)
          setTimeout(() => router.push(`/wiki/${wikiId}`), 600)
        } else if (data.status === 'error') {
          clearInterval(pollRef.current!)
          if (progressRef.current) clearInterval(progressRef.current)
          setLoading(false)
          setProgress(0)
          setStepIndex(0)
          setWikiId(null)
          setError(data.error || '分析失败，请重试')
        }
      } catch {
        // ignore network errors during polling
      }
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [wikiId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repoUrl.trim()) return

    setLoading(true)
    setError('')
    setProgress(2)
    setStepIndex(0)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '请求失败')
        setLoading(false)
        setProgress(0)
        setStepIndex(0)
        return
      }

      setWikiId(data.id)
    } catch {
      setError('网络错误，请重试')
      setLoading(false)
      setProgress(0)
      setStepIndex(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Progress overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-md px-8">
            <div className="text-center mb-8">
              <div className="inline-block w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" style={{ borderWidth: '3px' }} />
              <h3 className="text-xl font-semibold text-gray-900 mb-1">正在生成 Wiki</h3>
              <p className="text-sm text-gray-500 truncate max-w-xs mx-auto">{repoUrl.trim()}</p>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{PROGRESS_STEPS[stepIndex]?.label}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {PROGRESS_STEPS.slice(0, -1).map((step, i) => (
                <div key={step.label} className="flex items-center gap-3 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    i < stepIndex
                      ? 'bg-green-500'
                      : i === stepIndex
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-200'
                  }`}>
                    {i < stepIndex ? (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className={i <= stepIndex ? 'text-gray-800' : 'text-gray-400'}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-gray-400 text-center">
              通常需要 1-3 分钟，请勿关闭页面
            </p>
          </div>
        </div>
      )}

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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              生成 Wiki
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
