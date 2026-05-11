'use client';

import { useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RotateCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePreview } from '@/components/scan/ImagePreview';
import { resizeImage } from '@/lib/image/resize';
import { rotateImage90 } from '@/lib/image/rotate';
import { scanResultToFormDefaults, type FormDefaults } from '@/lib/ai/parse';
import type { ScanResultParsed } from '@/lib/ai/schema';
import { getCardRepository } from '@/lib/db/supabase-repository';
import {
  INTERESTED_SERVICES,
  type InterestedService,
} from '@/types/business-card';

const MAX_BATCH = 10;

type Step = 'select' | 'analyzing' | 'review' | 'saving' | 'done';

type ItemStatus = 'pending' | 'analyzing' | 'analyzed' | 'failed';

interface Item {
  id: string;
  blob: Blob;
  status: ItemStatus;
  ai?: FormDefaults;
  error?: string;
  service?: InterestedService;
  skipped?: boolean;
  saved?: boolean;
  saveError?: string;
}

interface State {
  step: Step;
  items: Item[];
  bulkService?: InterestedService;
  savedCount: number;
  saveFailedCount: number;
}

type Action =
  | { type: 'add-files'; blobs: Blob[] }
  | { type: 'rotate-item'; id: string; blob: Blob }
  | { type: 'start-analysis' }
  | { type: 'item-status'; id: string; patch: Partial<Item> }
  | { type: 'enter-review' }
  | { type: 'set-service'; id: string; service: InterestedService | undefined }
  | { type: 'set-bulk-service'; service: InterestedService | undefined }
  | { type: 'apply-bulk' }
  | { type: 'toggle-skip'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'start-saving' }
  | { type: 'mark-saved'; id: string }
  | { type: 'mark-save-failed'; id: string; error: string }
  | { type: 'finish' }
  | { type: 'reset' };

const initialState: State = {
  step: 'select',
  items: [],
  savedCount: 0,
  saveFailedCount: 0,
};

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'add-files': {
      const remaining = Math.max(0, MAX_BATCH - s.items.length);
      const slice = a.blobs.slice(0, remaining);
      const newItems: Item[] = slice.map((blob) => ({
        id: crypto.randomUUID(),
        blob,
        status: 'pending',
      }));
      return { ...s, items: [...s.items, ...newItems] };
    }
    case 'rotate-item':
      return {
        ...s,
        items: s.items.map((it) =>
          it.id === a.id ? { ...it, blob: a.blob } : it
        ),
      };
    case 'start-analysis':
      return { ...s, step: 'analyzing' };
    case 'item-status':
      return {
        ...s,
        items: s.items.map((it) => (it.id === a.id ? { ...it, ...a.patch } : it)),
      };
    case 'enter-review':
      return { ...s, step: 'review' };
    case 'set-service':
      return {
        ...s,
        items: s.items.map((it) =>
          it.id === a.id ? { ...it, service: a.service } : it
        ),
      };
    case 'set-bulk-service':
      return { ...s, bulkService: a.service };
    case 'apply-bulk':
      if (!s.bulkService) return s;
      return {
        ...s,
        items: s.items.map((it) =>
          it.skipped || it.status !== 'analyzed' ? it : { ...it, service: s.bulkService }
        ),
      };
    case 'toggle-skip':
      return {
        ...s,
        items: s.items.map((it) =>
          it.id === a.id ? { ...it, skipped: !it.skipped } : it
        ),
      };
    case 'remove':
      return { ...s, items: s.items.filter((it) => it.id !== a.id) };
    case 'start-saving':
      return { ...s, step: 'saving', savedCount: 0, saveFailedCount: 0 };
    case 'mark-saved':
      return {
        ...s,
        items: s.items.map((it) => (it.id === a.id ? { ...it, saved: true } : it)),
        savedCount: s.savedCount + 1,
      };
    case 'mark-save-failed':
      return {
        ...s,
        items: s.items.map((it) =>
          it.id === a.id ? { ...it, saveError: a.error } : it
        ),
        saveFailedCount: s.saveFailedCount + 1,
      };
    case 'finish':
      return { ...s, step: 'done' };
    case 'reset':
      return initialState;
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

