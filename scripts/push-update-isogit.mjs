/**
 * Коммит и push без системного git (Xcode license).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(__dirname, '..')
const token = process.env.GITHUB_TOKEN
const message = process.env.GIT_MESSAGE || 'Update'

if (!token) {
  console.error('Need GITHUB_TOKEN')
  process.exit(1)
}

const ignoreDirs = new Set(['node_modules', 'dist', '.git', '.vite', 'dev-dist'])

function shouldSkip(relPath) {
  const parts = relPath.split(path.sep)
  if (parts.some((p) => ignoreDirs.has(p))) return true
  if (relPath === '.DS_Store' || relPath.endsWith('/.DS_Store')) return true
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
    if (entry.isDirectory()) out.push(...(await listFiles(root, rel)))
    else if (entry.isFile()) out.push(rel)
  }
  return out
}

const files = await listFiles(dir)
for (const filepath of files) {
  await git.add({ fs, dir, filepath: filepath.split(path.sep).join('/') })
}

const status = await git.statusMatrix({ fs, dir })
const changed = status.filter(([, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1))
if (changed.length === 0) {
  console.log('Nothing to commit')
  process.exit(0)
}

const sha = await git.commit({
  fs,
  dir,
  message,
  author: {
    name: 'faceconntrol',
    email: 'faceconntrol@users.noreply.github.com',
  },
})
console.log(`Committed ${sha}`)

const result = await git.push({
  fs,
  http,
  dir,
  remote: 'origin',
  ref: 'main',
  onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
})
console.log('Push result:', result.ok ? 'ok' : result)
