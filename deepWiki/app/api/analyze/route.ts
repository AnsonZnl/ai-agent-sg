import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { saveWiki, updateWikiContent } from '@/lib/storage'
import { cloneRepo, getFileTree, readImportantFiles, cleanupRepo } from '@/lib/git'
import { analyzeRepo } from '@/lib/analyzer'

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json()

    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json({ error: '请提供有效的仓库 URL' }, { status: 400 })
    }

    const urlPattern = /^https?:\/\/(github\.com|gitee\.com|gitlab\.com|bitbucket\.org)\/.+/
    if (!urlPattern.test(repoUrl.trim())) {
      return NextResponse.json({ error: '请输入有效的 GitHub/Gitee 仓库链接' }, { status: 400 })
    }

    const cleanUrl = repoUrl.trim().replace(/\.git$/, '')
    const repoName = cleanUrl.split('/').slice(-2).join('/')
    const id = uuidv4()

    const record = {
      id,
      repoUrl: cleanUrl,
      repoName,
      status: 'analyzing' as const,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveWiki(record)

    // 异步分析，不阻塞响应
    runAnalysis(id, cleanUrl, repoName).catch(console.error)

    return NextResponse.json({ id, repoName })
  } catch (error) {
    console.error('analyze error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

async function runAnalysis(id: string, repoUrl: string, repoName: string) {
  let repoPath: string | null = null
  try {
    repoPath = await cloneRepo(repoUrl, id)
    const fileTree = getFileTree(repoPath)
    const fileContents = readImportantFiles(repoPath)

    let accumulated = ''
    await analyzeRepo(repoUrl, repoName, fileTree, fileContents, (chunk) => {
      accumulated += chunk
      // 实时写入，供 SSE 轮询读取
      updateWikiContent(id, accumulated, 'analyzing')
    })

    updateWikiContent(id, accumulated, 'done')
  } catch (error) {
    const msg = error instanceof Error ? error.message : '分析失败'
    updateWikiContent(id, '', 'error', msg)
  } finally {
    if (repoPath) cleanupRepo(id)
  }
}
