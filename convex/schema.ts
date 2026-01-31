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
});
