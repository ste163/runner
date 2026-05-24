import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const watchRoots = ['src']
const watchFiles = ['app.config.ts', 'lynx.config.ts']

let running = false
let pending = false
let timer: ReturnType<typeof setTimeout> | null = null
const watchers: Array<{ close: () => void }> = []

// TODO: remove this
function log(message: string) {
  console.log(message)
}

function runCommand(command: string, args: string[]) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: root,
      env: process.env,
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated by ${signal}`))
        return
      }

      resolve(code ?? 0)
    })
  })
}

async function rebuildAndInstall() {
  if (running) {
    pending = true
    return
  }

  running = true

  try {
    log('android:hot: build -> bun run build')
    const buildCode = await runCommand('bun', ['run', 'build'])
    if (buildCode !== 0) {
      throw new Error(`build failed with code ${buildCode}`)
    }

    log('android:hot: install -> bun android:static')
    const runCode = await runCommand('bun', ['android:static'])
    if (runCode !== 0) {
      throw new Error(`android:static failed with code ${runCode}`)
    }
  } finally {
    running = false

    if (pending) {
      pending = false
      scheduleRebuild()
    }
  }
}

function scheduleRebuild() {
  if (timer) {
    clearTimeout(timer)
  }

  timer = setTimeout(() => {
    timer = null
    void rebuildAndInstall().catch((error: unknown) => {
      console.error('android:hot:', error)
    })
  }, 250)
}

function isRelevantChange(changedPath: string) {
  const normalized = changedPath.split(path.sep).join('/')
  return (
    watchRoots.some((rootPath) => normalized.startsWith(`${rootPath}/`)) ||
    watchFiles.includes(normalized)
  )
}

function startWatchers() {
  for (const watchRoot of watchRoots) {
    const watcher = watch(path.join(root, watchRoot), { recursive: true }, (_event, filename) => {
      if (!filename) {
        return
      }

      const changedPath = path.join(watchRoot, String(filename))
      if (isRelevantChange(changedPath)) {
        log(`android:hot: change -> ${changedPath}`)
        scheduleRebuild()
      }
    })

    watchers.push({
      close: () => watcher.close(),
    })
  }

  for (const watchFile of watchFiles) {
    const watcher = watch(path.join(root, watchFile), {}, () => {
      if (isRelevantChange(watchFile)) {
        log(`android:hot: change -> ${watchFile}`)
        scheduleRebuild()
      }
    })

    watchers.push({
      close: () => watcher.close(),
    })
  }
}

function cleanup() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }

  for (const watcher of watchers) {
    watcher.close()
  }
}

async function main() {
  log('android:hot: env ready')
  startWatchers()
  await rebuildAndInstall()

  process.on('SIGINT', () => {
    cleanup()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    cleanup()
    process.exit(0)
  })

  await new Promise<void>(() => {})
}

void main().catch((error: unknown) => {
  console.error('android:hot:', error)
  process.exit(1)
})
