// Minimal OpenAI chat-completions client for the summarize function.
// Deno runtime, fetch-based, no SDK. JSON-object mode by default; we always
// expect a JSON payload back.
//
// Cost tracking is computed from the usage block per response. Pricing values
// below are USD per token (USD/1M divided by 1e6). Update them when OpenAI
// changes prices; they're cheap and not load-bearing for correctness.

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface UsageBlock {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string }; finish_reason: string }>;
  usage: UsageBlock;
  model: string;
}

export interface ChatResult {
  content: string;
  usage: UsageBlock;
  cost_usd: number;
  latency_ms: number;
  model: string;
}

const PRICING: Record<string, { input_per_token: number; output_per_token: number }> = {
  'gpt-4o-mini': { input_per_token: 0.15 / 1_000_000, output_per_token: 0.6 / 1_000_000 },
  'gpt-4o': { input_per_token: 2.5 / 1_000_000, output_per_token: 10 / 1_000_000 },
};

function computeCost(model: string, usage: UsageBlock): number {
  const p = PRICING[model] ?? PRICING['gpt-4o-mini'];
  return usage.prompt_tokens * p.input_per_token + usage.completion_tokens * p.output_per_token;
}

export class OpenAIClient {
  constructor(private apiKey: string) {}

  /**
   * Send a chat-completions request expecting strict JSON in the reply.
   * Retries 5xx with exponential backoff (max 3 attempts). 4xx fails fast.
   */
  async chatJSON(opts: {
    model: string;
    system: string;
    user: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<ChatResult> {
    const body = {
      model: opts.model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ] satisfies ChatMessage[],
      response_format: { type: 'json_object' } as const,
      temperature: opts.temperature ?? 0.3,
      ...(opts.max_tokens ? { max_tokens: opts.max_tokens } : {}),
    };

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const t0 = Date.now();
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const latency_ms = Date.now() - t0;

      if (res.status >= 500 && res.status < 600) {
        lastErr = new Error(`OpenAI ${res.status} ${res.statusText}`);
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') ?? '0');
        await sleep(Math.max(retryAfter * 1000, 1000));
        continue;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`OpenAI ${res.status} ${res.statusText}: ${txt.slice(0, 500)}`);
      }

      const data = (await res.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content ?? '';
      if (!content) throw new Error('OpenAI returned empty content');

      return {
        content,
        usage: data.usage,
        cost_usd: computeCost(data.model, data.usage),
        latency_ms,
        model: data.model,
      };
    }
    throw lastErr ?? new Error('OpenAI: exhausted retries');
  }
}

/**
 * Parse JSON from a model response with a defensive shape: strip code fences
 * if present (some models still add ```json wrappers), trim, then JSON.parse.
 * Throws with a helpful message on failure so the summarize loop can mark
 * summary_status='error' with a useful error_text.
 */
export function parseJSON<T>(content: string): T {
  let s = content.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(s) as T;
  } catch (e) {
    throw new Error(
      `Failed to parse OpenAI JSON: ${(e as Error).message}. Content head: ${s.slice(0, 200)}`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
