import { v } from "convex/values";
import { action } from "./_generated/server";
// Note: avoid importing ./_generated/api at module scope (can create TS circular types in Next build).

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTextForHash(text: string): string {
  // Reduce false positives from timestamps/boilerplate.
  return text
    .replace(/\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b/g, " ") // 2026-02-02
    .replace(/\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g, " ") // 02/02/2026
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ") // 12:34
    .replace(/©\s*\d{4}.*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function extractCandidateLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  const hrefs = [
    ...[...html.matchAll(/href\s*=\s*"([^"]+)"/gi)].map((m) => m[1]),
    ...[...html.matchAll(/href\s*=\s*'([^']+)'/gi)].map((m) => m[1]),
  ];

  const keywords = [
    "news",
    "announcement",
    "notices",
    "events",
    "open day",
    "admission",
    "最新消息",
    "通告",
    "活動",
    "入學",
    "開放日",
  ];

  let baseOrigin: string | undefined;
  try {
    baseOrigin = new URL(baseUrl).origin;
  } catch {
    baseOrigin = undefined;
  }

  for (const raw of hrefs) {
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:")) continue;
    let abs: string;
    try {
      abs = new URL(raw, baseUrl).toString();
    } catch {
      continue;
    }

    // Avoid crawling off-domain for MVP.
    if (baseOrigin) {
      try {
        if (new URL(abs).origin !== baseOrigin) continue;
      } catch {
        continue;
      }
    }

    const lower = abs.toLowerCase();
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
      out.add(abs);
    }
  }

  return [...out].slice(0, 8);
}

async function tryDiscoverFromSitemap(rootUrl: string): Promise<string[]> {
  try {
    const u = new URL(rootUrl);
    const sitemapUrl = new URL("/sitemap.xml", u.origin).toString();
    const resp = await fetch(sitemapUrl, { redirect: "follow" });
    if (!resp.ok) return [];
    const xml = await resp.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);

    const keywords = [
      "news",
      "announcement",
      "notices",
      "events",
      "open-day",
      "openday",
      "admission",
      "%E6%9C%80%E6%96%B0%E6%B6%88%E6%81%AF", // 最新消息
      "%E9%80%9A%E5%91%8A", // 通告
      "%E6%B4%BB%E5%8B%95", // 活動
      "%E5%85%A5%E5%AD%B8", // 入學
      "%E9%96%8B%E6%94%BE%E6%97%A5", // 開放日
    ];

    const origin = u.origin;
    return locs
      .map((x) => x.trim())
      .filter((x) => x && x.startsWith(origin))
      .filter((x) => keywords.some((k) => x.toLowerCase().includes(k)))
      .slice(0, 5);
  } catch {
    return [];
  }
}

