import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phone: v.string(),
    plan: v.optional(v.union(v.literal("FREE"), v.literal("PREMIUM"))),
    createdAt: v.number(),
    updatedAt: v.number(),
    verifiedAt: v.optional(v.number()),
  }).index("by_phone", ["phone"]),
  verification_tokens: defineTable({
    token: v.string(),
    phone: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_phone", ["phone"]),
  whatsapp_message_logs: defineTable({
    phone: v.string(),
    token: v.string(),
    status: v.string(),
    provider: v.string(),
    createdAt: v.number(),
    error: v.optional(v.string()),
    messageSid: v.optional(v.string()),
    errorCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    statusUpdatedAt: v.optional(v.number()),
  })
    .index("by_phone", ["phone"])
    .index("by_status", ["status"])
    .index("by_message_sid", ["messageSid"]),
  whatsapp_webhook_logs: defineTable({
    receivedAt: v.number(),
    messageSid: v.optional(v.string()),
    status: v.optional(v.string()),
    errorCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    to: v.optional(v.string()),
    signatureValid: v.boolean(),
    requestUrl: v.string(),
    rawBody: v.string(),
  }).index("by_message_sid", ["messageSid"]),

  schools: defineTable({
    nameEn: v.string(),
    nameZh: v.string(),

    level: v.string(),
    type: v.string(),

    districtEn: v.string(),
    districtZh: v.string(),

    genderEn: v.optional(v.string()),
    genderZh: v.optional(v.string()),

    religionEn: v.optional(v.string()),
    religionZh: v.optional(v.string()),

    addressEn: v.optional(v.string()),
    addressZh: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    websiteUrl: v.string(),
    sourceLastUpdate: v.optional(v.string()),

    // Monitoring health + validation (MVP)
    announcementsUrl: v.optional(v.string()),

    websiteLastCheckedAt: v.optional(v.number()),
    websiteLastStatusCode: v.optional(v.number()),
    websiteLastError: v.optional(v.string()),

    websiteConfidence: v.optional(v.number()),
    websiteValidationReasons: v.optional(v.array(v.string())),
    websiteSuggestedAnnouncementUrls: v.optional(v.array(v.string())),
    needsWebsiteReview: v.optional(v.boolean()),

    // URL auditor (continuous)
    auditStatus: v.optional(v.string()), // "pending" | "ok" | "needs_review"
    auditLastCheckedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_level", ["level"])
    .index("by_type", ["type"])
    .index("by_district", ["districtEn"])
    .index("by_level_type_district", ["level", "type", "districtEn"])
    .index("by_audit_status", ["auditStatus"])
    .index("by_audit_last_checked", ["auditLastCheckedAt"]),

  monitoring_runs: defineTable({
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    status: v.string(),
    schoolsChecked: v.number(),
    pagesFetched: v.number(),
    changesNew: v.number(),
    changesUpdated: v.number(),
    changesNone: v.number(),
    errors: v.number(),
  }),

  monitoring_state: defineTable({
    running: v.boolean(),
    cursor: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }),

  school_page_snapshots: defineTable({
    schoolId: v.id("schools"),
    url: v.string(),
    fetchedAt: v.number(),
    statusCode: v.optional(v.number()),
    contentType: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    text: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_school", ["schoolId"])
    .index("by_school_url", ["schoolId", "url"]),

  announcements: defineTable({
    schoolId: v.id("schools"),
    url: v.string(),
    title: v.string(),
    contentText: v.string(),
    contentHash: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    changeType: v.string(),
  })
    .index("by_school", ["schoolId"])
    .index("by_school_url", ["schoolId", "url"])
    .index("by_school_hash", ["schoolId", "contentHash"]),

  user_school_selections: defineTable({
    userId: v.id("users"),
    schoolIds: v.array(v.id("schools")),
    lockedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  url_audit_state: defineTable({
    running: v.boolean(),
    // If set, schools with auditLastCheckedAt < this will be re-audited.
    forceAuditAllBefore: v.optional(v.number()),

    checkedTotal: v.number(),
    mismatchesTotal: v.number(),
    fixedTotal: v.number(),
    errorsTotal: v.number(),

    lastRunAt: v.optional(v.number()),
    lastError: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  url_audit_fixes: defineTable({
    schoolId: v.id("schools"),

    oldWebsiteUrl: v.optional(v.string()),
    newWebsiteUrl: v.optional(v.string()),
    oldAnnouncementsUrl: v.optional(v.string()),
    newAnnouncementsUrl: v.optional(v.string()),

    confidence: v.number(),
    reason: v.optional(v.string()),
    model: v.string(),
    baseUrl: v.string(),

    createdAt: v.number(),
  }).index("by_school", ["schoolId"]),

  events: defineTable({
    schoolId: v.id("schools"),
    sourceUrl: v.string(),
    sourceContentHash: v.string(),

    // AI provenance (for model comparison)
    provider: v.optional(v.string()),
    model: v.optional(v.string()),

    eventHash: v.string(),
    title: v.string(),

    eventAt: v.optional(v.number()),
    registrationOpenAt: v.optional(v.number()),
    registrationCloseAt: v.optional(v.number()),
    quota: v.optional(v.number()),
    targetStudentYears: v.optional(v.array(v.string())),
    targetAdmissionYear: v.optional(v.string()),

    language: v.optional(v.union(v.literal("zh"), v.literal("en"), v.literal("mixed"))),
    confidence: v.optional(v.number()),

    rawExtractJson: v.optional(v.string()),
    extractionNotes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_school", ["schoolId"])
    .index("by_school_url", ["schoolId", "sourceUrl"])
    .index("by_event_hash", ["eventHash"]),
});
