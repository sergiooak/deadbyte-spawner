<template>
  <UEmpty
    v-if="status !== 'ready'"
    icon="i-nucleo-link-broken"
    title="WhatsApp não conectado"
    description="O controle remoto usa a sessão do bot: conecte a instância primeiro."
    variant="subtle"
  />

  <div v-else class="grid min-h-[calc(100dvh-14rem)] gap-px bg-(--ui-border) ring ring-default lg:grid-cols-[22rem_1fr]">
    <!-- Lista de chats -->
    <section class="flex min-h-0 flex-col bg-black">
      <div class="space-y-2 border-b border-default p-3">
        <div class="flex gap-2">
          <UInput v-model="search" icon="i-nucleo-magnifier" placeholder="Buscar chat…" class="flex-1" />
          <UTooltip text="Recarregar">
            <UButton color="neutral" variant="outline" icon="i-nucleo-arrow-rotate-clockwise" :loading="loadingChats" aria-label="Recarregar chats" @click="loadChats" />
          </UTooltip>
        </div>
        <UTabs v-model="filter" :items="filters" :content="false" size="xs" class="w-full" :ui="{ list: 'w-full', trigger: 'flex-1' }" />
      </div>
      <div class="log-scroll min-h-0 flex-1 overflow-y-auto">
        <p v-if="!filtered.length" class="p-6 text-center text-sm text-muted">{{ loadingChats ? 'Carregando…' : 'Nenhum chat.' }}</p>
        <button
          v-for="chat in filtered"
          :key="chat.id"
          type="button"
          class="flex w-full items-center gap-3 border-b border-default/60 px-3 py-2.5 text-start transition hover:bg-elevated/60"
          :class="selectedId === chat.id ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : ''"
          @click="select(chat.id)"
        >
          <span class="grid size-8 shrink-0 place-items-center bg-elevated text-muted">
            <UIcon :name="chat.isGroup ? 'i-nucleo-people' : 'i-nucleo-person'" class="size-4" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-highlighted">{{ chat.name || 'Sem nome' }}</span>
            <span class="flex items-center gap-1.5 font-mono text-[10px] text-dimmed">
              <span>{{ chat.isGroup ? `grupo · ${chat.participantsCount ?? '?'} membros` : 'privado' }}</span>
              <UIcon v-if="chat.pinned" name="i-nucleo-star" class="size-3" />
              <UIcon v-if="chat.isMuted" name="i-nucleo-eye-slash" class="size-3" />
              <UIcon v-if="chat.archived" name="i-nucleo-box-2" class="size-3" />
            </span>
          </span>
          <UBadge v-if="chat.unreadCount" size="sm">{{ chat.unreadCount }}</UBadge>
        </button>
      </div>
      <p class="border-t border-default px-3 py-1.5 font-mono text-[10px] text-dimmed">{{ filtered.length }} de {{ chats.length }} chats · nada disso é salvo no painel</p>
    </section>

    <!-- Chat selecionado -->
    <section class="flex min-h-0 flex-col bg-black">
      <div v-if="!selected" class="grid flex-1 place-items-center p-8">
        <UEmpty icon="i-nucleo-chat-bubble" title="Escolha um chat" description="Mande mensagens, arquivos e gerencie grupos como se fosse o próprio bot." variant="naked" />
      </div>

      <template v-else>
        <header class="flex flex-wrap items-center gap-3 border-b border-default p-3">
          <span class="grid size-10 place-items-center bg-primary/10 text-primary ring ring-inset ring-primary/40">
            <UIcon :name="selected.isGroup ? 'i-nucleo-people' : 'i-nucleo-person'" class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-pixel text-lg text-highlighted">{{ selected.name || 'Sem nome' }}</p>
            <p class="font-mono text-[11px] text-muted">{{ selected.isGroup ? `grupo · ${selected.participants.length} membros` : 'conversa privada' }}</p>
          </div>
          <UDropdownMenu :items="actionItems" :content="{ align: 'end' }">
            <UButton color="neutral" variant="outline" icon="i-nucleo-dots" trailing-icon="i-nucleo-chevron-down">Ações</UButton>
          </UDropdownMenu>
        </header>

        <div class="log-scroll min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
          <!-- Enviar -->
          <UForm :state="message" class="space-y-3" @submit="send">
            <UFormField label="Mensagem" name="text">
              <UTextarea v-model="message.text" :rows="4" autoresize placeholder="Escreva como o bot… *negrito*, _itálico_ e ~riscado~ funcionam" class="w-full" @keydown.ctrl.enter="send" />
            </UFormField>
            <div class="flex flex-wrap items-center gap-3">
              <USelect v-model="message.mode" :items="sendModes" class="w-40" aria-label="Enviar como" />
              <template v-if="message.mode === 'text'">
                <UButton color="neutral" variant="outline" icon="i-nucleo-image" @click="fileInput?.click()">{{ attachment ? attachment.filename : 'Anexar arquivo' }}</UButton>
                <UButton v-if="attachment" color="neutral" variant="ghost" icon="i-nucleo-xmark" aria-label="Remover anexo" @click="attachment = null" />
                <USwitch v-if="selected.isGroup" v-model="message.mentionAll" label="Mencionar todos" />
              </template>
              <p v-else class="font-mono text-xs text-muted">O texto vira figurinha, como no !{{ message.mode }}.</p>
              <UButton type="submit" icon="i-nucleo-paper-plane-2" class="ms-auto" :loading="sending" :disabled="message.mode === 'text' ? !message.text.trim() && !attachment : !message.text.trim()">Enviar</UButton>
            </div>
            <input ref="fileInput" type="file" class="hidden" @change="onFile" />
          </UForm>

          <!-- Grupo -->
          <template v-if="selected.isGroup">
            <USeparator label="Grupo" />
            <UForm :state="group" class="space-y-3" @submit="saveGroup">
              <UFormField label="Nome do grupo">
                <UInput v-model="group.subject" :maxlength="100" class="w-full" />
              </UFormField>
              <UFormField label="Descrição">
                <UTextarea v-model="group.description" :rows="3" autoresize class="w-full" />
              </UFormField>
              <div class="grid gap-3 sm:grid-cols-2">
                <USwitch v-model="group.messagesAdminsOnly" label="Só admins mandam mensagem" />
                <USwitch v-model="group.infoAdminsOnly" label="Só admins editam dados" />
              </div>
              <p class="font-mono text-[11px] text-dimmed">O bot precisa ser admin do grupo para mudar essas opções.</p>
              <div class="flex justify-end">
                <UButton type="submit" icon="i-nucleo-floppy-disk" :loading="savingGroup">Salvar grupo</UButton>
              </div>
            </UForm>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <p class="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Membros</p>
                <UButton size="xs" color="neutral" variant="ghost" :icon="revealNumbers ? 'i-nucleo-eye-slash' : 'i-nucleo-eye'" @click="revealNumbers = !revealNumbers">
                  {{ revealNumbers ? 'Ocultar números' : 'Mostrar números' }}
                </UButton>
              </div>
              <ul class="grid gap-px bg-(--ui-border) sm:grid-cols-2">
                <li v-for="member in selected.participants" :key="member.id" class="flex items-center justify-between gap-2 bg-black px-3 py-1.5 font-mono text-xs">
                  <span class="text-toned">{{ revealNumbers ? `+${member.user}` : maskUser(member.user) }}</span>
                  <UBadge v-if="member.isSuperAdmin || member.isAdmin" :color="member.isSuperAdmin ? 'primary' : 'neutral'" variant="subtle" size="sm">{{ member.isSuperAdmin ? 'dono' : 'admin' }}</UBadge>
                </li>
              </ul>
            </div>
          </template>
        </div>
      </template>
    </section>

    <ConfirmModal
      v-model:open="confirm.open"
      :title="confirm.title"
      :description="confirm.description"
      :action-label="confirm.label"
      icon="i-nucleo-triangle-warning"
      :action="confirm.run"
    />
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'

