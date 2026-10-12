<template>
  <UEmpty
    v-if="status !== 'ready'"
    icon="i-nucleo-link-broken"
    title="WhatsApp não conectado"
    description="Conecte a instância para editar o perfil e as configurações do número."
    variant="subtle"
  />

  <div v-else class="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[18rem_1fr]">
    <UCard class="bg-black">
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="relative">
          <img v-if="profile?.pictureUrl" :src="profile.pictureUrl" alt="Foto do perfil" class="neon-ring size-36 object-cover" referrerpolicy="no-referrer" />
          <div v-else class="neon-ring grid size-36 place-items-center bg-elevated">
            <UIcon name="i-nucleo-robot" class="size-12 text-muted" />
          </div>
        </div>
        <div class="min-w-0">
          <p class="truncate font-pixel text-xl text-highlighted">{{ profile?.displayName ?? '—' }}</p>
          <p class="font-mono text-xs text-muted">+{{ profile?.phoneNumber ?? '' }}</p>
          <p v-if="profile?.about" class="mt-2 text-sm text-toned">{{ profile.about }}</p>
        </div>
        <div class="flex w-full gap-2">
          <UButton color="neutral" variant="outline" icon="i-nucleo-image" class="flex-1 justify-center" :loading="uploading" @click="pickPicture">Trocar foto</UButton>
          <UTooltip text="Remover foto">
            <UButton color="error" variant="ghost" icon="i-nucleo-trash" :loading="removing" :disabled="!profile?.pictureUrl" aria-label="Remover foto" @click="removePicture" />
          </UTooltip>
        </div>
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onPicture" />
        <dl class="w-full space-y-1 text-start font-mono text-[11px] text-dimmed">
          <div class="flex justify-between"><dt>plataforma</dt><dd class="text-muted">{{ profile?.platform ?? '—' }}</dd></div>
          <div class="flex justify-between"><dt>whatsapp web</dt><dd class="text-muted">{{ profile?.webVersion ?? '—' }}</dd></div>
        </dl>
      </div>
    </UCard>

    <div class="space-y-6">
      <UPageCard title="Perfil" description="Nome e recado que os contatos veem." variant="subtle">
        <UForm :state="form" class="space-y-4" @submit="saveProfile">
          <UFormField label="Nome" name="displayName" :help="`${form.displayName.length}/25`">
            <UInput v-model="form.displayName" :maxlength="25" class="w-full" />
          </UFormField>
          <UFormField label="Recado" name="about" :help="`${form.about.length}/139`">
            <UTextarea v-model="form.about" :maxlength="139" :rows="2" autoresize class="w-full" />
          </UFormField>
          <div class="flex justify-end">
            <UButton type="submit" icon="i-nucleo-floppy-disk" :loading="savingProfile">Salvar perfil</UButton>
          </div>
        </UForm>
      </UPageCard>

      <UPageCard title="Configurações do número" description="Ficam salvas junto da sessão e voltam sozinhas depois de reiniciar ou redeployar." variant="subtle">
        <div class="space-y-4">
          <UFormField label="Presença" description="Online deixa o WhatsApp do bot como 'online' para os contatos.">
            <USelect v-model="settings.presence" :items="presenceItems" class="w-full sm:w-56" />
          </UFormField>
          <USeparator label="Baixar mídia automaticamente" />
          <div class="grid gap-3 sm:grid-cols-2">
            <USwitch v-model="settings.autoDownloadPhotos" label="Fotos" />
            <USwitch v-model="settings.autoDownloadVideos" label="Vídeos" />
            <USwitch v-model="settings.autoDownloadAudio" label="Áudios" />
            <USwitch v-model="settings.autoDownloadDocuments" label="Documentos" />
          </div>
          <USeparator />
          <USwitch v-model="settings.backgroundSync" label="Sincronizar em segundo plano" description="Mantém o histórico em dia mesmo sem abrir as conversas." />
          <div class="flex justify-end">
            <UButton icon="i-nucleo-floppy-disk" :loading="savingSettings" @click="saveSettings">Aplicar configurações</UButton>
          </div>
        </div>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
type Profile = { wid: string | null; phoneNumber: string | null; displayName: string | null; about: string | null; pictureUrl: string | null; platform: string | null; webVersion: string | null }
type Settings = {
  presence: 'available' | 'unavailable'
  autoDownloadAudio: boolean
  autoDownloadDocuments: boolean
  autoDownloadPhotos: boolean
  autoDownloadVideos: boolean
  backgroundSync: boolean
}

const props = defineProps<{ slug: string; status?: string | null }>()
const base = computed(() => `/api/instances/${props.slug}/bot`)

const profile = ref<Profile | null>(null)
const form = reactive({ displayName: '', about: '' })
const settings = reactive<Settings>({
  presence: 'unavailable',
  autoDownloadAudio: false,
  autoDownloadDocuments: false,
  autoDownloadPhotos: false,
  autoDownloadVideos: false,
  backgroundSync: true
})
const presenceItems = [
  { label: 'Offline (padrão)', value: 'unavailable' },
  { label: 'Online', value: 'available' }
]

const savingProfile = ref(false)
const savingSettings = ref(false)
const uploading = ref(false)
const removing = ref(false)
const fileInput = ref<HTMLInputElement>()

function setProfile(value: Profile | undefined) {
  if (!value) return
  profile.value = value
  form.displayName = value.displayName ?? ''
  form.about = value.about ?? ''
}

async function load() {
  if (props.status !== 'ready') return
  const [loadedProfile, loadedSettings] = await Promise.all([
    apiRequest<Profile>(`${base.value}/profile`).catch(() => undefined),
    apiRequest<Settings>(`${base.value}/settings`).catch(() => undefined)
  ])
  setProfile(loadedProfile)
  if (loadedSettings) Object.assign(settings, loadedSettings)
}

watch(() => props.status, load)
onMounted(load)

async function saveProfile() {
  savingProfile.value = true
  setProfile(
    await withToast(() => apiRequest<Profile>(`${base.value}/profile`, { method: 'PATCH', body: { displayName: form.displayName || undefined, about: form.about } }), {
      success: 'Perfil atualizado',
      error: 'Não foi possível atualizar o perfil'
    })
  )
  savingProfile.value = false
}

async function saveSettings() {
  savingSettings.value = true
  await withToast(() => apiRequest(`${base.value}/settings`, { method: 'PATCH', body: { ...settings } }), {
    success: 'Configurações aplicadas',
    error: 'Não foi possível aplicar'
  })
  savingSettings.value = false
}

function pickPicture() {
  fileInput.value?.click()
}

/** Recorta no centro e reduz para 640x640 JPEG antes de enviar: o WhatsApp usa foto quadrada. */
async function squareJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 640
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 640, 640)
  return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]!
}

async function onPicture(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  uploading.value = true
  const base64 = await squareJpeg(file)
  setProfile(
    await withToast(() => apiRequest<Profile>(`${base.value}/profile/picture`, { method: 'PUT', body: { base64, mimeType: 'image/jpeg' } }), {
      success: 'Foto atualizada',
      error: 'Não foi possível trocar a foto'
    })
  )
  uploading.value = false
}

async function removePicture() {
  removing.value = true
  setProfile(await withToast(() => apiRequest<Profile>(`${base.value}/profile/picture`, { method: 'DELETE' }), { success: 'Foto removida', error: 'Não foi possível remover' }))
  removing.value = false
}
</script>
