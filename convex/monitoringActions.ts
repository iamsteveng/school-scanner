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
  const hrefs = [...html.matchAll(/href\s*=\s*"([^"]+)"/gi)].map((m) => m[1]);

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

  for (const raw of hrefs) {
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
  }

  return [...out].slice(0, 5);
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
        const contentHash = text ? simpleHash(text) : undefined;

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
      for (const u of candidates.slice(0, Math.max(0, limitPagesPerSchool - 1))) {
        urlsToFetch.push(u);
      }

      for (const u of urlsToFetch.slice(1, limitPagesPerSchool)) {
        try {
          const resp = await fetch(u, { redirect: "follow" });
          const contentType = resp.headers.get("content-type") ?? undefined;
          const statusCode = resp.status;
          const html = await resp.text();
          const text = stripHtmlToText(html);
          const contentHash = text ? simpleHash(text) : undefined;

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