type ChatSummary = {
  id: string
  name: string
  isGroup: boolean
  isMuted: boolean
  archived: boolean
  pinned: boolean
  unreadCount: number
  timestamp: string | null
  participantsCount: number | null
}
type ChatDetail = ChatSummary & {
  description: string | null
  participants: Array<{ id: string; user: string; isAdmin: boolean; isSuperAdmin: boolean }>
}

const props = defineProps<{ slug: string; status?: string | null }>()
const base = computed(() => `/api/instances/${props.slug}/bot`)
const chatUrl = (id: string) => `${base.value}/chats/${encodeURIComponent(id)}`

const chats = ref<ChatSummary[]>([])
const loadingChats = ref(false)
const search = ref('')
const filter = ref<'all' | 'groups' | 'private' | 'unread'>('all')
const filters: TabsItem[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Grupos', value: 'groups' },
  { label: 'Privados', value: 'private' },
  { label: 'Não lidos', value: 'unread' }
]

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return chats.value.filter((chat) => {
    if (filter.value === 'groups' && !chat.isGroup) return false
    if (filter.value === 'private' && chat.isGroup) return false
    if (filter.value === 'unread' && !chat.unreadCount) return false
    return !term || chat.name?.toLowerCase().includes(term)
  })
})

async function loadChats() {
  if (props.status !== 'ready') return
  loadingChats.value = true
  chats.value = (await withToast(() => apiRequest<ChatSummary[]>(`${base.value}/chats`), { error: 'Não foi possível listar os chats' })) ?? []
  loadingChats.value = false
}
watch(() => props.status, loadChats)
onMounted(loadChats)

