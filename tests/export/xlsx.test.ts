import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  cardsToRows,
  cardsToWorkbook,
  defaultExportFilename,
  type XlsxColumns,
} from '@/lib/export/xlsx';
import type { BusinessCard } from '@/types/business-card';

const LABELS: XlsxColumns = {
  service: {
    kinderboard: '킨더보드',
    lumitiq: '루미티치',
    artbongbong: '아트봉봉',
    turuturu: '뚜루뚜루',
    aidt: 'AIDT',
    other: '기타',
  },
};

function makeCard(overrides: Partial<BusinessCard> = {}): BusinessCard {
  return {
    id: 'id1',
    createdAt: '2026-05-11T07:33:00.000Z',
    updatedAt: '2026-05-11T07:33:00.000Z',
    frontImageUrl: 'https://example.com/front.jpg',
    companyName: 'Young Asia',
    website: 'blog.naver.com/youngasia',
    websiteGuessed: false,
    country: { name: '대한민국', code: 'KR' },
    personName: '강용하',
    personNameEn: 'Kevin Kang',
    position: 'Exhibition Design Manager',
    industry: '디자인·광고',
    interestedService: 'kinderboard',
    aiFilledFields: [],
    ...overrides,
  };
}

describe('cardsToRows', () => {
  it('maps a card to Korean column headers', () => {
    const [row] = cardsToRows([makeCard()], LABELS);
    expect(row.회사명).toBe('Young Asia');
    expect(row.담당자).toBe('강용하');
    expect(row['담당자(영문)']).toBe('Kevin Kang');
    expect(row.직책).toBe('Exhibition Design Manager');
    expect(row.국가).toBe('대한민국 (KR)');
    expect(row.홈페이지).toBe('blog.naver.com/youngasia');
    expect(row.업종).toBe('디자인·광고');
    expect(row.관심서비스).toBe('킨더보드');
  });

  it('uses interestedServiceOther label when service is "other"', () => {
    const [row] = cardsToRows(
      [makeCard({ interestedService: 'other', interestedServiceOther: '신규 분야' })],
      LABELS
    );
    expect(row.관심서비스).toBe('기타');
    expect(row['관심서비스(기타)']).toBe('신규 분야');
  });

  it('renders empty strings for missing optional fields', () => {
    const [row] = cardsToRows(
      [
        makeCard({
          personNameEn: undefined,
          position: undefined,
          country: undefined,
          website: undefined,
          industry: undefined,
          note: undefined,
        }),
      ],
      LABELS
    );
    expect(row['담당자(영문)']).toBe('');
    expect(row.직책).toBe('');
    expect(row.국가).toBe('');
    expect(row.홈페이지).toBe('');
    expect(row.업종).toBe('');
    expect(row.노트).toBe('');
  });

  it('formats createdAt to local-style YYYY-MM-DD HH:mm', () => {
    const [row] = cardsToRows([makeCard()], LABELS);
    // exact tz depends on environment; check shape only
    expect(row.등록일).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

describe('cardsToWorkbook', () => {
  it('produces a workbook with a "명함" sheet matching headers + rows', () => {
    const wb = cardsToWorkbook([makeCard(), makeCard({ id: 'id2', companyName: 'B' })], LABELS);
    expect(wb.SheetNames).toContain('명함');
    const ws = wb.Sheets['명함'];

    // first row = headers
    expect(ws.A1.v).toBe('등록일');
    expect(ws.B1.v).toBe('회사명');
    expect(ws.C1.v).toBe('담당자');
    expect(ws.D1.v).toBe('담당자(영문)');

    // data rows present (header row + 2 data rows)
    expect(ws.B2.v).toBe('Young Asia');
    expect(ws.B3.v).toBe('B');
  });

  it('round-trips through write+read preserving cell values', () => {
    const wb = cardsToWorkbook([makeCard()], LABELS);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const reopened = XLSX.read(buffer, { type: 'buffer' });
    const sheet = reopened.Sheets['명함'];
    expect(sheet.B2.v).toBe('Young Asia');
    expect(sheet.C2.v).toBe('강용하');
  });
});

describe('defaultExportFilename', () => {
  it('uses 명함목록_YYYYMMDD_HHmm.xlsx pattern', () => {
    const name = defaultExportFilename(new Date('2026-05-11T07:33:00'));
    expect(name).toMatch(/^명함목록_\d{8}_\d{4}\.xlsx$/);
  });
});
