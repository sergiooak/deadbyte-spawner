import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'
import type { DeadByteBotManifest } from '@deadbyte/runtime'

export const repository = pgTable(
  'repository',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    repositoryUrl: text('repository_url').notNull(),
    defaultBranch: text('default_branch').notNull().default('main'),
    packageManager: text('package_manager').notNull().default('pnpm'),
    installCommand: text('install_command').notNull().default('pnpm install'),
    buildCommand: text('build_command').notNull().default('pnpm build'),
    startCommand: text('start_command').notNull().default('node dist/cli/index.mjs start'),
    manifestCommand: text('manifest_command').notNull().default('pnpm manifest'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    packageManagerCheck: check('repository_package_manager_check', sql`${table.packageManager} in ('pnpm', 'npm', 'yarn', 'bun')`)
  })
)

export const repositoryVersion = pgTable(
  'repository_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    repositorySlug: text('repository_slug')
      .notNull()
      .references(() => repository.slug),
    branch: text('branch').notNull(),
    commitHash: text('commit_hash').notNull(),
    version: text('version'),
    manifestHash: text('manifest_hash').notNull(),
    manifestJson: jsonb('manifest_json').notNull().$type<DeadByteBotManifest>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    repositoryCommitUnique: uniqueIndex('repository_version_repository_slug_commit_hash_unique').on(
      table.repositorySlug,
      table.commitHash
    ),
    repositoryCreatedAtIndex: index('repository_version_repository_slug_created_at_idx').on(table.repositorySlug, table.createdAt)
  })
)

export const command = pgTable(
  'command',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    repositorySlug: text('repository_slug')
      .notNull()
      .references(() => repository.slug),
    commandKey: text('command_key').notNull(),
    group: text('group').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    defaultEnabled: boolean('default_enabled').notNull().default(true),
    defaultOwnerOnly: boolean('default_owner_only').notNull().default(false),
    supportsPrivate: boolean('supports_private').notNull().default(true),
    supportsGroups: boolean('supports_groups').notNull().default(true),
    supportsImplicit: boolean('supports_implicit').notNull().default(false),
    configFields: jsonb('config_fields').notNull().default(sql`'[]'::jsonb`).$type<unknown[]>(),
    status: text('status').notNull().default('active'),
    firstSeenVersionId: uuid('first_seen_version_id').references(() => repositoryVersion.id),
    lastSeenVersionId: uuid('last_seen_version_id').references(() => repositoryVersion.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    repositoryCommandUnique: uniqueIndex('command_repository_slug_command_key_unique').on(table.repositorySlug, table.commandKey),
    statusCheck: check('command_status_check', sql`${table.status} in ('active', 'deprecated', 'removed')`),
    repositoryStatusIndex: index('command_repository_slug_status_idx').on(table.repositorySlug, table.status),
    repositoryCommandIndex: index('command_repository_slug_command_key_idx').on(table.repositorySlug, table.commandKey)
  })
)

export const commandAlias = pgTable(
  'command_alias',
  {
    repositorySlug: text('repository_slug')
      .notNull()
      .references(() => repository.slug),
    normalizedAlias: text('normalized_alias').notNull(),
    commandId: uuid('command_id')
      .notNull()
      .references(() => command.id),
    alias: text('alias').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    // O mesmo alias pode pertencer a mais de um comando: o match() de cada comando desempata (ex.: com ou sem argumentos).
    pk: primaryKey({ name: 'command_alias_pk', columns: [table.repositorySlug, table.commandId, table.normalizedAlias] }),
    commandIdIndex: index('command_alias_command_id_idx').on(table.commandId),
    repositoryAliasIndex: index('command_alias_repository_slug_normalized_alias_idx').on(table.repositorySlug, table.normalizedAlias)
  })
)

