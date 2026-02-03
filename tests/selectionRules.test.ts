import { describe, expect, it } from "vitest";
import { assertSelectionAllowed } from "../shared/selectionRules";

describe("selectionRules", () => {
  it("blocks free plan selecting more than 5", () => {
    expect(() =>
      assertSelectionAllowed({
        plan: "FREE",
        nextCount: 6,
        wasPreviouslySaved: false,
        isLocked: false,
      }),
    ).toThrow(/up to 5/);
  });

  it("allows free plan selecting 5 or fewer before lock", () => {
    expect(() =>
      assertSelectionAllowed({
        plan: "FREE",
        nextCount: 5,
        wasPreviouslySaved: false,
        isLocked: false,
      }),
    ).not.toThrow();
  });

  it("blocks free plan editing after lock", () => {
    expect(() =>
      assertSelectionAllowed({
        plan: "FREE",
        nextCount: 3,
        wasPreviouslySaved: true,
        isLocked: true,
      }),
    ).toThrow(/locked/);
  });

  it("allows premium editing", () => {
    expect(() =>
      assertSelectionAllowed({
        plan: "PREMIUM",
        nextCount: 20,
        wasPreviouslySaved: true,
        isLocked: true,
      }),
    ).not.toThrow();
  });
});
