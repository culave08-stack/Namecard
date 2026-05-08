'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePreview } from '@/components/scan/ImagePreview';
import { getCardRepository } from '@/lib/db/dexie-repository';
import type { BusinessCard } from '@/types/business-card';

export function LastCardPreview() {
  const t = useTranslations('home');
  const [card, setCard] = useState<BusinessCard | null | undefined>(undefined);

  useEffect(() => {
    getCardRepository()
      .getLatest()
      .then((c) => setCard(c ?? null));
  }, []);

  if (card === undefined) return <div className="h-32 animate-pulse rounded-lg bg-muted" />;
  if (card === null)
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{t('lastSaved')}</p>
      <p className="font-medium">{card.companyName}</p>
      <p className="text-sm text-muted-foreground">{card.personName}</p>
      <ImagePreview blob={card.frontImage} alt={card.companyName} />
    </div>
  );
}
