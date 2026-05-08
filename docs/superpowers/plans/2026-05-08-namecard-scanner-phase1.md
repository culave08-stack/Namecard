# Namecard Scanner — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 우선 명함 스캐너 MVP — 카메라/업로드 → Claude vision OCR → 폼 편집 → IndexedDB 저장 → 직전 카드 1건 홈 표시.

**Architecture:** Next.js 14 App Router 단일 SPA. 클라이언트가 이미지를 1600px·JPEG 0.8로 리사이즈해 `/api/scan` Route Handler로 전송. 서버에서만 Anthropic SDK로 `claude-opus-4-7` vision 호출. 응답을 Zod로 검증 후 폼에 prefill. 저장은 IndexedDB(Dexie)에 Repository 인터페이스로 추상화 — Phase 2+ Supabase 확장 대비.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, react-hook-form, zod, @anthropic-ai/sdk, dexie, next-intl, vitest, fake-indexeddb.

**Reference:** [docs/superpowers/specs/2026-05-08-namecard-scanner-design.md](../specs/2026-05-08-namecard-scanner-design.md)

---

## Task 1: 프로젝트 부트스트랩 (Next.js + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `vitest.config.ts`, `tests/sanity.test.ts`, `.env.local.example`

- [ ] **Step 1: Next.js 14 앱 스캐폴드**

```bash
cd /Users/im_1463/Documents/GitHub/Namecard
pnpm dlx create-next-app@14 . \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*" --use-pnpm --no-git
```
프롬프트: 기본값 모두 수락. `--no-git`은 이미 git repo이므로.

- [ ] **Step 2: Vitest + 테스트 의존성 설치**

```bash
pnpm add -D vitest @vitest/ui jsdom fake-indexeddb @testing-library/react @testing-library/jest-dom @types/node
```

- [ ] **Step 3: `vitest.config.ts` 작성**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 4: `tests/setup.ts` 작성**

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

- [ ] **Step 5: `tests/sanity.test.ts` 작성 (테스트 인프라 확인)**

```typescript
// tests/sanity.test.ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2);
  });

  it('jsdom is available', () => {
    expect(typeof document).toBe('object');
  });

  it('fake-indexeddb is available', () => {
    expect(typeof indexedDB).toBe('object');
  });
});
```

- [ ] **Step 6: `package.json`에 test 스크립트 추가**

`package.json`의 `"scripts"` 섹션에 추가:
```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 7: `.env.local.example` 작성**

```bash
# .env.local.example
# Anthropic Claude API
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-opus-4-7
```

- [ ] **Step 8: 테스트 실행 확인**

Run: `pnpm test`
Expected: 3개 sanity test PASS

- [ ] **Step 9: dev 서버 기동 확인**

Run: `pnpm dev`
브라우저에서 http://localhost:3000 접속 → Next.js 기본 페이지 표시 확인 후 Ctrl+C.

- [ ] **Step 10: 커밋**

```bash
git add .
git commit -m "chore: bootstrap Next.js 14 + Tailwind + Vitest"
```

---

## Task 2: 타입 정의

**Files:**
- Create: `types/business-card.ts`

- [ ] **Step 1: `types/business-card.ts` 작성**

```typescript
// types/business-card.ts

export type InterestedService =
  | 'kinderboard'
  | 'lumitiq'
  | 'artbongbong'
  | 'turuturu'
  | 'aidt'
  | 'other';

export const INTERESTED_SERVICES: InterestedService[] = [
  'kinderboard',
  'lumitiq',
  'artbongbong',
  'turuturu',
  'aidt',
  'other',
];

export type DetectedLanguage = 'ko' | 'en' | 'vi' | 'ja';
export type Confidence = 'low' | 'mid' | 'high';

export interface Country {
  name: string;
  code: string;
}

export interface BusinessCard {
  id: string;
  createdAt: string;
  updatedAt: string;
  frontImage: Blob;
  backImage?: Blob;
  companyName: string;
  website?: string;
  websiteGuessed?: boolean;
  country?: Country;
  personName: string;
  position?: string;
  industry?: string;
  interestedService: InterestedService;
  interestedServiceOther?: string;
  note?: string;
  detectedLanguage?: DetectedLanguage;
  aiFilledFields: string[];
  aiConfidence?: Partial<Record<string, Confidence>>;
}

export type ScanResult = {
  companyName: string | null;
  website: string | null;
  websiteGuessed: boolean;
  country: Country | null;
  personName: string | null;
  position: string | null;
  industry: string | null;
  detectedLanguage: DetectedLanguage | null;
  confidence?: Partial<Record<string, Confidence>>;
};
```

- [ ] **Step 2: TypeScript 컴파일 확인**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add types/
git commit -m "feat: add BusinessCard and ScanResult types"
```

---

## Task 3: 이미지 리사이즈 유틸 (TDD)

