import { spawn, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const children = new Set<ChildProcess>()
let stopping = false

function stopBuilds(signal: NodeJS.Signals) {
  stopping = true
  for (const child of children) child.kill(signal)
}

const onInterrupt = () => {
  process.exitCode = 130
  stopBuilds('SIGINT')
}
const onTerminate = () => {
  process.exitCode = 143
  stopBuilds('SIGTERM')
}
process.once('SIGINT', onInterrupt)
process.once('SIGTERM', onTerminate)

const builds = ['chromium', 'firefox'].map(browser => {
  const child = spawn(process.execPath, [vite, 'build', '--mode', browser, '--outDir', `dist/${browser}`], {
    cwd: root,
    stdio: 'inherit',
  })
  children.add(child)

  return new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => {
      children.delete(child)
      if (code === 0) resolve()
      else reject(new Error(`${browser} build failed (${signal ?? code})`))
    })
  })
})

try {
  await Promise.all(builds)
} catch (error) {
  if (!stopping) {
    console.error(error)
    process.exitCode = 1
    stopBuilds('SIGTERM')
  }
  await Promise.allSettled(builds)
}

process.removeListener('SIGINT', onInterrupt)
process.removeListener('SIGTERM', onTerminate)
