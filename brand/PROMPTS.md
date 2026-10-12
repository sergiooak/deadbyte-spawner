# Brand DeadByte: prompts de imagem

Prompts para gerar o mini brandbook e as imagens do painel num gerador de imagem (ChatGPT / Codex). O painel já usa os arquivos de `public/brand/` com placeholders; troque cada arquivo pelo gerado, com o **mesmo nome e tamanho**, e não precisa mexer no código.

## Como usar

1. Abra uma conversa nova e anexe as duas referências em **toda** mensagem:
   - `brand/reference/original-square.png` (1254x1254, caveira + letreiro)
   - `brand/reference/original-landscape.png` (1448x1086, cena da oficina de figurinhas)
2. Cole primeiro o [Brief da marca](#brief-da-marca). Depois peça cada asset com o prompt da seção dele, na mesma conversa, para manter a consistência.
3. Gere o brandbook ([prompt 0](#0-mini-brandbook)) antes dos outros: ele fixa a paleta e a logo que os demais vão seguir.
4. Exporte no tamanho pedido, em PNG, com fundo transparente quando o prompt disser. Salve em `public/brand/` com o nome indicado.
5. Para os favicons, peça a versão pixel art (prompt 5) e confira em 100% de zoom: precisa ler como caveira em 16 px.

## Brief da marca

Cole este bloco no início da conversa.

```text
You are designing the brand system for DEAD BYTE, a WhatsApp sticker bot ("bot de figurinhas") and its admin panel.
Use the two attached images as the ONLY source of truth for the character and the style. Match them as closely as possible:
same mascot, same materials, same lighting, same color, same mood. Do not reinvent the character.

THE MASCOT (keep it identical to the references):
- A chunky, cute robotic skull. Oversized rounded cranium, short jaw with 4 square teeth, small triangular nose hole.
- Material: off-white glazed ceramic / porcelain, worn and chipped, with fine black hairline cracks and dark grime in the crevices.
- Big round eye sockets with glowing neon aqua-mint LED eyes made of a fine dot-matrix grid.
- On the left side of the head: a black cybernetic ear module like a headphone, with concentric rings and a glowing aqua ring, plus a small round port above it and a panel seam running over the cranium.
- Dark metallic neck/jaw hinge parts. When a body is shown: black hoodie with a small "DBE" grunge logo, robotic hands in black and silver plates.
- Personality: friendly, mischievous, a bit sarcastic, always online. Cute, not scary. No blood, no gore.

STYLE:
- Dark cyberpunk, near-black background (#050807 to #0B0F0E) with deep teal fog, rain-wet reflections and subtle glitch noise.
- Single accent color: neon aqua-mint, sampled from the references around #00F5C4 (range #00F0C0 to #00FFD0). Glows, rim light and LEDs use only this color.
- Neutrals: bone white #EDEDE6 for the ceramic, charcoal #1A1D1C, black #000000.
- High contrast, cinematic rim lighting in aqua from behind, soft bloom, film grain, 3D render quality (Octane/Redshift look).
- Recurring graphic motifs from the references: big faded kanji 死 in the background, tiny monospaced corner captions in uppercase with wide tracking, "//" separators, short aqua underline bars, barcodes, scanner crop marks [ + ], diagonal slash bars "////".
- Wordmark: "DEAD BYTE" in heavy distressed brush lettering with horizontal glitch slices and drips. "DEAD" in bone white, "BYTE" in neon aqua-mint. Optional tagline "BOT DE FIGURINHAS" in a thin wide geometric sans, uppercase, wide letter spacing, between two thin aqua lines.
- Panel typography (for the brandbook pages): titles in Pixelify Sans, body in Chakra Petch, code in JetBrains Mono.

RULES:
- No WhatsApp logo or other third-party logos or trademarks.
- Text only where the prompt asks for it, spelled exactly. Portuguese copy must keep accents (ç, ã, õ).
- Keep everything square: no rounded cards or pill shapes in layouts.
```

## 0. Mini brandbook

Uma prancha horizontal que vira a referência das próximas imagens.

```text
Create a one-page mini brand book for DEAD BYTE as a single landscape board, 3840x2160, dark background, square grid layout with thin aqua divider lines.
Sections, each with a small uppercase monospaced label:
1. PRIMARY LOGO: the mascot head above the "DEAD BYTE" wordmark and the tagline "BOT DE FIGURINHAS", exactly as in the square reference.
2. LOGO MARK: the mascot head alone, front 3/4 view as in the references, on transparent-looking dark background.
3. WORDMARK: "DEAD BYTE" alone, plus a one-line horizontal lockup (head + wordmark side by side).
4. PIXEL MARK: the same mascot head redrawn as 32x32 pixel art (hard pixels, no anti-aliasing), shown at 16, 32 and 64 px, keeping the off-white skull, the black ear module on the left and the aqua eyes.
5. COLOR: swatches with hex codes: Neon Aqua (sampled accent, about #00F5C4), Aqua Deep (#00A080), Bone (#EDEDE6), Charcoal (#1A1D1C), Black (#000000).
6. TYPE: "Pixelify Sans" for titles, "Chakra Petch" for body, "JetBrains Mono" for code, each with a short Portuguese sample: "Instâncias online", "Escaneie o QR em Aparelhos conectados.", "[nitro] whatsapp.ready".
7. DO / DON'T: two small thumbnails: do keep the mascot cute and glowing; don't add blood, horns or extra colors.
8. TEXTURE: close-up of the cracked ceramic, the dot-matrix LED eye, and the glitch/drip effect of the wordmark.
Clean, readable, professional brand guide aesthetic mixed with the cyberpunk mood of the references.
```

## 1. Logo mark (cabeça do mascote)

Arquivo: `public/brand/logo-mark.png` · 1024x1024 · fundo transparente · usado na barra lateral e no login.

```text
The DEAD BYTE mascot head only, isolated, centered, front 3/4 view exactly like the references (ear module on the viewer's left).
Off-white cracked ceramic skull, glowing aqua-mint dot-matrix eyes, black cybernetic ear module with aqua ring.
Soft aqua rim light and a subtle outer glow that fades to fully transparent. No background, no text, no shadow on the ground.
Must stay readable when scaled down to 28 px: strong silhouette, high contrast eyes. 1024x1024 PNG with alpha.
```

## 2. Logo completa

Arquivo: `public/brand/logo-full.png` · 2400x800 · fundo transparente.

```text
Horizontal lockup: the mascot head on the left, the "DEAD BYTE" distressed glitch wordmark on the right ("DEAD" bone white, "BYTE" neon aqua-mint),
and below the wordmark the tagline "BOT DE FIGURINHAS" between two thin aqua lines with the "////" slash bars on the left, exactly the style of the square reference.
Transparent background, no scene, no kanji. 2400x800 PNG with alpha.
```

## 3. Wordmark

Arquivo: `public/brand/wordmark.png` · 2000x500 · fundo transparente.

```text
Only the text "DEAD BYTE" as the distressed brush wordmark from the references: heavy italic strokes, horizontal glitch slices, small drips,
"DEAD" in bone white #EDEDE6, "BYTE" in neon aqua-mint with soft glow. Spelled exactly D-E-A-D B-Y-T-E. Transparent background. 2000x500 PNG with alpha.
```

## 4. App icon

Arquivo: `public/brand/icon-512.png` · 512x512 · fundo preto (sem transparência) · ícone de app e PWA.

```text
App icon for DEAD BYTE: the mascot head centered on a solid near-black square (#050807) with a faint aqua radial glow behind it.
Head fills about 80% of the canvas, square corners (the OS will round them). No text. 512x512 PNG.
```

## 5. Favicons (pixel art)

Arquivos: `public/brand/favicon-32.png` (32x32), `public/brand/favicon-16.png` (16x16), `public/brand/apple-touch-icon.png` (180x180).

```text
Redraw the DEAD BYTE mascot head as true pixel art on a 32x32 grid: hard edges, no anti-aliasing, max 5 colors
(black #000000, bone #EDEDE6, light gray #9A9A94, dark gray #3A3D3C, aqua #00F5C4).
Keep the big round aqua eyes, the 4 teeth and the black ear module on the left so it still reads as the same character.
Deliver: 32x32 PNG, a 16x16 PNG simplified version (eyes and teeth must stay readable), and a 180x180 PNG made by scaling the 32x32 version
with nearest-neighbor plus a black background with 10% padding.
```

## 6. Imagem de compartilhamento (OG)

Arquivo: `public/brand/og-image.png` · 1200x630 · aparece quando o link do painel é colado no WhatsApp.

```text
Social share banner 1200x630 in the exact style of the square reference: mascot head on the right with aqua rim light,
"DEAD BYTE" wordmark on the left with the tagline "PAINEL DOS BOTS", faded kanji 死 in the background,
tiny corner captions in monospaced uppercase: top-left "BOTS // INSTÂNCIAS // LOGS", bottom-right a small barcode.
Keep important content inside a centered 1000x520 safe area. PNG.
```

## 7. Hero do login

Arquivo: `public/brand/login-hero.png` · 1600x1000 · aparece ao lado do formulário de login em telas grandes.

```text
Cinematic scene in the style of the landscape reference, no text, no logos: the mascot in its black "DBE" hoodie sits in a dark server room at night,
leaning toward a terminal screen with green-aqua code reflected in its glowing eyes, holding a black mug.
Rain-wet floor reflections, deep teal fog, faded kanji 死 on the back wall, cables, small stickers of the mascot on the desk.
Mascot on the right third, darker empty space on the left third (a login form will sit next to it). 1600x1000 PNG.
```

## 8. Estados vazios e status

Ilustrações quadradas usadas no painel. Todas 800x600, **fundo transparente**, sem texto, mascote de corpo inteiro ou meio corpo no estilo da cena landscape, glow aqua sutil, composição centralizada com respiro nas bordas.

| Arquivo | Onde aparece | Prompt |
| --- | --- | --- |
| `empty-instances.png` | Painel sem nenhuma instância | `The mascot sitting alone at an empty desk, looking at a blank phone screen with a tiny "+" floating above it, curious and bored, waiting for someone to connect.` |
| `empty-repositories.png` | Nenhum repositório cadastrado | `The mascot holding a glowing aqua data cartridge / floppy disk and looking for a slot to plug it in, cables hanging around.` |
| `bot-offline.png` | Instância parada | `The mascot asleep with its head on the keyboard, eyes dimmed to a faint aqua glow, a small "Zz" made of pixels above its head.` |
| `bot-crashed.png` | Instância caiu com erro | `The mascot glitching: horizontal glitch slices across the head, one eye flickering, small sparks and smoke from the ear module, dizzy expression, still cute.` |
| `bot-connected.png` | WhatsApp conectado | `The mascot giving a thumbs up while holding a phone with a glowing aqua check mark on the screen, eyes bright and happy.` |

Prefixo para cada linha da tabela:

```text
Illustration for an empty state of the DEAD BYTE admin panel. Same mascot, materials and lighting as the references.
800x600 PNG with transparent background, no text, no logos, centered with generous padding, soft aqua glow only around the character.
Scene:
```

## Depois de gerar

- Troque os arquivos em `public/brand/` mantendo os nomes e rode `python -I brand/optimize.py`. O painel serve as cópias leves de `public/brand/web/` (WebP e o JPG do OG); os favicons e o `icon-512.png` são usados direto.
- A cor de destaque das artes (por volta de `#00F5C4`, aqua-menta) é mais ciano que o primary atual do painel (`emerald`, `#34D399`). Se o brandbook confirmar o aqua, dá para trocar o primary do painel para uma paleta customizada com esse tom.
