// lib/ai/parse.ts
import { ScanResultSchema, type ScanResultParsed } from './schema';
import type { BusinessCard } from '@/types/business-card';

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

export function scanResultToFormDefaults(parsed: ScanResultParsed): FormDefaults {
  const companyName = cleanString(parsed.companyName);
  const website = cleanString(parsed.website);
  const country = cleanCountry(parsed.country);
  const personName = cleanString(parsed.personName);
  const personNameEn = cleanString(parsed.personNameEn);
  const position = cleanString(parsed.position);
  const industry = cleanString(parsed.industry);

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
