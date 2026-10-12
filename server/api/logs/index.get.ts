import { eventHandler } from 'h3'
import { listLogFiles } from '../../utils/log-files.js'

/** Lista os arquivos NDJSON de log (spawner e bots). Aceita sessão do painel ou DEADBYTE_LOGS_TOKEN. */
export default eventHandler(async () => ({ files: await listLogFiles() }))
