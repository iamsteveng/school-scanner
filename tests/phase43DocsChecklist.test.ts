import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const taskBriefPath = resolve(
  process.cwd(),
  "docs/tasks/phase-4-3-edit-school-cta-gating.md",
);

describe("Phase 4.3 docs checklist", () => {
  it("documents backend/frontend gating decisions", () => {
    const content = readFileSync(taskBriefPath, "utf8");

    expect(content).toContain("Backend gate");
    expect(content).toContain("UPGRADE_REQUIRED");
    expect(content).toContain("Frontend dashboard gating");
    expect(content).toContain("Free users: opens upgrade modal");
    expect(content).toContain("Premium users: routes directly to `/schools`");
  });

  it("includes PR summary with test evidence commands", () => {
    const content = readFileSync(taskBriefPath, "utf8");

    expect(content).toContain("## PR Summary (ready to paste)");
    expect(content).toContain("npm run test");
    expect(content).toContain("npx tsc --noEmit");
    expect(content).toContain("npm run build");
  });

  it("includes visual proof checklist for free and premium paths", () => {
    const content = readFileSync(taskBriefPath, "utf8");

    expect(content).toContain("## Visual Proof (attach in PR)");
    expect(content).toContain("free-edit-upgrade-modal.png");
    expect(content).toContain("premium-edit-entry.png");
    expect(content).toContain("dashboard-edit-gating.gif");
  });
});
