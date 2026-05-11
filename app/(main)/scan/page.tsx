'use client';

import { useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/scan/CameraCapture';
import { ImagePreview } from '@/components/scan/ImagePreview';
import { ScanProgress } from '@/components/scan/ScanProgress';
import { BusinessCardForm, type FormValues } from '@/components/scan/BusinessCardForm';
import { resizeImage } from '@/lib/image/resize';
import { rotateImage90 } from '@/lib/image/rotate';
import { scanResultToFormDefaults, type FormDefaults } from '@/lib/ai/parse';
import type { ScanResultParsed } from '@/lib/ai/schema';
import { getCardRepository } from '@/lib/db/supabase-repository';

type Step = 'camera' | 'preview' | 'analyzing' | 'form';

interface State {
  step: Step;
  front?: Blob;
  back?: Blob;
  defaults?: FormDefaults;
}

type Action =
  | { type: 'capture-front'; blob: Blob }
  | { type: 'capture-back'; blob: Blob }
  | { type: 'rotate-front'; blob: Blob }
  | { type: 'rotate-back'; blob: Blob }
  | { type: 'retake' }
  | { type: 'start-analyze' }
  | { type: 'analyzed'; defaults: FormDefaults }
  | { type: 'manual-fallback' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'capture-front':
      return { ...s, step: 'preview', front: a.blob };
    case 'capture-back':
      return { ...s, back: a.blob };
    case 'rotate-front':
      return { ...s, front: a.blob };
    case 'rotate-back':
      return { ...s, back: a.blob };
    case 'retake':
      return { step: 'camera' };
    case 'start-analyze':
      return { ...s, step: 'analyzing' };
    case 'analyzed':
      return { ...s, step: 'form', defaults: a.defaults };
    case 'manual-fallback':
      return { ...s, step: 'form', defaults: undefined };
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ScanPage() {
  const t = useTranslations('scan');
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, { step: 'camera' });
  const [submitting, setSubmitting] = useState(false);

  async function analyze() {
    if (!state.front) return;
    dispatch({ type: 'start-analyze' });
    try {
      const frontResized = await resizeImage(state.front, { maxEdge: 1600, quality: 0.8 });
      const backResized = state.back
        ? await resizeImage(state.back, { maxEdge: 1600, quality: 0.8 })
        : undefined;
      const frontImage = await blobToDataUrl(frontResized);
      const backImage = backResized ? await blobToDataUrl(backResized) : undefined;

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ frontImage, backImage }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const detail = typeof errBody?.error === 'string' ? errBody.error : '';
        toast.error(detail ? `${t('aiFailed')} (${detail})` : t('aiFailed'), {
          duration: 8_000,
        });
        console.error('scan failed', errBody);
        dispatch({ type: 'manual-fallback' });
        return;
      }

      const parsed = (await res.json()) as ScanResultParsed;
      const defaults = scanResultToFormDefaults(parsed);
      dispatch({ type: 'analyzed', defaults });
    } catch (err) {
      console.error(err);
      toast.error(t('aiFailed'));
      dispatch({ type: 'manual-fallback' });
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!state.front) return;
    setSubmitting(true);
    try {
      const repo = getCardRepository();
      await repo.save({
        frontImage: state.front,
        backImage: state.back,
        companyName: values.companyName,
        website: values.website || undefined,
        websiteGuessed:
          state.defaults?.websiteGuessed === true && values.website === state.defaults.website,
        country:
          values.countryName && values.countryCode
            ? { name: values.countryName, code: values.countryCode.toUpperCase() }
            : undefined,
        personName: values.personName,
        personNameEn: values.personNameEn || undefined,
        position: values.position || undefined,
        industry: values.industry || undefined,
        companyType: values.companyType || undefined,
        companyDescription: values.companyDescription || undefined,
        phoneCompany: values.phoneCompany || undefined,
        phoneMobile: values.phoneMobile || undefined,
        email: values.email || undefined,
        fax: values.fax || undefined,
        interestedService: values.interestedService,
        interestedServiceOther: values.interestedServiceOther || undefined,
        note: values.note || undefined,
        detectedLanguage: state.defaults?.detectedLanguage,
        aiFilledFields: state.defaults?.aiFilledFields ?? [],
        aiConfidence: state.defaults?.aiConfidence,
      });
      toast.success(t('saved'));
      router.push('/');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="뒤로"
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <h1 className="text-base font-semibold tracking-tight">{t(`step.${state.step}`)}</h1>
        <div className="w-9" />
      </header>

      {state.step === 'camera' && (
        <CameraCapture
          label={t('step.camera')}
          onCapture={(blob) => dispatch({ type: 'capture-front', blob })}
        />
      )}

      {state.step === 'preview' && state.front && (
        <div className="flex flex-col gap-4">
          <PreviewWithRotate
            src={state.front}
            alt="앞면"
            onRotate={async () => {
              const rotated = await rotateImage90(state.front!, 'cw');
              dispatch({ type: 'rotate-front', blob: rotated });
            }}
          />
          {state.back ? (
            <PreviewWithRotate
              src={state.back}
              alt="뒷면"
              onRotate={async () => {
                const rotated = await rotateImage90(state.back!, 'cw');
                dispatch({ type: 'rotate-back', blob: rotated });
              }}
            />
          ) : (
            <CameraCapture
              label={t('addBack')}
              onCapture={(blob) => dispatch({ type: 'capture-back', blob })}
            />
          )}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'retake' })}
              size="lg"
              className="flex-1"
            >
              {t('retake')}
            </Button>
            <Button onClick={analyze} size="lg" className="flex-1">
              {t('analyze')}
            </Button>
          </div>
        </div>
      )}

      {state.step === 'analyzing' && <ScanProgress />}

      {state.step === 'form' && (
        <BusinessCardForm
          defaults={state.defaults}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function PreviewWithRotate({
  src,
  alt,
  onRotate,
}: {
  src: Blob | string;
  alt: string;
  onRotate: () => Promise<void> | void;
}) {
  const [rotating, setRotating] = useState(false);
  async function handleClick() {
    if (rotating) return;
    setRotating(true);
    try {
      await onRotate();
    } finally {
      setRotating(false);
    }
  }
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="aspect-card w-full bg-muted">
        <ImagePreview src={src} alt={alt} />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={rotating}
        aria-label="90도 회전"
        className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform active:scale-95 disabled:opacity-60"
      >
        <RotateCw
          className={`size-4 ${rotating ? 'animate-spin' : ''}`}
          strokeWidth={1.75}
        />
      </button>
    </div>
  );
}
