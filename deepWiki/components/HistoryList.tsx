'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface WikiRecord {
  id: string
  repoUrl: string
  repoName: string
  status: 'pending' | 'analyzing' | 'done' | 'error'
  createdAt: string
}

export default function HistoryList() {
  const [wikis, setWikis] = useState<WikiRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWikis = async () => {
    try {
      const res = await fetch('/api/wikis')
      if (res.ok) {
        const data = await res.json()
        setWikis(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWikis()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (wikis.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        暂无历史记录，输入仓库链接开始分析
      </div>
    )
  }

  const statusBadge = (status: WikiRecord['status']) => {
    const map = {
      pending: { label: '等待中', cls: 'bg-gray-100 text-gray-600' },
      analyzing: { label: '分析中', cls: 'bg-blue-100 text-blue-600 animate-pulse' },
      done: { label: '已完成', cls: 'bg-green-100 text-green-600' },
      error: { label: '失败', cls: 'bg-red-100 text-red-600' },
    }
    const { label, cls } = map[status]
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
    )
  }

  return (
    <div className="space-y-2">
      {wikis.map((wiki) => (
        <Link
          key={wiki.id}
          href={`/wiki/${wiki.id}`}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-800 truncate group-hover:text-blue-700">
              {wiki.repoName}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {new Date(wiki.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            {statusBadge(wiki.status)}
          </div>
        </Link>
      ))}
    </div>
  )
}
