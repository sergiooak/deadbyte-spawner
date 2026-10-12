export type InstanceStatus =
  | 'created'
  | 'installing'
  | 'stopped'
  | 'starting'
  | 'waiting_qr'
  | 'authenticated'
  | 'ready'
  | 'disconnected'
  | 'stopping'
  | 'crashed'
  | 'error'

export type Instance = {
  slug: string
  repositorySlug: string
  repositoryVersionId: string | null
  name: string
  clientId: string
  status: InstanceStatus
  mode: string
  branch: string
  commitHash: string | null
  sessionPath: string
  repoPath: string
  runtimeConfigPath: string
  internalHost: string
  internalPort: number | null
  lastQr: string | null
  autoStart: boolean
  createdAt: string
  updatedAt: string
  startedAt: string | null
  stoppedAt: string | null
  lastReadyAt: string | null
  lastHeartbeatAt: string | null
}

export type Repository = {
  slug: string
  name: string
  repositoryUrl: string
  defaultBranch: string
  packageManager: string
  installCommand: string
  buildCommand: string
  startCommand: string
  manifestCommand: string
  createdAt: string
  updatedAt: string
  syncing?: boolean
}

export type RepositoryCommand = {
  id: string
  repositorySlug: string
  commandKey: string
  group: string
  name: string
  description: string | null
  defaultEnabled: boolean
  defaultOwnerOnly: boolean
  supportsPrivate: boolean
  supportsGroups: boolean
  supportsImplicit: boolean
  status: 'active' | 'deprecated' | 'removed'
  updatedAt: string
}

export type RepositoryVersion = {
  id: string
  branch: string
  commitHash: string
  version: string | null
  manifestHash: string
  createdAt: string
}

export type SyncResult = {
  addedCommands: number
  updatedCommands: number
  removedCommands: number
  aliasesCount: number
  repositoryVersionId: string
  commitHash: string
  durationMs: number
}

export type InstanceCommand = {
  commandId: string
  commandKey: string
  name: string
  group: string
  description: string | null
  status: string
  supportsPrivate: boolean
  supportsGroups: boolean
  enabled: boolean
  ownerOnly: boolean
  descriptionOverride: string | null
  disabledMessage: string | null
  config: Record<string, unknown>
  aliases: string[]
}

export type ProcessLog = {
  id: number
  instanceSlug: string
  stream: 'stdout' | 'stderr'
  line: string
  createdAt: string
}

export type RuntimeEvent = {
  id: number
  instanceSlug: string | null
  eventName: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string | null
  payload: Record<string, unknown> | null
  error: Record<string, unknown> | null
  createdAt: string
}

export type SpawnerSettings = {
  nodeVersion: string
  platform: string
  uptimeSeconds: number
  runningInstances: string[]
  paths: Record<'data' | 'repos' | 'instances' | 'sessions', string>
  bot: {
    defaultRepositoryUrl: string
    defaultBranch: string
    internalHost: string
    portRange: string
    chromePath: string | null
    ffmpegPath: string | null
    rembgUrl: string | null
    logRetentionDays: number
  }
  secrets: Record<string, boolean>
}

export type AuthSession = {
  authenticated: boolean
  bypassed: boolean
  problem?: string
}
