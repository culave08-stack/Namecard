'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ImagePreview } from '@/components/scan/ImagePreview';
import {
  BusinessCardForm,
  type FormValues,
} from '@/components/scan/BusinessCardForm';
import { getCardRepository } from '@/lib/db/dexie-repository';
import type { BusinessCard } from '@/types/business-card';

export default function CardDetailPage() {
  const t = useTranslations('detail');
  const tList = useTranslations('list');
  const tService = useTranslations('service');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [card, setCard] = useState<BusinessCard | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCardRepository()
      .getById(id)
      .then((c) => setCard(c ?? null));
  }, [id]);

  async function handleUpdate(values: FormValues) {
    if (!card) return;
    setSubmitting(true);
    try {
      const repo = getCardRepository();
      const updated = await repo.update(card.id, {
        companyName: values.companyName,
        website: values.website || undefined,
        country:
          values.countryName && values.countryCode
            ? { name: values.countryName, code: values.countryCode.toUpperCase() }
            : undefined,
        personName: values.personName,
        personNameEn: values.personNameEn || undefined,
        position: values.position || undefined,
        industry: values.industry || undefined,
        interestedService: values.interestedService,
        interestedServiceOther: values.interestedServiceOther || undefined,
        note: values.note || undefined,
      });
      setCard(updated);
      setEditing(false);
      toast.success(t('updated'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!card) return;
    await getCardRepository().delete(card.id);
    toast.success(t('deleted'));
    router.push('/cards');
  }

  if (card === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-12 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (card === null) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/cards" className="text-sm text-muted-foreground hover:text-foreground">
          {tList('back')}
        </Link>
        <p className="py-12 text-center text-sm text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  const created = new Date(card.createdAt);
  const dateStr = `${created.getFullYear()}-${pad(created.getMonth() + 1)}-${pad(created.getDate())}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/cards" className="text-sm text-muted-foreground hover:text-foreground">
          {tList('back')}
        </Link>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <div className="w-12" />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">{t('frontImage')}</p>
        <ImagePreview blob={card.frontImage} alt={card.companyName} />
        {card.backImage && (
          <>
            <p className="text-xs font-medium text-muted-foreground">{t('backImage')}</p>
            <ImagePreview blob={card.backImage} alt={`${card.companyName} (back)`} />
          </>
        )}
      </div>

      {editing ? (
        <>
          <BusinessCardForm
            defaults={{
              companyName: card.companyName,
              website: card.website,
              websiteGuessed: card.websiteGuessed,
              country: card.country,
              personName: card.personName,
              personNameEn: card.personNameEn,
              position: card.position,
              industry: card.industry,
              detectedLanguage: card.detectedLanguage,
              aiFilledFields: [],
              aiConfidence: undefined,
            }}
            initialUserFields={{
              interestedService: card.interestedService,
              interestedServiceOther: card.interestedServiceOther,
              note: card.note,
            }}
            onSubmit={handleUpdate}
            submitting={submitting}
            submitLabel="수정 완료"
          />
          <Button variant="outline" onClick={() => setEditing(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
        </>
      ) : (
        <>
          <CardReadonlyView card={card} dateStr={dateStr} serviceLabel={
            card.interestedService === 'other' && card.interestedServiceOther
              ? card.interestedServiceOther
              : tService(card.interestedService)
          } />
          <div className="flex gap-2">
            <Button onClick={() => setEditing(true)} className="flex-1">
              {t('edit')}
            </Button>
            {confirmingDelete ? (
              <>
                <Button variant="outline" onClick={() => setConfirmingDelete(false)} className="flex-1">
                  {t('cancel')}
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="flex-1">
                  {t('deleteConfirm')}
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={() => setConfirmingDelete(true)} className="flex-1">
                {t('delete')}
              </Button>
            )}
          </div>
          {confirmingDelete && (
            <p className="text-xs text-destructive">{t('deleteConfirmDesc')}</p>
          )}
        </>
      )}
    </div>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function CardReadonlyView({
  card,
  dateStr,
  serviceLabel,
}: {
  card: BusinessCard;
  dateStr: string;
  serviceLabel: string;
}) {
  const t = useTranslations('form');
  const tDetail = useTranslations('detail');
  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
      <Row label={t('companyName')} value={card.companyName} />
      <Row label={t('website')} value={card.website} />
      <Row label={t('country')} value={card.country ? `${card.country.name} (${card.country.code})` : undefined} />
      <Row label={t('personName')} value={card.personName} />
      {card.personNameEn && <Row label={t('personNameEn')} value={card.personNameEn} />}
      <Row label={t('position')} value={card.position} />
      <Row label={t('industry')} value={card.industry} />
      <Row label={t('interestedService')} value={serviceLabel} />
      <Row label={t('note')} value={card.note} />
      <Row label={tDetail('createdAt')} value={dateStr} />
    </dl>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="col-span-1 text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value || '—'}</dd>
    </>
  );
}
