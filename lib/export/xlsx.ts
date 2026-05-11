import * as XLSX from 'xlsx';
import type { BusinessCard, InterestedService } from '@/types/business-card';

export interface XlsxColumns {
  service: Record<InterestedService, string>;
}

interface Row {
  등록일: string;
  회사명: string;
  담당자: string;
  '담당자(영문)': string;
  직책: string;
  국가: string;
  홈페이지: string;
  업종: string;
  '회사 유형': string;
  관심서비스: string;
  '관심서비스(기타)': string;
  노트: string;
}

const HEADERS: ReadonlyArray<keyof Row> = [
  '등록일',
  '회사명',
  '담당자',
  '담당자(영문)',
  '직책',
  '국가',
  '홈페이지',
  '업종',
  '회사 유형',
  '관심서비스',
  '관심서비스(기타)',
  '노트',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function countryLabel(c: BusinessCard['country']): string {
  if (!c) return '';
  return c.code ? `${c.name} (${c.code})` : c.name;
}

export function cardsToRows(cards: BusinessCard[], labels: XlsxColumns): Row[] {
  return cards.map((c) => ({
    등록일: formatDate(c.createdAt),
    회사명: c.companyName,
    담당자: c.personName,
    '담당자(영문)': c.personNameEn ?? '',
    직책: c.position ?? '',
    국가: countryLabel(c.country),
    홈페이지: c.website ?? '',
    업종: c.industry ?? '',
    '회사 유형': c.companyType ?? '',
    관심서비스: labels.service[c.interestedService] ?? c.interestedService,
    '관심서비스(기타)': c.interestedServiceOther ?? '',
    노트: c.note ?? '',
  }));
}

export function cardsToWorkbook(
  cards: BusinessCard[],
  labels: XlsxColumns
): XLSX.WorkBook {
  const rows = cardsToRows(cards, labels);
  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS as string[] });

  // auto-width: longest cell per column + small padding
  ws['!cols'] = HEADERS.map((h) => {
    const headerLen = stringWidth(h);
    const maxCell = rows.reduce(
      (acc, r) => Math.max(acc, stringWidth(String(r[h] ?? ''))),
      headerLen
    );
    return { wch: Math.min(maxCell + 2, 60) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '명함');
  return wb;
}

// Approximate visible width: CJK characters count as 2 columns.
function stringWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    // CJK / Hangul / Hiragana / Katakana ranges (rough)
    if (
      (cp >= 0x1100 && cp <= 0x11ff) || // Hangul Jamo
      (cp >= 0x3040 && cp <= 0x30ff) || // Hiragana + Katakana
      (cp >= 0x3400 && cp <= 0x9fff) || // CJK Unified Ideographs
      (cp >= 0xac00 && cp <= 0xd7af) || // Hangul Syllables
      (cp >= 0xf900 && cp <= 0xfaff)    // CJK Compatibility Ideographs
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

export function defaultExportFilename(now: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `명함목록_${yyyy}${mm}${dd}_${hh}${min}.xlsx`;
}

export function downloadCardsXlsx(
  cards: BusinessCard[],
  labels: XlsxColumns,
  filename: string = defaultExportFilename()
): void {
  const wb = cardsToWorkbook(cards, labels);
  XLSX.writeFile(wb, filename);
}
