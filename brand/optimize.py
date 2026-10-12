"""Gera as versões leves das imagens do brandbook usadas pelo painel.

Os PNGs em public/brand/ são os originais (1024 px, 1,5 MB cada). O painel mostra a logo em 28 px
e as ilustrações em até 256 px, então serve as cópias de public/brand/web/.
Os favicons e o apple-touch-icon também saem daqui, reescalados da logo e do ícone do app.

Uso, depois de trocar qualquer imagem em public/brand/:
    python -I brand/optimize.py
Requer Pillow com suporte a WebP.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public' / 'brand'
TARGET = SOURCE / 'web'

# nome, largura máxima, formato, qualidade
OUTPUTS = [
    ('logo-mark', 256, 'webp', 90),
    ('wordmark', 800, 'webp', 90),
    ('login-hero', 1600, 'webp', 80),
    ('empty-instances', 800, 'webp', 85),
    ('empty-repositories', 800, 'webp', 85),
    ('bot-offline', 800, 'webp', 85),
    ('bot-crashed', 800, 'webp', 85),
    ('bot-connected', 800, 'webp', 85),
    # O WhatsApp só mostra a prévia do link com imagem de até ~300 KB.
    ('og-image', 1200, 'jpg', 85),
]


def make_favicons() -> None:
    # Cabeça recortada até a borda do alfa, centralizada num quadrado e reduzida com Lanczos.
    mark = Image.open(SOURCE / 'logo-mark.png').convert('RGBA')
    head = mark.crop(mark.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox())
    side = max(head.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(head, ((side - head.width) // 2, (side - head.height) // 2))
    for size in (32, 16):
        out = SOURCE / f'favicon-{size}.png'
        square.resize((size, size), Image.LANCZOS).save(out, optimize=True)
        print(f'{out.relative_to(ROOT)}  {size}x{size}  {out.stat().st_size} B')
    out = SOURCE / 'apple-touch-icon.png'
    Image.open(SOURCE / 'icon-512.png').convert('RGB').resize((180, 180), Image.LANCZOS).save(out, optimize=True)
    print(f'{out.relative_to(ROOT)}  180x180  {out.stat().st_size // 1024} KB')


def main() -> None:
    TARGET.mkdir(exist_ok=True)
    for name, max_width, fmt, quality in OUTPUTS:
        image = Image.open(SOURCE / f'{name}.png')
        if image.width > max_width:
            image = image.resize((max_width, round(image.height * max_width / image.width)), Image.LANCZOS)
        out = TARGET / f'{name}.{fmt}'
        if fmt == 'jpg':
            image.convert('RGB').save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
        else:
            image.save(out, 'WEBP', quality=quality, method=6)
        print(f'{out.relative_to(ROOT)}  {image.width}x{image.height}  {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
    make_favicons()
