import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://deadbyte:deadbyte@localhost:5432/deadbyte'

export const sqlClient = postgres(databaseUrl, {
  max: 10,
  prepare: false,
  onnotice: () => undefined
})

export const db = drizzle(sqlClient, { schema })

export type DeadByteDb = typeof db
