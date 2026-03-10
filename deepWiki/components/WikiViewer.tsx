'use client'

import { useEffect, useRef, useState, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface WikiViewerProps {
  content: string
  isStreaming?: boolean
}

// 独立的 Mermaid 图表组件，memo 防止父组件重渲染时重建
const MermaidChart = memo(function MermaidChart({ source }: { source: string }) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  const rendered = useRef(false)

  useEffect(() => {
    if (rendered.current) return
    rendered.current = true

    const clean = source.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: { htmlLabels: true },
        })
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg: rendered } = await mermaid.render(id, clean)
        setSvg(rendered)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }

    render()
  }, [source])

  if (error) {
    return (
      <details className="mermaid-error w-full">
        <summary className="text-red-600 cursor-pointer text-xs px-2 py-1">
          图表语法错误（点击查看详情）
        </summary>
        <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap break-all">{error}</pre>
        <pre className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">{source}</pre>
      </details>
    )
  }

  if (!svg) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
        <span className="inline-block w-3 h-3 border border-gray-300 border-t-blue-400 rounded-full animate-spin" />
        渲染图表中...
      </div>
    )
  }

  return (
    <div
      className="flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
})

export default function WikiViewer({ content, isStreaming }: WikiViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [content, isStreaming])

  return (
    <div className="wiki-content prose prose-gray max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const lang = match?.[1]
            const codeStr = String(children).replace(/\n$/, '')

            if (lang === 'mermaid') {
              return (
                <div className="mermaid-container my-6 overflow-x-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {isStreaming ? (
                    <pre className="text-xs text-gray-400 italic">流式生成中，完成后渲染图表...</pre>
                  ) : (
                    <MermaidChart source={codeStr} />
                  )}
                </div>
              )
            }

            const isBlock = !props.ref && codeStr.includes('\n')
            if (isBlock || lang) {
              return (
                <div className="relative my-4">
                  {lang && (
                    <span className="absolute top-2 right-3 text-xs text-gray-400 font-mono">{lang}</span>
                  )}
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
                    <code className={`font-mono text-sm ${className || ''}`} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              )
            }

            return (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800" {...props}>
                {children}
              </code>
            )
          },
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-8 pb-3 border-b-2 border-gray-200">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-gray-800 mb-3 mt-8 pb-2 border-b border-gray-200">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-6">{children}</h3>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-200 rounded-lg">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700 border border-gray-200">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border border-gray-200 text-gray-700">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-400 pl-4 py-1 my-4 bg-blue-50 rounded-r-lg text-gray-700">{children}</blockquote>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-3 pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-3 pl-4">{children}</ol>,
          li: ({ children }) => <li className="text-gray-700">{children}</li>,
          p: ({ children }) => <p className="text-gray-700 leading-relaxed my-3">{children}</p>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>
          ),
          hr: () => <hr className="my-8 border-gray-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <div className="flex items-center gap-2 mt-4 text-blue-500">
          <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse rounded" />
          <span className="text-sm">正在生成...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
