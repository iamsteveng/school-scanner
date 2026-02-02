import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phone: v.string(),
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

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_level", ["level"])
    .index("by_type", ["type"])
    .index("by_district", ["districtEn"])
    .index("by_level_type_district", ["level", "type", "districtEn"]),

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
    .index("by_school_url", ["schoolId", "url"]),
});
