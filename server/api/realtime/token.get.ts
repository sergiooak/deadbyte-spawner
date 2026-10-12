import { eventHandler } from 'h3'
import { issueRealtimeToken } from '../../utils/realtime-token.js'

// A rota passa pelo middleware de login; o token só abre o WebSocket por 60 segundos.
export default eventHandler(() => ({ token: issueRealtimeToken() }))
