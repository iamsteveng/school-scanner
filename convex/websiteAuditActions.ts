import { v } from "convex/values";
import { action } from "./_generated/server";

function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAiHubBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.pathname === "/" || u.pathname === "") {
      u.pathname = "/v1";
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

function extractCandidateLinks(content: string, baseUrl: string): string[] {
  const out = new Set<string>();

  const hrefs = [
    ...[...content.matchAll(/href\s*=\s*"([^"]+)"/gi)].map((m) => m[1]),
    ...[...content.matchAll(/href\s*=\s*'([^']+)'/gi)].map((m) => m[1]),
  ];

  // Markdown links (e.g. from r.jina.ai proxy)
  const mdLinks = [...content.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);

  const keywords = [
    "primary",
    "primary school",
    "ps",
    "小學",
    "附屬小學",
    "latest_news",
    "news",
    "notice",
    "announcement",
    "通告",
    "最新消息",
    "入學",
    "admission",
  ];

  let baseOrigin: string | undefined;
  try {
    baseOrigin = new URL(baseUrl).origin;
  } catch {
    baseOrigin = undefined;
  }

  for (const raw of [...hrefs, ...mdLinks]) {
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:")) continue;
    let abs: string;
    try {
      abs = new URL(raw, baseUrl).toString();
    } catch {
      continue;
    }

    // Allow off-domain, but only if it matches our keywords (e.g. spccps.edu.hk from spcc.edu.hk)
    const lower = abs.toLowerCase();
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
      out.add(abs);
    }

    // Always keep any obvious "primary school" domain variants discovered.
    if (/(spccps|primary)/i.test(abs)) out.add(abs);

    // Prefer keeping same-origin links too (for announcements pages).
    if (baseOrigin) {
      try {
        if (new URL(abs).origin === baseOrigin) out.add(abs);
      } catch {
        // ignore
      }
    }
  }

  return [...out].slice(0, 30);
}

