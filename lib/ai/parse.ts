// lib/ai/parse.ts
import { ScanResultSchema, type ScanResultParsed } from './schema';
import { INDUSTRIES, type BusinessCard, type Industry } from '@/types/business-card';

const JSON_BLOCK = /```(?:json)?\s*([\s\S]*?)\s*```/i;

export function parseScanResponse(raw: string): ScanResultParsed {
  const candidate = extractJson(raw);
  let json: unknown;
  try {
    json = JSON.parse(candidate);
  } catch {
    throw new Error('AI response is not valid JSON');
  }
  return ScanResultSchema.parse(json);
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(JSON_BLOCK);
  if (match) return match[1];
  // last resort: find first { ... } block
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export type FormDefaults = Pick<
  BusinessCard,
  | 'companyName'
  | 'website'
  | 'websiteGuessed'
  | 'country'
  | 'personName'
  | 'personNameEn'
  | 'position'
  | 'industry'
  | 'detectedLanguage'
  | 'aiFilledFields'
  | 'aiConfidence'
>;

// Normalizes a possibly-string value: blanks, "..." placeholders, and the
// literal "null"/"undefined" become undefined. Otherwise returns the trimmed
// string. Non-strings pass through unchanged.
function cleanString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  if (/^\.{2,}$/.test(trimmed)) return undefined;
  if (trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return undefined;
  return trimmed;
}

function cleanCountry(c: ScanResultParsed['country']) {
  if (!c) return undefined;
  const name = cleanString(c.name);
  const code = cleanString(c.code);
  if (!name || !code) return undefined;
  return { name, code: code.toUpperCase() };
}

// Aliases that the AI might emit instead of the canonical Korean labels.
// Keys are normalized (lowercase, separators collapsed) — see normalizeKey().
const INDUSTRY_ALIASES: Record<string, Industry> = {
  // 교육
  education: '교육',
  edu: '교육',
  school: '교육',
  edutech: '교육',
  edtech: '교육',
  // IT·소프트웨어
  it: 'IT·소프트웨어',
  software: 'IT·소프트웨어',
  소프트웨어: 'IT·소프트웨어',
  tech: 'IT·소프트웨어',
  technology: 'IT·소프트웨어',
  saas: 'IT·소프트웨어',
  // 제조
  manufacturing: '제조',
  manufacture: '제조',
  제조업: '제조',
  // 유통·리테일
  retail: '유통·리테일',
  ecommerce: '유통·리테일',
  '유통': '유통·리테일',
  리테일: '유통·리테일',
  // 서비스
  service: '서비스',
  services: '서비스',
  // 의료·헬스케어
  healthcare: '의료·헬스케어',
  health: '의료·헬스케어',
  의료: '의료·헬스케어',
  헬스케어: '의료·헬스케어',
  medical: '의료·헬스케어',
  // 금융
  finance: '금융',
  financial: '금융',
  banking: '금융',
  // 건설·부동산
  construction: '건설·부동산',
  realestate: '건설·부동산',
  건설: '건설·부동산',
  부동산: '건설·부동산',
  // 식음료
  fnb: '식음료',
  foodbeverage: '식음료',
  food: '식음료',
  // 엔터테인먼트·미디어
  entertainment: '엔터테인먼트·미디어',
  media: '엔터테인먼트·미디어',
  엔터테인먼트: '엔터테인먼트·미디어',
  미디어: '엔터테인먼트·미디어',
  // 디자인·광고
  design: '디자인·광고',
  advertising: '디자인·광고',
  marketing: '디자인·광고',
  광고: '디자인·광고',
  디자인: '디자인·광고',
  exhibitiondesign: '디자인·광고',
  // 컨설팅
  consulting: '컨설팅',
  consultant: '컨설팅',
  // 물류·운송
  logistics: '물류·운송',
  shipping: '물류·운송',
  물류: '물류·운송',
  운송: '물류·운송',
  // 공공·정부
  government: '공공·정부',
  public: '공공·정부',
  정부: '공공·정부',
  공공: '공공·정부',
  // 농업·식품
  agriculture: '농업·식품',
  farming: '농업·식품',
  // 에너지·환경
  energy: '에너지·환경',
  environment: '에너지·환경',
  에너지: '에너지·환경',
  환경: '에너지·환경',
  // 법률·회계
  legal: '법률·회계',
  law: '법률·회계',
  accounting: '법률·회계',
  법률: '법률·회계',
  회계: '법률·회계',
  // 연구·R&D
  research: '연구·R&D',
  rnd: '연구·R&D',
  연구: '연구·R&D',
  // 기타
  other: '기타',
  etc: '기타',
};

// Normalize a string for alias lookup: lowercase + drop spaces and all
// common separator characters (· / - · ／ etc).
function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_/／·∙•・&]+/g, '');
}

// Build canonical-key lookup for INDUSTRIES so e.g. "it·소프트웨어" matches "IT·소프트웨어".
const CANONICAL_BY_KEY: Record<string, Industry> = Object.fromEntries(
  INDUSTRIES.map((label) => [normalizeKey(label), label])
);

export function normalizeIndustry(raw: unknown): Industry | undefined {
  const cleaned = cleanString(raw);
  if (!cleaned) return undefined;
  const key = normalizeKey(cleaned);
  if (!key) return undefined;
  // 1) exact canonical match (case/separator-insensitive)
  if (CANONICAL_BY_KEY[key]) return CANONICAL_BY_KEY[key];
  // 2) alias match (also normalized)
  for (const [aliasRaw, label] of Object.entries(INDUSTRY_ALIASES)) {
    if (normalizeKey(aliasRaw) === key) return label;
  }
  // 3) substring match against canonical labels (e.g. "IT 소프트웨어 회사" → "IT·소프트웨어")
  for (const label of INDUSTRIES) {
    if (key.includes(normalizeKey(label))) return label;
  }
  // 4) substring match against aliases
  for (const [aliasRaw, label] of Object.entries(INDUSTRY_ALIASES)) {
    const aliasKey = normalizeKey(aliasRaw);
    if (aliasKey && key.includes(aliasKey)) return label;
  }
  // Unknown industry — fall through so the form keeps the AI's raw string
  // rather than silently coercing to "기타". The dropdown will treat
  // unrecognized values as cleared and the user can pick manually.
  return undefined;
}

export function scanResultToFormDefaults(parsed: ScanResultParsed): FormDefaults {
  const companyName = cleanString(parsed.companyName);
  const website = cleanString(parsed.website);
  const country = cleanCountry(parsed.country);
  const personName = cleanString(parsed.personName);
  const personNameEn = cleanString(parsed.personNameEn);
  const position = cleanString(parsed.position);
  const industry = normalizeIndustry(parsed.industry);

  const aiFilledFields: string[] = [];
  if (companyName) aiFilledFields.push('companyName');
  if (website) aiFilledFields.push('website');
  if (country) aiFilledFields.push('country');
  if (personName) aiFilledFields.push('personName');
  if (personNameEn) aiFilledFields.push('personNameEn');
  if (position) aiFilledFields.push('position');
  if (industry) aiFilledFields.push('industry');

  return {
    companyName: companyName ?? '',
    website,
    websiteGuessed: parsed.websiteGuessed && Boolean(website),
    country,
    personName: personName ?? '',
    personNameEn,
    position,
    industry,
    detectedLanguage: parsed.detectedLanguage ?? undefined,
    aiFilledFields,
    aiConfidence: parsed.confidence as BusinessCard['aiConfidence'],
  };
}
