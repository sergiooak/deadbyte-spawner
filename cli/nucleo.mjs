#!/usr/bin/env node
// CLI dos ícones Nucleo Pixel. Os ids são o nome oficial do Nucleo: i-nucleo-<nome>.
//
//   nucleo search <termos...> [--limit N] [--json]                 busca por nome e tags (OR, ranqueado)
//   nucleo show <nome> [--json]                                     tags e SVG de um ícone
//   nucleo map [conceito] [--json]                                  decisões já tomadas (icons/map.json)
//   nucleo preview <nomes...> [--context <nomes>] [--out arquivo]   prancha PNG para comparar candidatos
//   nucleo check                                                    todo i-nucleo-* existe; nada de outra família
//   nucleo build                                                    regenera icons/nucleo.json só com os ícones usados
//
// Adaptada do layer da Supporte (supportelogistica/nuxt-layer). Diferenças:
// - O desenho fica como o Nucleo exportou: traço de 2px na grade 24 com ponta quadrada (estilo Pixel).
//   O build só tira o <svg> externo e os metadados do app Nucleo; nenhum path é alterado.
// - Este repo é público e a licença do Nucleo não permite publicar o catálogo. O catálogo completo
//   fica em icons/nucleo-source.json (fora do git) e a coleção commitada só tem os ícones usados.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iconBody as body } from '../icons/collection.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = process.env.NUCLEO_SOURCE ?? path.join(ROOT, 'icons/nucleo-source.json')
const COLLECTION = path.join(ROOT, 'icons/nucleo.json')
const MAP = path.join(ROOT, 'icons/map.json')
const UI_ICONS = path.join(ROOT, 'icons/ui-icons.json')
const SCAN_FOLDERS = ['app', 'server', 'shared'].map((folder) => path.join(ROOT, folder))
const ICON_REF = /(?:\bi-nucleo-|\bnucleo:)([a-z0-9]+(?:-[a-z0-9]+)*)/g
// Logo de marca vem do simple-icons; todo o resto vem do Nucleo.
const OTHER_FAMILIES = /\bi-(lucide|heroicons|mdi|ph|tabler|carbon|material-symbols)-[a-z0-9-]+/g

const [command, ...rest] = process.argv.slice(2)
const flags = parseFlags(rest)

const commands = { search, show, map, preview, check, build }
if (!commands[command]) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n'))
  process.exit(command ? 1 : 0)
}
await commands[command]()

function parseFlags(args) {
  const result = { _: [] }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--json') result.json = true
    else if (arg.startsWith('--')) result[arg.slice(2)] = args[++i]
    else result._.push(arg)
  }
  return result
}

function loadSource() {
  if (!fs.existsSync(SOURCE)) {
    fail(`Catálogo não encontrado em ${SOURCE}. Copie o export do Nucleo Pixel para lá ou defina NUCLEO_SOURCE.`)
  }
  return JSON.parse(fs.readFileSync(SOURCE, 'utf8')).icons
}

function loadCollection() {
  return JSON.parse(fs.readFileSync(COLLECTION, 'utf8'))
}

function loadMap() {
  if (!fs.existsSync(MAP)) return []
  return Object.entries(JSON.parse(fs.readFileSync(MAP, 'utf8')).concepts ?? {}).map(([concept, entry]) => ({ concept, ...entry }))
}

function score(icon, terms) {
  const name = icon.name.toLowerCase()
  const tags = icon.tags.toLowerCase().split(',')
  let total = 0
  for (const term of terms) {
    if (name === term) total += 100
    else if (name.split('-').includes(term)) total += 60
    else if (name.includes(term)) total += 40
    if (tags.includes(term)) total += 30
    else if (tags.some((tag) => tag.includes(term))) total += 10
  }
  return total
}

