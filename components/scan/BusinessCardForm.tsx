'use client';

import { useMemo } from 'react';
import { useForm, Controller, type Control } from 'react-hook-form';
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
import { INTERESTED_SERVICES, type InterestedService } from '@/types/business-card';
import type { FormDefaults } from '@/lib/ai/parse';

export interface InitialUserFields {
  interestedService?: InterestedService;
  interestedServiceOther?: string;
  note?: string;
}

const FormSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().optional(),
  websiteGuessed: z.boolean().optional(),
  countryName: z.string().optional(),
  countryCode: z.string().optional(),
  personName: z.string().min(1),
  personNameEn: z.string().optional(),
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
  personNameEn: ['personNameEn'],
  position: ['position'],
  industry: ['industry'],
};

export interface BusinessCardFormProps {
  defaults?: FormDefaults;
  initialUserFields?: InitialUserFields;
  onSubmit: (values: FormValues) => Promise<void> | void;
  submitting?: boolean;
  submitLabel?: string;
}

export function BusinessCardForm({
  defaults,
  initialUserFields,
  onSubmit,
  submitting,
  submitLabel,
}: BusinessCardFormProps) {
  const t = useTranslations('form');
  const tService = useTranslations('service');

  const initial = useMemo<FormDefaultValues>(() => ({
    companyName: defaults?.companyName ?? '',
    website: defaults?.website ?? '',
    websiteGuessed: defaults?.websiteGuessed ?? false,
    countryName: defaults?.country?.name ?? '',
    countryCode: defaults?.country?.code ?? '',
    personName: defaults?.personName ?? '',
    personNameEn: defaults?.personNameEn ?? '',
    position: defaults?.position ?? '',
    industry: defaults?.industry ?? '',
    interestedService: initialUserFields?.interestedService,
    interestedServiceOther: initialUserFields?.interestedServiceOther ?? '',
    note: initialUserFields?.note ?? '',
  }), [defaults, initialUserFields]);

  const {
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
        <ControlledInput control={control} name="companyName" className={lowClass('companyName')} />
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
        <ControlledInput control={control} name="website" type="url" className={lowClass('website')} />
      </Field>

      <Field label={t('country')} showAi={showAi('country')}>
        <div className="flex gap-2">
          <ControlledInput control={control} name="countryName" placeholder="국가명" className="flex-1" />
          <ControlledInput control={control} name="countryCode" placeholder="ISO" maxLength={2} className="w-20" />
        </div>
      </Field>

      <Field
        label={t('personName')}
        showAi={showAi('personName')}
        error={errors.personName ? t('required') : undefined}
      >
        <ControlledInput control={control} name="personName" className={lowClass('personName')} />
      </Field>

      <Field label={t('personNameEn')} showAi={showAi('personNameEn')}>
        <ControlledInput control={control} name="personNameEn" className={lowClass('personNameEn')} />
      </Field>

      <Field label={t('position')} showAi={showAi('position')}>
        <ControlledInput control={control} name="position" className={lowClass('position')} />
      </Field>

      <Field label={t('industry')} showAi={showAi('industry')}>
        <ControlledInput control={control} name="industry" className={lowClass('industry')} />
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
          <ControlledInput control={control} name="interestedServiceOther" />
        </Field>
      )}

      <Field label={t('note')}>
        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <Textarea
              rows={3}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </Field>

      <Button type="submit" disabled={submitting}>
        {submitting ? '...' : (submitLabel ?? '저장')}
      </Button>
    </form>
  );
}

interface ControlledInputProps {
  control: Control<FormValues>;
  name: keyof FormValues;
  className?: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}

function ControlledInput({ control, name, className, type, placeholder, maxLength }: ControlledInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          type={type}
          placeholder={placeholder}
          maxLength={maxLength}
          className={className}
          value={typeof field.value === 'string' ? field.value : (field.value ?? '') as string}
          onChange={(e) => field.onChange(e.currentTarget.value)}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      )}
    />
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
