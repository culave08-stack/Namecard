// tests/ai/parse.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizeCompanyType,
  normalizeIndustry,
  parseScanResponse,
  scanResultToFormDefaults,
} from '@/lib/ai/parse';

describe('parseScanResponse', () => {
  it('parses valid JSON string', () => {
    const raw = JSON.stringify({
      companyName: 'Acme Corp',
      website: 'acme.com',
      websiteGuessed: false,
      country: { name: '베트남', code: 'VN' },
      personName: 'Nguyen Van A',
      position: 'CTO',
      industry: 'IT',
      detectedLanguage: 'vi',
      confidence: { companyName: 'high', personName: 'high' },
    });
    const result = parseScanResponse(raw);
    expect(result.companyName).toBe('Acme Corp');
    expect(result.country?.code).toBe('VN');
  });

  it('extracts JSON from text wrapper (defense)', () => {
    const raw = 'Sure! Here is the JSON:\n```json\n{"companyName":"X","website":null,"websiteGuessed":false,"country":null,"personName":"Y","position":null,"industry":null,"detectedLanguage":null}\n```';
    const result = parseScanResponse(raw);
    expect(result.companyName).toBe('X');
    expect(result.personName).toBe('Y');
  });

  it('accepts non-alpha-2 country codes (normalization happens later)', () => {
    // Real-world: AI sometimes returns 3-letter codes despite the prompt.
    // The schema no longer throws so we don't drop the whole response.
    const raw = JSON.stringify({
      companyName: 'X',
      website: null,
      websiteGuessed: false,
      country: { name: '한국', code: 'KOR' },
      personName: 'Y',
      position: null,
      industry: null,
      detectedLanguage: 'ko',
    });
    const result = parseScanResponse(raw);
    expect(result.country?.code).toBe('KOR');
  });

  it('throws on completely invalid JSON', () => {
    expect(() => parseScanResponse('not json at all')).toThrow();
  });
});

describe('scanResultToFormDefaults', () => {
  it('maps non-null AI fields to aiFilledFields', () => {
    const parsed = {
      companyName: 'Acme',
      website: null,
      websiteGuessed: false,
      country: { name: '한국', code: 'KR' },
      personName: 'Kim',
      position: null,
      industry: null,
      detectedLanguage: 'ko' as const,
      confidence: { companyName: 'high' as const },
    };
    const defaults = scanResultToFormDefaults(parsed);
    expect(defaults.aiFilledFields).toContain('companyName');
    expect(defaults.aiFilledFields).toContain('country');
    expect(defaults.aiFilledFields).toContain('personName');
    expect(defaults.aiFilledFields).not.toContain('website');
    expect(defaults.aiFilledFields).not.toContain('position');
  });

  it('marks website as guessed when websiteGuessed is true', () => {
    const parsed = {
      companyName: 'Acme',
      website: 'acme.com',
      websiteGuessed: true,
      country: null,
      personName: 'Kim',
      position: null,
      industry: null,
      detectedLanguage: null,
    };
    const defaults = scanResultToFormDefaults(parsed);
    expect(defaults.website).toBe('acme.com');
    expect(defaults.websiteGuessed).toBe(true);
    expect(defaults.aiFilledFields).toContain('website');
  });

  it('normalizes 3-letter country codes to ISO alpha-2', () => {
    const parsed = {
      companyName: 'X',
      website: null,
      websiteGuessed: false,
      country: { name: '한국', code: 'KOR' },
      personName: 'Y',
      position: null,
      industry: null,
      detectedLanguage: 'ko' as const,
    };
    const defaults = scanResultToFormDefaults(parsed);
    expect(defaults.country?.code).toBe('KR');
  });

  it('keeps country name but blanks unknown code (no alpha-3 mapping)', () => {
    const parsed = {
      companyName: 'X',
      website: null,
      websiteGuessed: false,
      country: { name: '베트남', code: 'XYZ' },
      personName: 'Y',
      position: null,
      industry: null,
      detectedLanguage: 'vi' as const,
    };
    const defaults = scanResultToFormDefaults(parsed);
    expect(defaults.country?.name).toBe('베트남');
    expect(defaults.country?.code).toBe('');
  });

  it('normalizes industry to a canonical taxonomy value', () => {
    const parsed = {
      companyName: 'X',
      website: null,
      websiteGuessed: false,
      country: null,
      personName: 'Y',
      position: null,
      industry: 'Exhibition Design',
      detectedLanguage: null,
    };
    const defaults = scanResultToFormDefaults(parsed);
    expect(defaults.industry).toBe('디자인·광고');
    expect(defaults.aiFilledFields).toContain('industry');
  });
});

