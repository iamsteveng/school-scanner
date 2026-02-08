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

type ZeaburAiHubChatResponse = {
  id?: string;
  choices?: Array<{ message?: { content?: string } }>;
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

function parseIsoToMs(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (!s) return undefined;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return undefined;
  return ms;
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

    if (!baseUrl || !apiKey || !model) {
      const fallback = fallbackExtractFromText(inputText);
      return {
        ...fallback,
        provider: "fallback",
        requestId: stableHash(args.contentHash + args.sourceUrl),
      };
    }

    // Zeabur AI Hub is OpenAI-compatible.
    // Docs: https://zeabur.com/docs/en-US/ai-hub
    // Example endpoint: https://hnd1.aihub.zeabur.ai/v1/chat/completions
    const url = new URL("chat/completions", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();

    const system =
      "You extract Hong Kong primary school open-day/admissions events from raw webpage text. " +
      "Return ONLY valid JSON. Use ISO 8601 strings with timezone offset (+08:00) for all date/time fields.";

    const user =
      `SOURCE_URL: ${args.sourceUrl}\n` +
      `CONTENT_HASH: ${args.contentHash}\n` +
      "\nTEXT:\n" +
      inputText;

    const schemaHint = {
      confidence: 0.0,
      events: [
        {
          title: "",
          eventAt: "2026-02-01T10:00:00+08:00",
          registrationOpenAt: "2026-01-01T00:00:00+08:00",
          registrationCloseAt: "2026-01-15T23:59:59+08:00",
          quota: 0,
          targetStudentYears: ["P6"],
          targetAdmissionYear: "2026-2027",
          language: "zh",
        },
      ],
      notes: "",
    };

    const body = {
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            user +
            "\n\nReturn JSON with keys: confidence (0..1), events (array), notes (optional). " +
            "Each event: title (required), eventAt/registrationOpenAt/registrationCloseAt as ISO8601 strings (+08:00), " +
            "quota as integer if present, targetStudentYears as array like K1/K2/K3/P1..P6, targetAdmissionYear like 2026-2027, " +
            "language as zh/en/mixed. Omit unknown fields. " +
            `Example shape: ${JSON.stringify(schemaHint)}`,
        },
      ],
      response_format: { type: "json_object" },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const rawText = await resp.text();
    if (!resp.ok) {
      const fallback = fallbackExtractFromText(inputText);
      return {
        ...fallback,
        provider: "zeabur_error",
        requestId: stableHash(rawText).slice(0, 12),
        raw: { status: resp.status, body: rawText.slice(0, 4000) },
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

    const chat = parsed as ZeaburAiHubChatResponse;
    const content = chat?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      const fallback = fallbackExtractFromText(inputText);
      return {
        ...fallback,
        provider: "zeabur_missing_content",
        requestId: stableHash(rawText).slice(0, 12),
        raw: parsed,
      };
    }

    let contentJson: unknown;
    try {
      contentJson = JSON.parse(content);
    } catch {
      const fallback = fallbackExtractFromText(inputText);
      return {
        ...fallback,
        provider: "zeabur_content_not_json",
        requestId: stableHash(content).slice(0, 12),
        raw: { response: parsed, content: content.slice(0, 4000) },
      };
    }

    const parsedObj =
      contentJson && typeof contentJson === "object"
        ? (contentJson as Record<string, unknown>)
        : null;
    const eventsRaw = Array.isArray(parsedObj?.events)
      ? (parsedObj?.events as unknown[])
      : [];
    const confidence =
      typeof parsedObj?.confidence === "number"
        ? (parsedObj.confidence as number)
        : undefined;

    const normalized: EventExtract[] = eventsRaw
      .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
      .slice(0, 10)
      .map((e) => {
        const title = typeof e.title === "string" ? e.title : "";
        const language = e.language;
        return {
          title: title.trim().slice(0, 200),
          eventAt: parseIsoToMs(e.eventAt),
          registrationOpenAt: parseIsoToMs(e.registrationOpenAt),
          registrationCloseAt: parseIsoToMs(e.registrationCloseAt),
          quota:
            typeof e.quota === "number"
              ? Math.trunc(e.quota)
              : typeof e.quota === "string"
                ? Number.parseInt(e.quota, 10)
                : undefined,
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
      provider: "zeabur_ai_hub",
      requestId: stableHash(args.contentHash + args.sourceUrl),
      events: normalized,
      confidence: confidence ?? null,
      raw: { response: parsed, content: contentJson },
    };
  },
});
