'use client';

import { useTranslations } from 'next-intl';

export function ScanProgress() {
  const t = useTranslations('scan');
  return (
    <div className="flex flex-col items-center gap-5 py-16">
      <div className="relative size-14">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
        <div className="absolute inset-0 size-14 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-foreground">{t('step.analyzing')}</p>
        <p className="text-xs text-muted-foreground">최대 10초 내외 소요됩니다</p>
      </div>
    </div>
  );
}
