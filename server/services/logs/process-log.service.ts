import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { runtimeProcessLog } from '../../db/schema/index.js'

export class ProcessLogService {
  async append(instanceSlug: string, stream: 'stdout' | 'stderr', line: string) {
    await db.insert(runtimeProcessLog).values({ instanceSlug, stream, line })
  }

  async list(instanceSlug: string, limit = 200) {
    return await db
      .select()
      .from(runtimeProcessLog)
      .where(eq(runtimeProcessLog.instanceSlug, instanceSlug))
      .orderBy(desc(runtimeProcessLog.createdAt))
      .limit(limit)
  }
}
