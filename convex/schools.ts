import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const normalize = (value: string) => value.trim();

export const listSchools = query({
  args: {
    level: v.optional(v.string()),
    type: v.optional(v.string()),
    district: v.optional(v.string()),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const level = args.level ? normalize(args.level) : undefined;
    const type = args.type ? normalize(args.type) : undefined;
    const district = args.district ? normalize(args.district) : undefined;
    const q = args.q ? normalize(args.q).toLowerCase() : undefined;
    const limit = args.limit ?? 200;

    // Start with the most selective index we can.
    let schools;
    if (level && type && district) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_level_type_district", (q) =>
          q.eq("level", level).eq("type", type).eq("district", district),
        )
        .take(limit);
    } else if (district) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_district", (q) => q.eq("district", district))
        .take(limit);
    } else if (level) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_level", (q) => q.eq("level", level))
        .take(limit);
    } else if (type) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_type", (q) => q.eq("type", type))
        .take(limit);
    } else {
      schools = await ctx.db.query("schools").take(limit);
    }

    if (!q) {
      return schools;
    }

    // For now, do a simple in-memory substring match (fine for MVP / small datasets).
    return schools.filter((school) => {
      return (
        school.nameEn.toLowerCase().includes(q) ||
        school.nameZh.toLowerCase().includes(q)
      );
    });
  },
});

export const seedSchools = mutation({
  args: {
    schools: v.array(
      v.object({
        nameEn: v.string(),
        nameZh: v.string(),
        level: v.string(),
        type: v.string(),
        district: v.string(),
        websiteUrl: v.string(),
      }),
    ),
    wipeExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // NOTE: No auth gating yet (MVP). We should restrict this in prod.
    if (args.wipeExisting) {
      const existing = await ctx.db.query("schools").collect();
      for (const row of existing) {
        await ctx.db.delete(row._id);
      }
    }

    const now = Date.now();

    for (const school of args.schools) {
      await ctx.db.insert("schools", {
        ...school,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { inserted: args.schools.length };
  },
});
