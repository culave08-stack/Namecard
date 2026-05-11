'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import { getCardRepository } from '@/lib/db/supabase-repository';
import type { BusinessCard } from '@/types/business-card';

export function LastCardPreview() {
  const t = useTranslations('home');
  const [card, setCard] = useState<BusinessCard | null | undefined>(undefined);

  useEffect(() => {
    getCardRepository()
      .getLatest()
      .then((c) => setCard(c ?? null));
  }, []);

  if (card === undefined) {
    return (
      <div className="aspect-card w-full animate-pulse rounded-xl bg-muted" />
    );
  }

  if (card === null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/30 py-12 text-center">
        <Inbox className="size-7 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  const created = new Date(card.createdAt);
  const dateStr = `${created.getFullYear()}.${pad(created.getMonth() + 1)}.${pad(created.getDate())}`;

  return (
    <Link
      href={`/cards/${card.id}`}
      className="lift block overflow-hidden rounded-xl border border-border bg-card shadow-card hover:shadow-card-hover"
    >
      <div className="relative aspect-card w-full overflow-hidden bg-muted">
        <img
          src={card.frontImageUrl}
          alt={card.companyName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-medium tracking-tight text-foreground">
            {card.companyName}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {card.personName}
            {card.position ? ` · ${card.position}` : ''}
          </p>
        </div>
        <time className="shrink-0 text-xs text-muted-foreground tabular">{dateStr}</time>
      </div>
    </Link>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
