import { GoogleGenAI, type Part } from '@google/genai';
import { SCAN_SYSTEM_PROMPT, SCAN_USER_TEXT } from './prompt';

export interface VisionInput {
  frontImageBase64: string;
  backImageBase64?: string;
}

export interface VisionClient {
  scan(input: VisionInput): Promise<string>;
}

class GeminiVisionClient implements VisionClient {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async scan({ frontImageBase64, backImageBase64 }: VisionInput): Promise<string> {
    const parts: Part[] = [
      { inlineData: { mimeType: 'image/jpeg', data: stripDataUrl(frontImageBase64) } },
    ];
    if (backImageBase64) {
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: stripDataUrl(backImageBase64) },
      });
    }
    parts.push({ text: SCAN_USER_TEXT });

    // First attempt: with Google Search grounding so the model can look up the
    // company (especially for industry classification). Some Gemini responses
    // come back with grounding metadata but an empty text payload — when that
    // happens we retry below without tools so we still get an OCR result.
    // NOTE: Gemini does not allow responseMimeType together with tools — JSON
    // is enforced via the system prompt + extractJson() instead.
    const groundedResponse = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SCAN_SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
      },
    });

    const groundedText = extractText(groundedResponse);
    if (groundedText) return groundedText;

    const groundedFinish = finishReasonOf(groundedResponse);
    console.warn(
      `[gemini] empty text with grounding (finishReason=${groundedFinish}); retrying without tools`
    );

    const fallbackResponse = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
      config: { systemInstruction: SCAN_SYSTEM_PROMPT },
    });

    const fallbackText = extractText(fallbackResponse);
    if (fallbackText) return fallbackText;

    const fallbackFinish = finishReasonOf(fallbackResponse);
    throw new Error(
      `Gemini returned no text (grounded finishReason=${groundedFinish}, ` +
        `fallback finishReason=${fallbackFinish})`
    );
  }
}

type GenContentResponse = Awaited<
  ReturnType<GoogleGenAI['models']['generateContent']>
>;

// Pull text out of the first candidate's parts. Gemini's `response.text`
// helper sometimes returns '' when only grounding metadata or function calls
// are present; iterating parts manually is more reliable.
function extractText(response: GenContentResponse): string {
  // The SDK's accessor is the happy path
  const direct = (response as { text?: string }).text;
  if (typeof direct === 'string' && direct.length > 0) return direct;

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const collected: string[] = [];
  for (const part of parts) {
    const t = (part as { text?: unknown }).text;
    if (typeof t === 'string' && t.length > 0) collected.push(t);
  }
  return collected.join('');
}

function finishReasonOf(response: GenContentResponse): string {
  const candidate = response.candidates?.[0];
  return String(candidate?.finishReason ?? 'unknown');
}

function stripDataUrl(b64: string): string {
  const idx = b64.indexOf(',');
  return idx >= 0 ? b64.slice(idx + 1) : b64;
}

export function createVisionClient(): VisionClient {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GeminiVisionClient(apiKey, model);
}
