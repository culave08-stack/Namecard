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
  | 'position'
  | 'industry'
  | 'detectedLanguage'
  | 'aiFilledFields'
  | 'aiConfidence'
>;

export function scanResultToFormDefaults(parsed: ScanResultParsed): FormDefaults {
  const aiFilledFields: string[] = [];
  const fieldMap: Array<[keyof ScanResultParsed, string]> = [
    ['companyName', 'companyName'],
    ['website', 'website'],
    ['country', 'country'],
    ['personName', 'personName'],
    ['position', 'position'],
    ['industry', 'industry'],
  ];
  for (const [src, dst] of fieldMap) {
    if (parsed[src] !== null && parsed[src] !== undefined) {
      aiFilledFields.push(dst);
    }
  }
  return {
    companyName: parsed.companyName ?? '',
    website: parsed.website ?? undefined,
    websiteGuessed: parsed.websiteGuessed,
    country: parsed.country ?? undefined,
    personName: parsed.personName ?? '',
    position: parsed.position ?? undefined,
    industry: parsed.industry ?? undefined,
    detectedLanguage: parsed.detectedLanguage ?? undefined,
    aiFilledFields,
    aiConfidence: parsed.confidence as BusinessCard['aiConfidence'],
  };
}
