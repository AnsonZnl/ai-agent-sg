import { NextRequest, NextResponse } from 'next/server'
import { getWiki } from '@/lib/storage'
import { generatePDF } from '@/lib/pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const format = request.nextUrl.searchParams.get('format') || 'md'
  const record = getWiki(id)

  if (!record) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }

  if (record.status !== 'done') {
    return NextResponse.json({ error: 'Wiki 尚未生成完成' }, { status: 400 })
  }

  const fileName = record.repoName.replace(/\//g, '-')

  if (format === 'md') {
    return new NextResponse(record.content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}-wiki.md"`,
      },
    })
  }

  if (format === 'pdf') {
    const pdfBuffer = await generatePDF(record.content, record.repoName)
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}-wiki.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: '不支持的格式' }, { status: 400 })
}
