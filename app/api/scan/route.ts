// app/api/scan/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createVisionClient } from '@/lib/ai/client';
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

  let raw: string;
  try {
    const client = createVisionClient();
    raw = await client.scan({
      frontImageBase64: parsed.data.frontImage,
      backImageBase64: parsed.data.backImage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/scan] AI call failed:', message);
    if (err instanceof Error && (err.name === 'AbortError' || /timeout/i.test(err.message))) {
      return errorResponse(504, 'timeout', 'Gemini API timed out');
    }
    return errorResponse(502, 'ai_failed', message);
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
