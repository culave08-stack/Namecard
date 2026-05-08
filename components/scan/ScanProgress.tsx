'use client';

import { useTranslations } from 'next-intl';

export function ScanProgress() {
  const t = useTranslations('scan');
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      <p className="text-sm text-muted-foreground">{t('step.analyzing')}</p>
    </div>
  );
}
