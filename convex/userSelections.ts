import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeSelection, assertSelectionAllowed } from "../shared/selectionRules";

export const getForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("user_school_selections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    return row ?? null;
  },
});

export const saveForUser = mutation({
  args: {
    userId: v.id("users"),
    schoolIds: v.array(v.id("schools")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const plan = (user.plan ?? "FREE") as "FREE" | "PREMIUM";

    const normalizedSchoolIds = normalizeSelection(args.schoolIds);

    // Validate that school ids exist.
    // (This is O(n) reads; fine for small n.)
    for (const schoolId of normalizedSchoolIds) {
      const school = await ctx.db.get(schoolId);
      if (!school) {
        throw new Error(`School not found: ${schoolId}`);
      }
    }

    const existing = await ctx.db
      .query("user_school_selections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const now = Date.now();

    assertSelectionAllowed({
      plan,
      nextCount: normalizedSchoolIds.length,
      wasPreviouslySaved: !!existing,
      isLocked: !!existing?.lockedAt,
    });

    if (!existing) {
      const lockedAt = plan === "FREE" ? now : undefined;
      const id = await ctx.db.insert("user_school_selections", {
        userId: args.userId,
        schoolIds: normalizedSchoolIds,
        lockedAt,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true, selectionId: id, lockedAt };
    }

    // Premium can always edit. Free cannot edit once locked (enforced above).
    const lockedAt = existing.lockedAt ?? (plan === "FREE" ? now : undefined);

    await ctx.db.patch(existing._id, {
      schoolIds: normalizedSchoolIds,
      lockedAt,
      updatedAt: now,
    });

    return { ok: true, selectionId: existing._id, lockedAt };
  },
});
