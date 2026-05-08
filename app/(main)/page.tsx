import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { LastCardPreview } from '@/components/home/LastCardPreview';

export default function HomePage() {
  const t = useTranslations('home');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <Link href="/scan" className={buttonVariants({ size: 'lg' })}>
        {t('addCard')}
      </Link>
      <LastCardPreview />
    </div>
  );
}
