import esCommon from './locales/es/common.ts'
import enCommon from './locales/en/common.ts'
import esWorkspace from './locales/es/workspace.ts'
import enWorkspace from './locales/en/workspace.ts'
import esDossier from './locales/es/dossier.ts'
import enDossier from './locales/en/dossier.ts'

export const resources = {
  es: { common: esCommon, workspace: esWorkspace, dossier: esDossier },
  en: { common: enCommon, workspace: enWorkspace, dossier: enDossier },
} as const

/** Preserve keys/structure, while allowing each locale to supply its own words. */
export type TranslationShape<T> = { [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]> }

// Adding/removing a source key makes incomplete translations fail typecheck.
const checkedResources: Record<'es' | 'en', TranslationShape<typeof resources.es>> = resources
void checkedResources
