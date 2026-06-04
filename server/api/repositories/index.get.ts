import { eventHandler } from 'h3'
import { RepositoryService } from '../../services/repositories/repository.service.js'

export default eventHandler(async () => {
  return await new RepositoryService().list()
})
