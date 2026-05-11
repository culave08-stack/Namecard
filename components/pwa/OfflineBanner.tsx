'use client';

import { useTranslations } from 'next-intl';
import { useOnline } from '@/lib/hooks/useOnline';

export function OfflineBanner() {
  const t = useTranslations('offline');
  const online = useOnline();
  if (online) return null;
  return (
    <div className="sticky top-0 z-50 -mx-4 -mt-6 mb-2 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      {t('banner')}
    </div>
  );
}
