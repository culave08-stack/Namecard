'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ImagePreview } from '@/components/scan/ImagePreview';
import {
  BusinessCardForm,
  type FormValues,
} from '@/components/scan/BusinessCardForm';
import { getCardRepository } from '@/lib/db/supabase-repository';
import type { BusinessCard } from '@/types/business-card';

export default function CardDetailPage() {
  const t = useTranslations('detail');
  const tList = useTranslations('list');
  const tService = useTranslations('service');
  const tForm = useTranslations('form');
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
        companyType: values.companyType || undefined,
        phoneCompany: values.phoneCompany || undefined,
        phoneMobile: values.phoneMobile || undefined,
        email: values.email || undefined,
        fax: values.fax || undefined,
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
      <div className="flex flex-col gap-4">
        <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
        <div className="aspect-card w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (card === null) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/cards"
          aria-label={tList('back')}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <p className="py-12 text-center text-sm text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  const created = new Date(card.createdAt);
  const dateStr = `${created.getFullYear()}.${pad(created.getMonth() + 1)}.${pad(created.getDate())}`;

  const serviceLabel =
    card.interestedService === 'other' && card.interestedServiceOther
      ? card.interestedServiceOther
      : tService(card.interestedService);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/cards"
          aria-label={tList('back')}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <h1 className="text-base font-semibold tracking-tight">{t('title')}</h1>
        <div className="w-9" />
      </header>

      <section className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="aspect-card w-full bg-muted">
            <ImagePreview src={card.frontImageUrl} alt={card.companyName} />
          </div>
        </div>
        {card.backImageUrl && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="aspect-card w-full bg-muted">
              <ImagePreview src={card.backImageUrl} alt={`${card.companyName} (back)`} />
            </div>
          </div>
        )}
      </section>

      {editing ? (
        <section className="space-y-4">
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
              companyType: card.companyType,
              phoneCompany: card.phoneCompany,
              phoneMobile: card.phoneMobile,
              email: card.email,
              fax: card.fax,
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
        </section>
      ) : (
        <>
          <section className="space-y-2">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {card.companyName}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground">{card.personName}</span>
              {card.personNameEn && (
                <span className="text-muted-foreground/70"> · {card.personNameEn}</span>
              )}
              {card.position ? <span> · {card.position}</span> : null}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {card.country?.name && <Tag>{card.country.name}</Tag>}
              {card.companyType && <Tag>{card.companyType}</Tag>}
              {card.industry && <Tag>{card.industry}</Tag>}
              <Tag accent>{serviceLabel}</Tag>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <DetailRow label={tForm('website')} value={card.website} mono />
            <DetailRow
              label={tForm('country')}
              value={
                card.country
                  ? card.country.code
                    ? `${card.country.name} (${card.country.code})`
                    : card.country.name
                  : undefined
              }
            />
            <DetailRow label={tForm('industry')} value={card.industry} />
            <DetailRow label={tForm('companyType')} value={card.companyType} />
            <DetailRow label={tForm('phoneCompany')} value={card.phoneCompany} mono />
            <DetailRow label={tForm('phoneMobile')} value={card.phoneMobile} mono />
            <DetailRow label={tForm('email')} value={card.email} mono />
            <DetailRow label={tForm('fax')} value={card.fax} mono />
            <DetailRow label={tForm('interestedService')} value={serviceLabel} />
            {card.note && <DetailRow label={tForm('note')} value={card.note} block />}
            <DetailRow label={t('createdAt')} value={dateStr} mono />
          </section>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => setEditing(true)} className="flex-1 gap-1.5" size="lg">
              <Pencil className="size-4" strokeWidth={1.75} />
              {t('edit')}
            </Button>
            {confirmingDelete ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1"
                  size="lg"
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                  size="lg"
                >
                  {t('deleteConfirm')}
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setConfirmingDelete(true)}
                className="flex-1 gap-1.5"
                size="lg"
              >
                <Trash2 className="size-4" strokeWidth={1.75} />
                {t('delete')}
              </Button>
            )}
          </div>
          {confirmingDelete && (
            <p className="text-center text-xs text-destructive">{t('deleteConfirmDesc')}</p>
          )}
        </>
      )}
    </div>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function DetailRow({
  label,
  value,
  mono = false,
  block = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  block?: boolean;
}) {
  if (!value) return null;
  return (
    <div
      className={`flex ${block ? 'flex-col gap-1' : 'items-baseline justify-between gap-3'} text-sm`}
    >
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`min-w-0 break-words text-right text-foreground ${mono ? 'tabular' : ''} ${
          block ? 'whitespace-pre-wrap text-left' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  const cls = accent
    ? 'bg-primary/10 text-primary'
    : 'bg-muted text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium tracking-tight ${cls}`}
    >
      {children}
    </span>
  );
}
