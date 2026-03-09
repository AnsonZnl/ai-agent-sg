import simpleGit from 'simple-git'
import path from 'path'
import fs from 'fs'
import os from 'os'

const TEMP_DIR = path.join(os.tmpdir(), 'deepwiki-repos')

export async function cloneRepo(repoUrl: string, repoId: string): Promise<string> {
  const repoPath = path.join(TEMP_DIR, repoId)

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true })
  }

  const git = simpleGit()
  await git.clone(repoUrl, repoPath, ['--depth', '1'])

  return repoPath
}

export function cleanupRepo(repoId: string): void {
  const repoPath = path.join(TEMP_DIR, repoId)
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true })
  }
}

export function getFileTree(repoPath: string, maxDepth = 4): string {
  const lines: string[] = []

  function walk(dir: string, depth: number, prefix: string) {
    if (depth > maxDepth) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const filtered = entries.filter(e => !IGNORE_DIRS.has(e.name))

    filtered.forEach((entry, index) => {
      const isLast = index === filtered.length - 1
      const connector = isLast ? '└── ' : '├── '
      const childPrefix = isLast ? '    ' : '│   '
      lines.push(prefix + connector + entry.name)

      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), depth + 1, prefix + childPrefix)
      }
    })
  }

  walk(repoPath, 0, '')
  return lines.join('\n')
}

export function readImportantFiles(repoPath: string): string {
  const results: string[] = []

  // 读取根目录关键文件
  const rootFiles = [
    'README.md', 'README.MD', 'readme.md',
    'package.json', 'pom.xml', 'build.gradle', 'Cargo.toml',
    'pyproject.toml', 'setup.py', 'requirements.txt',
    'go.mod', 'CMakeLists.txt', 'Makefile',
    'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile',
    '.env.example', 'config.yaml', 'config.yml',
  ]

  for (const file of rootFiles) {
    const filePath = path.join(repoPath, file)
    if (fs.existsSync(filePath)) {
      const content = safeRead(filePath, 3000)
      if (content) {
        results.push(`### ${file}\n\`\`\`\n${content}\n\`\`\``)
      }
    }
  }

  // 读取 src / lib / core 等核心目录下的入口文件
  const srcDirs = ['src', 'lib', 'core', 'app', 'main', 'server']
  for (const srcDir of srcDirs) {
    const dirPath = path.join(repoPath, srcDir)
    if (fs.existsSync(dirPath)) {
      collectKeyFiles(dirPath, results, 0, 3)
    }
  }

  return results.join('\n\n')
}

function collectKeyFiles(dir: string, results: string[], depth: number, maxDepth: number) {
  if (depth > maxDepth) return
  if (results.length > 20) return

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue
    const fullPath = path.join(dir, entry.name)

    if (entry.isFile() && isCodeFile(entry.name)) {
      const content = safeRead(fullPath, 2000)
      if (content) {
        const rel = path.relative(dir, fullPath)
        results.push(`### ${entry.name}\n\`\`\`\n${content}\n\`\`\``)
      }
      if (results.length > 20) return
    } else if (entry.isDirectory() && depth < maxDepth) {
      collectKeyFiles(fullPath, results, depth + 1, maxDepth)
    }
  }
}

function safeRead(filePath: string, maxChars: number): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.length > maxChars ? content.slice(0, maxChars) + '\n...(truncated)' : content
  } catch {
    return ''
  }
}

function isCodeFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase()
  return ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs', '.rb', '.php', '.vue', '.svelte', '.kt', '.swift'].includes(ext)
}

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'target',
  '__pycache__', '.venv', 'venv', 'env', '.idea', '.vscode',
  'coverage', '.nyc_output', 'vendor',
])
