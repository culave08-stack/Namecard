import { useTranslations } from 'next-intl';

export function AiBadge() {
  const t = useTranslations('form');
  return (
    <span className="ml-1 inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
      ✨ {t('aiBadge')}
    </span>
  );
}
