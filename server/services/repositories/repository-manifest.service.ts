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
    await execaCommand(`${command} --dangerously-allow-all-builds`, {
      cwd,
      shell: true,
      stderr: 'inherit',
      stdout: 'inherit',
      env: { ...process.env, npm_config_dangerously_allow_all_builds: 'true' }
    })
  }

  async build(cwd: string, command: string): Promise<void> {
    await execaCommand(command, { cwd, shell: true, stderr: 'inherit', stdout: 'inherit' })
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
