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
