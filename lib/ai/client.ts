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

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SCAN_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini response had no text content');
    }
    return text;
  }
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
