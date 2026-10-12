"""Gera as versões leves das imagens do brandbook usadas pelo painel.

Os PNGs em public/brand/ são os originais (1024 px, 1,5 MB cada). O painel mostra a logo em 28 px
e as ilustrações em até 256 px, então serve as cópias de public/brand/web/.

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