async function fetchWithFallback(url: string): Promise<{ finalUrl: string; text: string; raw: string; status: number }> {
  const doFetch = async (u: string) => {
    const resp = await fetch(u, { redirect: "follow" });
    const raw = await resp.text();
    return { status: resp.status, raw, finalUrl: resp.url };
  };

  try {
    const r = await doFetch(url);
    const text = stripHtmlToText(r.raw);
    return { ...r, text };
  } catch {
    // proxy fallback (handles TLS issues / blocks)
    const httpsUrl = url.replace(/^http:\/\//i, "https://");
    const proxyUrl = `https://r.jina.ai/${httpsUrl}`;
    const r = await doFetch(proxyUrl);
    // r.jina.ai returns markdown; stripHtmlToText is fine (it will mostly pass through).
    const text = stripHtmlToText(r.raw);
    return { ...r, text };
  }
}

type AiAuditResult = {
  isMismatch: boolean;
  confidence: number;
  reason?: string;
  recommendedWebsiteUrl?: string | null;
  recommendedAnnouncementsUrl?: string | null;
};

export const auditSchoolUrls: ReturnType<typeof action> = action({
  args: {
    schoolId: v.id("schools"),
    model: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");

    const school = await ctx.runQuery(api.schools.getSchoolById, {
      schoolId: args.schoolId,
    });
    if (!school) throw new Error("School not found");

    const websiteUrl = school.websiteUrl;
    const baseUrlRaw = args.baseUrl ?? process.env.ZEABUR_AI_BASE_URL;
    const apiKey = process.env.ZEABUR_AI_API_KEY;
    const model = args.model ?? process.env.ZEABUR_AI_MODEL ?? "gemini-2.5-flash-lite";

    const fetched = await fetchWithFallback(websiteUrl);
    const candidateUrls = extractCandidateLinks(fetched.raw, websiteUrl);

    if (!baseUrlRaw || !apiKey) {
      return {
        ok: true,
        provider: "disabled",
        model,
        school: {
          id: school._id,
          nameZh: school.nameZh,
          nameEn: school.nameEn,
          level: school.level,
          websiteUrl,
          announcementsUrl: school.announcementsUrl ?? null,
        },
        fetch: {
          status: fetched.status,
          finalUrl: fetched.finalUrl,
          textSample: fetched.text.slice(0, 600),
        },
        candidates: candidateUrls,
        audit: null,
        note: "Missing ZEABUR_AI_BASE_URL or ZEABUR_AI_API_KEY; report-only mode returns candidates only.",
      };
    }

    const baseUrl = normalizeAiHubBaseUrl(baseUrlRaw);
    const url = new URL("chat/completions", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();

    const system =
      "You are auditing school website URLs for Hong Kong schools. " +
      "Given the school identity (name, level) and the text of the current websiteUrl, decide if it is the correct site for that school. " +
      "If it is wrong, pick the correct website URL and announcements URL from the provided candidateUrls only. " +
      "Return ONLY valid JSON.";

    const user = {
      school: {
        nameZh: school.nameZh,
        nameEn: school.nameEn,
        level: school.level,
        districtEn: school.districtEn,
        districtZh: school.districtZh,
      },
      current: {
        websiteUrl,
        announcementsUrl: school.announcementsUrl ?? null,
        fetchedFinalUrl: fetched.finalUrl,
        fetchedStatus: fetched.status,
      },
      pageTextSample: fetched.text.slice(0, 3000),
      candidateUrls,
      constraints: {
        recommendationMustComeFromCandidateUrls: true,
      },
      output: {
        isMismatch: "boolean",
        confidence: "number 0..1",
        reason: "string",
        recommendedWebsiteUrl: "string|null",
        recommendedAnnouncementsUrl: "string|null",
      },
    };

    const body = {
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
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
      return {
        ok: true,
        provider: "zeabur_ai_hub_error",
        model,
        school: {
          id: school._id,
          nameZh: school.nameZh,
          nameEn: school.nameEn,
          level: school.level,
          websiteUrl,
          announcementsUrl: school.announcementsUrl ?? null,
        },
        fetch: {
          status: fetched.status,
          finalUrl: fetched.finalUrl,
          textSample: fetched.text.slice(0, 600),
        },
        candidates: candidateUrls,
        audit: null,
        error: { status: resp.status, body: rawText.slice(0, 2000) },
      };
    }

    const parsed = JSON.parse(rawText) as { choices?: Array<{ message?: { content?: string } }> };
    const content = parsed?.choices?.[0]?.message?.content ?? "";

    let contentJson: unknown;
    try {
      contentJson = JSON.parse(content);
    } catch {
      contentJson = null;
    }

    const audit = (contentJson && typeof contentJson === "object")
      ? (contentJson as AiAuditResult)
      : null;

    // Report-only: DO NOT patch the DB.
    return {
      ok: true,
      provider: "zeabur_ai_hub",
      model,
      requestId: stableHash(rawText).slice(0, 12),
      school: {
        id: school._id,
        nameZh: school.nameZh,
        nameEn: school.nameEn,
        level: school.level,
        websiteUrl,
        announcementsUrl: school.announcementsUrl ?? null,
      },
      fetch: {
        status: fetched.status,
        finalUrl: fetched.finalUrl,
        textSample: fetched.text.slice(0, 600),
      },
      candidates: candidateUrls,
      audit,
      raw: {
        responseMeta: {
          // preserve id+usage when present
          id:
            parsed && typeof parsed === "object"
              ? (parsed as Record<string, unknown>).id
              : undefined,
          model:
            parsed && typeof parsed === "object"
              ? (parsed as Record<string, unknown>).model
              : undefined,
          usage:
            parsed && typeof parsed === "object"
              ? (parsed as Record<string, unknown>).usage
              : undefined,
        },
        content: contentJson,
      },
    };
  },
});
