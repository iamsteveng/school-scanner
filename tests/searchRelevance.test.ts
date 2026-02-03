import { describe, expect, it } from "vitest";
import { scoreTextMatch, sortSchoolsByRelevance } from "../shared/searchRelevance";

describe("searchRelevance", () => {
  it("scores exact match higher than prefix and substring", () => {
    expect(scoreTextMatch("ABC", "ABC")).toBeGreaterThan(
      scoreTextMatch("ABCD", "ABC"),
    );
    expect(scoreTextMatch("ABCD", "ABC")).toBeGreaterThan(
      scoreTextMatch("XABCY", "ABC"),
    );
  });

  it("prefers earlier substring occurrences", () => {
    expect(scoreTextMatch("ABC something", "something")).toBeGreaterThan(
      scoreTextMatch("xxxx something", "something"),
    );
  });

  it("sorts by relevance then tie-breaks by nameEn", () => {
    const schools = [
      { nameEn: "B School", nameZh: "乙校" },
      { nameEn: "A School", nameZh: "甲校" },
      { nameEn: "C School", nameZh: "丙校" },
    ];

    const out = sortSchoolsByRelevance(schools, "school");
    // All include "school" at the same position; tie-breaker should be nameEn ascending.
    expect(out.map((s) => s.nameEn)).toEqual([
      "A School",
      "B School",
      "C School",
    ]);
  });
});
