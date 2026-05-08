'use client';

import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AiBadge } from '@/components/shared/AiBadge';
import { INTERESTED_SERVICES } from '@/types/business-card';
import type { FormDefaults } from '@/lib/ai/parse';

const FormSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().optional(),
  websiteGuessed: z.boolean().optional(),
  countryName: z.string().optional(),
  countryCode: z.string().optional(),
  personName: z.string().min(1),
  position: z.string().optional(),
  industry: z.string().optional(),
  interestedService: z.enum(
    ['kinderboard', 'lumitiq', 'artbongbong', 'turuturu', 'aidt', 'other'],
    { message: '서비스를 선택하세요' }
  ),
  interestedServiceOther: z.string().optional(),
  note: z.string().optional(),
});

export type FormValues = z.infer<typeof FormSchema>;
type FormDefaultValues = Partial<FormValues>;

const FIELD_TO_FORM_KEYS: Record<string, Array<keyof FormValues>> = {
  companyName: ['companyName'],
  website: ['website'],
  country: ['countryName', 'countryCode'],
  personName: ['personName'],
  position: ['position'],
  industry: ['industry'],
};

export interface BusinessCardFormProps {
  defaults?: FormDefaults;
  onSubmit: (values: FormValues) => Promise<void> | void;
  submitting?: boolean;
}

export function BusinessCardForm({ defaults, onSubmit, submitting }: BusinessCardFormProps) {
  const t = useTranslations('form');
  const tService = useTranslations('service');

  const initial = useMemo<FormDefaultValues>(() => ({
    companyName: defaults?.companyName ?? '',
    website: defaults?.website ?? '',
    websiteGuessed: defaults?.websiteGuessed ?? false,
    countryName: defaults?.country?.name ?? '',
    countryCode: defaults?.country?.code ?? '',
    personName: defaults?.personName ?? '',
    position: defaults?.position ?? '',
    industry: defaults?.industry ?? '',
    interestedService: undefined,
    interestedServiceOther: '',
    note: '',
  }), [defaults]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: initial as FormValues,
  });

  const aiFilled = new Set(defaults?.aiFilledFields ?? []);
  const conf = defaults?.aiConfidence ?? {};

  const showAi = (cardFieldKey: string) => {
    if (!aiFilled.has(cardFieldKey)) return false;
    const formKeys = FIELD_TO_FORM_KEYS[cardFieldKey] ?? [cardFieldKey as keyof FormValues];
    return !formKeys.some((k) => dirtyFields[k]);
  };
  const lowClass = (key: string) =>
    conf[key] === 'low' ? 'ring-2 ring-yellow-400' : '';

  const websiteValue = watch('website');
  const interestedService = watch('interestedService');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field
        label={t('companyName')}
        showAi={showAi('companyName')}
        error={errors.companyName ? t('required') : undefined}
      >
        <Input {...register('companyName')} className={lowClass('companyName')} />
      </Field>

      <Field
        label={t('website')}
        showAi={showAi('website')}
        hint={
          defaults?.websiteGuessed && websiteValue === defaults.website
            ? `⚠️ ${t('websiteGuessed')}`
            : undefined
        }
      >
        <Input type="url" {...register('website')} className={lowClass('website')} />
      </Field>

      <Field label={t('country')} showAi={showAi('country')}>
        <div className="flex gap-2">
          <Input {...register('countryName')} placeholder="국가명" />
          <Input {...register('countryCode')} placeholder="ISO" maxLength={2} className="w-20" />
        </div>
      </Field>

      <Field
        label={t('personName')}
        showAi={showAi('personName')}
        error={errors.personName ? t('required') : undefined}
      >
        <Input {...register('personName')} className={lowClass('personName')} />
      </Field>

      <Field label={t('position')} showAi={showAi('position')}>
        <Input {...register('position')} className={lowClass('position')} />
      </Field>

      <Field label={t('industry')} showAi={showAi('industry')}>
        <Input {...register('industry')} className={lowClass('industry')} />
      </Field>

      <Field
        label={t('interestedService')}
        error={errors.interestedService ? t('selectService') : undefined}
      >
        <Controller
          control={control}
          name="interestedService"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectService')} />
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
        />
      </Field>

      {interestedService === 'other' && (
        <Field label={t('interestedServiceOther')}>
          <Input {...register('interestedServiceOther')} />
        </Field>
      )}

      <Field label={t('note')}>
        <Textarea rows={3} {...register('note')} />
      </Field>

      <Button type="submit" disabled={submitting}>
        {submitting ? '...' : '저장'}
      </Button>
    </form>
  );
}

function Field({
  label,
  showAi,
  hint,
  error,
  children,
}: {
  label: string;
  showAi?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">
        {label}
        {showAi && <AiBadge />}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