**Files:**
- Create: `lib/image/resize.ts`, `tests/image/resize.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// tests/image/resize.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { resizeImage } from '@/lib/image/resize';

beforeAll(() => {
  // jsdom HTMLCanvasElement.toBlob mock
  HTMLCanvasElement.prototype.toBlob = function (cb, type, quality) {
    const blob = new Blob(['fake'], { type: type || 'image/jpeg' });
    cb(blob);
  };
});

describe('resizeImage', () => {
  it('returns a Blob with image/jpeg type', async () => {
    const sourceBlob = new Blob(['x'], { type: 'image/png' });
    // mock Image loader
    Object.defineProperty(global, 'Image', {
      writable: true,
      value: class {
        onload: () => void = () => {};
        set src(_v: string) {
          setTimeout(() => {
            (this as any).naturalWidth = 3200;
            (this as any).naturalHeight = 2000;
            this.onload();
          }, 0);
        }
      },
    });

    const result = await resizeImage(sourceBlob, { maxEdge: 1600, quality: 0.8 });
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
  });

  it('preserves aspect ratio when scaling down', async () => {
    const calls: Array<{ w: number; h: number }> = [];
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string) {
      if (type === '2d') {
        return {
          drawImage: (_img: any, _x: number, _y: number, w: number, h: number) => {
            calls.push({ w, h });
          },
        } as any;
      }
      return origGetContext.call(this, type);
    };

    const sourceBlob = new Blob(['x'], { type: 'image/png' });
    Object.defineProperty(global, 'Image', {
      writable: true,
      value: class {
        onload: () => void = () => {};
        set src(_v: string) {
          setTimeout(() => {
            (this as any).naturalWidth = 3200;
            (this as any).naturalHeight = 2000;
            this.onload();
          }, 0);
        }
      },
    });

    await resizeImage(sourceBlob, { maxEdge: 1600, quality: 0.8 });
    // 3200x2000 → maxEdge 1600 → 1600x1000 (ratio 1.6)
    expect(calls[0]).toEqual({ w: 1600, h: 1000 });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test resize`
Expected: FAIL — `resizeImage` not exported

- [ ] **Step 3: 구현 작성**

```typescript
// lib/image/resize.ts

export interface ResizeOptions {
  maxEdge: number;
  quality: number; // 0-1
}

export async function resizeImage(
  source: Blob,
  options: ResizeOptions
): Promise<Blob> {
  const { maxEdge, quality } = options;
  const url = URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxEdge);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
        'image/jpeg',
        quality
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

function scaleToFit(w: number, h: number, maxEdge: number): { width: number; height: number } {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h };
  const ratio = w >= h ? maxEdge / w : maxEdge / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test resize`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/image tests/image
git commit -m "feat: add canvas-based image resize utility"
```

---

## Task 4: AI 응답 Zod 스키마 + 파싱 로직 (TDD)

**Files:**
- Create: `lib/ai/schema.ts`, `lib/ai/parse.ts`, `tests/ai/parse.test.ts`

- [ ] **Step 1: Zod 스키마 작성**

```typescript
// lib/ai/schema.ts
import { z } from 'zod';

export const ScanResultSchema = z.object({
  companyName: z.string().nullable(),
  website: z.string().nullable(),
  websiteGuessed: z.boolean().default(false),
  country: z
    .object({ name: z.string(), code: z.string().length(2) })
    .nullable(),
  personName: z.string().nullable(),
  position: z.string().nullable(),
  industry: z.string().nullable(),
  detectedLanguage: z.enum(['ko', 'en', 'vi', 'ja']).nullable(),
  confidence: z.record(z.enum(['low', 'mid', 'high'])).optional(),
});

export type ScanResultParsed = z.infer<typeof ScanResultSchema>;
```

- [ ] **Step 2: 실패 테스트 작성**

```typescript
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `pnpm test parse`
Expected: FAIL — exports not defined

- [ ] **Step 4: 파싱 로직 구현**

```typescript
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
    aiConfidence: parsed.confidence,
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test parse`
Expected: PASS (6 tests)

- [ ] **Step 6: 커밋**

```bash
git add lib/ai tests/ai
git commit -m "feat: add AI response parsing with Zod validation"
```

---

## Task 5: AI 시스템 프롬프트 (상수)

**Files:**
- Create: `lib/ai/prompt.ts`

- [ ] **Step 1: 프롬프트 작성**

```typescript
// lib/ai/prompt.ts

export const SCAN_SYSTEM_PROMPT = `당신은 명함에서 정보를 추출하는 전문가입니다.
첨부된 명함 이미지(앞면 필수, 뒷면 선택)에서 정보를 JSON으로 추출하세요.

명함은 한국어/영어/베트남어/일본어 중 하나로 작성됩니다.
앞뒤가 다른 언어일 수 있으니 둘 다 참고하세요.

규칙:
- 명확히 보이지 않는 필드는 null
- website가 명함에 명시되어 있지 않으면 회사명/이메일 도메인으로 추론하고 websiteGuessed: true
- country는 한글명과 ISO 2자리 코드 모두 반환 (예: { "name": "베트남", "code": "VN" })
- detectedLanguage는 명함 주 언어 ("ko" / "en" / "vi" / "ja")
- confidence는 추출한 각 필드별 "low" / "mid" / "high"

출력 형식 (JSON만, 다른 텍스트 금지):
{
  "companyName": "...",
  "website": "...",
  "websiteGuessed": false,
  "country": { "name": "베트남", "code": "VN" },
  "personName": "...",
  "position": "...",
  "industry": "...",
  "detectedLanguage": "vi",
  "confidence": { "companyName": "high", "personName": "high" }
}`;

export const SCAN_USER_TEXT = '이 명함에서 정보를 추출해 위 형식의 JSON으로만 응답하세요.';
```

