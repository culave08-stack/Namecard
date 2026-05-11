import { Sparkle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AiBadge() {
  const t = useTranslations('form');
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-medium tracking-wider text-primary">
      <Sparkle className="size-2.5" strokeWidth={1.75} />
      {t('aiBadge')}
    </span>
  );
}
