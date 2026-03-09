import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data', 'wikis')

export interface WikiRecord {
  id: string
  repoUrl: string
  repoName: string
  status: 'pending' | 'analyzing' | 'done' | 'error'
  content: string
  error?: string
  createdAt: string
  updatedAt: string
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function saveWiki(record: WikiRecord): void {
  ensureDir()
  const filePath = path.join(DATA_DIR, `${record.id}.json`)
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8')
}

export function getWiki(id: string): WikiRecord | null {
  ensureDir()
  const filePath = path.join(DATA_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function listWikis(): WikiRecord[] {
  ensureDir()
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  const records: WikiRecord[] = []
  for (const file of files) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'))
      records.push(record)
    } catch {
      // skip corrupt files
    }
  }
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function updateWikiContent(id: string, content: string, status: WikiRecord['status'], error?: string): void {
  const record = getWiki(id)
  if (!record) return
  record.content = content
  record.status = status
  record.updatedAt = new Date().toISOString()
  if (error) record.error = error
  saveWiki(record)
}

export function deleteWiki(id: string): void {
  ensureDir()
  const filePath = path.join(DATA_DIR, `${id}.json`)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