- [ ] **Step 2: TypeScript 컴파일 확인**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/ai/prompt.ts
git commit -m "feat: add Claude vision system prompt for namecard OCR"
```

---

## Task 6: API Route Handler `/api/scan` (TDD)

**Files:**
- Create: `lib/ai/client.ts`, `app/api/scan/route.ts`, `tests/api/scan.test.ts`

- [ ] **Step 1: Anthropic SDK 설치**

```bash
pnpm add @anthropic-ai/sdk
```

- [ ] **Step 2: 클라이언트 wrapper 작성**

```typescript
// lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeVisionInput {
  frontImageBase64: string;
  backImageBase64?: string;
}

export interface ClaudeVisionClient {
  scan(input: ClaudeVisionInput): Promise<string>;
}

class AnthropicClaudeVisionClient implements ClaudeVisionClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async scan({ frontImageBase64, backImageBase64 }: ClaudeVisionInput): Promise<string> {
    const { SCAN_SYSTEM_PROMPT, SCAN_USER_TEXT } = await import('./prompt');
    const content: Anthropic.Messages.ContentBlockParam[] = [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: stripDataUrl(frontImageBase64) },
      },
    ];
    if (backImageBase64) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: stripDataUrl(backImageBase64) },
      });
    }
    content.push({ type: 'text', text: SCAN_USER_TEXT });

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SCAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude response had no text content');
    }
    return textBlock.text;
  }
}

function stripDataUrl(b64: string): string {
  const idx = b64.indexOf(',');
  return idx >= 0 ? b64.slice(idx + 1) : b64;
}

export function createClaudeClient(): ClaudeVisionClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7';
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new AnthropicClaudeVisionClient(apiKey, model);
}
```

- [ ] **Step 3: 실패 테스트 작성**

```typescript
// tests/api/scan.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockScan = vi.fn();

vi.mock('@/lib/ai/client', () => ({
  createClaudeClient: () => ({ scan: mockScan }),
}));

import { POST } from '@/app/api/scan/route';

