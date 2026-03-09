import { NextResponse } from 'next/server'
import { listWikis } from '@/lib/storage'

export async function GET() {
  const wikis = listWikis()
  return NextResponse.json(wikis)
}
