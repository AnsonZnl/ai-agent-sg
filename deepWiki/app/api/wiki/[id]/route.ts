import { NextRequest, NextResponse } from 'next/server'
import { getWiki } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const record = getWiki(id)

  if (!record) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }

  return NextResponse.json(record)
}
