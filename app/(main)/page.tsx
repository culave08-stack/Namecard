import Link from 'next/link';
import { Camera, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LastCardPreview } from '@/components/home/LastCardPreview';

export default function HomePage() {
  const t = useTranslations('home');
  return (
    <div className="flex flex-col gap-10">
      <section className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary/80">
          Namecard
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          행사장에서 받은 명함을 한 번에 찍고, 회사·담당자 정보를 자동으로 정리합니다.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ActionTile
          href="/scan"
          icon={<Camera className="size-5" strokeWidth={1.75} />}
          title={t('addCard')}
          description="카메라로 촬영 · AI 자동 인식"
          primary
        />
        <ActionTile
          href="/cards"
          icon={<LayoutGrid className="size-5" strokeWidth={1.75} />}
          title={t('viewAll')}
          description="검색 · 필터 · 엑셀 내보내기"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('lastSaved')}
        </h2>
        <LastCardPreview />
      </section>
    </div>
  );
}

interface ActionTileProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  primary?: boolean;
}

function ActionTile({ href, icon, title, description, primary }: ActionTileProps) {
  const isPrimary = Boolean(primary);
  return (
    <Link
      href={href}
      className={`lift group flex flex-col gap-3 rounded-xl border p-5 ${
        isPrimary
          ? 'border-transparent bg-primary text-primary-foreground shadow-card hover:shadow-card-hover'
          : 'border-border bg-card text-card-foreground shadow-card hover:shadow-card-hover'
      }`}
    >
      <span
        className={`inline-flex size-9 items-center justify-center rounded-lg ${
          isPrimary
            ? 'bg-primary-foreground/10 text-primary-foreground'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {icon}
      </span>
      <div className="space-y-1">
        <p className="font-medium tracking-tight">{title}</p>
        <p
          className={`text-xs ${
            isPrimary ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}
