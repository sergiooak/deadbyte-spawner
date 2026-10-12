# Prompt único para o Codex / ChatGPT

Versão consolidada de [PROMPTS.md](PROMPTS.md) para mandar numa mensagem só. Anexe `brand/reference/original-square.png` e `brand/reference/original-landscape.png` junto.

```text
Create the complete brand kit for DEAD BYTE, a WhatsApp sticker bot ("bot de figurinhas") and its admin panel.

REFERENCES
The two attached images are the ONLY source of truth for the character and the style:
- original-square.png: mascot head + "DEAD BYTE" wordmark + tagline.
- original-landscape.png: the mascot in a hoodie in a sticker workshop scene.
Match them as closely as possible: same mascot, same materials, same lighting, same accent color, same mood. Do not reinvent the character.

MASCOT (keep identical to the references)
- Chunky, cute robotic skull. Oversized rounded cranium, short jaw with 4 square teeth, small triangular nose hole.
- Off-white glazed ceramic, worn and chipped, fine black hairline cracks, dark grime in crevices.
- Big round eye sockets with glowing neon aqua-mint LED eyes made of a fine dot-matrix grid.
- On the viewer's left: black cybernetic ear module like a headphone, concentric rings, glowing aqua ring, small round port above it, panel seam over the cranium.
- Dark metal jaw hinges. When a body is shown: black hoodie with a small "DBE" grunge logo, robotic hands in black and silver plates.
- Friendly, mischievous, a bit sarcastic, always online. Cute, never scary. No blood, no gore, no horns.

STYLE
- Dark cyberpunk. Near-black backgrounds (#050807 to #0B0F0E), deep teal fog, rain-wet reflections, subtle glitch noise, film grain.
- ONE accent color: neon aqua-mint sampled from the references, about #00F5C4. All glows, rim lights and LEDs use only it.
- Neutrals: bone #EDEDE6 (ceramic), charcoal #1A1D1C, black #000000.
- 3D render quality (Octane/Redshift look), cinematic aqua rim light from behind, soft bloom, high contrast.
- Motifs: big faded kanji 死 in backgrounds, tiny uppercase monospaced corner captions with wide tracking, "//" separators, short aqua underline bars, barcodes, scanner crop marks [ + ], diagonal slash bars "////".
- Wordmark: "DEAD BYTE" in heavy distressed italic brush lettering with horizontal glitch slices and small drips. "DEAD" bone white, "BYTE" neon aqua-mint with glow. Tagline "BOT DE FIGURINHAS" in a thin wide geometric sans, uppercase, wide tracking, between two thin aqua lines.
- Panel fonts (for the brand book only): titles Pixelify Sans, body Chakra Petch, code JetBrains Mono.

RULES
- No WhatsApp logo or any third-party logo or trademark.
- Text only where asked, spelled exactly. Portuguese text keeps its accents (ç, ã, õ, â).
- Square layouts: no rounded cards or pill shapes.
- Exact pixel sizes below. "Transparent" means real PNG alpha, not a checkerboard drawn on the image.
- Generate the brand book FIRST and use it as the reference for every other file so all assets stay consistent.

DELIVERABLES (PNG, exact file names and sizes)

0. brandbook.png, 3840x2160. One landscape board, dark background, square grid with thin aqua dividers, each section with a small uppercase mono label:
   PRIMARY LOGO (head above wordmark and tagline, as in the square reference) · LOGO MARK (head alone) · WORDMARK (alone + one-line lockup head|wordmark) · PIXEL MARK (head as 32x32 pixel art shown at 16, 32 and 64 px) · COLOR (Neon Aqua ~#00F5C4, Aqua Deep #00A080, Bone #EDEDE6, Charcoal #1A1D1C, Black #000000, with hex codes) · TYPE (Pixelify Sans "Instâncias online", Chakra Petch "Escaneie o QR em Aparelhos conectados.", JetBrains Mono "[nitro] whatsapp.ready") · DO / DON'T (do: cute and glowing; don't: blood, horns, extra colors) · TEXTURE (cracked ceramic, dot-matrix eye, glitch/drip lettering).

1. logo-mark.png, 1024x1024, transparent. Mascot head only, centered, front 3/4 view like the references. Soft aqua rim light and outer glow fading to fully transparent. No text, no ground shadow. Strong silhouette that still reads at 28 px.

2. logo-full.png, 2400x800, transparent. Head on the left, "DEAD BYTE" wordmark on the right, tagline "BOT DE FIGURINHAS" below between two thin aqua lines with "////" on the left. No scene, no kanji.

3. wordmark.png, 2000x500, transparent. Only "DEAD BYTE" (spelled D-E-A-D B-Y-T-E) in the brush/glitch style.

4. icon-512.png, 512x512, solid #050807 background (no transparency). Head centered filling ~80%, faint aqua radial glow behind, square corners, no text.

5. Favicons as TRUE pixel art: hard edges, no anti-aliasing, max 5 colors (#000000, #EDEDE6, #9A9A94, #3A3D3C, #00F5C4). Big aqua eyes, 4 teeth and the black ear module on the left must stay readable.
   - favicon-32.png, 32x32, transparent.
   - favicon-16.png, 16x16, transparent, simplified.
   - apple-touch-icon.png, 180x180: the 32x32 version scaled with nearest-neighbor on solid black with 10% padding.

6. og-image.png, 1200x630. Share banner in the square reference style: head on the right with aqua rim light, wordmark on the left with tagline "PAINEL DOS BOTS", faded kanji 死 behind, top-left mono caption "BOTS // INSTÂNCIAS // LOGS", small barcode bottom-right. Keep content inside a centered 1000x520 safe area.

7. login-hero.png, 1600x1000, no text, no logos. Landscape-reference style: mascot in the black "DBE" hoodie in a dark server room at night, leaning toward a terminal, aqua code reflected in its eyes, holding a black mug. Wet floor reflections, teal fog, faded kanji 死 on the back wall, cables, small mascot stickers on the desk. Mascot in the right third; left third dark and empty (a login form sits there).

8. Empty-state illustrations, each 800x600, transparent background, no text, no logos, mascot full or half body, same materials and lighting, centered with generous padding, soft aqua glow only around the character:
   - empty-instances.png: sitting alone at an empty desk looking at a blank phone with a tiny "+" floating above it, curious and bored.
   - empty-repositories.png: holding a glowing aqua data cartridge / floppy disk, looking for a slot to plug it in, cables hanging.
   - bot-offline.png: asleep with its head on a keyboard, eyes dimmed to a faint aqua, small pixel "Zz" above.
   - bot-crashed.png: glitching, horizontal glitch slices across the head, one eye flickering, small sparks and smoke from the ear module, dizzy but cute.
   - bot-connected.png: thumbs up, holding a phone with a glowing aqua check mark on the screen, bright happy eyes.

OUTPUT
If you have access to the repository sergiooak/deadbyte-spawner, save every file in public/brand/ with the exact names above (overwriting the placeholders) and brandbook.png in brand/. Otherwise return each image as a downloadable file with exactly that name.
Before finishing, check each file: correct size, real transparency where asked, text spelled exactly, same mascot in all of them.
```
