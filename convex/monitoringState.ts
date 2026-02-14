import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const getState = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("monitoring_state").take(1);
    return rows[0] ?? null;
  },
});

export const ensureState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("monitoring_state").take(1);
    if (rows[0]) return rows[0];
    const now = Date.now();
    const _id = await ctx.db.insert("monitoring_state", {
      running: false,
      updatedAt: now,
    });
    return await ctx.db.get(_id);
  },
});

export const startNewDailyRun = internalMutation({
  args: {},
  handler: async (ctx) => {
    const state = (await ctx.db.query("monitoring_state").take(1))[0];
    const now = Date.now();
    if (!state) {
      await ctx.db.insert("monitoring_state", {
        running: true,
        cursor: undefined,
        startedAt: now,
        updatedAt: now,
      });
      return { ok: true };
    }

    await ctx.db.patch(state._id, {
      running: true,
      cursor: undefined,
      startedAt: now,
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const updateAfterBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    isDone: v.boolean(),
  },
  handler: async (ctx, args) => {
    const state = (await ctx.db.query("monitoring_state").take(1))[0];
    const now = Date.now();
    if (!state) {
      await ctx.db.insert("monitoring_state", {
        running: !args.isDone,
        cursor: args.isDone ? undefined : args.cursor,
        startedAt: now,
        updatedAt: now,
      });
      return;
    }

    await ctx.db.patch(state._id, {
      running: !args.isDone,
      cursor: args.isDone ? undefined : args.cursor,
      updatedAt: now,
    });
  },
});
