// Um ícone Nucleo Pixel por comando do bot. Decisões de conceito em icons/map.json.
// Comando novo sem entrada aqui cai no ícone do grupo (GROUP_ICONS).
export const COMMAND_ICONS: Record<string, string> = {
  'system.replyable-dispatch': 'i-nucleo-arrow-turn-left',
  'system.menu': 'i-nucleo-bullet-list',
  'system.ping': 'i-nucleo-radar',
  'system.status': 'i-nucleo-gauge',
  'system.time': 'i-nucleo-clock',
  'media.grayscale': 'i-nucleo-contrast',
  'media.gayflag': 'i-nucleo-flag-7',
  'media.craque': 'i-nucleo-medal',
  'group.config': 'i-nucleo-sliders',
  'group.config-on': 'i-nucleo-toggle',
  'group.config-off': 'i-nucleo-toggle',
  'group.config-set': 'i-nucleo-pen',
  'group.open': 'i-nucleo-lock-open',
  'group.close': 'i-nucleo-lock',
  'group.promote': 'i-nucleo-arrow-up',
  'group.demote': 'i-nucleo-user-minus',
  'group.ban': 'i-nucleo-user-xmark',
  'group.add': 'i-nucleo-user-plus',
  'group.delete': 'i-nucleo-trash-xmark',
  'group.call-admins': 'i-nucleo-bell',
  'group.everyone': 'i-nucleo-at-sign',
  'group.giveaway': 'i-nucleo-gift',
  'group.giveaway-admins': 'i-nucleo-ticket',
  'group.russian-roulette': 'i-nucleo-target',
  'group.rules': 'i-nucleo-gavel',
  'group.membership-requests': 'i-nucleo-door-open',
  'sticker.create': 'i-nucleo-face-smile-wink',
  'sticker.fit': 'i-nucleo-expand',
  'sticker.crop': 'i-nucleo-crop',
  'sticker.stretch': 'i-nucleo-arrows-expand-x-2',
  'sticker.steal': 'i-nucleo-incognito',
  'sticker.bg': 'i-nucleo-eraser',
  'sticker.to-media': 'i-nucleo-image',
  'sticker.ly-search': 'i-nucleo-magnifier',
  'sticker.ly-pack': 'i-nucleo-box-2',
  'sticker.ly-trending': 'i-nucleo-chart-line',
  'sticker.attp': 'i-nucleo-sparkle',
  'sticker.ttp': 'i-nucleo-text-tool',
  'bible.implicit-verse': 'i-nucleo-book',
  'bible.get-verse': 'i-nucleo-quote',
  'bible.get-chapter': 'i-nucleo-bookmark',
  'bible.random-verse': 'i-nucleo-dice-2',
  'bible.random-chapter': 'i-nucleo-book-open',
  'bible.search': 'i-nucleo-book-search',
  'bible.search-all': 'i-nucleo-book-search',
  'fun.emoji': 'i-nucleo-face-smile',
  'fun.react': 'i-nucleo-heart-2',
  'fun.boot-correction': 'i-nucleo-robot',
  'fun.cat': 'i-nucleo-circle-cat',
  'fun.coin': 'i-nucleo-hand-holding-coin',
  'fun.dice': 'i-nucleo-dice-6',
  'fun.dog': 'i-nucleo-dog',
  'fun.fontes': 'i-nucleo-text-size',
  'fun.math': 'i-nucleo-calculator',
  'fun.meme': 'i-nucleo-face-smile-2',
  'utility.cep': 'i-nucleo-map-pin',
  'utility.jev': 'i-nucleo-brain-sparkle',
  'utility.ddd': 'i-nucleo-phone',
  'utility.ddi': 'i-nucleo-globe',
  'music.play': 'i-nucleo-music-note',
  'music.lyrics': 'i-nucleo-microphone'
}

export const GROUP_ICONS: Record<string, string> = {
  sticker: 'i-nucleo-face-smile-wink',
  stickers: 'i-nucleo-face-smile-wink',
  fun: 'i-nucleo-dice-2',
  bible: 'i-nucleo-book-open',
  music: 'i-nucleo-music-note',
  media: 'i-nucleo-image',
  utility: 'i-nucleo-wrench',
  group: 'i-nucleo-people',
  groups: 'i-nucleo-people',
  system: 'i-nucleo-gear'
}

export function commandIcon(commandId?: string, group?: string): string {
  if (!commandId) return 'i-nucleo-chat-bubble'
  return COMMAND_ICONS[commandId] ?? GROUP_ICONS[group ?? commandId.split('.')[0] ?? ''] ?? 'i-nucleo-console'
}

/** Ícone e cor de cada resultado de uma ação. */
export const OUTCOME_META = {
  running: { label: 'rodando', icon: 'i-nucleo-loader', tone: 'info' },
  ok: { label: 'ok', icon: 'i-nucleo-circle-check', tone: 'success' },
  error: { label: 'erro', icon: 'i-nucleo-circle-xmark', tone: 'error' },
  denied: { label: 'sem permissão', icon: 'i-nucleo-lock', tone: 'warning' },
  disabled: { label: 'desativado', icon: 'i-nucleo-ban', tone: 'neutral' },
  ignored: { label: 'sem comando', icon: 'i-nucleo-chat-bubble', tone: 'neutral' }
} as const

export type Outcome = keyof typeof OUTCOME_META

/** Nome amigável de cada passo, usado no detalhe ao passar o mouse. */
export const STEP_LABELS: Record<string, string> = {
  'message.received': 'Mensagem recebida',
  'message.ignored': 'Sem comando',
  'command.matched': 'Comando reconhecido',
  'command.disabled': 'Comando desativado',
  'command.permission_denied': 'Sem permissão',
  'command.executed': 'Concluído',
  'command.failed': 'Falhou',
  'command.error': 'Erro tratado',
  'sticker.render.started': 'Gerando figurinha',
  'sticker.render.completed': 'Figurinha pronta',
  'sticker.render.failed': 'Falha na figurinha',
  'sticker.compressed': 'Figurinha comprimida',
  'sticker.created': 'Figurinha criada'
}
