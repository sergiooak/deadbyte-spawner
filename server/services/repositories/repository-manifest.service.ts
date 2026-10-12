import { DeadByteBotManifestSchema, type DeadByteBotManifest } from '@deadbyte/runtime'
import { destr } from 'destr'
import { execaCommand } from 'execa'
import { access, readFile, writeFile } from 'node:fs/promises'
import { hash } from 'ohash'
import { join, resolve } from 'pathe'

export type LoadedRepositoryManifest = {
  manifest: DeadByteBotManifest
  manifestHash: string
  rawStdout: string
}

const OUTPUT_TAIL_LINES = 20

/**
 * Instalação e build do bot precisam das devDependencies (unbuild, typescript) e dos scripts
 * prepare de dependências git (o fork do whatsapp-web.js roda husky/is-ci). Com o NODE_ENV=production
 * do container, pnpm e npm pulam as devDependencies e o prepare falha. Os bots continuam rodando em produção.
 */
const BUILD_ENV = { NODE_ENV: 'development' }

/**
 * Roda o comando mostrando a saída nos logs do container e, se falhar, põe o fim da saída na
 * mensagem do erro: é ela que aparece no card de sincronização do painel.
 */
async function runVisible(command: string, cwd: string, env: Record<string, string> = {}): Promise<void> {
  const result = await execaCommand(command, {
    cwd,
    shell: true,
    stdout: ['pipe', 'inherit'],
    stderr: ['pipe', 'inherit'],
    all: true,
    reject: false,
    env: { ...process.env, ...env }
  })
  if (result.failed) {
    const tail = String(result.all ?? '').split('\n').map((line) => line.trimEnd()).filter(Boolean).slice(-OUTPUT_TAIL_LINES).join('\n')
    throw new Error(tail ? `${result.shortMessage}\n\n${tail}` : result.shortMessage)
  }
}

export class RepositoryManifestService {
  /**
   * Creates a pnpm-workspace.yaml in the repository directory if one doesn't exist.
   * This prevents pnpm from traversing up and detecting the spawner's workspace,
   * which would cause it to skip creating a local node_modules for the bot repo.
   */
  private async ensureIsolatedWorkspace(cwd: string): Promise<void> {
    const workspaceFile = join(cwd, 'pnpm-workspace.yaml')
    try {
      await access(workspaceFile)
    }
    catch {
      await writeFile(workspaceFile, '')
    }
  }

  /**
   * Patches file: dependencies in package.json whose target path doesn't exist
   * relative to the repo directory. Resolves them against the spawner root instead,
   * which is where packages like deadbyte-runtime actually live.
   */
  private async patchFileDependencies(cwd: string): Promise<void> {
    const pkgPath = join(cwd, 'package.json')
    const raw = await readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(raw) as Record<string, unknown>
    const spawnerRoot = resolve(process.cwd())

    let changed = false
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
      const deps = pkg[section] as Record<string, string> | undefined
      if (!deps) continue
      for (const [name, version] of Object.entries(deps)) {
        if (!version.startsWith('file:')) continue
        const relativePath = version.slice('file:'.length)
        const resolvedFromRepo = resolve(cwd, relativePath)
        try {
          await access(resolvedFromRepo)
        }
        catch {
          // Path doesn't exist relative to repo — try resolving from spawner root
          const resolvedFromSpawner = resolve(spawnerRoot, relativePath)
          try {
            await access(resolvedFromSpawner)
            deps[name] = `file:${resolvedFromSpawner}`
            changed = true
          }
          catch {
            // Not found anywhere; leave as-is and let install surface the real error
          }
        }
      }
    }

    if (changed) {
      await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    }
  }

  async install(cwd: string, command: string): Promise<void> {
    await this.ensureIsolatedWorkspace(cwd)
    await this.patchFileDependencies(cwd)
    await runVisible(`${command} --dangerously-allow-all-builds`, cwd, { ...BUILD_ENV, npm_config_dangerously_allow_all_builds: 'true' })
  }

  async build(cwd: string, command: string): Promise<void> {
    await runVisible(command, cwd, BUILD_ENV)
  }

  async load(cwd: string, command: string): Promise<LoadedRepositoryManifest> {
    const result = await execaCommand(command, { cwd, shell: true })
    const parsed = DeadByteBotManifestSchema.parse(destr<unknown>(result.stdout))
    return {
      manifest: parsed,
      manifestHash: hash(parsed),
      rawStdout: result.stdout
    }
  }
}
