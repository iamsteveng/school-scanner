import { v } from "convex/values";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
  const mdLinks = [...content.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map(
    (m) => m[1],
  );

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

    const lower = abs.toLowerCase();
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
      out.add(abs);
    }

    // Keep obvious primary-school domain variants discovered.
    if (/(ps\.|spccps|primary)/i.test(abs)) out.add(abs);

    // Keep same-origin links too.
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

async function fetchWithFallback(url: string): Promise<{
  finalUrl: string;
  text: string;
  raw: string;
  status: number;
}> {
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
    const httpsUrl = url.replace(/^http:\/\//i, "https://");
    const proxyUrl = `https://r.jina.ai/${httpsUrl}`;
    const r = await doFetch(proxyUrl);
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

type AuditOutput = {
  schoolId: string;
  nameZh: string;
  nameEn: string;
  level: string;
  currentWebsiteUrl: string;
  currentAnnouncementsUrl: string | null;
  isMismatch: boolean;
  confidence: number;
  reason?: string;
  recommendedWebsiteUrl?: string | null;
  recommendedAnnouncementsUrl?: string | null;
  usage?: unknown;
  requestId?: string;
};

type ConvexActionCtxLike = {
  // Keep this loose to avoid Next.js build-time type coupling with Convex FunctionReference types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery: (query: any, args: any) => Promise<any>;
};

type SchoolId = Id<"schools">;

async function auditOne(
  ctx: ConvexActionCtxLike,
  args: { schoolId: SchoolId; model?: string; baseUrl?: string },
): Promise<AuditOutput> {
  const { api } = await import("./_generated/api");

  const school = await ctx.runQuery(api.schools.getSchoolById, {
    schoolId: args.schoolId,
  });
  if (!school) throw new Error("School not found");
  if (typeof school !== "object" || school === null) {
    throw new Error("Invalid school row");
  }

  const s = school as Record<string, unknown>;
  const websiteUrl = typeof s.websiteUrl === "string" ? s.websiteUrl : null;
  if (!websiteUrl) throw new Error("School row missing websiteUrl");
  const baseUrlRaw = args.baseUrl ?? process.env.ZEABUR_AI_BASE_URL;
  const apiKey = process.env.ZEABUR_AI_API_KEY;
  const model =
    args.model ?? process.env.ZEABUR_AI_MODEL ?? "gemini-2.5-flash-lite";

  const fetched = await fetchWithFallback(websiteUrl);
  const candidateUrls = extractCandidateLinks(fetched.raw, websiteUrl);

  if (!baseUrlRaw || !apiKey) {
    return {
      schoolId: args.schoolId,
      nameZh: typeof s.nameZh === "string" ? s.nameZh : "",
      nameEn: typeof s.nameEn === "string" ? s.nameEn : "",
      level: typeof s.level === "string" ? s.level : "",
      currentWebsiteUrl: websiteUrl,
      currentAnnouncementsUrl:
        typeof s.announcementsUrl === "string" ? s.announcementsUrl : null,
      isMismatch: false,
      confidence: 0,
      reason: "Missing ZEABUR_AI_BASE_URL or ZEABUR_AI_API_KEY",
      recommendedWebsiteUrl: null,
      recommendedAnnouncementsUrl: null,
    };
  }

  const baseUrl = normalizeAiHubBaseUrl(baseUrlRaw);
  const url = new URL(
    "chat/completions",
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  ).toString();

  const system =
    "You are auditing school website URLs for Hong Kong schools. " +
    "Given the school identity (name, level) and the text of the current websiteUrl, decide if it is the correct site for that school. " +
    "If it is wrong, pick the correct website URL and announcements URL from the provided candidateUrls only. " +
    "Return ONLY valid JSON.";

  const user = {
    school: {
      nameZh: typeof s.nameZh === "string" ? s.nameZh : "",
      nameEn: typeof s.nameEn === "string" ? s.nameEn : "",
      level: typeof s.level === "string" ? s.level : "",
      districtEn: typeof s.districtEn === "string" ? s.districtEn : "",
      districtZh: typeof s.districtZh === "string" ? s.districtZh : "",
    },
    current: {
      websiteUrl,
      announcementsUrl:
        typeof s.announcementsUrl === "string" ? s.announcementsUrl : null,
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
      schoolId: args.schoolId,
      nameZh: typeof s.nameZh === "string" ? s.nameZh : "",
      nameEn: typeof s.nameEn === "string" ? s.nameEn : "",
      level: typeof s.level === "string" ? s.level : "",
      currentWebsiteUrl: websiteUrl,
      currentAnnouncementsUrl:
        typeof s.announcementsUrl === "string" ? s.announcementsUrl : null,
      isMismatch: false,
      confidence: 0,
      reason: `AI hub error ${resp.status}`,
      recommendedWebsiteUrl: null,
      recommendedAnnouncementsUrl: null,
      requestId: stableHash(rawText).slice(0, 12),
    };
  }

  const parsed = JSON.parse(rawText) as Record<string, unknown>;

  const choices = Array.isArray(parsed.choices)
    ? (parsed.choices as unknown[])
    : [];
  const firstChoice =
    choices[0] && typeof choices[0] === "object"
      ? (choices[0] as Record<string, unknown>)
      : null;
  const message =
    firstChoice && typeof firstChoice.message === "object"
      ? (firstChoice.message as Record<string, unknown>)
      : null;
  const content = typeof message?.content === "string" ? message.content : "";

  let contentJson: unknown;
  try {
    contentJson = JSON.parse(content);
  } catch {
    contentJson = null;
  }

  const audit =
    contentJson && typeof contentJson === "object"
      ? (contentJson as AiAuditResult)
      : null;

  return {
    schoolId: args.schoolId,
    nameZh: typeof s.nameZh === "string" ? s.nameZh : "",
    nameEn: typeof s.nameEn === "string" ? s.nameEn : "",
    level: typeof s.level === "string" ? s.level : "",
    currentWebsiteUrl: websiteUrl,
    currentAnnouncementsUrl:
      typeof s.announcementsUrl === "string" ? s.announcementsUrl : null,
    isMismatch: !!audit?.isMismatch,
    confidence: typeof audit?.confidence === "number" ? audit.confidence : 0,
    reason: audit?.reason,
    recommendedWebsiteUrl: audit?.recommendedWebsiteUrl ?? null,
    recommendedAnnouncementsUrl: audit?.recommendedAnnouncementsUrl ?? null,
    usage: parsed.usage,
    requestId: (parsed.id as string | undefined) ?? stableHash(rawText).slice(0, 12),
  };
}

// NOTE: Explicit type annotation avoids Next.js/TS circular inference issues.
export const auditSchoolUrls: ReturnType<typeof action> = action({
  args: {
    schoolId: v.id("schools"),
    model: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const out = await auditOne(ctx, {
      schoolId: args.schoolId,
      model: args.model,
      baseUrl: args.baseUrl,
    });
    return { ok: true, ...out };
  },
});

// NOTE: Explicit type annotation avoids Next.js/TS circular inference issues.
export const auditBatch: ReturnType<typeof action> = action({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    model: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    autoFix: v.optional(v.boolean()),
    autoFixMinConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { api } = await import("./_generated/api");

    const limit = Math.max(1, Math.min(200, args.limit ?? 200));
    const autoFix = args.autoFix ?? true;
    const autoFixMinConfidence = args.autoFixMinConfidence ?? 0.9;

    const page = await ctx.runQuery(api.schools.listSchoolsPaged, {
      cursor: args.cursor,
      limit,
    });

    const results: AuditOutput[] = [];
    let mismatches = 0;
    let errors = 0;
    let fixed = 0;

    for (const s of page.page) {
      try {
        const r = await auditOne(ctx, {
          schoolId: s._id,
          model: args.model,
          baseUrl: args.baseUrl,
        });

        if (r.isMismatch) mismatches += 1;

        if (
          autoFix &&
          r.isMismatch &&
          r.confidence >= autoFixMinConfidence &&
          (r.recommendedWebsiteUrl || r.recommendedAnnouncementsUrl)
        ) {
          await ctx.runMutation(api.schools.patchSchoolUrls, {
            schoolId: s._id,
            websiteUrl: r.recommendedWebsiteUrl ?? undefined,
            announcementsUrl: r.recommendedAnnouncementsUrl ?? undefined,
            auditNote: `AI audit auto-fix (conf=${r.confidence})`,
          });
          fixed += 1;
        }

        results.push(r);
      } catch (e) {
        errors += 1;
        results.push({
          schoolId: s._id,
          nameZh: s.nameZh,
          nameEn: s.nameEn,
          level: s.level,
          currentWebsiteUrl: s.websiteUrl,
          currentAnnouncementsUrl: s.announcementsUrl ?? null,
          isMismatch: false,
          confidence: 0,
          reason: e instanceof Error ? e.message : String(e),
          recommendedWebsiteUrl: null,
          recommendedAnnouncementsUrl: null,
        });
      }
    }

    return {
      ok: true,
      limit,
      cursorIn: args.cursor ?? null,
      cursorOut: page.cursor,
      isDone: page.isDone,
      model: args.model ?? process.env.ZEABUR_AI_MODEL ?? "gemini-2.5-flash-lite",
      baseUrl: args.baseUrl ?? process.env.ZEABUR_AI_BASE_URL ?? null,
      autoFix,
      autoFixMinConfidence,
      mismatches,
      fixed,
      errors,
      results,
    };
  },
});

// NOTE: Explicit type annotation avoids Next.js/TS circular inference issues.
export const runContinuousUrlAuditBatch: ReturnType<typeof action> = action({
  args: {
    limit: v.optional(v.number()),
    staleDays: v.optional(v.number()),
    model: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    autoFixMinConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { api, internal } = await import("./_generated/api");

    const state = await ctx.runQuery(api.urlAuditState.getState, {});
    if (!state?.running) {
      return { ok: true, skipped: true, reason: "url audit not running" };
    }

    const limit = Math.max(1, Math.min(50, args.limit ?? 10));
    const staleDays = args.staleDays ?? 30;
    const autoFixMinConfidence = args.autoFixMinConfidence ?? 0.9;

    const model = args.model ?? process.env.ZEABUR_AI_MODEL ?? "gemini-2.5-flash-lite";
    const baseUrl = args.baseUrl ?? process.env.ZEABUR_AI_BASE_URL ?? null;

    const candidates = await ctx.runQuery(api.schools.listSchoolsForUrlAudit, {
      limit,
      staleDays,
      forceAuditAllBefore: state.forceAuditAllBefore,
    });

    let checked = 0;
    let mismatches = 0;
    let fixed = 0;
    let errors = 0;

    for (const row of candidates) {
      const checkedAt = Date.now();
      const s = row as Record<string, unknown>;
      const schoolId = s._id as SchoolId | undefined;
      if (!schoolId) {
        errors += 1;
        continue;
      }

      try {
        const r = await auditOne(ctx, {
          schoolId,
          model,
          baseUrl: baseUrl ?? undefined,
        });
        checked += 1;

        if (r.isMismatch) mismatches += 1;

        // Always mark checked. Clear pending by default.
        await ctx.runMutation(api.schools.recordUrlAuditCheck, {
          schoolId,
          checkedAt,
          status: r.isMismatch ? "needs_review" : "ok",
        });

        if (
          r.isMismatch &&
          r.confidence >= autoFixMinConfidence &&
          (r.recommendedWebsiteUrl || r.recommendedAnnouncementsUrl)
        ) {
          // Patch + log fix.
          await ctx.runMutation(api.schools.patchSchoolUrls, {
            schoolId,
            websiteUrl: r.recommendedWebsiteUrl ?? undefined,
            announcementsUrl: r.recommendedAnnouncementsUrl ?? undefined,
            auditNote: `AI audit auto-fix (conf=${r.confidence})`,
          });

          await ctx.runMutation(internal.urlAuditFixes.logAutoFix, {
            schoolId,
            oldWebsiteUrl: typeof s.websiteUrl === "string" ? s.websiteUrl : undefined,
            newWebsiteUrl: r.recommendedWebsiteUrl ?? undefined,
            oldAnnouncementsUrl:
              typeof s.announcementsUrl === "string" ? s.announcementsUrl : undefined,
            newAnnouncementsUrl: r.recommendedAnnouncementsUrl ?? undefined,
            confidence: r.confidence,
            reason: r.reason,
            model,
            baseUrl: baseUrl ?? "",
          });

          fixed += 1;
        }
      } catch {
        errors += 1;
        await ctx.runMutation(api.schools.recordUrlAuditCheck, {
          schoolId,
          checkedAt,
          status: "pending",
        });
      }
    }

    await ctx.runMutation(internal.urlAuditState.recordBatchStats, {
      checked,
      mismatches,
      fixed,
      errors,
      lastError: errors ? "batch contained errors" : undefined,
    });

    return { ok: true, checked, mismatches, fixed, errors, limit, staleDays };
  },
});