export const instance = pgTable(
  'instance',
  {
    slug: text('slug').primaryKey(),
    repositorySlug: text('repository_slug')
      .notNull()
      .references(() => repository.slug),
    repositoryVersionId: uuid('repository_version_id').references(() => repositoryVersion.id),
    name: text('name').notNull(),
    clientId: text('client_id').notNull().unique(),
    status: text('status').notNull().default('created'),
    mode: text('mode').notNull().default('managed'),
    branch: text('branch').notNull(),
    commitHash: text('commit_hash'),
    sessionPath: text('session_path').notNull(),
    repoPath: text('repo_path').notNull(),
    runtimeConfigPath: text('runtime_config_path').notNull(),
    internalHost: text('internal_host').notNull().default('127.0.0.1'),
    internalPort: integer('internal_port'),
    lastQr: text('last_qr'),
    autoStart: boolean('auto_start').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    stoppedAt: timestamp('stopped_at', { withTimezone: true }),
    lastReadyAt: timestamp('last_ready_at', { withTimezone: true }),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true })
  },
  (table) => ({
    statusCheck: check(
      'instance_status_check',
      sql`${table.status} in ('created', 'installing', 'stopped', 'starting', 'waiting_qr', 'authenticated', 'ready', 'disconnected', 'stopping', 'crashed', 'error')`
    ),
    modeCheck: check('instance_mode_check', sql`${table.mode} in ('standalone', 'managed')`),
    repositoryIndex: index('instance_repository_slug_idx').on(table.repositorySlug),
    statusIndex: index('instance_status_idx').on(table.status)
  })
)

export const instanceCommand = pgTable(
  'instance_command',
  {
    instanceSlug: text('instance_slug')
      .notNull()
      .references(() => instance.slug),
    commandId: uuid('command_id')
      .notNull()
      .references(() => command.id),
    enabled: boolean('enabled').notNull().default(true),
    ownerOnly: boolean('owner_only').notNull().default(false),
    descriptionOverride: text('description_override'),
    disabledMessage: text('disabled_message'),
    config: jsonb('config').notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.instanceSlug, table.commandId] }),
    instanceEnabledIndex: index('instance_command_instance_slug_enabled_idx').on(table.instanceSlug, table.enabled),
    commandIdIndex: index('instance_command_command_id_idx').on(table.commandId)
  })
)

export const instanceCommandAlias = pgTable(
  'instance_command_alias',
  {
    instanceSlug: text('instance_slug')
      .notNull()
      .references(() => instance.slug),
    normalizedAlias: text('normalized_alias').notNull(),
    commandId: uuid('command_id')
      .notNull()
      .references(() => command.id),
    alias: text('alias').notNull(),
    source: text('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ name: 'instance_command_alias_pk', columns: [table.instanceSlug, table.commandId, table.normalizedAlias] }),
    instanceAliasIndex: index('instance_command_alias_instance_slug_normalized_alias_idx').on(table.instanceSlug, table.normalizedAlias),
    sourceCheck: check('instance_command_alias_source_check', sql`${table.source} in ('default', 'custom')`),
    commandIdIndex: index('instance_command_alias_command_id_idx').on(table.commandId)
  })
)

export const runtimeEvent = pgTable(
  'runtime_event',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    instanceSlug: text('instance_slug').references(() => instance.slug),
    eventName: text('event_name').notNull(),
    level: text('level').notNull(),
    message: text('message'),
    payload: jsonb('payload').$type<Record<string, unknown> | null>(),
    error: jsonb('error').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    levelCheck: check('runtime_event_level_check', sql`${table.level} in ('debug', 'info', 'warn', 'error', 'fatal')`),
    instanceCreatedAtIndex: index('runtime_event_instance_slug_created_at_idx').on(table.instanceSlug, table.createdAt)
  })
)

export const runtimeProcessLog = pgTable(
  'runtime_process_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    instanceSlug: text('instance_slug')
      .notNull()
      .references(() => instance.slug),
    stream: text('stream').notNull(),
    line: text('line').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    streamCheck: check('runtime_process_log_stream_check', sql`${table.stream} in ('stdout', 'stderr')`),
    instanceCreatedAtIndex: index('runtime_process_log_instance_slug_created_at_idx').on(table.instanceSlug, table.createdAt)
  })
)

export const seenContact = pgTable(
  'seen_contact',
  {
    instanceSlug: text('instance_slug')
      .notNull()
      .references(() => instance.slug),
    wid: text('wid').notNull(),
    number: text('number'),
    name: text('name'),
    pushname: text('pushname'),
    isMyContact: boolean('is_my_contact'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.instanceSlug, table.wid] }),
    lastSeenIndex: index('seen_contact_instance_slug_last_seen_at_idx').on(table.instanceSlug, table.lastSeenAt)
  })
)

