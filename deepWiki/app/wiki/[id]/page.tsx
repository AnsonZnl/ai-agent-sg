'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import WikiViewer from '@/components/WikiViewer'

interface WikiRecord {
  id: string
  repoUrl: string
  repoName: string
  status: 'pending' | 'analyzing' | 'done' | 'error'
  content: string
  error?: string
  createdAt: string
}

export default function WikiPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [record, setRecord] = useState<WikiRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<'md' | 'pdf' | null>(null)

  const fetchRecord = useCallback(async () => {
    try {
      const res = await fetch(`/api/wiki/${id}`)
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      setRecord(data)
      setLoading(false)
      return data.status
    } catch {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRecord()
  }, [fetchRecord])

  // 轮询：分析中时每 2 秒拉取一次
  useEffect(() => {
    if (!record || record.status === 'done' || record.status === 'error') return

    const timer = setInterval(async () => {
      const status = await fetchRecord()
      if (status === 'done' || status === 'error') {
        clearInterval(timer)
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [record?.status, fetchRecord])

  const handleDownload = async (format: 'md' | 'pdf') => {
    setDownloading(format)
    try {
      const res = await fetch(`/api/download/${id}?format=${format}`)
      if (!res.ok) {
        alert('下载失败')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${record?.repoName?.replace(/\//g, '-') || id}-wiki.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('下载失败，请重试')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">记录不存在</p>
          <Link href="/" className="text-blue-600 hover:underline">返回首页</Link>
        </div>
      </div>
    )
  }

  const isStreaming = record.status === 'analyzing'
  const isDone = record.status === 'done'
  const isError = record.status === 'error'

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{record.repoName}</div>
              <a
                href={record.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline truncate block"
              >
                {record.repoUrl}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isStreaming && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full animate-pulse">
                AI 分析中...
              </span>
            )}
            {isDone && (
              <>
                <button
                  onClick={() => handleDownload('md')}
                  disabled={!!downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {downloading === 'md' ? (
                    <span className="inline-block w-3 h-3 border border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  MD
                </button>
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={!!downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {downloading === 'pdf' ? (
                    <span className="inline-block w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  PDF
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium">分析失败</p>
            <p className="text-red-600 text-sm mt-1">{record.error || '未知错误'}</p>
          </div>
        )}

        {(isStreaming || isDone) && record.content ? (
          <WikiViewer content={record.content} isStreaming={isStreaming} />
        ) : isStreaming && !record.content ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="inline-block w-10 h-10 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-6" />
            <p className="text-lg font-medium text-gray-700">正在克隆仓库并分析代码...</p>
            <p className="text-sm text-gray-400 mt-2">这可能需要 1-3 分钟，请耐心等待</p>
          </div>
        ) : null}
      </main>
    </div>
  )
}