export default function BatchScanPage() {
  const t = useTranslations('batch');
  const tService = useTranslations('service');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useReducer(reducer, initialState);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (state.items.length + files.length > MAX_BATCH) {
      toast.warning(`최대 ${MAX_BATCH}장까지 가능합니다`);
    }
    dispatch({ type: 'add-files', blobs: files });
    e.target.value = '';
  }

  async function analyzeAll() {
    if (state.items.length === 0) return;
    dispatch({ type: 'start-analysis' });

    await Promise.allSettled(
      state.items.map(async (item) => {
        dispatch({ type: 'item-status', id: item.id, patch: { status: 'analyzing' } });
        try {
          const resized = await resizeImage(item.blob, { maxEdge: 1600, quality: 0.8 });
          const frontImage = await blobToDataUrl(resized);
          const res = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ frontImage }),
            signal: AbortSignal.timeout(45_000),
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error ?? `HTTP ${res.status}`);
          }
          const parsed = (await res.json()) as ScanResultParsed;
          const ai = scanResultToFormDefaults(parsed);
          dispatch({
            type: 'item-status',
            id: item.id,
            patch: { status: 'analyzed', ai },
          });
        } catch (err) {
          dispatch({
            type: 'item-status',
            id: item.id,
            patch: {
              status: 'failed',
              error: err instanceof Error ? err.message : String(err),
            },
          });
        }
      })
    );

    dispatch({ type: 'enter-review' });
  }

  async function saveAll() {
    const targets = state.items.filter(
      (it) => it.status === 'analyzed' && !it.skipped
    );
    const missing = targets.filter((it) => !it.service);
    if (missing.length > 0) {
      toast.error(`${missing.length}장의 관심 서비스를 선택하세요`);
      return;
    }
    if (targets.length === 0) {
      toast.warning('저장할 명함이 없습니다');
      return;
    }

    dispatch({ type: 'start-saving' });
    const repo = getCardRepository();

    // sequential save — avoids concurrent Storage uploads thrashing free tier
    for (const it of targets) {
      try {
        await repo.save({
          frontImage: it.blob,
          companyName: it.ai?.companyName ?? '',
          website: it.ai?.website || undefined,
          websiteGuessed: it.ai?.websiteGuessed,
          country: it.ai?.country,
          personName: it.ai?.personName ?? '',
          personNameEn: it.ai?.personNameEn || undefined,
          position: it.ai?.position || undefined,
          industry: it.ai?.industry || undefined,
          companyType: it.ai?.companyType || undefined,
          phoneCompany: it.ai?.phoneCompany || undefined,
          phoneMobile: it.ai?.phoneMobile || undefined,
          email: it.ai?.email || undefined,
          fax: it.ai?.fax || undefined,
          interestedService: it.service!,
          detectedLanguage: it.ai?.detectedLanguage,
          aiFilledFields: it.ai?.aiFilledFields ?? [],
          aiConfidence: it.ai?.aiConfidence,
        });
        dispatch({ type: 'mark-saved', id: it.id });
      } catch (err) {
        dispatch({
          type: 'mark-save-failed',
          id: it.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    dispatch({ type: 'finish' });
  }

  const analyzedCount = state.items.filter((it) => it.status === 'analyzed').length;
  const analyzingCount = state.items.filter((it) => it.status === 'analyzing').length;
  const failedCount = state.items.filter((it) => it.status === 'failed').length;

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
        <h1 className="text-base font-semibold tracking-tight">{t('title')}</h1>
        <div className="w-9" />
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {state.step === 'select' && (
        <>
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('howto')}
            </p>
            <p className="text-sm text-muted-foreground">
              최대 {MAX_BATCH}장의 명함 앞면을 한 번에 선택하면 AI가 차례로 분석합니다.
              저장 단계에서 각 명함의 관심 서비스만 골라주세요.
            </p>
          </div>

          {state.items.length > 0 && (
            <ul className="space-y-2">
              {state.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 shadow-card"
                >
                  <div className="aspect-card h-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    <ImagePreview src={it.blob} alt="명함" />
                  </div>
                  <p className="flex-1 truncate text-sm text-muted-foreground">
                    이미지 {state.items.indexOf(it) + 1}
                  </p>
                  <RotateButton
                    onRotate={async () => {
                      const rotated = await rotateImage90(it.blob, 'cw');
                      dispatch({ type: 'rotate-item', id: it.id, blob: rotated });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'remove', id: it.id })}
                    aria-label="제거"
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {state.items.length < MAX_BATCH && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="lift flex aspect-card w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground shadow-card hover:border-primary/40 hover:bg-muted/60 hover:text-foreground"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-card text-primary shadow-card">
                <Upload className="size-4" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-medium text-foreground">
                명함 이미지 선택
              </span>
              <span className="text-[11px]">
                {state.items.length}/{MAX_BATCH} · 탭하거나 클릭해서 추가
              </span>
            </button>
          )}

          <Button
            size="lg"
            className="h-12"
            disabled={state.items.length === 0}
            onClick={analyzeAll}
          >
            {state.items.length === 0
              ? '명함을 1장 이상 선택'
              : `${state.items.length}장 분석 시작`}
          </Button>
        </>
      )}

      {state.step === 'analyzing' && (
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <Loader2 className="size-10 animate-spin text-primary" strokeWidth={1.75} />
          <div className="space-y-1">
            <p className="text-sm font-medium">분석 중…</p>
            <p className="text-xs text-muted-foreground tabular">
              {analyzedCount + failedCount}/{state.items.length} 완료 · {analyzingCount} 진행
            </p>
          </div>
        </div>
      )}

      {state.step === 'review' && (
        <>
          <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              일괄 적용
            </p>
            <div className="flex gap-2">
              <Select
                value={state.bulkService ?? ''}
                onValueChange={(v) =>
                  dispatch({
                    type: 'set-bulk-service',
                    service: (v || undefined) as InterestedService | undefined,
                  })
                }
              >
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue placeholder="관심 서비스 선택" />
                </SelectTrigger>
                <SelectContent>
                  {INTERESTED_SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tService(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!state.bulkService}
                onClick={() => dispatch({ type: 'apply-bulk' })}
              >
                모두 적용
              </Button>
            </div>
          </div>

          <ul className="space-y-3">
            {state.items.map((it) => (
              <ReviewItem
                key={it.id}
                item={it}
                onServiceChange={(service) =>
                  dispatch({ type: 'set-service', id: it.id, service })
                }
                onToggleSkip={() => dispatch({ type: 'toggle-skip', id: it.id })}
                onRotate={async () => {
                  const rotated = await rotateImage90(it.blob, 'cw');
                  dispatch({ type: 'rotate-item', id: it.id, blob: rotated });
                }}
              />
            ))}
          </ul>

          <Button size="lg" className="h-12" onClick={saveAll}>
            {`${state.items.filter((it) => it.status === 'analyzed' && !it.skipped).length}장 저장`}
          </Button>
        </>
      )}

      {state.step === 'saving' && (
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <Loader2 className="size-10 animate-spin text-primary" strokeWidth={1.75} />
          <div className="space-y-1">
            <p className="text-sm font-medium">저장 중…</p>
            <p className="text-xs text-muted-foreground tabular">
              {state.savedCount + state.saveFailedCount}/
              {state.items.filter((it) => it.status === 'analyzed' && !it.skipped).length} 완료
            </p>
          </div>
        </div>
      )}

      {state.step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="size-12 text-primary" strokeWidth={1.5} />
          <div className="space-y-1">
            <p className="text-base font-semibold">
              {state.savedCount}장 저장 완료
            </p>
            {state.saveFailedCount > 0 && (
              <p className="text-xs text-destructive">
                {state.saveFailedCount}장 저장 실패 — 네트워크 확인 후 다시 시도
              </p>
            )}
          </div>
          <div className="flex w-full gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => dispatch({ type: 'reset' })}
            >
              새로 시작
            </Button>
            <Button className="flex-1" onClick={() => router.push('/cards')}>
              목록 보기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewItem({
  item,
  onServiceChange,
  onToggleSkip,
  onRotate,
}: {
  item: Item;
  onServiceChange: (service: InterestedService | undefined) => void;
  onToggleSkip: () => void;
  onRotate: () => Promise<void> | void;
}) {
  const tService = useTranslations('service');

  if (item.status === 'failed') {
    return (
      <li className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <div className="aspect-card h-14 shrink-0 overflow-hidden rounded-md bg-muted">
          <ImagePreview src={item.blob} alt="실패" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertTriangle className="size-3.5" strokeWidth={1.75} />
            분석 실패
          </p>
          <p className="break-words text-[11px] text-destructive/80">{item.error}</p>
        </div>
      </li>
    );
  }

  const skipped = Boolean(item.skipped);

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border bg-card p-3 shadow-card ${
        skipped ? 'border-border/40 opacity-60' : 'border-border'
      }`}
    >
      <div className="relative aspect-card h-14 shrink-0 overflow-hidden rounded-md bg-muted">
        <ImagePreview src={item.blob} alt={item.ai?.companyName ?? '명함'} />
        <RotateButton compact onRotate={onRotate} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium text-foreground">
            {item.ai?.companyName || '—'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {item.ai?.personName || '—'}
            {item.ai?.position ? ` · ${item.ai.position}` : ''}
          </p>
        </div>

        {!skipped && (
          <Select
            value={item.service ?? ''}
            onValueChange={(v) =>
              onServiceChange((v || undefined) as InterestedService | undefined)
            }
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="관심 서비스 선택" />
            </SelectTrigger>
            <SelectContent>
              {INTERESTED_SERVICES.map((s) => (
                <SelectItem key={s} value={s}>
                  {tService(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleSkip}
        className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {skipped ? '복구' : '제외'}
      </button>
    </li>
  );
}

function RotateButton({
  onRotate,
  compact = false,
}: {
  onRotate: () => Promise<void> | void;
  compact?: boolean;
}) {
  const [rotating, setRotating] = useState(false);
  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (rotating) return;
    setRotating(true);
    try {
      await onRotate();
    } finally {
      setRotating(false);
    }
  }
  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={rotating}
        aria-label="90도 회전"
        className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform active:scale-90 disabled:opacity-60"
      >
        <RotateCw
          className={`size-3 ${rotating ? 'animate-spin' : ''}`}
          strokeWidth={1.75}
        />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={rotating}
      aria-label="90도 회전"
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <RotateCw
        className={`size-4 ${rotating ? 'animate-spin' : ''}`}
        strokeWidth={1.75}
      />
    </button>
  );
}
