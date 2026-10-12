import { eventHandler, getQuery } from 'h3'
import { collectEvents } from '../../utils/log-files.js'

/**
 * Atalho para revisão: erros e avisos de todos os serviços nos últimos N dias (padrão 7),
 * já com why/fix quando o erro é estruturado. /api/logs/issues?days=3&levels=error
 */
export default eventHandler(async (event) => {
  const query = getQuery(event)
  const days = Math.min(Math.max(Number(query.days ?? 7) || 7, 1), 180)
  const levels = typeof query.levels === 'string' ? query.levels.split(',') : ['error', 'warn']
  const limit = Math.min(Number(query.limit ?? 500) || 500, 5000)
  const events = await collectEvents({ days, levels, limit })
  return { days, levels, count: events.length, events }
})
