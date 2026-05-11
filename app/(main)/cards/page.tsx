'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, Search } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { getCardRepository } from '@/lib/db/supabase-repository';
import type { BusinessCard, InterestedService } from '@/types/business-card';
import { INTERESTED_SERVICES } from '@/types/business-card';

const SERVICE_ALL = '__all__';
const COUNTRY_ALL = '__all__';

export default function CardsListPage() {
  const t = useTranslations('list');
  const tService = useTranslations('service');
  const tExport = useTranslations('export');
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
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          aria-label={t('back')}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
        </Link>
        <h1 className="text-base font-semibold tracking-tight">{t('title')}</h1>
        <div className="w-9" />
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <Input
          placeholder={t('search')}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          className="h-11 pl-9"
        />
      </div>

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
          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <p className="text-xs text-muted-foreground tabular">
              {t('count', { n: filtered.length })}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={filtered.length === 0}
              onClick={async () => {
                const { downloadCardsXlsx } = await import('@/lib/export/xlsx');
                downloadCardsXlsx(filtered, {
                  service: {
                    kinderboard: tService('kinderboard'),
                    lumitiq: tService('lumitiq'),
                    artbongbong: tService('artbongbong'),
                    turuturu: tService('turuturu'),
                    aidt: tService('aidt'),
                    other: tService('other'),
                  },
                });
              }}
              className="gap-1.5"
            >
              <FileSpreadsheet className="size-3.5" strokeWidth={1.75} />
              {tExport('xlsx')}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/30 py-16 text-center">
              <Search className="size-7 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
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
      <SelectTrigger aria-label={ariaLabel} className="h-10">
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
  return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
}
