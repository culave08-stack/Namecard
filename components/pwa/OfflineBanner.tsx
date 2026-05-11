'use client';

import { WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnline } from '@/lib/hooks/useOnline';

export function OfflineBanner() {
  const t = useTranslations('offline');
  const online = useOnline();
  if (online) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
      <WifiOff className="size-3.5 shrink-0" strokeWidth={1.75} />
      <span className="leading-snug">{t('banner')}</span>
    </div>
  );
}
