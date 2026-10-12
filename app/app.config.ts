// Brilho neon do primary, reaproveitado em botões e foco.
const neonGlow = 'shadow-[0_0_0_1px_var(--ui-primary),0_0_18px_-4px_var(--ui-primary)]'

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'neutral'
    },

    // Nucleo Pixel, pelo nome oficial. Decisões em icons/map.json; lista do bundle em icons/ui-icons.json.
    icons: {
      arrowDown: 'i-nucleo-arrow-down',
      arrowLeft: 'i-nucleo-arrow-left',
      arrowRight: 'i-nucleo-arrow-right',
      arrowUp: 'i-nucleo-arrow-up',
      caution: 'i-nucleo-circle-warning',
      check: 'i-nucleo-check',
      chevronDoubleLeft: 'i-nucleo-double-chevron-left',
      chevronDoubleRight: 'i-nucleo-double-chevron-right',
      chevronDown: 'i-nucleo-chevron-down',
      chevronLeft: 'i-nucleo-chevron-left',
      chevronRight: 'i-nucleo-chevron-right',
      chevronUp: 'i-nucleo-chevron-up',
      close: 'i-nucleo-xmark',
      copy: 'i-nucleo-copy',
      copyCheck: 'i-nucleo-clipboard-check',
      dark: 'i-nucleo-moon',
      drag: 'i-nucleo-grip-dots-vertical',
      ellipsis: 'i-nucleo-dots',
      error: 'i-nucleo-circle-xmark',
      external: 'i-nucleo-open-external',
      eye: 'i-nucleo-eye',
      eyeOff: 'i-nucleo-eye-slash',
      file: 'i-nucleo-file',
      folder: 'i-nucleo-folder',
      folderOpen: 'i-nucleo-folder-open',
      hash: 'i-nucleo-hashtag',
      info: 'i-nucleo-circle-info',
      light: 'i-nucleo-lightbulb',
      loading: 'i-nucleo-loader',
      menu: 'i-nucleo-menu-bars',
      minus: 'i-nucleo-minus',
      panelClose: 'i-nucleo-sidebar-left-hide',
      panelOpen: 'i-nucleo-sidebar-left-show',
      plus: 'i-nucleo-plus',
      reload: 'i-nucleo-arrow-rotate-clockwise',
      search: 'i-nucleo-magnifier',
      star: 'i-nucleo-star',
      stop: 'i-nucleo-media-stop',
      success: 'i-nucleo-circle-check',
      system: 'i-nucleo-monitor',
      tip: 'i-nucleo-lightbulb',
      upload: 'i-nucleo-square-dashed-upload',
      warning: 'i-nucleo-triangle-warning'
    },

    button: {
      slots: { base: 'font-mono uppercase tracking-wider text-xs' },
      compoundVariants: [{ color: 'primary', variant: 'solid', class: `${neonGlow} hover:shadow-[0_0_0_1px_var(--ui-primary),0_0_28px_-2px_var(--ui-primary)]` }]
    },
    badge: {
      slots: { base: 'font-mono uppercase tracking-wider' }
    },
    card: {
      slots: { root: 'bg-default/60 ring-default' }
    },
    avatar: {
      slots: { root: 'rounded-none' }
    },
    input: {
      slots: { base: 'font-mono' }
    },
    navigationMenu: {
      slots: { link: 'font-mono uppercase tracking-wider text-xs' }
    },
    dashboardNavbar: {
      slots: { title: 'font-pixel text-lg tracking-wide' }
    },
    tabs: {
      slots: { label: 'font-mono uppercase tracking-wider' }
    }
  }
})
