import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { normalizeSelection, getSelectionGuardOutcome } from "../shared/selectionRules";

type SaveForUserArgs = {
  userId: Id<"users">;
  schoolIds: Id<"schools">[];
};

type SaveForUserResult =
  | {
      ok: true;
      code: "OK";
      selectionId: Id<"user_school_selections">;
      lockedAt?: number;
    }
  | {
      ok: false;
      code: "UPGRADE_REQUIRED" | "FREE_LIMIT_EXCEEDED";
      message: string;
    };

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

export const clearForUserDev = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_school_selections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
      return { ok: true, deleted: false };
    }

    await ctx.db.delete(existing._id);
    return { ok: true, deleted: true };
  },
});

export async function saveForUserInternal(
  ctx: MutationCtx,
  args: SaveForUserArgs,
): Promise<SaveForUserResult> {
  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new Error("User not found");
  }

  const plan = (user.plan ?? "FREE") as "FREE" | "PREMIUM";

  const normalizedSchoolIds = normalizeSelection(args.schoolIds);

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

  const guard = getSelectionGuardOutcome({
    plan,
    nextCount: normalizedSchoolIds.length,
    wasPreviouslySaved: !!existing,
    isLocked: !!existing?.lockedAt,
  });

  if (!guard.ok) {
    return {
      ok: false,
      code: guard.code,
      message: guard.message,
    };
  }

  if (!existing) {
    const lockedAt = plan === "FREE" ? now : undefined;
    const id = await ctx.db.insert("user_school_selections", {
      userId: args.userId,
      schoolIds: normalizedSchoolIds,
      lockedAt,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, code: "OK", selectionId: id, lockedAt };
  }

  const lockedAt = existing.lockedAt ?? (plan === "FREE" ? now : undefined);

  await ctx.db.patch(existing._id, {
    schoolIds: normalizedSchoolIds,
    lockedAt,
    updatedAt: now,
  });

  return { ok: true, code: "OK", selectionId: existing._id, lockedAt };
}

export const saveForUser = mutation({
  args: {
    userId: v.id("users"),
    schoolIds: v.array(v.id("schools")),
  },
  handler: saveForUserInternal,
});
