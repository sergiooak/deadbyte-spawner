// Conversão do export do Nucleo para o formato de coleção Iconify, compartilhada pela CLI e pelo nuxt.config.
// Só tira o <svg> externo (o viewBox vai para width/height) e os metadados do app Nucleo.
// Paths, traços e pontas ficam exatamente como foram exportados.
export function iconBody(svg) {
  return svg
    .replace(/^\s*<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/ class="nc-icon-wrapper"/g, '')
    .replace(/ data-[a-z-]+="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .trim()
}

export function toCollection(sourceIcons, lastModified = Math.floor(Date.now() / 1000)) {
  const icons = {}
  for (const icon of sourceIcons) {
    icons[icon.name] = { body: iconBody(icon.content), width: icon.width, height: icon.height }
  }
  return { prefix: 'nucleo', lastModified, icons }
}
