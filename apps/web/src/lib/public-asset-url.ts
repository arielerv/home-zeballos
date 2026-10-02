/** Resolve public assets without changing source catalog URLs or external links. */
export function publicAssetUrl(path: string, base = import.meta.env?.BASE_URL ?? '/'): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path
  return `${base.replace(/\/$/, '')}${path}`
}