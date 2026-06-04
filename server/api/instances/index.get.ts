import { eventHandler } from 'h3'
import { InstanceService } from '../../services/instances/instance.service.js'

export default eventHandler(async () => {
  return await new InstanceService().list()
})
