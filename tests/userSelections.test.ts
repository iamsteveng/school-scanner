import { describe, expect, it } from "vitest";
import { saveForUserInternal } from "../convex/userSelections";

function makeCtx(args: {
  plan: "FREE" | "PREMIUM";
  existingSelection?: { _id: string; lockedAt?: number } | null;
}) {
  const patches: Array<{ id: string; value: unknown }> = [];
  const inserts: Array<{ table: string; value: unknown }> = [];

  return {
    patches,
    inserts,
    ctx: {
      db: {
        get: async (id: string) => {
          if (id === "user-1") {
            return { _id: "user-1", plan: args.plan };
          }
          if (id.startsWith("school-")) {
            return { _id: id };
          }
          return null;
        },
        query: () => ({
          withIndex: () => ({
            unique: async () => args.existingSelection ?? null,
          }),
        }),
        insert: async (table: string, value: unknown) => {
          inserts.push({ table, value });
          return "selection-new";
        },
        patch: async (id: string, value: unknown) => {
          patches.push({ id, value });
        },
      },
    },
  };
}

describe("saveForUserInternal", () => {
  it("allows first free save and locks selection", async () => {
    const { ctx, inserts, patches } = makeCtx({
      plan: "FREE",
      existingSelection: null,
    });

    const result = await saveForUserInternal(
      ctx as unknown as Parameters<typeof saveForUserInternal>[0],
      {
        userId: "user-1",
        schoolIds: ["school-1", "school-2"],
      } as unknown as Parameters<typeof saveForUserInternal>[1],
    );

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ code: "OK", selectionId: "selection-new" });
    if (result.ok) {
      expect(typeof result.lockedAt).toBe("number");
    }

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      table: "user_school_selections",
      value: {
        userId: "user-1",
        schoolIds: ["school-1", "school-2"],
      },
    });
    expect((inserts[0].value as { lockedAt?: unknown }).lockedAt).toEqual(expect.any(Number));
    expect(patches).toHaveLength(0);
  });

  it("returns explicit upgrade-required result for locked free users", async () => {
    const { ctx, patches, inserts } = makeCtx({
      plan: "FREE",
      existingSelection: { _id: "selection-1", lockedAt: 1700000000000 },
    });

    const result = await saveForUserInternal(
      ctx as unknown as Parameters<typeof saveForUserInternal>[0],
      {
        userId: "user-1",
        schoolIds: ["school-1", "school-2"],
      } as unknown as Parameters<typeof saveForUserInternal>[1],
    );

    expect(result).toEqual({
      ok: false,
      code: "UPGRADE_REQUIRED",
      message: "Selection is locked for Free plan until upgrade",
    });
    expect(patches).toHaveLength(0);
    expect(inserts).toHaveLength(0);
  });

  it("allows premium users to edit existing selection", async () => {
    const { ctx, patches, inserts } = makeCtx({
      plan: "PREMIUM",
      existingSelection: { _id: "selection-1", lockedAt: undefined },
    });

    const result = await saveForUserInternal(
      ctx as unknown as Parameters<typeof saveForUserInternal>[0],
      {
        userId: "user-1",
        schoolIds: ["school-1", "school-2", "school-3"],
      } as unknown as Parameters<typeof saveForUserInternal>[1],
    );

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ code: "OK", selectionId: "selection-1" });
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({
      id: "selection-1",
      value: {
        schoolIds: ["school-1", "school-2", "school-3"],
      },
    });
    expect((patches[0].value as { lockedAt?: unknown }).lockedAt).toBeUndefined();
    expect(inserts).toHaveLength(0);
  });
});
