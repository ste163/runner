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

const runCommand = (command: string, args: string[]) => {
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

const rebuildAndInstall = async () => {
  if (running) {
    pending = true
    return
  }

  running = true

  try {
    console.log('android:dev: build -> bun run build')
    const buildCode = await runCommand('bun', ['run', 'build'])
    if (buildCode !== 0) {
      throw new Error(`build failed with code ${buildCode}`)
    }

    console.log('android:dev: install -> sparkling-app-cli run:android')
    const runCode = await runCommand('sparkling-app-cli', ['run:android'])
    if (runCode !== 0) {
      throw new Error(`run:android failed with code ${runCode}`)
    }
  } finally {
    running = false

    if (pending) {
      pending = false
      scheduleRebuild()
    }
  }
}

const scheduleRebuild = () => {
  if (timer) {
    clearTimeout(timer)
  }

  timer = setTimeout(() => {
    timer = null
    void rebuildAndInstall().catch((error: unknown) => {
      console.error('android:dev:', error)
    })
  }, 250)
}

const isRelevantChange = (changedPath: string) => {
  const normalized = changedPath.split(path.sep).join('/')
  return (
    watchRoots.some((rootPath) => normalized.startsWith(`${rootPath}/`)) ||
    watchFiles.includes(normalized)
  )
}

const startWatchers = () => {
  for (const watchRoot of watchRoots) {
    const watcher = watch(path.join(root, watchRoot), { recursive: true }, (_event, filename) => {
      if (!filename) {
        return
      }

      const changedPath = path.join(watchRoot, String(filename))
      if (isRelevantChange(changedPath)) {
        console.log(`android:dev: change -> ${changedPath}`)
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
        console.log(`android:dev: change -> ${watchFile}`)
        scheduleRebuild()
      }
    })

    watchers.push({
      close: () => watcher.close(),
    })
  }
}

const cleanup = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }

  for (const watcher of watchers) {
    watcher.close()
  }
}

const main = async () => {
  console.log('android:dev: env ready')
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
  console.error('android:dev:', error)
  process.exit(1)
})