function search() {
  const terms = flags._.map((term) => term.toLowerCase())
  if (!terms.length) fail('Informe ao menos um termo em inglês. Ex.: nucleo search robot bot')
  const limit = flags.limit ? Number(flags.limit) : 40
  const decided = new Map(loadMap().map((entry) => [entry.icon, entry.concept]))

  const hits = loadSource()
    .map((icon) => ({ name: icon.name, tags: icon.tags, score: score(icon, terms), mappedAs: decided.get(icon.name) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)

  if (flags.json) return console.log(JSON.stringify(hits, null, 2))
  for (const hit of hits)
    console.log(`${String(hit.score).padStart(4)}  ${hit.name.padEnd(36)} ${hit.mappedAs ? `[mapa: ${hit.mappedAs}]  ` : ''}${hit.tags}`)
  if (!hits.length) console.log('Nenhum resultado. Tente sinônimos, a ação, o objeto ou uma metáfora.')
}

function show() {
  const name = flags._[0]
  const icon = loadSource().find((item) => item.name === name)
  if (!icon) fail(`Ícone "${name}" não existe no catálogo.`)
  const result = { id: `i-nucleo-${icon.name}`, tags: icon.tags, svg: body(icon.content) }
  if (flags.json) return console.log(JSON.stringify(result, null, 2))
  console.log(`${result.id}\ntags: ${result.tags}\n\n${result.svg.replace(/></g, '>\n<')}`)
}

function map() {
  const concept = flags._[0]?.toLowerCase()
  const entries = loadMap().filter((entry) => !concept || entry.concept.toLowerCase().includes(concept))
  if (flags.json) return console.log(JSON.stringify(entries, null, 2))
  if (!entries.length) return console.log(concept ? `Sem decisão para "${concept}".` : 'Nenhum mapa encontrado.')
  for (const entry of entries)
    console.log(
      `${entry.concept.padEnd(28)} i-nucleo-${entry.icon}${entry.reason ? `\n  porquê: ${entry.reason}` : ''}${entry.alts?.length ? `\n  alternativas: ${entry.alts.join(', ')}` : ''}`,
    )
}

async function preview() {
  const names = flags._
  if (!names.length) fail('Informe os candidatos. Ex.: nucleo preview robot robot-2 --context gear,terminal')
  const context = flags.context ? flags.context.split(',') : []
  const source = new Map(loadSource().map((icon) => [icon.name, icon]))
  const all = [...names, ...context]
  for (const name of all) if (!source.has(name)) fail(`Ícone "${name}" não existe no catálogo.`)

  const sizes = [16, 20, 24]
  const themes = [
    { bg: '#000000', fg: '#f5f5f5', label: '#a3a3a3' },
    { bg: '#000000', fg: '#34d399', label: '#a3a3a3' },
  ]
  const cell = 64
  const labelWidth = 220
  const width = labelWidth + sizes.length * themes.length * cell
  const height = 40 + all.length * cell
  const parts = [`<rect width="${width}" height="${height}" fill="#0a0a0a"/>`]
  themes.forEach((theme, t) => {
    const x = labelWidth + t * sizes.length * cell
    parts.push(`<rect x="${x}" y="0" width="${sizes.length * cell}" height="${height}" fill="${theme.bg}"/>`)
    sizes.forEach((size, s) =>
      parts.push(`<text x="${x + s * cell + cell / 2}" y="24" font-family="monospace" font-size="11" text-anchor="middle" fill="${theme.label}">${size}px</text>`),
    )
  })
  all.forEach((name, row) => {
    const y = 40 + row * cell
    const isContext = row >= names.length
    parts.push(
      `<text x="12" y="${y + cell / 2 + 4}" font-family="monospace" font-size="12" fill="${isContext ? '#737373' : '#f5f5f5'}">${isContext ? '· ' : ''}${name}</text>`,
    )
    const icon = source.get(name)
    themes.forEach((theme, t) =>
      sizes.forEach((size, s) => {
        const x = labelWidth + t * sizes.length * cell + s * cell + (cell - size) / 2
        parts.push(
          `<svg x="${x}" y="${y + (cell - size) / 2}" width="${size}" height="${size}" viewBox="0 0 ${icon.width} ${icon.height}">${body(icon.content).replaceAll('currentColor', theme.fg)}</svg>`,
        )
      }),
    )
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.join('')}</svg>`
  const out = path.resolve(ROOT, flags.out ?? '.tmp/nucleo-preview.png')
  fs.mkdirSync(path.dirname(out), { recursive: true })

  try {
    const { Resvg } = await import('@resvg/resvg-js')
    const png = new Resvg(svg, { fitTo: { mode: 'zoom', value: 2 }, font: { loadSystemFonts: true } }).render().asPng()
    fs.writeFileSync(out, png)
    console.log(`Prancha gerada: ${out}`)
  } catch {
    const svgOut = out.replace(/\.png$/, '.svg')
    fs.writeFileSync(svgOut, svg)
    console.log(`@resvg/resvg-js indisponível; prancha salva em SVG: ${svgOut}`)
  }
}

function usedIcons() {
  const used = new Set(JSON.parse(fs.readFileSync(UI_ICONS, 'utf8')))
  for (const file of listFiles(SCAN_FOLDERS)) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(ICON_REF)) used.add(match[1])
  }
  return used
}

function check() {
  const collection = loadCollection().icons
  const brands = JSON.parse(fs.readFileSync(createRequire(import.meta.url).resolve('@iconify-json/simple-icons/icons.json'), 'utf8'))
  let errors = 0
  for (const file of listFiles(SCAN_FOLDERS)) {
    const text = fs.readFileSync(file, 'utf8')
    const relative = path.relative(ROOT, file).replaceAll('\\', '/')
    for (const match of text.matchAll(ICON_REF)) {
      if (!collection[match[1]]) {
        console.error(`ERRO ${relative}: "${match[0]}" não está em icons/nucleo.json (rode nucleo build).`)
        errors++
      }
    }
    for (const match of text.matchAll(/\bi-simple-icons-([a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
      if (!brands.icons[match[1]] && !brands.aliases?.[match[1]]) {
        console.error(`ERRO ${relative}: "${match[0]}" não existe no simple-icons (veja simpleicons.org).`)
        errors++
      }
    }
    for (const match of text.matchAll(OTHER_FAMILIES)) {
      console.error(`ERRO ${relative}: "${match[0]}" é de outra família. Use Nucleo (nucleo search) ou simple-icons para logo de marca.`)
      errors++
    }
  }
  if (errors) fail(`${errors} erro(s) de ícone.`)
  console.log('ok: todos os ícones usados existem na coleção Nucleo ou no simple-icons.')
}

function build() {
  const source = new Map(loadSource().map((icon) => [icon.name, icon]))
  const icons = {}
  const missing = []
  for (const name of [...usedIcons()].sort()) {
    const icon = source.get(name)
    if (!icon) {
      missing.push(name)
      continue
    }
    icons[name] = { body: body(icon.content), width: icon.width, height: icon.height }
  }
  if (missing.length) fail(`Não existem no catálogo: ${missing.join(', ')}`)

  const previous = fs.existsSync(COLLECTION) ? loadCollection() : null
  const changed = !previous || JSON.stringify(previous.icons) !== JSON.stringify(icons)
  const collection = { prefix: 'nucleo', lastModified: changed ? Math.floor(Date.now() / 1000) : previous.lastModified, icons }
  if (changed) fs.writeFileSync(COLLECTION, JSON.stringify(collection, null, 1) + '\n')
  console.log(`${changed ? 'icons/nucleo.json gerado' : 'icons/nucleo.json já estava atualizado'}: ${Object.keys(icons).length} ícones usados.`)
}

function listFiles(folders) {
  const extensions = new Set(['.vue', '.ts', '.js', '.mjs'])
  const files = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full)
      } else if (extensions.has(path.extname(entry.name))) files.push(full)
    }
  }
  for (const folder of folders) walk(folder)
  return files
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
