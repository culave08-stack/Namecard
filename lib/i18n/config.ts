// lib/i18n/config.ts
export const DEFAULT_LOCALE = 'ko' as const;
export const SUPPORTED_LOCALES = ['ko'] as const; // Phase 4: en, vi, ja
export type Locale = (typeof SUPPORTED_LOCALES)[number];