// Chat selecionado
const selectedId = ref<string>()
const selected = ref<ChatDetail | null>(null)
const group = reactive({ subject: '', description: '', messagesAdminsOnly: false, infoAdminsOnly: false })
const revealNumbers = ref(false)

async function select(id: string) {
  selectedId.value = id
  revealNumbers.value = false
  const detail = await withToast(() => apiRequest<ChatDetail>(chatUrl(id)), { error: 'Não foi possível abrir o chat' })
  if (!detail) return
  selected.value = detail
  Object.assign(group, { subject: detail.name ?? '', description: detail.description ?? '', messagesAdminsOnly: false, infoAdminsOnly: false })
}

function maskUser(user: string) {
  return user.length <= 6 ? '*'.repeat(user.length) : `+${user.slice(0, 4)}${'*'.repeat(user.length - 6)}${user.slice(-2)}`
}

// Envio
type SendMode = 'text' | 'ttp' | 'ttp2' | 'ttp3'
const sendModes: Array<{ label: string; value: SendMode }> = [
  { label: 'Texto / arquivo', value: 'text' },
  { label: 'Figurinha TTP', value: 'ttp' },
  { label: 'Figurinha TTP 2', value: 'ttp2' },
  { label: 'Figurinha TTP 3', value: 'ttp3' }
]
const TTP_STYLES: Record<Exclude<SendMode, 'text'>, 1 | 2 | 3> = { ttp: 1, ttp2: 2, ttp3: 3 }
const message = reactive<{ text: string; mentionAll: boolean; mode: SendMode }>({ text: '', mentionAll: false, mode: 'text' })
const attachment = ref<{ base64: string; mimeType: string; filename: string } | null>(null)
const fileInput = ref<HTMLInputElement>()
const sending = ref(false)

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    useToast().add({ title: 'Arquivo grande demais', description: 'O limite é 10 MB.', color: 'error', icon: 'i-nucleo-circle-xmark' })
    return
  }
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
  attachment.value = { base64: dataUrl.split(',')[1]!, mimeType: file.type || 'application/octet-stream', filename: file.name }
}

async function send() {
  const asTtp = message.mode !== 'text'
  if (!selected.value || (!message.text.trim() && (asTtp || !attachment.value))) return
  sending.value = true
  const body = asTtp
    ? { text: message.text.trim(), ttpStyle: TTP_STYLES[message.mode as Exclude<SendMode, 'text'>] }
    : { text: message.text || undefined, media: attachment.value ?? undefined, mentionAll: message.mentionAll || undefined }
  const result = await withToast(
    () => apiRequest(`${chatUrl(selected.value!.id)}/messages`, { method: 'POST', body }),
    { success: asTtp ? 'Figurinha enviada' : 'Mensagem enviada', error: 'Não foi possível enviar' }
  )
  sending.value = false
  if (result) {
    message.text = ''
    attachment.value = null
  }
}

