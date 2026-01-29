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
  })
    .index("by_phone", ["phone"])
    .index("by_status", ["status"]),
});
