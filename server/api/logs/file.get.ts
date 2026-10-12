import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { createError, eventHandler, getQuery, sendStream, setResponseHeader } from 'h3'
import { isValidLogFile, logFilePath } from '../../utils/log-files.js'

/** Baixa um arquivo NDJSON: /api/logs/file?scope=bots/nitro&name=2026-10-12.jsonl */
export default eventHandler(async (event) => {
  const { scope, name } = getQuery(event)
  if (typeof scope !== 'string' || typeof name !== 'string' || !isValidLogFile(scope, name)) {
    throw createError({ statusCode: 400, statusMessage: 'Use scope=spawner|bots/<instância> e name=AAAA-MM-DD.jsonl.' })
  }
  const path = logFilePath(scope, name)
  await access(path).catch(() => {
    throw createError({ statusCode: 404, statusMessage: 'Arquivo de log não encontrado.' })
  })
  setResponseHeader(event, 'content-type', 'application/x-ndjson; charset=utf-8')
  return sendStream(event, createReadStream(path))
})
