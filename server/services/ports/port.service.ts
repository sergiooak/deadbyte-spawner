import { createServer } from 'node:net'
import { readSpawnerEnv } from '../../utils/env.js'

export class PortService {
  async findAvailablePort(): Promise<number> {
    const env = readSpawnerEnv()
    for (let port = env.DEADBYTE_INTERNAL_PORT_START; port <= env.DEADBYTE_INTERNAL_PORT_END; port += 1) {
      if (await this.isAvailable(port, env.DEADBYTE_INTERNAL_HOST)) {
        return port
      }
    }
    throw new Error('No internal API port is available.')
  }

  private async isAvailable(port: number, host: string): Promise<boolean> {
    return await new Promise((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close(() => resolve(true))
      })
      server.listen(port, host)
    })
  }
}
