/**
 * Push без системного git (Xcode license). Одноразовый скрипт деплоя.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(__dirname, '..')
const token = process.env.GITHUB_TOKEN
const remoteUrl = process.env.GIT_REMOTE_URL
const branch = 'main'

if (!token || !remoteUrl) {
  console.error('Need GITHUB_TOKEN and GIT_REMOTE_URL')
  process.exit(1)
}

const ignoreDirs = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vite',
  'dev-dist',
  '.DS_Store',
])

const ignoreNames = new Set(['.DS_Store', 'package-lock.backup'])

function shouldSkip(relPath) {
  const parts = relPath.split(path.sep)
  if (parts.some((p) => ignoreDirs.has(p))) return true
  if (ignoreNames.has(path.basename(relPath))) return true
  if (relPath.endsWith('.local')) return true
  if (relPath.startsWith('.env') && relPath !== '.env.example') return true
  return false
}

async function listFiles(root, prefix = '') {
  const entries = await fs.promises.readdir(path.join(root, prefix), { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const rel = prefix ? path.join(prefix, entry.name) : entry.name
    if (shouldSkip(rel)) continue
    if (entry.isDirectory()) {
      out.push(...(await listFiles(root, rel)))
    } else if (entry.isFile()) {
      out.push(rel)
    }
  }
  return out
}

if (fs.existsSync(path.join(dir, '.git'))) {
  fs.rmSync(path.join(dir, '.git'), { recursive: true, force: true })
}

await git.init({ fs, dir, defaultBranch: branch })

const files = await listFiles(dir)
console.log(`Staging ${files.length} files...`)
for (const filepath of files) {
  await git.add({ fs, dir, filepath: filepath.split(path.sep).join('/') })
}

const sha = await git.commit({
  fs,
  dir,
  message: 'Initial commit: Contract PWA for GitHub Pages',
  author: {
    name: 'faceconntrol',
    email: 'faceconntrol@users.noreply.github.com',
  },
})
console.log(`Committed ${sha}`)

await git.addRemote({ fs, dir, remote: 'origin', url: remoteUrl })

console.log('Pushing to origin/main...')
const result = await git.push({
  fs,
  http,
  dir,
  remote: 'origin',
  ref: branch,
  onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
})
console.log('Push result:', result)
