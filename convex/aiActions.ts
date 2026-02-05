import { v } from "convex/values";
import { action } from "./_generated/server";

export type EventExtract = {
  title: string;
  eventAt?: number;
  registrationOpenAt?: number;
  registrationCloseAt?: number;
  quota?: number;
  targetStudentYears?: string[];
  targetAdmissionYear?: string;
  language?: "zh" | "en" | "mixed";
  confidence?: number;
  rawExtractJson?: string;
  extractionNotes?: string;
};

function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function guessLanguage(text: string): "zh" | "en" | "mixed" {
  const hasZh = /[\u4e00-\u9fff]/.test(text);
  const hasEn = /[A-Za-z]/.test(text);
  if (hasZh && hasEn) return "mixed";
  if (hasZh) return "zh";
  return "en";
}

// Minimal fallback extractor so the pipeline still functions even if Zeabur isn't configured.
function fallbackExtractFromText(text: string): {
  events: EventExtract[];
  confidence: number;
  raw: unknown;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { events: [], confidence: 0, raw: { reason: "empty" } };
  }

  const title = trimmed.slice(0, 80);
  return {
    events: [
      {
        title,
        language: guessLanguage(trimmed),
        confidence: 0.1,
        extractionNotes: "fallback extractor (Zeabur not configured)",
      },
    ],
    confidence: 0.1,
    raw: { title },
  };
}

export const extractEventsFromText: ReturnType<typeof action> = action({
  args: {
    schoolId: v.id("schools"),
    sourceUrl: v.string(),
    contentText: v.string(),
    contentHash: v.string(),
  },
  handler: async (_ctx, args) => {
    const baseUrl = process.env.ZEABUR_AI_BASE_URL;
    const apiKey = process.env.ZEABUR_AI_API_KEY;
    const model = process.env.ZEABUR_AI_MODEL;

    const inputText = args.contentText.slice(0, 12_000);

    if (!baseUrl || !apiKey) {
      const fallback = fallbackExtractFromText(inputText);
      return {
        ...fallback,
        provider: "fallback",
        requestId: stableHash(args.contentHash + args.sourceUrl),
      };
    }

    const prompt = {
      task: "extract_school_events",
      schoolId: args.schoolId,
      sourceUrl: args.sourceUrl,
      contentHash: args.contentHash,
      instructions:
        "Extract open-day/admissions-related events from the provided text. Return JSON only. If unknown, omit the field.",
      schema: {
        events: [
          {
            title: "string",
            eventAt: "number? (ms timestamp)",
            registrationOpenAt: "number? (ms timestamp)",
            registrationCloseAt: "number? (ms timestamp)",
            quota: "number?",
            targetStudentYears: "string[]?",
            targetAdmissionYear: "string?",
            language: '"zh"|"en"|"mixed"?'
          },
        ],
        confidence: "number (0..1)",
        notes: "string?",
      },
      text: inputText,
    };

    const url = new URL("/extract", baseUrl).toString();

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(model ? { "X-Model": model } : {}),
      },
      body: JSON.stringify(prompt),
    });

    const rawText = await resp.text();
    if (!resp.ok) {
      // Surface enough details for debugging (stored as raw on event rows)
      const fallback = fallbackExtractFromText(inputText);
      return {
        ...fallback,
        provider: "zeabur_error",
        requestId: stableHash(rawText).slice(0, 12),
        raw: {
          status: resp.status,
          body: rawText.slice(0, 4000),
        },
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const fallback = fallbackExtractFromText(inputText);
      return {
        ...fallback,
        provider: "zeabur_invalid_json",
        requestId: stableHash(rawText).slice(0, 12),
        raw: { body: rawText.slice(0, 4000) },
      };
    }

    const parsedObj = (parsed && typeof parsed === "object") ? (parsed as Record<string, unknown>) : null;
    const eventsRaw = Array.isArray(parsedObj?.events) ? (parsedObj?.events as unknown[]) : [];
    const confidence = typeof parsedObj?.confidence === "number" ? (parsedObj.confidence as number) : undefined;

    const normalized: EventExtract[] = eventsRaw
      .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
      .slice(0, 10)
      .map((e) => {
        const title = typeof e.title === "string" ? e.title : "";
        const language = e.language;
        return {
          title: title.trim().slice(0, 200),
          eventAt: typeof e.eventAt === "number" ? e.eventAt : undefined,
          registrationOpenAt:
            typeof e.registrationOpenAt === "number" ? e.registrationOpenAt : undefined,
          registrationCloseAt:
            typeof e.registrationCloseAt === "number" ? e.registrationCloseAt : undefined,
          quota: typeof e.quota === "number" ? e.quota : undefined,
          targetStudentYears: Array.isArray(e.targetStudentYears)
            ? e.targetStudentYears.map(String).slice(0, 6)
            : undefined,
          targetAdmissionYear:
            typeof e.targetAdmissionYear === "string" ? e.targetAdmissionYear : undefined,
          language:
            language === "zh" || language === "en" || language === "mixed"
              ? language
              : guessLanguage(inputText),
          confidence: typeof e.confidence === "number" ? e.confidence : undefined,
        };
      })
      .filter((e) => e.title.length > 0);

    return {
      provider: "zeabur",
      requestId: stableHash(args.contentHash + args.sourceUrl),
      events: normalized,
      confidence: confidence ?? null,
      raw: parsed,
    };
  },
});
