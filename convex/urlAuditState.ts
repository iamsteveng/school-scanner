import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

const DEFAULTS = () => {
  const now = Date.now();
  return {
    running: false,
    checkedTotal: 0,
    mismatchesTotal: 0,
    fixedTotal: 0,
    errorsTotal: 0,
    createdAt: now,
    updatedAt: now,
  };
};

export const getState = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("url_audit_state").take(1);
    return rows[0] ?? null;
  },
});

export const ensureState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("url_audit_state").take(1);
    if (rows[0]) return rows[0];
    const _id = await ctx.db.insert("url_audit_state", DEFAULTS());
    return await ctx.db.get(_id);
  },
});

export const setRunning = mutation({
  args: { running: v.boolean() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("url_audit_state").take(1);
    const now = Date.now();
    if (!rows[0]) {
      await ctx.db.insert("url_audit_state", { ...DEFAULTS(), running: args.running });
      return { ok: true };
    }
    await ctx.db.patch(rows[0]._id, { running: args.running, updatedAt: now });
    return { ok: true };
  },
});

export const forceReauditAllNow = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("url_audit_state").take(1);
    const now = Date.now();
    if (!rows[0]) {
      await ctx.db.insert("url_audit_state", {
        ...DEFAULTS(),
        forceAuditAllBefore: now,
      });
      return { ok: true, forceAuditAllBefore: now };
    }
    await ctx.db.patch(rows[0]._id, {
      forceAuditAllBefore: now,
      updatedAt: now,
    });
    return { ok: true, forceAuditAllBefore: now };
  },
});

export const recordBatchStats = internalMutation({
  args: {
    checked: v.number(),
    mismatches: v.number(),
    fixed: v.number(),
    errors: v.number(),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const state = (await ctx.db.query("url_audit_state").take(1))[0];
    const now = Date.now();
    if (!state) {
      await ctx.db.insert("url_audit_state", {
        ...DEFAULTS(),
        running: true,
        checkedTotal: args.checked,
        mismatchesTotal: args.mismatches,
        fixedTotal: args.fixed,
        errorsTotal: args.errors,
        lastRunAt: now,
        lastError: args.lastError,
      });
      return;
    }

    await ctx.db.patch(state._id, {
      checkedTotal: (state.checkedTotal ?? 0) + args.checked,
      mismatchesTotal: (state.mismatchesTotal ?? 0) + args.mismatches,
      fixedTotal: (state.fixedTotal ?? 0) + args.fixed,
      errorsTotal: (state.errorsTotal ?? 0) + args.errors,
      lastRunAt: now,
      lastError: args.lastError,
      updatedAt: now,
    });
  },
});