// NOTE: Explicit type annotation avoids a Next.js/TS circular inference issue when typechecking
// Convex action definitions inside the Next.js app repo.
export const runMonitoringOnceAction: ReturnType<typeof action> = action({
  args: {
    limitSchools: v.optional(v.number()),
    limitPagesPerSchool: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    const { api } = await import("./_generated/api");

    const runId = await ctx.runMutation(api.monitoringMutations.createMonitoringRun, {
      startedAt,
    });

    const limitSchools = args.limitSchools ?? 20;
    const limitPagesPerSchool = args.limitPagesPerSchool ?? 3;

    const schools = await ctx.runQuery(api.monitoringQueries.getSchoolsForMonitoring, {
      limit: limitSchools,
    });

    let schoolsChecked = 0;
    let pagesFetched = 0;
    let changesNew = 0;
    let changesUpdated = 0;
    let changesNone = 0;
    let errors = 0;

    for (const school of schools) {
      schoolsChecked += 1;
      const rootUrl = school.websiteUrl;
      if (!rootUrl) {
        errors += 1;
        continue;
      }

      const urlsToFetch: string[] = [rootUrl];
      let rootHtml = "";

      try {
        const resp = await fetch(rootUrl, { redirect: "follow" });
        const contentType = resp.headers.get("content-type") ?? undefined;
        const statusCode = resp.status;
        rootHtml = await resp.text();
        const text = stripHtmlToText(rootHtml);
        const contentHash = text ? simpleHash(normalizeTextForHash(text)) : undefined;

        const fetchedAt = Date.now();

        await ctx.runMutation(api.monitoringMutations.insertSchoolPageSnapshot, {
          schoolId: school._id,
          url: rootUrl,
          fetchedAt,
          statusCode,
          contentType,
          text,
          contentHash,
        });

        await ctx.runMutation(api.monitoringMutations.patchSchoolWebsiteCheck, {
          schoolId: school._id,
          checkedAt: fetchedAt,
          statusCode,
        });

        pagesFetched += 1;
      } catch (e) {
        errors += 1;
        const fetchedAt = Date.now();
        const error = e instanceof Error ? e.message : String(e);

        await ctx.runMutation(api.monitoringMutations.insertSchoolPageSnapshot, {
          schoolId: school._id,
          url: rootUrl,
          fetchedAt,
          error,
        });

        await ctx.runMutation(api.monitoringMutations.patchSchoolWebsiteCheck, {
          schoolId: school._id,
          checkedAt: fetchedAt,
          error,
        });
        continue;
      }

      const candidates = rootHtml ? extractCandidateLinks(rootHtml, rootUrl) : [];
      const sitemapCandidates = await tryDiscoverFromSitemap(rootUrl);

      for (const u of [...candidates, ...sitemapCandidates].slice(
        0,
        Math.max(0, limitPagesPerSchool - 1),
      )) {
        urlsToFetch.push(u);
      }

      for (const u of urlsToFetch.slice(1, limitPagesPerSchool)) {
        try {
          const resp = await fetch(u, { redirect: "follow" });
          const contentType = resp.headers.get("content-type") ?? undefined;
          const statusCode = resp.status;
          const html = await resp.text();
          const text = stripHtmlToText(html);
          const contentHash = text ? simpleHash(normalizeTextForHash(text)) : undefined;

          const prev = await ctx.runQuery(api.monitoringQueries.getLatestSnapshotHash, {
            schoolId: school._id,
            url: u,
          });

          let changeType = "NO_CHANGE";
          if (!prev?.contentHash && contentHash) {
            changeType = "NEW";
            changesNew += 1;
          } else if (prev?.contentHash && contentHash && prev.contentHash !== contentHash) {
            changeType = "UPDATED";
            changesUpdated += 1;
          } else {
            changesNone += 1;
          }

          await ctx.runMutation(api.monitoringMutations.insertSchoolPageSnapshot, {
            schoolId: school._id,
            url: u,
            fetchedAt: Date.now(),
            statusCode,
            contentType,
            text,
            contentHash,
          });

          if (changeType === "NEW" || changeType === "UPDATED") {
            const title = `${school.nameEn} update`;
            const contentText = text.slice(0, 2000);
            const announcementHash = contentHash ?? simpleHash(contentText);

            await ctx.runMutation(api.monitoringMutations.insertAnnouncement, {
              schoolId: school._id,
              url: u,
              title,
              contentText,
              contentHash: announcementHash,
              firstSeenAt: Date.now(),
              lastSeenAt: Date.now(),
              changeType,
            });
          }

          pagesFetched += 1;
        } catch (e) {
          errors += 1;
          await ctx.runMutation(api.monitoringMutations.insertSchoolPageSnapshot, {
            schoolId: school._id,
            url: u,
            fetchedAt: Date.now(),
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    await ctx.runMutation(api.monitoringMutations.finishMonitoringRun, {
      runId,
      finishedAt: Date.now(),
      status: "completed",
      schoolsChecked,
      pagesFetched,
      changesNew,
      changesUpdated,
      changesNone,
      errors,
    });

    return { runId, schoolsChecked, pagesFetched, changesNew, changesUpdated, changesNone, errors };
  },
});
