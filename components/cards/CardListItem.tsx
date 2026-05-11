'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { BusinessCard } from '@/types/business-card';

export interface CardListItemProps {
  card: BusinessCard;
}

export function CardListItem({ card }: CardListItemProps) {
  const tService = useTranslations('service');

  const created = new Date(card.createdAt);
  const dateStr = `${created.getFullYear()}.${pad(created.getMonth() + 1)}.${pad(created.getDate())}`;

  const serviceLabel =
    card.interestedService === 'other' && card.interestedServiceOther
      ? card.interestedServiceOther
      : tService(card.interestedService);

  return (
    <Link
      href={`/cards/${card.id}`}
      className="lift group flex gap-4 rounded-xl border border-border bg-card p-3 shadow-card hover:shadow-card-hover"
    >
      <div className="relative aspect-card h-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {card.frontImageUrl && (
          <img
            src={card.frontImageUrl}
            alt={card.companyName}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
        <div className="space-y-0.5">
          <p className="truncate font-medium tracking-tight text-foreground">
            {card.companyName || '—'}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {card.personName}
            {card.position ? <span className="text-muted-foreground/70"> · {card.position}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {card.country?.name && <Tag>{card.country.name}</Tag>}
          {card.industry && <Tag>{card.industry}</Tag>}
          <Tag accent>{serviceLabel}</Tag>
        </div>
      </div>

      <time className="shrink-0 self-start text-[11px] text-muted-foreground tabular">
        {dateStr}
      </time>
    </Link>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  const cls = accent
    ? 'bg-primary/10 text-primary'
    : 'bg-muted text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-[3px] text-[10px] font-medium tracking-tight ${cls}`}
    >
      {children}
    </span>
  );
}
