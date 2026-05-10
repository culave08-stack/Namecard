'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { BusinessCard } from '@/types/business-card';

export interface CardListItemProps {
  card: BusinessCard;
}

export function CardListItem({ card }: CardListItemProps) {
  const tService = useTranslations('service');
  const [thumbUrl, setThumbUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(card.frontImage);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [card.frontImage]);

  const created = new Date(card.createdAt);
  const dateStr = `${created.getFullYear()}-${pad(created.getMonth() + 1)}-${pad(created.getDate())}`;

  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={card.companyName}
          className="h-16 w-24 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="h-16 w-24 shrink-0 rounded-md bg-muted" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium">{card.companyName || '—'}</p>
          <p className="shrink-0 text-xs text-muted-foreground">{dateStr}</p>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {card.personName}
          {card.personNameEn ? ` · ${card.personNameEn}` : ''}
          {card.position ? ` · ${card.position}` : ''}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {card.country?.name && (
            <Badge>{card.country.name}</Badge>
          )}
          <Badge variant="accent">
            {card.interestedService === 'other' && card.interestedServiceOther
              ? card.interestedServiceOther
              : tService(card.interestedService)}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'accent' }) {
  const cls =
    variant === 'accent'
      ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
      : 'bg-muted text-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}
