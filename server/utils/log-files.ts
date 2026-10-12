import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { join } from 'pathe'
import { spawnerPaths } from './paths.js'

/** Arquivos NDJSON gerados pelo evlog: <logsDir>/spawner e <logsDir>/bots/<instância>. */
export type LogFile = { scope: string; name: string; size: number; modifiedAt: string }

const SCOPE = /^(spawner|bots\/[a-z0-9][a-z0-9-]*)$/
const FILE = /^\d{4}-\d{2}-\d{2}(\.\d+)?\.jsonl$/

export function isValidLogFile(scope: string, name: string): boolean {
  return SCOPE.test(scope) && FILE.test(name)
}

export function logFilePath(scope: string, name: string): string {
  return join(spawnerPaths().logsDir, scope, name)
}

async function listDir(scope: string): Promise<LogFile[]> {
  const dir = join(spawnerPaths().logsDir, scope)
  const names = await readdir(dir).catch(() => [] as string[])
  const files: LogFile[] = []
  for (const name of names.filter((item) => FILE.test(item))) {
    const info = await stat(join(dir, name))
    files.push({ scope, name, size: info.size, modifiedAt: info.mtime.toISOString() })
  }
  return files
}

export async function listLogFiles(): Promise<LogFile[]> {
  const bots = await readdir(join(spawnerPaths().logsDir, 'bots')).catch(() => [] as string[])
  const scopes = ['spawner', ...bots.map((slug) => `bots/${slug}`)].filter((scope) => SCOPE.test(scope))
  const all = (await Promise.all(scopes.map(listDir))).flat()
  return all.sort((a, b) => b.name.localeCompare(a.name) || a.scope.localeCompare(b.scope))
}

/** Lê eventos de arquivos dos últimos `days` dias que passam no filtro, do mais novo para o mais antigo. */
export async function collectEvents(options: { days: number; levels: string[]; limit: number }): Promise<Array<Record<string, unknown>>> {
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const files = (await listLogFiles()).filter((file) => file.name.slice(0, 10) >= since)
  const events: Array<Record<string, unknown>> = []

  for (const file of files) {
    const lines = createInterface({ input: createReadStream(logFilePath(file.scope, file.name), 'utf8'), crlfDelay: Infinity })
    for await (const line of lines) {
      if (!line) continue
      try {
        const event = JSON.parse(line) as Record<string, unknown>
        if (options.levels.includes(String(event.level))) events.push({ _scope: file.scope, ...event })
      } catch {
        // linha corrompida (ex.: container morto no meio da escrita): ignora
      }
    }
  }

  return events.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, options.limit)
}
