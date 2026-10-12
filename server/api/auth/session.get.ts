import { eventHandler } from 'h3'
import { adminPasswordProblem, isAuthBypassed, isAuthenticated } from '../../utils/auth.js'

export default eventHandler(async (event) => {
  const bypassed = isAuthBypassed()
  return {
    authenticated: await isAuthenticated(event),
    bypassed,
    problem: bypassed ? undefined : adminPasswordProblem()
  }
})
