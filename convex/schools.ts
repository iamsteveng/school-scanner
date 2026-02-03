import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import seedData from "./seed/hk_primary_schools_seed.json";
import { sortSchoolsByRelevance } from "../shared/searchRelevance";

const normalize = (value: string) => value.trim();

export const listSchools = query({
  args: {
    level: v.optional(v.string()),
    type: v.optional(v.string()),

    // District filters
    district: v.optional(v.string()), // districtEn (back-compat)
    districtZh: v.optional(v.string()),

    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const level = args.level ? normalize(args.level) : undefined;
    const type = args.type ? normalize(args.type) : undefined;

    // Prefer districtEn filter because we have indexes for it.
    const districtEn = args.district ? normalize(args.district) : undefined;
    const districtZh = args.districtZh ? normalize(args.districtZh) : undefined;

    const q = args.q ? normalize(args.q) : undefined;
    const limit = args.limit ?? 200;

    // For substring search (no full-text index yet), we need to scan more than a single page.
    // Our dataset is small right now (~600), so 5000 is safe and keeps latency low.
    const scanLimit = q ? Math.max(limit, 5000) : limit;

    // Start with the most selective index we can.
    let schools;
    if (level && type && districtEn) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_level_type_district", (q) =>
          q.eq("level", level).eq("type", type).eq("districtEn", districtEn),
        )
        .take(scanLimit);
    } else if (districtEn) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_district", (q) => q.eq("districtEn", districtEn))
        .take(scanLimit);
    } else if (level) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_level", (q) => q.eq("level", level))
        .take(scanLimit);
    } else if (type) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_type", (q) => q.eq("type", type))
        .take(scanLimit);
    } else {
      schools = await ctx.db.query("schools").take(scanLimit);
    }

    // If districtZh is provided (and districtEn isn't), filter in-memory.
    // (We can add a districtZh index later if needed.)
    if (!districtEn && districtZh) {
      schools = schools.filter((s) => normalize(s.districtZh) === districtZh);
    }

    if (!q) {
      return schools.slice(0, limit);
    }

    const ranked = sortSchoolsByRelevance(schools, q);
    return ranked.slice(0, limit);
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

export const refreshPrimarySchoolsFromSeed = internalMutation({
  args: {
    wipeExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Seed file is committed to the repo and bundled into Convex functions.
    // `generatedAt` is an ISO string.
    const seed = seedData as unknown as {
      generatedAt: string;
      schools: Array<{
        nameEn: string;
        nameZh: string;
        level: string;
        type: string;
        districtEn: string;
        districtZh: string;
        genderEn?: string;
        genderZh?: string;
        religionEn?: string;
        religionZh?: string;
        addressEn?: string;
        addressZh?: string;
        latitude?: number;
        longitude?: number;
        websiteUrl: string;
        sourceLastUpdate?: string;
      }>;
    };

    if (!seed?.schools?.length) {
      throw new Error("Seed file contains no schools");
    }

    if (args.wipeExisting ?? true) {
      const existing = await ctx.db.query("schools").collect();
      for (const row of existing) {
        await ctx.db.delete(row._id);
      }
    }

    const now = Date.now();

    for (const school of seed.schools) {
      await ctx.db.insert("schools", {
        ...school,
        // Keep provenance visible in the table.
        sourceLastUpdate: school.sourceLastUpdate ?? seed.generatedAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      inserted: seed.schools.length,
      seedGeneratedAt: seed.generatedAt,
    };
  },
});