function makeRequest(body: any): Request {
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
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `pnpm test scan`
Expected: FAIL — `POST` not exported

- [ ] **Step 5: Route Handler 구현**

```typescript
// app/api/scan/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClaudeClient } from '@/lib/ai/client';
import { parseScanResponse } from '@/lib/ai/parse';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RequestSchema = z.object({
  frontImage: z.string().min(20),
  backImage: z.string().min(20).optional(),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_image', 'Body is not valid JSON');
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'invalid_image', 'frontImage is required');
  }

  const client = createClaudeClient();

  let raw: string;
  try {
    raw = await client.scan({
      frontImageBase64: parsed.data.frontImage,
      backImageBase64: parsed.data.backImage,
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || /timeout/i.test(err.message))) {
      return errorResponse(504, 'timeout', 'Claude API timed out');
    }
    return errorResponse(502, 'ai_failed', err instanceof Error ? err.message : 'Unknown AI error');
  }

  try {
    const result = parseScanResponse(raw);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(
      502,
      'ai_failed',
      err instanceof Error ? err.message : 'Failed to parse AI response'
    );
  }
}

function errorResponse(
  status: number,
  code: 'ai_failed' | 'invalid_image' | 'timeout',
  message: string
): Response {
  return NextResponse.json({ error: message, code }, { status });
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm test scan`
Expected: PASS (4 tests)

- [ ] **Step 7: 커밋**

```bash
git add lib/ai/client.ts app/api/scan tests/api
git commit -m "feat: add /api/scan route handler with Claude vision"
```

---

## Task 7: Dexie 스키마 + Repository (TDD)

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/repository.ts`, `lib/db/dexie-repository.ts`, `tests/db/repository.test.ts`

- [ ] **Step 1: Dexie 설치**

```bash
pnpm add dexie
```

- [ ] **Step 2: Repository 인터페이스 정의**

```typescript
// lib/db/repository.ts
import type { BusinessCard } from '@/types/business-card';

export type NewBusinessCard = Omit<BusinessCard, 'id' | 'createdAt' | 'updatedAt'>;

export interface CardRepository {
  save(card: NewBusinessCard): Promise<BusinessCard>;
  list(): Promise<BusinessCard[]>;
  getLatest(): Promise<BusinessCard | undefined>;
  getById(id: string): Promise<BusinessCard | undefined>;
}
```

- [ ] **Step 3: 실패 테스트 작성**

```typescript
// tests/db/repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { DexieCardRepository } from '@/lib/db/dexie-repository';
import type { NewBusinessCard } from '@/lib/db/repository';

function makeCard(overrides: Partial<NewBusinessCard> = {}): NewBusinessCard {
  return {
    frontImage: new Blob(['front'], { type: 'image/jpeg' }),
    companyName: 'Acme',
    personName: 'Kim',
    interestedService: 'kinderboard',
    aiFilledFields: [],
    ...overrides,
  };
}

describe('DexieCardRepository', () => {
  let repo: DexieCardRepository;

  beforeEach(async () => {
    repo = new DexieCardRepository(`test-db-${Math.random()}`);
    await repo.clearAll();
  });

  it('saves a card and returns it with id, createdAt, updatedAt', async () => {
    const saved = await repo.save(makeCard());
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(saved.updatedAt).toBe(saved.createdAt);
    expect(saved.companyName).toBe('Acme');
  });

  it('persists Blob as Blob (not coerced to string)', async () => {
    const saved = await repo.save(makeCard());
    const fetched = await repo.getById(saved.id);
    expect(fetched).toBeDefined();
    expect(fetched!.frontImage).toBeInstanceOf(Blob);
  });

  it('list returns most recent first', async () => {
    await repo.save(makeCard({ companyName: 'A' }));
    await new Promise((r) => setTimeout(r, 5));
    await repo.save(makeCard({ companyName: 'B' }));
    await new Promise((r) => setTimeout(r, 5));
    await repo.save(makeCard({ companyName: 'C' }));

    const list = await repo.list();
    expect(list.map((c) => c.companyName)).toEqual(['C', 'B', 'A']);
  });

  it('getLatest returns the most recent card or undefined', async () => {
    expect(await repo.getLatest()).toBeUndefined();
    await repo.save(makeCard({ companyName: 'Only' }));
    const latest = await repo.getLatest();
    expect(latest?.companyName).toBe('Only');
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `pnpm test repository`
Expected: FAIL — `DexieCardRepository` not exported

- [ ] **Step 5: Dexie 스키마 작성**

```typescript
// lib/db/schema.ts
import Dexie, { type Table } from 'dexie';
import type { BusinessCard } from '@/types/business-card';

export class CardDatabase extends Dexie {
  cards!: Table<BusinessCard, string>;

  constructor(name: string = 'namecard-db') {
    super(name);
    this.version(1).stores({
      cards: 'id, createdAt, companyName, personName, interestedService',
    });
  }
}
```

- [ ] **Step 6: Dexie 구현체 작성**

```typescript
// lib/db/dexie-repository.ts
import { CardDatabase } from './schema';
import type { CardRepository, NewBusinessCard } from './repository';
import type { BusinessCard } from '@/types/business-card';

export class DexieCardRepository implements CardRepository {
  private db: CardDatabase;

  constructor(dbName: string = 'namecard-db') {
    this.db = new CardDatabase(dbName);
  }

  async save(card: NewBusinessCard): Promise<BusinessCard> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const full: BusinessCard = { ...card, id, createdAt: now, updatedAt: now };
    await this.db.cards.add(full);
    return full;
  }

  async list(): Promise<BusinessCard[]> {
    return this.db.cards.orderBy('createdAt').reverse().toArray();
  }

  async getLatest(): Promise<BusinessCard | undefined> {
    return this.db.cards.orderBy('createdAt').reverse().first();
  }

  async getById(id: string): Promise<BusinessCard | undefined> {
    return this.db.cards.get(id);
  }

  async clearAll(): Promise<void> {
    await this.db.cards.clear();
  }
}

let singleton: DexieCardRepository | null = null;
export function getCardRepository(): DexieCardRepository {
  if (typeof window === 'undefined') {
    throw new Error('CardRepository is only available in the browser');
  }
  if (!singleton) singleton = new DexieCardRepository();
  return singleton;
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `pnpm test repository`
Expected: PASS (4 tests)

- [ ] **Step 8: 커밋**

```bash
git add lib/db tests/db
git commit -m "feat: add Dexie repository with CardRepository interface"
```

---

## Task 8: shadcn/ui 초기화 + 컴포넌트 추가

**Files:**
- Create: `components.json`, `components/ui/*.tsx`, `lib/utils.ts`

- [ ] **Step 1: shadcn 초기화**

```bash
pnpm dlx shadcn@latest init
```
프롬프트:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 2: 필수 컴포넌트 추가**

```bash
pnpm dlx shadcn@latest add button input label select textarea sonner
```

- [ ] **Step 3: 컴파일 확인**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 4: 토스트 provider 배치 — `app/layout.tsx`에 `<Toaster />` 추가**

`app/layout.tsx` body 안 마지막에 다음 추가:
```tsx
import { Toaster } from '@/components/ui/sonner';
// ...
        {children}
        <Toaster richColors position="top-center" />
```

- [ ] **Step 5: 커밋**

```bash
git add .
git commit -m "chore: init shadcn/ui with button, input, label, select, textarea, sonner"
```

---

## Task 9: next-intl 스캐폴드 (ko 로케일만)

**Files:**
- Create: `lib/i18n/config.ts`, `lib/i18n/messages/ko.json`, `i18n.ts`
- Modify: `app/layout.tsx`, `next.config.mjs`

- [ ] **Step 1: next-intl 설치**

```bash
pnpm add next-intl
```

- [ ] **Step 2: i18n config 작성 (locale prefix 없는 default-locale 모드)**

```typescript
// lib/i18n/config.ts
export const DEFAULT_LOCALE = 'ko' as const;
export const SUPPORTED_LOCALES = ['ko'] as const; // Phase 4: en, vi, ja
export type Locale = (typeof SUPPORTED_LOCALES)[number];
```

- [ ] **Step 3: 메시지 파일 작성**

```json
// lib/i18n/messages/ko.json
{
  "home": {
    "title": "명함 스캐너",
    "addCard": "+ 명함 추가",
    "empty": "아직 저장된 명함이 없습니다",
    "lastSaved": "직전 저장 카드"
  },
  "scan": {
    "step": {
      "camera": "명함 앞면 촬영",
      "preview": "확인",
      "analyzing": "AI가 명함을 분석 중입니다...",
      "form": "정보 확인"
    },
    "addBack": "뒷면 추가 (선택)",
    "retake": "재촬영",
    "analyze": "분석 시작",
    "manualFallback": "수동 입력으로 진행",
    "save": "저장",
    "saved": "저장 완료",
    "permissionDenied": "카메라 권한이 거부되었습니다. 파일 업로드로 진행합니다.",
    "aiFailed": "AI 분석에 실패했습니다. 수동으로 입력해주세요.",
    "guideHint": "명함을 가이드 프레임에 맞춰 주세요"
  },
  "form": {
    "companyName": "회사명",
    "website": "홈페이지",
    "websiteGuessed": "추정값",
    "country": "국가",
    "personName": "담당자명",
    "position": "직책",
    "industry": "업종",
    "interestedService": "관심 서비스",
    "interestedServiceOther": "기타 서비스명",
    "note": "노트",
    "aiBadge": "AI",
    "required": "필수 항목입니다",
    "selectService": "서비스를 선택하세요"
  },
  "service": {
    "kinderboard": "킨더보드",
    "lumitiq": "루미티치",
    "artbongbong": "아트봉봉",
    "turuturu": "뚜루뚜루",
    "aidt": "AIDT",
    "other": "기타"
  }
}
```

- [ ] **Step 4: i18n.ts 작성 (next-intl request config)**

```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`@/lib/i18n/messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 5: `next.config.mjs` 수정**

```javascript
// next.config.mjs
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 6: `app/layout.tsx`에 NextIntlClientProvider 통합**

```tsx
// app/layout.tsx
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from '@/components/ui/sonner';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <main className="mx-auto min-h-dvh w-full max-w-[640px] px-4 py-6">
            {children}
          </main>
          <Toaster richColors position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export const metadata = {
  title: '명함 스캐너',
  description: '명함을 카메라로 찍어 디지털화하세요',
};
```

- [ ] **Step 7: dev 서버에서 동작 확인**

Run: `pnpm dev`
http://localhost:3000 에서 에러 없이 로딩 확인. Ctrl+C.

- [ ] **Step 8: 커밋**

```bash
git add .
git commit -m "feat: scaffold next-intl with ko locale and translations"
```

---

## Task 10: 카메라/이미지 입력 컴포넌트

**Files:**
- Create: `components/scan/CameraCapture.tsx`, `components/scan/ImagePreview.tsx`

이 컴포넌트들은 브라우저 미디어 API에 의존하므로 jsdom 단위 테스트는 생략하고 수동 QA로 검증합니다.

- [ ] **Step 1: `CameraCapture.tsx` 작성 — getUserMedia 시도, 실패 시 file input 폴백**

```tsx
// components/scan/CameraCapture.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface CameraCaptureProps {
  label: string;
  onCapture: (blob: Blob) => void;
}

export function CameraCapture({ label, onCapture }: CameraCaptureProps) {
  const t = useTranslations('scan');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'init' | 'live' | 'fallback'>('init');

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setMode('fallback');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setMode('live');
      } catch (err) {
        toast.warning(t('permissionDenied'));
        setMode('fallback');
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [t]);

  function captureFromVideo() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      'image/jpeg',
      0.95
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{label}</p>

      {mode === 'live' && (
        <div className="relative aspect-[86/54] w-full overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-4 rounded-md border-2 border-dashed border-white/80" />
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
            {t('guideHint')}
          </p>
        </div>
      )}

      {mode === 'live' && (
        <Button onClick={captureFromVideo} type="button">
          📸
        </Button>
      )}

      {mode === 'fallback' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={() => fileInputRef.current?.click()} type="button">
            파일 선택 / 촬영
          </Button>
        </>
      )}

      {mode === 'init' && <p className="text-sm text-muted-foreground">카메라 준비 중...</p>}
    </div>
  );
}
```

- [ ] **Step 2: `ImagePreview.tsx` 작성**

```tsx
// components/scan/ImagePreview.tsx
'use client';

import { useEffect, useState } from 'react';

export interface ImagePreviewProps {
  blob: Blob;
  alt: string;
}

export function ImagePreview({ blob, alt }: ImagePreviewProps) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!url) return null;
  return (
    <img
      src={url}
      alt={alt}
      className="aspect-[86/54] w-full rounded-lg object-cover"
    />
  );
}
```

- [ ] **Step 3: 컴파일 확인**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add components/scan
git commit -m "feat: add CameraCapture and ImagePreview components"
```

---

## Task 11: AI 배지 + 명함 입력 폼

**Files:**
- Create: `components/shared/AiBadge.tsx`, `components/scan/BusinessCardForm.tsx`

- [ ] **Step 1: `AiBadge.tsx` 작성**

```tsx
// components/shared/AiBadge.tsx
import { useTranslations } from 'next-intl';

export function AiBadge() {
  const t = useTranslations('form');
  return (
    <span className="ml-1 inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
      ✨ {t('aiBadge')}
    </span>
  );
}
```

- [ ] **Step 2: `BusinessCardForm.tsx` 작성**

```tsx
// components/scan/BusinessCardForm.tsx
'use client';

import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AiBadge } from '@/components/shared/AiBadge';
import {
  INTERESTED_SERVICES,
  type Confidence,
  type InterestedService,
} from '@/types/business-card';
import type { FormDefaults } from '@/lib/ai/parse';

const FormSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().optional(),
  websiteGuessed: z.boolean().optional(),
  countryName: z.string().optional(),
  countryCode: z.string().optional(),
  personName: z.string().min(1),
  position: z.string().optional(),
  industry: z.string().optional(),
  interestedService: z.enum(
    ['kinderboard', 'lumitiq', 'artbongbong', 'turuturu', 'aidt', 'other'],
    { required_error: '서비스를 선택하세요', invalid_type_error: '서비스를 선택하세요' }
  ),
  interestedServiceOther: z.string().optional(),
  note: z.string().optional(),
});

export type FormValues = z.infer<typeof FormSchema>;
type FormDefaultValues = Partial<FormValues>;

// Maps a BusinessCard field key (used in aiFilledFields) to the form keys that mirror it.
// e.g. AI fills "country" but the form splits it into countryName + countryCode.
const FIELD_TO_FORM_KEYS: Record<string, Array<keyof FormValues>> = {
  companyName: ['companyName'],
  website: ['website'],
  country: ['countryName', 'countryCode'],
  personName: ['personName'],
  position: ['position'],
  industry: ['industry'],
};

export interface BusinessCardFormProps {
  defaults?: FormDefaults;
  onSubmit: (values: FormValues) => Promise<void> | void;
  submitting?: boolean;
}

export function BusinessCardForm({ defaults, onSubmit, submitting }: BusinessCardFormProps) {
  const t = useTranslations('form');
  const tService = useTranslations('service');

  const initial = useMemo<FormDefaultValues>(() => ({
    companyName: defaults?.companyName ?? '',
    website: defaults?.website ?? '',
    websiteGuessed: defaults?.websiteGuessed ?? false,
    countryName: defaults?.country?.name ?? '',
    countryCode: defaults?.country?.code ?? '',
    personName: defaults?.personName ?? '',
    position: defaults?.position ?? '',
    industry: defaults?.industry ?? '',
    // 사용자가 명시 선택해야 저장 가능 (spec §4 폼 초기값 정책)
    interestedService: undefined,
    interestedServiceOther: '',
    note: '',
  }), [defaults]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: initial as FormValues,
  });

  const aiFilled = new Set(defaults?.aiFilledFields ?? []);
  const conf = defaults?.aiConfidence ?? {};

  // AI가 채운 필드 키 → 실제 form key들 중 하나라도 dirty면 배지 제거
  const showAi = (cardFieldKey: string) => {
    if (!aiFilled.has(cardFieldKey)) return false;
    const formKeys = FIELD_TO_FORM_KEYS[cardFieldKey] ?? [cardFieldKey as keyof FormValues];
    return !formKeys.some((k) => dirtyFields[k]);
  };
  const lowClass = (key: string) =>
    conf[key] === 'low' ? 'ring-2 ring-yellow-400' : '';

  const websiteValue = watch('website');
  const interestedService = watch('interestedService');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field
        label={t('companyName')}
        showAi={showAi('companyName')}
        error={errors.companyName?.message ?? (errors.companyName ? t('required') : undefined)}
      >
        <Input {...register('companyName')} className={lowClass('companyName')} />
      </Field>

      <Field
        label={t('website')}
        showAi={showAi('website')}
        hint={
          defaults?.websiteGuessed && websiteValue === defaults.website
            ? `⚠️ ${t('websiteGuessed')}`
            : undefined
        }
      >
        <Input type="url" {...register('website')} className={lowClass('website')} />
      </Field>

      <Field label={t('country')} showAi={showAi('country')}>
        <div className="flex gap-2">
          <Input {...register('countryName')} placeholder="국가명" />
          <Input {...register('countryCode')} placeholder="ISO" maxLength={2} className="w-20" />
        </div>
      </Field>

      <Field
        label={t('personName')}
        showAi={showAi('personName')}
        error={errors.personName ? t('required') : undefined}
      >
        <Input {...register('personName')} className={lowClass('personName')} />
      </Field>

      <Field label={t('position')} showAi={showAi('position')}>
        <Input {...register('position')} className={lowClass('position')} />
      </Field>

      <Field label={t('industry')} showAi={showAi('industry')}>
        <Input {...register('industry')} className={lowClass('industry')} />
      </Field>

      <Field
        label={t('interestedService')}
        error={errors.interestedService ? t('selectService') : undefined}
      >
        <Controller
          control={control}
          name="interestedService"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectService')} />
              </SelectTrigger>
              <SelectContent>
                {INTERESTED_SERVICES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tService(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {interestedService === 'other' && (
        <Field label={t('interestedServiceOther')}>
          <Input {...register('interestedServiceOther')} />
        </Field>
      )}

      <Field label={t('note')}>
        <Textarea rows={3} {...register('note')} />
      </Field>

      <Button type="submit" disabled={submitting}>
        {submitting ? '...' : '저장'}
      </Button>
    </form>
  );
}

function Field({
  label,
  showAi,
  hint,
  error,
  children,
}: {
  label: string;
  showAi?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">
        {label}
        {showAi && <AiBadge />}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: react-hook-form 의존성 설치**

```bash
pnpm add react-hook-form @hookform/resolvers zod
```
(zod는 Task 4에서 이미 설치됨 — 누락이면 추가)

- [ ] **Step 4: 컴파일 확인**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add components/shared components/scan/BusinessCardForm.tsx
git commit -m "feat: add BusinessCardForm with AI badges and Zod validation"
```

---

## Task 12: 스캔 흐름 페이지 (상태머신)

**Files:**
- Create: `components/scan/ScanProgress.tsx`, `app/(main)/scan/page.tsx`, `app/(main)/layout.tsx`

- [ ] **Step 1: `ScanProgress.tsx` 작성**

```tsx
// components/scan/ScanProgress.tsx
'use client';

import { useTranslations } from 'next-intl';

export function ScanProgress() {
  const t = useTranslations('scan');
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      <p className="text-sm text-muted-foreground">{t('step.analyzing')}</p>
    </div>
  );
}
```

- [ ] **Step 2: `app/(main)/layout.tsx` 작성 (route group, root layout과 분리)**

```tsx
// app/(main)/layout.tsx
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 3: `app/(main)/scan/page.tsx` 작성**

```tsx
// app/(main)/scan/page.tsx
'use client';

import { useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/scan/CameraCapture';
import { ImagePreview } from '@/components/scan/ImagePreview';
import { ScanProgress } from '@/components/scan/ScanProgress';
import { BusinessCardForm, type FormValues } from '@/components/scan/BusinessCardForm';
import { resizeImage } from '@/lib/image/resize';
import type { FormDefaults } from '@/lib/ai/parse';
import { getCardRepository } from '@/lib/db/dexie-repository';
import type { ScanResult } from '@/types/business-card';

type Step = 'camera' | 'preview' | 'analyzing' | 'form';

interface State {
  step: Step;
  front?: Blob;
  back?: Blob;
  defaults?: FormDefaults;
}

type Action =
  | { type: 'capture-front'; blob: Blob }
  | { type: 'capture-back'; blob: Blob }
  | { type: 'retake' }
  | { type: 'start-analyze' }
  | { type: 'analyzed'; defaults: FormDefaults }
  | { type: 'manual-fallback' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'capture-front':
      return { ...s, step: 'preview', front: a.blob };
    case 'capture-back':
      return { ...s, back: a.blob };
    case 'retake':
      return { step: 'camera' };
    case 'start-analyze':
      return { ...s, step: 'analyzing' };
    case 'analyzed':
      return { ...s, step: 'form', defaults: a.defaults };
    case 'manual-fallback':
      return { ...s, step: 'form', defaults: undefined };
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ScanPage() {
  const t = useTranslations('scan');
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, { step: 'camera' });
  const [submitting, setSubmitting] = useState(false);

  async function analyze() {
    if (!state.front) return;
    dispatch({ type: 'start-analyze' });
    try {
      const frontResized = await resizeImage(state.front, { maxEdge: 1600, quality: 0.8 });
      const backResized = state.back
        ? await resizeImage(state.back, { maxEdge: 1600, quality: 0.8 })
        : undefined;
      const frontImage = await blobToDataUrl(frontResized);
      const backImage = backResized ? await blobToDataUrl(backResized) : undefined;

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ frontImage, backImage }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        toast.error(t('aiFailed'));
        console.error('scan failed', errBody);
        dispatch({ type: 'manual-fallback' });
        return;
      }

      const parsed: ScanResult = await res.json();
      const { scanResultToFormDefaults } = await import('@/lib/ai/parse');
      const defaults = scanResultToFormDefaults(parsed as any);
      dispatch({ type: 'analyzed', defaults });
    } catch (err) {
      console.error(err);
      toast.error(t('aiFailed'));
      dispatch({ type: 'manual-fallback' });
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!state.front) return;
    setSubmitting(true);
    try {
      const repo = getCardRepository();
      await repo.save({
        frontImage: state.front,
        backImage: state.back,
        companyName: values.companyName,
        website: values.website || undefined,
        websiteGuessed: state.defaults?.websiteGuessed && values.website === state.defaults.website,
        country:
          values.countryName && values.countryCode
            ? { name: values.countryName, code: values.countryCode.toUpperCase() }
            : undefined,
        personName: values.personName,
        position: values.position || undefined,
        industry: values.industry || undefined,
        interestedService: values.interestedService,
        interestedServiceOther: values.interestedServiceOther || undefined,
        note: values.note || undefined,
        detectedLanguage: state.defaults?.detectedLanguage,
        aiFilledFields: state.defaults?.aiFilledFields ?? [],
        aiConfidence: state.defaults?.aiConfidence,
      });
      toast.success(t('saved'));
      router.push('/');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t(`step.${state.step}`)}</h1>

      {state.step === 'camera' && (
        <CameraCapture
          label={t('step.camera')}
          onCapture={(blob) => dispatch({ type: 'capture-front', blob })}
        />
      )}

      {state.step === 'preview' && state.front && (
        <div className="flex flex-col gap-3">
          <ImagePreview blob={state.front} alt="앞면" />
          {state.back ? (
            <ImagePreview blob={state.back} alt="뒷면" />
          ) : (
            <CameraCapture
              label={t('addBack')}
              onCapture={(blob) => dispatch({ type: 'capture-back', blob })}
            />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => dispatch({ type: 'retake' })} className="flex-1">
              {t('retake')}
            </Button>
            <Button onClick={analyze} className="flex-1">
              {t('analyze')}
            </Button>
          </div>
        </div>
      )}

      {state.step === 'analyzing' && <ScanProgress />}

      {state.step === 'form' && (
        <BusinessCardForm
          defaults={state.defaults}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: 컴파일 확인**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add components/scan/ScanProgress.tsx app/\(main\)
git commit -m "feat: add scan flow page with state machine reducer"
```

---

## Task 13: 홈 화면 (직전 카드 1건 표시)

**Files:**
- Create: `app/(main)/page.tsx`, `components/home/LastCardPreview.tsx`
- Modify: `app/page.tsx` (delete or reroute — Task 1에서 create-next-app이 만든 기본 page.tsx)

- [ ] **Step 1: 기본 `app/page.tsx` 제거 (route group과 충돌 방지)**

```bash
rm app/page.tsx
```

(`app/(main)/page.tsx`가 `/` 라우트를 담당)

- [ ] **Step 2: `components/home/LastCardPreview.tsx` 작성**

```tsx
// components/home/LastCardPreview.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePreview } from '@/components/scan/ImagePreview';
import { getCardRepository } from '@/lib/db/dexie-repository';
import type { BusinessCard } from '@/types/business-card';

export function LastCardPreview() {
  const t = useTranslations('home');
  const [card, setCard] = useState<BusinessCard | null | undefined>(undefined);

  useEffect(() => {
    getCardRepository()
      .getLatest()
      .then((c) => setCard(c ?? null));
  }, []);

  if (card === undefined) return <div className="h-32 animate-pulse rounded-lg bg-muted" />;
  if (card === null)
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{t('lastSaved')}</p>
      <p className="font-medium">{card.companyName}</p>
      <p className="text-sm text-muted-foreground">{card.personName}</p>
      <ImagePreview blob={card.frontImage} alt={card.companyName} />
    </div>
  );
}
```

- [ ] **Step 3: `app/(main)/page.tsx` 작성**

```tsx
// app/(main)/page.tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LastCardPreview } from '@/components/home/LastCardPreview';

export default function HomePage() {
  const t = useTranslations('home');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <Button asChild size="lg">
        <Link href="/scan">{t('addCard')}</Link>
      </Button>
      <LastCardPreview />
    </div>
  );
}
```

- [ ] **Step 4: dev 서버에서 동작 확인**

Run: `pnpm dev`
http://localhost:3000 → "명함 스캐너" 타이틀 + [+ 명함 추가] 버튼 + "아직 저장된 명함이 없습니다" 표시.
[+ 명함 추가] 클릭 → /scan 이동, 카메라 권한 요청 (또는 파일 입력 폴백) 확인. Ctrl+C.

- [ ] **Step 5: 커밋**

```bash
git add app/\(main\) components/home
git commit -m "feat: add home page with last card preview"
```

---

## Task 14: 종단간 수동 QA + 마무리

**Files:** (수정만)

- [ ] **Step 1: `.env.local` 작성 (실제 키)**

```bash
cp .env.local.example .env.local
```
`.env.local`을 편집해 `ANTHROPIC_API_KEY`에 실제 키 입력. (이 파일은 `.gitignore`로 무시됨)

- [ ] **Step 2: 모든 테스트 통과 확인**

Run: `pnpm test`
Expected: parse / resize / repository / scan + sanity 모두 PASS

- [ ] **Step 3: 타입체크 통과 확인**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 4: 빌드 통과 확인**

Run: `pnpm build`
Expected: Next.js 빌드 성공, 경고만 허용

- [ ] **Step 5: 수동 QA — spec §9 시나리오 모두 실행**

`pnpm dev` 후 다음 시나리오를 한 번씩 실행:
- 데스크톱 크롬 webcam 캡처 → AI 분석 → 폼 prefill → 저장 → 홈에 카드 표시
- 데스크톱 파일 업로드 (camera 권한 거부) → 동일 흐름
- 모바일 크롬 (혹은 크롬 디바이스 모드 iPhone 12 Pro)에서 후면 카메라 → 동일 흐름
- AI 의도적 실패 (`.env.local` 키 잘못된 값으로 일시 변경) → 토스트 + 폼 빈 상태로 진입
- 신뢰도 low 필드가 있는 명함 → 노란 테두리 시각 확인
- AI prefill된 필드 편집 → ✨ AI 배지 사라짐 확인
- websiteGuessed=true 케이스 → ⚠️ 추정값 라벨 확인
- 저장 후 새로고침 → 직전 카드가 홈에 그대로 표시 (IDB persist)

각 시나리오에서 발견된 이슈는 별도 step으로 fix → 커밋.

- [ ] **Step 6: 최종 커밋 (수정사항 있을 시)**

```bash
git add .
git commit -m "chore: phase 1 manual QA fixes"
```

Phase 1 완료. Phase 2 (목록/상세/검색/필터)는 별도 plan으로 작성 예정.

---

## Phase 1 Definition of Done

- [ ] `pnpm test` → 전부 PASS
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm build` → 성공
- [ ] spec §9의 11개 수동 QA 시나리오 모두 통과
- [ ] `.env.local.example` 커밋되고 실제 키는 `.gitignore` 처리
- [ ] 14개 task 모두 commit (각 task당 1+ commit)
