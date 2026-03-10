import { NextRequest, NextResponse } from 'next/server'
import { getWiki } from '@/lib/storage'
import { generatePDF } from '@/lib/pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const record = getWiki(id)
  if (!record || record.status !== 'done') {
    return NextResponse.json({ error: '记录不存在或尚未完成' }, { status: 404 })
  }

  const format = request.nextUrl.searchParams.get('format') || 'md'

  if (format === 'md') {
    const filename = `${record.repoName.replace(/\//g, '-')}-wiki.md`
    return new NextResponse(record.content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  if (format === 'pdf') {
    try {
      const pdfBuffer = await generatePDF(record.content, record.repoName)
      const filename = `${record.repoName.replace(/\//g, '-')}-wiki.pdf`
      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      return NextResponse.json({ error: 'PDF 生成失败' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: '不支持的格式' }, { status: 400 })
}
