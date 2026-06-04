import { normalizeSlug } from '@deadbyte/runtime'

export function toSlug(value: string): string {
  return normalizeSlug(value)
}
