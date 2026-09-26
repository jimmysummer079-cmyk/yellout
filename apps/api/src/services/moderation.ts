/**
 * Content moderation + crisis detection hook.
 * Degrades gracefully when GEMINI_API_KEY is unset: returns a safe stub result.
 */

export interface ModerationResult {
  ok: boolean;
  crisisFlag: boolean;
  reason?: string;
  provider: 'stub' | 'gemini';
}

const CRISIS_HINTS = [
  '自杀',
  '不想活',
  '结束生命',
  '活不下去',
  '自我了断',
  '轻生',
];

export async function moderateVentContent(input: {
  targetTag: string;
  /** Optional ASR transcript when available */
  transcript?: string;
}): Promise<ModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // Local heuristic always runs (no network required).
  const text = `${input.targetTag} ${input.transcript || ''}`.toLowerCase();
  const localCrisis = CRISIS_HINTS.some((h) => text.includes(h.toLowerCase()));

  if (!apiKey) {
    return {
      ok: true,
      crisisFlag: localCrisis,
      reason: localCrisis ? 'local_keyword_match' : undefined,
      provider: 'stub',
    };
  }

  try {
    // Optional Gemini check — fail open on any error.
    const prompt = `You are a safety classifier for an anonymous emotional venting app.
Respond ONLY with JSON: {"ok":boolean,"crisisFlag":boolean,"reason":string}
Flag crisisFlag=true only for clear suicidal ideation or imminent self-harm.
Target tag: ${input.targetTag}
Transcript (may be empty): ${input.transcript || '(none)'}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 120 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return {
        ok: true,
        crisisFlag: localCrisis,
        reason: 'gemini_http_fallback',
        provider: 'stub',
      };
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        ok: true,
        crisisFlag: localCrisis,
        reason: 'gemini_parse_fallback',
        provider: 'stub',
      };
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      ok?: boolean;
      crisisFlag?: boolean;
      reason?: string;
    };
    return {
      ok: parsed.ok !== false,
      crisisFlag: Boolean(parsed.crisisFlag) || localCrisis,
      reason: parsed.reason,
      provider: 'gemini',
    };
  } catch {
    return {
      ok: true,
      crisisFlag: localCrisis,
      reason: 'gemini_error_fallback',
      provider: 'stub',
    };
  }
}

export function moderationProvider(): 'stub' | 'gemini' {
  return process.env.GEMINI_API_KEY?.trim() ? 'gemini' : 'stub';
}
