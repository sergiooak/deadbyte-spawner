import { rm } from 'node:fs/promises'
import { spawnerPaths } from '../../utils/paths.js'

export class SessionService {
  async clear(instanceSlug: string): Promise<void> {
    await rm(spawnerPaths().sessionPath(instanceSlug), { force: true, recursive: true })
  }
}
