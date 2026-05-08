// tests/ai/parse.test.ts
import { describe, it, expect } from 'vitest';
import { parseScanResponse, scanResultToFormDefaults } from '@/lib/ai/parse';

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

  it('throws on invalid country code', () => {
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
    expect(() => parseScanResponse(raw)).toThrow();
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
});