export const seenChat = pgTable(
  'seen_chat',
  {
    instanceSlug: text('instance_slug')
      .notNull()
      .references(() => instance.slug),
    wid: text('wid').notNull(),
    name: text('name'),
    isGroup: boolean('is_group'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.instanceSlug, table.wid] }),
    lastSeenIndex: index('seen_chat_instance_slug_last_seen_at_idx').on(table.instanceSlug, table.lastSeenAt)
  })
)

export const commandExecution = pgTable(
  'command_execution',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    instanceSlug: text('instance_slug')
      .notNull()
      .references(() => instance.slug),
    commandId: uuid('command_id').references(() => command.id),
    commandKey: text('command_key').notNull(),
    repositoryVersionId: uuid('repository_version_id'),
    chatWid: text('chat_wid'),
    contactWid: text('contact_wid'),
    messageId: text('message_id'),
    triggerAlias: text('trigger_alias'),
    status: text('status').notNull(),
    durationMs: integer('duration_ms'),
    input: jsonb('input').$type<Record<string, unknown> | null>(),
    output: jsonb('output').$type<Record<string, unknown> | null>(),
    error: jsonb('error').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    statusCheck: check('command_execution_status_check', sql`${table.status} in ('success', 'error', 'ignored', 'blocked')`),
    repositoryVersionFk: foreignKey({
      columns: [table.repositoryVersionId],
      foreignColumns: [repositoryVersion.id],
      name: 'cmd_exec_repo_version_id_fk'
    }),
    instanceCreatedAtIndex: index('command_execution_instance_slug_created_at_idx').on(table.instanceSlug, table.createdAt),
    commandCreatedAtIndex: index('command_execution_command_id_created_at_idx').on(table.commandId, table.createdAt),
    chatCreatedAtIndex: index('command_execution_chat_wid_created_at_idx').on(table.chatWid, table.createdAt),
    contactCreatedAtIndex: index('command_execution_contact_wid_created_at_idx').on(table.contactWid, table.createdAt),
    commandKeyCreatedAtIndex: index('command_execution_command_key_created_at_idx').on(table.commandKey, table.createdAt)
  })
)

export const messageEvent = pgTable(
  'message_event',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    instanceSlug: text('instance_slug')
      .notNull()
      .references(() => instance.slug),
    chatWid: text('chat_wid'),
    contactWid: text('contact_wid'),
    messageId: text('message_id'),
    direction: text('direction').notNull(),
    chatType: text('chat_type'),
    messageType: text('message_type'),
    hasCommand: boolean('has_command').notNull().default(false),
    commandId: uuid('command_id').references(() => command.id),
    commandKey: text('command_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    directionCheck: check('message_event_direction_check', sql`${table.direction} in ('incoming', 'outgoing')`),
    chatTypeCheck: check('message_event_chat_type_check', sql`${table.chatType} is null or ${table.chatType} in ('private', 'group')`),
    instanceCreatedAtIndex: index('message_event_instance_slug_created_at_idx').on(table.instanceSlug, table.createdAt),
    instanceChatIndex: index('message_event_instance_slug_chat_wid_idx').on(table.instanceSlug, table.chatWid),
    instanceContactIndex: index('message_event_instance_slug_contact_wid_idx').on(table.instanceSlug, table.contactWid),
    commandCreatedAtIndex: index('message_event_command_id_created_at_idx').on(table.commandId, table.createdAt)
  })
)

export const instanceDailyStat = pgTable(
  'instance_daily_stat',
  {
    instanceSlug: text('instance_slug')
      .notNull()
      .references(() => instance.slug),
    date: date('date').notNull(),
    privateChatCount: integer('private_chat_count').notNull().default(0),
    groupChatCount: integer('group_chat_count').notNull().default(0),
    contactCount: integer('contact_count').notNull().default(0),
    incomingMessageCount: integer('incoming_message_count').notNull().default(0),
    outgoingMessageCount: integer('outgoing_message_count').notNull().default(0),
    commandExecutionCount: integer('command_execution_count').notNull().default(0),
    commandSuccessCount: integer('command_success_count').notNull().default(0),
    commandErrorCount: integer('command_error_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.instanceSlug, table.date] })
  })
)