describe('normalizeIndustry', () => {
  it('returns canonical labels unchanged', () => {
    expect(normalizeIndustry('교육')).toBe('교육');
    expect(normalizeIndustry('IT·소프트웨어')).toBe('IT·소프트웨어');
    expect(normalizeIndustry('연구·R&D')).toBe('연구·R&D');
  });

  it('maps English aliases to Korean canonical', () => {
    expect(normalizeIndustry('IT')).toBe('IT·소프트웨어');
    expect(normalizeIndustry('Software')).toBe('IT·소프트웨어');
    expect(normalizeIndustry('Manufacturing')).toBe('제조');
    expect(normalizeIndustry('Healthcare')).toBe('의료·헬스케어');
    expect(normalizeIndustry('Logistics')).toBe('물류·운송');
    expect(normalizeIndustry('Marketing')).toBe('디자인·광고');
  });

  it('is separator/whitespace insensitive', () => {
    expect(normalizeIndustry('IT/소프트웨어')).toBe('IT·소프트웨어');
    expect(normalizeIndustry('IT 소프트웨어')).toBe('IT·소프트웨어');
    expect(normalizeIndustry('it·소프트웨어')).toBe('IT·소프트웨어');
  });

  it('returns undefined for empty / unknown values', () => {
    expect(normalizeIndustry(null)).toBeUndefined();
    expect(normalizeIndustry('')).toBeUndefined();
    expect(normalizeIndustry('   ')).toBeUndefined();
    expect(normalizeIndustry('....')).toBeUndefined();
    expect(normalizeIndustry('완전히 새로운 분야 xyzzy')).toBeUndefined();
  });

  it('matches substring against canonical labels', () => {
    expect(normalizeIndustry('의료 헬스케어 관련 기업')).toBe('의료·헬스케어');
    expect(normalizeIndustry('디자인 및 광고 대행')).toBe('디자인·광고');
  });
});

describe('normalizeCompanyType', () => {
  it('returns canonical labels unchanged', () => {
    expect(normalizeCompanyType('학교')).toBe('학교');
    expect(normalizeCompanyType('에듀테크')).toBe('에듀테크');
    expect(normalizeCompanyType('협회·단체')).toBe('협회·단체');
  });

  it('maps English aliases to Korean canonical', () => {
    expect(normalizeCompanyType('School')).toBe('학교');
    expect(normalizeCompanyType('Kindergarten')).toBe('유치원·어린이집');
    expect(normalizeCompanyType('Academy')).toBe('학원');
    expect(normalizeCompanyType('EdTech')).toBe('에듀테크');
    expect(normalizeCompanyType('Publisher')).toBe('출판사');
    expect(normalizeCompanyType('Distributor')).toBe('유통사');
    expect(normalizeCompanyType('Government')).toBe('정부기관');
    expect(normalizeCompanyType('Startup')).toBe('스타트업');
  });

  it('is separator/whitespace insensitive', () => {
    expect(normalizeCompanyType('유치원/어린이집')).toBe('유치원·어린이집');
    expect(normalizeCompanyType('연구·R&D 연구기관')).toBe('연구기관');
    expect(normalizeCompanyType('협회 단체')).toBe('협회·단체');
  });

  it('returns undefined for empty / unknown values', () => {
    expect(normalizeCompanyType(null)).toBeUndefined();
    expect(normalizeCompanyType('')).toBeUndefined();
    expect(normalizeCompanyType('....')).toBeUndefined();
    expect(normalizeCompanyType('완전히 새로운 조직 xyzzy')).toBeUndefined();
  });

  it('matches substring against canonical labels', () => {
    expect(normalizeCompanyType('서울중앙초등학교')).toBe('학교');
    expect(normalizeCompanyType('Edtech company in Seoul')).toBe('에듀테크');
    expect(normalizeCompanyType('카카오 스타트업 출신')).toBe('스타트업');
  });
});
