// tests/api/scan.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockScan } = vi.hoisted(() => ({ mockScan: vi.fn() }));

vi.mock('@/lib/ai/client', () => ({
  createClaudeClient: () => ({ scan: mockScan }),
}));

import { POST } from '@/app/api/scan/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/scan', () => {
  beforeEach(() => {
    mockScan.mockReset();
  });

  it('returns 400 when frontImage is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('invalid_image');
  });

  it('returns parsed scan result on Claude success', async () => {
    mockScan.mockResolvedValue(
      JSON.stringify({
        companyName: 'Acme',
        website: null,
        websiteGuessed: false,
        country: { name: '한국', code: 'KR' },
        personName: 'Kim',
        position: null,
        industry: null,
        detectedLanguage: 'ko',
      })
    );
    const res = await POST(
      makeRequest({ frontImage: 'data:image/jpeg;base64,Zm9v' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.companyName).toBe('Acme');
    expect(json.country.code).toBe('KR');
  });

  it('returns 502 ai_failed when Claude returns invalid JSON', async () => {
    mockScan.mockResolvedValue('totally not json');
    const res = await POST(
      makeRequest({ frontImage: 'data:image/jpeg;base64,Zm9v' })
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.code).toBe('ai_failed');
  });

  it('returns 504 timeout when Claude throws timeout error', async () => {
    mockScan.mockRejectedValue(Object.assign(new Error('timed out'), { name: 'AbortError' }));
    const res = await POST(
      makeRequest({ frontImage: 'data:image/jpeg;base64,Zm9v' })
    );
    expect(res.status).toBe(504);
    const json = await res.json();
    expect(json.code).toBe('timeout');
  });
});
