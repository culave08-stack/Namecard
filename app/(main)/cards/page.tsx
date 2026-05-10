'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CardListItem } from '@/components/cards/CardListItem';
import { getCardRepository } from '@/lib/db/dexie-repository';
import type { BusinessCard, InterestedService } from '@/types/business-card';
import { INTERESTED_SERVICES } from '@/types/business-card';

const SERVICE_ALL = '__all__';
const COUNTRY_ALL = '__all__';

export default function CardsListPage() {
  const t = useTranslations('list');
  const tService = useTranslations('service');
  const [cards, setCards] = useState<BusinessCard[] | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>(SERVICE_ALL);
  const [countryFilter, setCountryFilter] = useState<string>(COUNTRY_ALL);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    getCardRepository().list().then(setCards);
  }, []);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards ?? []) {
      if (c.country?.name) set.add(c.country.name);
    }
    return Array.from(set).sort();
  }, [cards]);

  const filtered = useMemo(() => {
    if (!cards) return [];
    const q = query.trim().toLowerCase();
    return cards
      .filter((c) => {
        if (serviceFilter !== SERVICE_ALL && c.interestedService !== serviceFilter) return false;
        if (countryFilter !== COUNTRY_ALL && c.country?.name !== countryFilter) return false;
        if (q) {
          const haystack = [
            c.companyName,
            c.personName,
            c.personNameEn,
            c.position,
            c.industry,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp = a.createdAt.localeCompare(b.createdAt);
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [cards, query, serviceFilter, countryFilter, sortDir]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          {t('back')}
        </Link>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <div className="w-12" />
      </div>

      <Input
        placeholder={t('search')}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
      />

      <div className="grid grid-cols-3 gap-2">
        <FilterSelect
          ariaLabel={t('filterService')}
          value={serviceFilter}
          onChange={setServiceFilter}
          options={[
            { value: SERVICE_ALL, label: t('all') },
            ...INTERESTED_SERVICES.map((s) => ({
              value: s,
              label: tService(s as InterestedService),
            })),
          ]}
        />
        <FilterSelect
          ariaLabel={t('filterCountry')}
          value={countryFilter}
          onChange={setCountryFilter}
          options={[
            { value: COUNTRY_ALL, label: t('all') },
            ...countries.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          ariaLabel="sort"
          value={sortDir}
          onChange={(v) => setSortDir(v as 'desc' | 'asc')}
          options={[
            { value: 'desc', label: t('sortNewest') },
            { value: 'asc', label: t('sortOldest') },
          ]}
        />
      </div>

      {cards === undefined ? (
        <div className="flex flex-col gap-2">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t('count', { n: filtered.length })}</p>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((c) => (
                <CardListItem key={c.id} card={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface FilterOption {
  value: string;
  label: string;
}

function FilterSelect({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Skeleton() {
  return <div className="h-20 animate-pulse rounded-lg bg-muted" />;
}
