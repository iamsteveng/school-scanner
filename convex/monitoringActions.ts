import { v } from "convex/values";
import { action } from "./_generated/server";
// Note: avoid importing ./_generated/api at module scope (can create TS circular types in Next build).

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

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

function extractCandidateLinks(content: string, baseUrl: string): string[] {
  const out = new Set<string>();

  // HTML hrefs
  const hrefs = [
    ...[...content.matchAll(/href\s*=\s*"([^"]+)"/gi)].map((m) => m[1]),
    ...[...content.matchAll(/href\s*=\s*'([^']+)'/gi)].map((m) => m[1]),
  ];

  // Markdown links (e.g. from r.jina.ai proxy)
  const mdLinks = [...content.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);

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

  for (const raw of [...hrefs, ...mdLinks]) {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type WebsiteValidationResult = {
  confidence: number;
  reasons: string[];
  suggestedAnnouncementUrls: string[];
  needsWebsiteReview: boolean;
};

function validateWebsiteForSchool(args: {
  schoolNameEn: string;
  schoolNameZh: string;
  schoolLevel: string;
  url: string;
  pageText: string;
  candidateUrls: string[];
}): WebsiteValidationResult {
  const reasons: string[] = [];
  const page = normalizeForMatch(args.pageText);
  const nameEn = normalizeForMatch(args.schoolNameEn);
  const nameZh = args.schoolNameZh.trim();

  let score = 20;

  const hasZh = nameZh.length > 0 && page.includes(nameZh);
  if (hasZh) {
    score += 40;
    reasons.push("Matched school Chinese name on page");
  } else {
    reasons.push("Did not find school Chinese name on page");
  }

  const hasEn = nameEn.length > 0 && page.includes(nameEn);
  if (hasEn) {
    score += 20;
    reasons.push("Matched school English name on page");
  } else {
    reasons.push("Did not find school English name on page");
  }

  const level = args.schoolLevel.toUpperCase();
  const primaryMarkers = ["primary", "primary school", "p1", "p2", "p3", "p4", "p5", "p6", "小學", "小一", "小二", "小三", "小四", "小五", "小六", "附屬小學"];
  const secondaryMarkers = ["secondary", "f1", "f2", "f3", "f4", "f5", "f6", "dse", "ibdp", "中學", "中一", "中二", "中三", "中四", "中五", "中六"];

  const hasPrimaryMarkers = primaryMarkers.some((m) => page.includes(m));
  const hasSecondaryMarkers = secondaryMarkers.some((m) => page.includes(m));

  if (level.includes("PRIMARY")) {
    if (hasPrimaryMarkers) {
      score += 15;
      reasons.push("Page contains primary-school markers");
    } else {
      reasons.push("Page missing primary-school markers");
    }
    if (hasSecondaryMarkers) {
      score -= 30;
      reasons.push("Page contains secondary-school markers (possible mismatch)");
    }
  }

  // URL heuristic: if school is primary but URL path lacks any primary-ish indicator, slightly lower.
  try {
    const path = new URL(args.url).pathname.toLowerCase();
    if (level.includes("PRIMARY") && !/(primary|ps|p\d|小學)/.test(path) && /(secondary|college|dse|ibdp|f\d)/.test(path)) {
      score -= 10;
      reasons.push("URL path suggests non-primary section");
    }
  } catch {
    // ignore
  }

  score = Math.max(0, Math.min(100, score));

  // Suggest URLs: prioritize candidate URLs that look like news/announcements/open day.
  const suggestKeywords = ["open", "openday", "open-day", "開放", "開放日", "news", "latest", "announcement", "notice", "通告", "最新消息", "活動", "admission", "入學"];
  const suggestedAnnouncementUrls = args.candidateUrls
    .filter((u) => suggestKeywords.some((k) => u.toLowerCase().includes(k.toLowerCase())))
    .slice(0, 5);

  const needsWebsiteReview = score < 40;
  if (needsWebsiteReview) reasons.push("Low confidence: likely wrong website or wrong section");

  return { confidence: score, reasons, suggestedAnnouncementUrls, needsWebsiteReview };
}

async function tryDiscoverFromSitemap(rootUrl: string, fetcher: (url: string) => Promise<Response>): Promise<string[]> {
  try {
    const u = new URL(rootUrl);
    const sitemapUrl = new URL("/sitemap.xml", u.origin).toString();
    const resp = await fetcher(sitemapUrl);
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
    schoolQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    const { api } = await import("./_generated/api");

    // Crawl policy (MVP): keep it gentle.
    const perDomainDelayMs = 800;
    const lastFetchAtByDomain = new Map<string, number>();

    const fetchWithPolicy = async (url: string) => {
      const doFetch = async (targetUrl: string) => {
        let domain = "";
        try {
          domain = new URL(targetUrl).host;
        } catch {
          domain = "";
        }

        const now = Date.now();
        const last = domain ? lastFetchAtByDomain.get(domain) : undefined;
        if (domain && last != null) {
          const waitMs = perDomainDelayMs - (now - last);
          if (waitMs > 0) await sleep(waitMs);
        }

        const resp = await fetch(targetUrl, { redirect: "follow" });
        if (domain) lastFetchAtByDomain.set(domain, Date.now());
        return resp;
      };

      const classifyError = (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        const looksLikeTls =
          msg.includes("certificate") ||
          msg.includes("TLS") ||
          msg.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE");
        return { msg, looksLikeTls };
      };

      try {
        return await doFetch(url);
      } catch (e1) {
        const { looksLikeTls } = classifyError(e1);

        if (looksLikeTls) {
          try {
            const httpUrl = url.replace(/^https:\/\//i, "http://");
            if (httpUrl !== url) return await doFetch(httpUrl);
          } catch {
            // ignore
          }

          try {
            // This returns rendered-ish text/HTML and often works even when TLS is broken.
            // Prefer https for proxy (the proxy endpoint requires valid TLS).
            const httpsUrl = url.replace(/^http:\/\//i, "https://");
            const proxyUrl = `https://r.jina.ai/${httpsUrl}`;
            return await doFetch(proxyUrl);
          } catch {
            // ignore
          }
        }

        // If not TLS, or fallbacks failed, try proxy anyway (covers 403/blocks).
        try {
          const httpsUrl = url.replace(/^http:\/\//i, "https://");
          const proxyUrl = `https://r.jina.ai/${httpsUrl}`;
          return await doFetch(proxyUrl);
        } catch {
          // ignore
        }

        throw e1;
      }
    };

    const runId = await ctx.runMutation(api.monitoringMutations.createMonitoringRun, {
      startedAt,
    });

    const limitSchools = args.limitSchools ?? 20;
    const limitPagesPerSchool = args.limitPagesPerSchool ?? 3;
    const maxPagesPerRun = 150;

    const schools = await ctx.runQuery(api.monitoringQueries.getSchoolsForMonitoring, {
      limit: limitSchools,
      q: args.schoolQuery,
    });

    let schoolsChecked = 0;
    let pagesFetched = 0;
    let changesNew = 0;
    let changesUpdated = 0;
    let changesNone = 0;
    let errors = 0;

    for (const school of schools) {
      schoolsChecked += 1;
      const rootUrl = school.announcementsUrl ?? school.websiteUrl;

      // Tiny delay between schools to avoid bursts even across domains.
      await sleep(100);
      if (!rootUrl) {
        errors += 1;
        continue;
      }

      if (pagesFetched >= maxPagesPerRun) break;

      const urlsToFetch: string[] = [rootUrl];
      let rootHtml = "";

      try {
        const resp = await fetchWithPolicy(rootUrl);
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
      const sitemapCandidates = await tryDiscoverFromSitemap(rootUrl, fetchWithPolicy);

      // Website validation + suggestions (systematic wrong-URL detection).
      const validation = validateWebsiteForSchool({
        schoolNameEn: school.nameEn,
        schoolNameZh: school.nameZh,
        schoolLevel: school.level,
        url: rootUrl,
        pageText: stripHtmlToText(rootHtml),
        candidateUrls: [...candidates, ...sitemapCandidates],
      });

      await ctx.runMutation(api.monitoringMutations.patchSchoolWebsiteValidation, {
        schoolId: school._id,
        checkedAt: Date.now(),
        websiteConfidence: validation.confidence,
        reasons: validation.reasons,
        suggestedAnnouncementUrls: validation.suggestedAnnouncementUrls,
        needsWebsiteReview: validation.needsWebsiteReview,
      });

      const combined = [...candidates, ...sitemapCandidates];
      const isAssetUrl = (u: string) => {
        const lower = u.toLowerCase();
        return (
          lower.includes("/sites/default/files/") ||
          /\.(png|jpe?g|gif|svg|webp|ico|css|js|map|woff2?|ttf|eot)(\?|$)/.test(lower)
        );
      };

      for (const u of combined
        .filter((u) => !isAssetUrl(u))
        .slice(0, Math.max(0, limitPagesPerSchool - 1))) {
        urlsToFetch.push(u);
      }

      for (const u of urlsToFetch.slice(1, limitPagesPerSchool)) {
        if (pagesFetched >= maxPagesPerRun) break;
        try {
          const resp = await fetchWithPolicy(u);
          const contentType = resp.headers.get("content-type") ?? undefined;
          const statusCode = resp.status;
          const html = await resp.text();
          const text = stripHtmlToText(html);
          const contentHash = text ? simpleHash(normalizeTextForHash(text)) : undefined;

          const looksLikeProxyError =
            statusCode >= 500 ||
            text.toLowerCase().includes("error 524") ||
            text.toLowerCase().includes("a timeout occurred") ||
            text.toLowerCase().includes("upstream connect error") ||
            text.toLowerCase().includes("cloudflare");

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

          const now = Date.now();
          const existingAnnouncement = await ctx.runQuery(
            api.monitoringQueries.getAnnouncementBySchoolAndUrl,
            { schoolId: school._id, url: u },
          );

          if (changeType === "NO_CHANGE") {
            // If this page was previously considered an announcement page, keep it "fresh" without spamming.
            if (existingAnnouncement) {
              await ctx.runMutation(api.monitoringMutations.touchAnnouncement, {
                announcementId: existingAnnouncement._id,
                lastSeenAt: now,
                changeType: "NO_CHANGE",
              });
            }
          } else {
            // NEW or UPDATED
            // Don't create announcements from obviously bad fetches (proxy timeouts, 5xx, etc.).
            if (looksLikeProxyError) {
              errors += 1;
            } else {
              const title = `${school.nameEn} update`;
              const contentText = text.slice(0, 2000);
              const announcementHash = contentHash ?? simpleHash(contentText);

              // If we already have an announcement row for this page, treat this update as UPDATED.
              const finalChangeType = existingAnnouncement ? "UPDATED" : changeType;

              await ctx.runMutation(api.monitoringMutations.upsertAnnouncementBySchoolAndUrl, {
                schoolId: school._id,
                url: u,
                title,
                contentText,
                contentHash: announcementHash,
                firstSeenAt: existingAnnouncement?.firstSeenAt ?? now,
                lastSeenAt: now,
                changeType: finalChangeType,
              });
            }
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