// Grupo
const savingGroup = ref(false)
async function saveGroup() {
  if (!selected.value) return
  savingGroup.value = true
  const detail = await withToast(() => apiRequest<ChatDetail>(`${chatUrl(selected.value!.id)}/group`, { method: 'PATCH', body: { ...group } }), {
    success: 'Grupo atualizado',
    error: 'Não foi possível atualizar o grupo'
  })
  savingGroup.value = false
  if (detail) selected.value = detail
}

// Ações
const confirm = reactive({ open: false, title: '', description: '', label: '', run: async () => {} })

async function runAction(action: string, success: string) {
  if (!selected.value) return
  const result = await withToast(() => apiRequest(`${chatUrl(selected.value!.id)}/actions`, { method: 'POST', body: { action } }), { success, error: 'A ação falhou' })
  if (result) await loadChats()
}

function ask(title: string, description: string, label: string, action: string, success: string) {
  Object.assign(confirm, {
    open: true,
    title,
    description,
    label,
    run: async () => {
      await runAction(action, success)
      if (action === 'delete' || action === 'leave') selected.value = null
    }
  })
}

async function copyInvite() {
  if (!selected.value) return
  const result = await withToast(() => apiRequest<{ link: string }>(`${chatUrl(selected.value!.id)}/invite-link`), { error: 'Não foi possível pegar o link (o bot é admin?)' })
  if (result) {
    await navigator.clipboard.writeText(result.link)
    useToast().add({ title: 'Link de convite copiado', icon: 'i-nucleo-clipboard-check', color: 'success' })
  }
}

const actionItems = computed<DropdownMenuItem[][]>(() => {
  const chat = selected.value
  if (!chat) return []
  const summary = chats.value.find((item) => item.id === chat.id) ?? chat
  return [
    [
      { label: 'Marcar como lida', icon: 'i-nucleo-check', onSelect: () => runAction('markRead', 'Marcada como lida') },
      { label: 'Marcar como não lida', icon: 'i-nucleo-chat-bubble', onSelect: () => runAction('markUnread', 'Marcada como não lida') },
      summary.pinned
        ? { label: 'Desafixar', icon: 'i-nucleo-star', onSelect: () => runAction('unpin', 'Chat desafixado') }
        : { label: 'Fixar', icon: 'i-nucleo-star', onSelect: () => runAction('pin', 'Chat fixado') },
      summary.isMuted
        ? { label: 'Reativar notificações', icon: 'i-nucleo-eye', onSelect: () => runAction('unmute', 'Notificações reativadas') }
        : { label: 'Silenciar', icon: 'i-nucleo-eye-slash', onSelect: () => runAction('mute', 'Chat silenciado') },
      summary.archived
        ? { label: 'Desarquivar', icon: 'i-nucleo-box-2', onSelect: () => runAction('unarchive', 'Chat desarquivado') }
        : { label: 'Arquivar', icon: 'i-nucleo-box-2', onSelect: () => runAction('archive', 'Chat arquivado') },
      ...(chat.isGroup ? [{ label: 'Copiar link de convite', icon: 'i-nucleo-copy', onSelect: copyInvite }] : [])
    ],
    [
      { label: 'Limpar conversa', icon: 'i-nucleo-trash', color: 'warning' as const, onSelect: () => ask('Limpar conversa?', 'Apaga as mensagens deste chat no WhatsApp do bot.', 'Limpar', 'clear', 'Conversa limpa') },
      { label: 'Apagar conversa', icon: 'i-nucleo-trash', color: 'error' as const, onSelect: () => ask('Apagar conversa?', 'Remove o chat da lista do WhatsApp do bot.', 'Apagar', 'delete', 'Conversa apagada') },
      ...(chat.isGroup
        ? [{ label: 'Sair do grupo', icon: 'i-nucleo-exit-door', color: 'error' as const, onSelect: () => ask('Sair do grupo?', 'O bot deixa o grupo e para de responder nele.', 'Sair do grupo', 'leave', 'O bot saiu do grupo') }]
        : [])
    ]
  ]
})
</script>
